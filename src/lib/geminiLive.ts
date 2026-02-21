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
 * Downsample an AudioBuffer to the target sample-rate using an
 * OfflineAudioContext (accurate, browser-native resampling).
 */
async function downsample(
    buffer: Float32Array,
    fromRate: number,
    toRate: number,
): Promise<Float32Array> {
    if (fromRate === toRate) return buffer;
    const ratio = toRate / fromRate;
    const newLength = Math.round(buffer.length * ratio);
    const offCtx = new OfflineAudioContext(1, newLength, toRate);
    const src = offCtx.createBufferSource();
    const audioBuf = offCtx.createBuffer(1, buffer.length, fromRate);
    audioBuf.getChannelData(0).set(buffer);
    src.buffer = audioBuf;
    src.connect(offCtx.destination);
    src.start();
    const rendered = await offCtx.startRendering();
    return rendered.getChannelData(0);
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

    // Queues (following official docs pattern)
    private responseQueue: any[] = [];
    private audioQueue: Float32Array[] = [];

    private _state: LiveSessionState = 'idle';
    private _alive = false;
    private _loopsRunning = false;

    // Transcription buffers
    private modelTranscriptBuffer = '';
    private userTranscriptBuffer = '';

    // Playback scheduling
    private nextPlaybackTime = 0;
    private currentSourceNode: AudioBufferSourceNode | null = null;

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
        this.responseQueue = [];
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
                        startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
                        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                        prefixPaddingMs: 20,
                        silenceDurationMs: 500,
                    },
                },
            };

            // Start message processing loops BEFORE connecting
            this._loopsRunning = true;
            this.runMessageLoop();
            this.runPlaybackLoop();

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
                        // Push into queue — loops will process
                        this.responseQueue.push(message);
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

    // ── message loop (official docs pattern) ──────────────────────
    private async runMessageLoop(): Promise<void> {
        while (this._loopsRunning) {
            if (this.responseQueue.length === 0) {
                await new Promise((r) => setTimeout(r, 16)); // ~60fps polling
                continue;
            }

            const message = this.responseQueue.shift();
            const sc = message?.serverContent;
            if (!sc) continue;

            // ── interruption ──────────────────────────────────────
            if (sc.interrupted) {
                // Clear all queued audio immediately
                this.audioQueue.length = 0;
                this.stopCurrentPlayback();
                this._state = 'listening';
                this.callbacks.onInterrupted?.();
                continue;
            }

            // ── model audio data ──────────────────────────────────
            if (sc.modelTurn?.parts) {
                for (const part of sc.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        const float32 = pcm16Base64ToFloat32(part.inlineData.data);
                        this.audioQueue.push(float32);
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
        }
    }

    // ── playback loop (official docs pattern) ─────────────────────
    private async runPlaybackLoop(): Promise<void> {
        while (this._loopsRunning) {
            if (this.audioQueue.length === 0) {
                // If we were speaking and queue is now empty, signal end
                if (this._state === 'modelSpeaking') {
                    // Wait a tiny bit for more chunks that might be in flight
                    await new Promise((r) => setTimeout(r, 100));
                    if (this.audioQueue.length === 0 && this._state === 'modelSpeaking') {
                        this._state = 'listening';
                        this.callbacks.onModelAudioEnd?.();
                    }
                }
                await new Promise((r) => setTimeout(r, 16));
                continue;
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
                await this.playbackCtx.resume();
            }

            const chunk = this.audioQueue.shift()!;

            // Create audio buffer
            const buffer = this.playbackCtx.createBuffer(1, chunk.length, OUTPUT_SAMPLE_RATE);
            buffer.getChannelData(0).set(chunk);

            const sourceNode = this.playbackCtx.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(this.playbackCtx.destination);
            this.currentSourceNode = sourceNode;

            // Schedule gapless playback
            const now = this.playbackCtx.currentTime;
            const startTime = Math.max(now, this.nextPlaybackTime);
            sourceNode.start(startTime);
            this.nextPlaybackTime = startTime + buffer.duration;

            // Wait for chunk to finish playing
            const waitMs = (this.nextPlaybackTime - now) * 1000;
            if (waitMs > 0) {
                await new Promise((r) => setTimeout(r, waitMs));
            }
        }
    }

    /** Stop current audio playback (on interruption). */
    private stopCurrentPlayback(): void {
        try {
            this.currentSourceNode?.stop();
        } catch {
            // may already be stopped
        }
        this.currentSourceNode = null;
        this.nextPlaybackTime = 0;
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
    private async handleMicData(raw: Float32Array, actualRate: number): Promise<void> {
        if (!this._alive || !this.session) return;

        // Compute audio level for visualizer
        this._audioLevel = Math.min(1, computeRMS(raw) * 5);

        // Don't send audio while model is speaking (let VAD handle interruption naturally)
        // Actually, we DO send — the server-side VAD needs the audio to detect interruption.
        let pcmData: Float32Array;
        if (actualRate !== INPUT_SAMPLE_RATE) {
            try {
                pcmData = await downsample(raw, actualRate, INPUT_SAMPLE_RATE);
            } catch {
                pcmData = raw; // best effort
            }
        } else {
            pcmData = raw;
        }

        // Double-check alive after potential async downsample
        if (!this._alive || !this.session) return;

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
        this.responseQueue = [];
        this.audioQueue = [];
        this._state = 'idle';
    }
}
