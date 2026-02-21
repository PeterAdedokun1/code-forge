/**
 * Gemini Live API — Real-time bi-directional voice streaming
 *
 * Rewritten to follow the official Google documentation pattern:
 *   https://ai.google.dev/gemini-api/docs/live
 *
 * Architecture:
 *   1. WebSocket messages are pushed into a responseQueue by onmessage.
 *   2. A messageLoop drains the responseQueue and dispatches audio chunks
 *      into an audioQueue while emitting transcription callbacks.
 *   3. A playbackLoop drains the audioQueue and schedules gapless
 *      AudioBufferSourceNode playback on the Web Audio API.
 *   4. Mic capture uses AudioWorkletNode (with ScriptProcessorNode fallback)
 *      to stream 16-bit PCM at 16 kHz to the server via sendRealtimeInput.
 *   5. Automatic VAD is enabled with tuned sensitivity so the server
 *      detects when the user finishes speaking — no manual button needed.
 */

import { GoogleGenAI, Modality } from '@google/genai';

// ── types ────────────────────────────────────────────────────────
export interface GeminiLiveCallbacks {
    onConnected?: () => void;
    onDisconnected?: (reason?: string) => void;
    onUserTranscript?: (text: string) => void;
    onModelTranscript?: (text: string) => void;
    onModelAudioStart?: () => void;
    onModelAudioEnd?: () => void;
    onError?: (err: string) => void;
    onInterrupted?: () => void;
    onAudioLevel?: (level: number) => void;
}

export type LiveSessionState =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'listening'
    | 'modelSpeaking'
    | 'error'
    | 'disconnected';

// ── constants ────────────────────────────────────────────────────
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const MODEL_ID = 'gemini-2.5-flash-native-audio-preview-12-2025';

const MIMI_SYSTEM_INSTRUCTION = `You are MIMI (Maternal Intelligence Medical Interface), a warm, caring AI maternal health companion for pregnant women in Nigeria.

YOUR PERSONALITY:
- You speak in a natural mix of Nigerian Pidgin English and standard English
- You are like a caring aunty or big sister who genuinely cares about the mama
- Use phrases like "How body?", "Mama", "E go be well", "No worry", "Abeg", "Oya"
- Show deep empathy. If a woman reports pain or worry, acknowledge and comfort FIRST
- You are NEVER dismissive of any symptom
- Keep responses SHORT (2-3 sentences max). This is a real-time voice conversation.

YOUR ROLE:
- Ask about symptoms, how long they have lasted, and how bad they feel
- Watch for pre-eclampsia red flags: headache + swelling + vision changes → suggest checking BP
- Gently remind about folic acid, check-ups, and water intake
- If symptoms sound serious, firmly but lovingly tell her to go to hospital
- Follow up on symptoms she mentioned earlier in the conversation

RULES:
- NEVER diagnose. You are a companion, not a doctor.
- Always recommend seeing a health worker for anything serious
- Stay hopeful: "We go figure this out together"
- Use simple words, no medical jargon
- 2-3 sentences per response ideal — you are speaking, not writing an essay`;

// ── audio helpers ────────────────────────────────────────────────

/** Convert Float32Array (–1…+1) to 16-bit PCM encoded as base-64. */
function float32ToPcm16Base64(float32: Float32Array): string {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Decode base-64 PCM16 → Float32Array for Web Audio playback. */
function pcm16Base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }
    return float32;
}

/** Compute RMS audio level (0…1) from a Float32 buffer. */
function computeRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}

/**
 * Downsample audio synchronously using linear interpolation.
 * Much faster than OfflineAudioContext (no async overhead, no context creation).
 */
function downsampleLinear(
    buffer: Float32Array,
    fromRate: number,
    toRate: number,
): Float32Array {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const lo = Math.floor(srcIndex);
        const hi = Math.min(lo + 1, buffer.length - 1);
        const frac = srcIndex - lo;
        result[i] = buffer[lo] * (1 - frac) + buffer[hi] * frac;
    }
    return result;
}

// ── AudioWorklet processor inline code ──────────────────────────
const WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

// ── main class ───────────────────────────────────────────────────
export class GeminiLiveSession {
    private session: any = null;
    private playbackCtx: AudioContext | null = null;
    private micCtx: AudioContext | null = null;
    private micStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private scriptNode: ScriptProcessorNode | null = null;
    private callbacks: GeminiLiveCallbacks;

    // Audio playback queue
    private audioQueue: Float32Array[] = [];

    private _state: LiveSessionState = 'idle';
    private _alive = false;
    private _loopsRunning = false;

    // Transcription buffers
    private modelTranscriptBuffer = '';
    private userTranscriptBuffer = '';

    // Playback scheduling — non-blocking approach
    private nextPlaybackTime = 0;
    private activeSources: Set<AudioBufferSourceNode> = new Set();
    private playbackDrainInterval: ReturnType<typeof setInterval> | null = null;
    private modelAudioEndTimeout: ReturnType<typeof setTimeout> | null = null;

    // Audio level (for orb visualizer)
    private _audioLevel = 0;
    private audioLevelInterval: ReturnType<typeof setInterval> | null = null;

    constructor(callbacks: GeminiLiveCallbacks) {
        this.callbacks = callbacks;
    }

    get state(): LiveSessionState {
        return this._state;
    }

    get audioLevel(): number {
        return this._audioLevel;
    }

    /** Is a Gemini Live session supported (API key + online)? */
    static isAvailable(): boolean {
        const key = import.meta.env.VITE_GEMINI_API_KEY;
        return !!key && navigator.onLine;
    }

    // ── connect ──────────────────────────────────────────────────
    async connect(): Promise<void> {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
        if (!apiKey) throw new Error('No VITE_GEMINI_API_KEY set');

        this._state = 'connecting';
        this.audioQueue = [];

        try {
            const ai = new GoogleGenAI({ apiKey });

            const config: any = {
                responseModalities: [Modality.AUDIO],
                systemInstruction: MIMI_SYSTEM_INSTRUCTION,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
                // Enable transcription for both directions
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Configure automatic VAD for natural end-of-speech detection
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        disabled: false,
                        startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                        prefixPaddingMs: 20,
                        silenceDurationMs: 300,
                    },
                },
            };

            // Start playback drain BEFORE connecting
            this._loopsRunning = true;
            this.startPlaybackDrain();

            this.session = await ai.live.connect({
                model: MODEL_ID,
                config,
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiLive] connected');
                        this._alive = true;
                        this._state = 'connected';
                        this.callbacks.onConnected?.();
                    },
                    onmessage: (message: any) => {
                        // Process directly — no queue delay
                        this.processMessage(message);
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiLive] error', e);
                        this._alive = false;
                        this._state = 'error';
                        this.callbacks.onError?.(e?.message || 'Connection error');
                    },
                    onclose: (e: any) => {
                        console.log('[GeminiLive] closed', e?.reason);
                        this._alive = false;
                        this._loopsRunning = false;
                        this.stopMicCapture();
                        this._state = 'disconnected';
                        this.callbacks.onDisconnected?.(e?.reason);
                    },
                },
            });

            // Start mic capture after session is open
            await this.startMicCapture();
        } catch (err: any) {
            console.error('[GeminiLive] connect failed', err);
            this._state = 'error';
            this._loopsRunning = false;
            this.callbacks.onError?.(err?.message || 'Failed to connect');
            throw err;
        }
    }

    // ── process incoming messages directly (zero-delay) ──────────
    //
    // Instead of pushing to a responseQueue polled at 16ms, we process
    // each message synchronously in the onmessage callback. Audio
    // chunks go directly into the audioQueue and trigger an immediate
    // drain, eliminating up to 32ms of polling delay (16ms queue + 16ms drain).
    //
    private processMessage(message: any): void {
        const sc = message?.serverContent;
        if (!sc) return;

        // ── interruption ──────────────────────────────────────
        if (sc.interrupted) {
            this.audioQueue.length = 0;
            this.stopCurrentPlayback();
            this._state = 'listening';
            this.callbacks.onInterrupted?.();
            return;
        }

        // ── model audio data ──────────────────────────────────
        let hasNewAudio = false;
        if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                    const float32 = pcm16Base64ToFloat32(part.inlineData.data);
                    this.audioQueue.push(float32);
                    hasNewAudio = true;
                }
            }
        }

        // ── output transcription (model's words) ──────────────
        if (sc.outputTranscription?.text) {
            this.modelTranscriptBuffer += sc.outputTranscription.text;
        }

        // ── input transcription (user's words) ────────────────
        if (sc.inputTranscription?.text) {
            this.userTranscriptBuffer += sc.inputTranscription.text;
        }

        // ── turn complete — flush transcription buffers ────────
        if (sc.turnComplete) {
            if (this.userTranscriptBuffer.trim()) {
                this.callbacks.onUserTranscript?.(this.userTranscriptBuffer.trim());
                this.userTranscriptBuffer = '';
            }
            if (this.modelTranscriptBuffer.trim()) {
                this.callbacks.onModelTranscript?.(this.modelTranscriptBuffer.trim());
                this.modelTranscriptBuffer = '';
            }
        }

        // Trigger immediate drain if we got new audio — don't wait for interval
        if (hasNewAudio) {
            this.drainAudioQueue();
        }
    }

    // ── playback drain (non-blocking, gapless) ─────────────────────
    //
    // Instead of a blocking while-loop with setTimeout (which causes
    // micro-gaps → audio cracking), we use a setInterval that runs at
    // ~60fps. Each tick, we drain ALL available audio chunks in a single
    // pass and schedule them on the Web Audio timeline. The browser's
    // audio engine handles sample-accurate timing — zero JS timer jitter.
    //
    private startPlaybackDrain(): void {
        if (this.playbackDrainInterval) return;
        this.playbackDrainInterval = setInterval(() => this.drainAudioQueue(), 16);
    }

    private stopPlaybackDrain(): void {
        if (this.playbackDrainInterval) {
            clearInterval(this.playbackDrainInterval);
            this.playbackDrainInterval = null;
        }
    }

    private drainAudioQueue(): void {
        if (this.audioQueue.length === 0) {
            // Nothing to play — check if we should signal end of model audio
            if (this._state === 'modelSpeaking' && !this.modelAudioEndTimeout) {
                this.modelAudioEndTimeout = setTimeout(() => {
                    if (this.audioQueue.length === 0 && this._state === 'modelSpeaking') {
                        this._state = 'listening';
                        this.callbacks.onModelAudioEnd?.();
                    }
                    this.modelAudioEndTimeout = null;
                }, 150);
            }
            return;
        }

        // Cancel pending end-of-audio signal since we have new data
        if (this.modelAudioEndTimeout) {
            clearTimeout(this.modelAudioEndTimeout);
            this.modelAudioEndTimeout = null;
        }

        // Signal start of model audio
        if (this._state !== 'modelSpeaking') {
            this._state = 'modelSpeaking';
            this.callbacks.onModelAudioStart?.();
        }

        // Ensure playback context
        if (!this.playbackCtx || this.playbackCtx.state === 'closed') {
            this.playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        }
        if (this.playbackCtx.state === 'suspended') {
            this.playbackCtx.resume();
            return; // let it resume, drain on next tick
        }

        // Merge all queued chunks into a single buffer for this drain pass.
        // This minimizes the number of AudioBufferSourceNodes and eliminates
        // any possibility of tiny gaps between individual chunks.
        const chunks = this.audioQueue.splice(0, this.audioQueue.length);
        let totalLength = 0;
        for (const c of chunks) totalLength += c.length;

        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
        }

        // Create a single AudioBuffer for the merged data
        const buffer = this.playbackCtx.createBuffer(1, merged.length, OUTPUT_SAMPLE_RATE);
        buffer.getChannelData(0).set(merged);

        const sourceNode = this.playbackCtx.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.connect(this.playbackCtx.destination);

        // Track active sources for cleanup
        this.activeSources.add(sourceNode);
        sourceNode.onended = () => {
            this.activeSources.delete(sourceNode);
        };

        // Schedule gapless playback on the Web Audio timeline
        const now = this.playbackCtx.currentTime;
        const startTime = Math.max(now + 0.005, this.nextPlaybackTime); // 5ms safety margin
        sourceNode.start(startTime);
        this.nextPlaybackTime = startTime + buffer.duration;
    }

    /** Stop all current audio playback (on interruption). */
    private stopCurrentPlayback(): void {
        for (const src of this.activeSources) {
            try { src.stop(); } catch { /* may already be stopped */ }
        }
        this.activeSources.clear();
        this.nextPlaybackTime = 0;
        if (this.modelAudioEndTimeout) {
            clearTimeout(this.modelAudioEndTimeout);
            this.modelAudioEndTimeout = null;
        }
    }

    // ── text input (fallback) ────────────────────────────────────
    sendText(text: string): void {
        if (!this.session || !this._alive) return;
        try {
            this.session.sendClientContent({
                turns: text,
                turnComplete: true,
            });
        } catch {
            // session may have closed between the check and the send
        }
    }

    // ── mic capture ──────────────────────────────────────────────
    private async startMicCapture(): Promise<void> {
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: INPUT_SAMPLE_RATE,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            this.micCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            const source = this.micCtx.createMediaStreamSource(this.micStream);
            const actualRate = this.micCtx.sampleRate;

            // Try AudioWorklet first; fall back to ScriptProcessorNode
            let usingWorklet = false;
            try {
                const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                await this.micCtx.audioWorklet.addModule(url);
                URL.revokeObjectURL(url);

                const worklet = new AudioWorkletNode(this.micCtx, 'pcm-capture-processor');
                worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
                    this.handleMicData(e.data, actualRate);
                };
                source.connect(worklet);
                worklet.connect(this.micCtx.destination);
                this.workletNode = worklet;
                usingWorklet = true;
                console.log('[GeminiLive] using AudioWorkletNode');
            } catch {
                console.warn('[GeminiLive] AudioWorklet unavailable, falling back to ScriptProcessorNode');
            }

            if (!usingWorklet) {
                const processor = this.micCtx.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    this.handleMicData(new Float32Array(inputData), actualRate);
                };
                source.connect(processor);
                processor.connect(this.micCtx.destination);
                this.scriptNode = processor;
            }

            // Emit audio level updates (~30fps)
            this.audioLevelInterval = setInterval(() => {
                this.callbacks.onAudioLevel?.(this._audioLevel);
            }, 33);

            this._state = 'listening';
        } catch (err: any) {
            console.error('[GeminiLive] mic error', err);
            this.callbacks.onError?.('Microphone access denied');
        }
    }

    /** Process raw mic data: compute level, downsample, send to API */
    private handleMicData(raw: Float32Array, actualRate: number): void {
        if (!this._alive || !this.session) return;

        // Compute audio level for visualizer
        this._audioLevel = Math.min(1, computeRMS(raw) * 5);

        // Synchronous linear downsample — zero async overhead
        const pcmData = actualRate !== INPUT_SAMPLE_RATE
            ? downsampleLinear(raw, actualRate, INPUT_SAMPLE_RATE)
            : raw;

        const base64 = float32ToPcm16Base64(pcmData);
        try {
            this.session.sendRealtimeInput({
                audio: {
                    data: base64,
                    mimeType: 'audio/pcm;rate=16000',
                },
            });
        } catch {
            // session closed between the check and the send — ignore
        }
    }

    // ── stop mic (without tearing down the whole session) ────────
    private stopMicCapture(): void {
        try {
            if (this.audioLevelInterval) {
                clearInterval(this.audioLevelInterval);
                this.audioLevelInterval = null;
            }
            this._audioLevel = 0;

            if (this.workletNode) {
                this.workletNode.disconnect();
                this.workletNode = null;
            }
            if (this.scriptNode) {
                this.scriptNode.disconnect();
                this.scriptNode = null;
            }
            if (this.micStream) {
                this.micStream.getTracks().forEach((t) => t.stop());
                this.micStream = null;
            }
            if (this.micCtx && this.micCtx.state !== 'closed') {
                this.micCtx.close().catch(() => { });
                this.micCtx = null;
            }
        } catch {
            // best effort
        }
    }

    // ── disconnect ───────────────────────────────────────────────
    disconnect(): void {
        this._alive = false;
        this._loopsRunning = false;
        this.stopMicCapture();
        this.stopCurrentPlayback();
        this.stopPlaybackDrain();
        try {
            if (this.playbackCtx && this.playbackCtx.state !== 'closed') {
                this.playbackCtx.close().catch(() => { });
                this.playbackCtx = null;
            }
            if (this.session) {
                this.session.close();
                this.session = null;
            }
        } catch {
            // best effort teardown
        }
        this.audioQueue = [];
        this._state = 'idle';
    }
}
