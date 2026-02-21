/**
 * Gemini Live API — Real-time bi-directional voice streaming
 *
 * Complete rewrite following the official @google/genai SDK docs.
 *
 * Key improvements over the previous implementation:
 * 1. AudioWorkletNode (off-main-thread mic capture) → zero UI jank
 * 2. Decoupled message queue + playback loop (per official example)
 * 3. Automatic VAD with tuned sensitivity for natural turn-taking
 * 4. Continuous mic streaming (never gated on modelSpeaking)
 * 5. audioStreamEnd signal when mic is paused
 * 6. Proper interruption handling — flush audio queue instantly
 */

import {
    GoogleGenAI,
    Modality,
    StartSensitivity,
    EndSensitivity,
} from '@google/genai';

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

// ── AudioWorklet processor (inline, registered as blob URL) ──────
const WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 2048; // ~128ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    for (let i = 0; i < channelData.length; i++) {
      this._buffer.push(channelData[i]);
    }

    if (this._buffer.length >= this._bufferSize) {
      const float32 = new Float32Array(this._buffer);
      this._buffer = [];
      this.port.postMessage({ audio: float32 });
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

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

/**
 * Down-sample an AudioBuffer to the target sample-rate using an
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

// ── main class ───────────────────────────────────────────────────
export class GeminiLiveSession {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private session: any = null;
    private playbackCtx: AudioContext | null = null;
    private micCtx: AudioContext | null = null;
    private micStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private scriptNode: ScriptProcessorNode | null = null;
    private callbacks: GeminiLiveCallbacks;
    private audioQueue: Float32Array[] = [];
    private isPlayingAudio = false;
    private _state: LiveSessionState = 'idle';
    private _alive = false;
    private modelTranscriptBuffer = '';
    private userTranscriptBuffer = '';
    private _playbackLoopRunning = false;
    private _nextPlayTime = 0;

    constructor(callbacks: GeminiLiveCallbacks) {
        this.callbacks = callbacks;
    }

    get state(): LiveSessionState {
        return this._state;
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

        try {
            const ai = new GoogleGenAI({ apiKey });

            const config = {
                responseModalities: [Modality.AUDIO],
                systemInstruction: MIMI_SYSTEM_INSTRUCTION,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
                // Enable transcriptions for both sides
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Automatic Voice Activity Detection — key for natural conversations
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        disabled: false,
                        startOfSpeechSensitivity:
                            StartSensitivity.START_SENSITIVITY_LOW,
                        endOfSpeechSensitivity:
                            EndSensitivity.END_SENSITIVITY_HIGH,
                        prefixPaddingMs: 300,
                        silenceDurationMs: 1000,
                    },
                },
            };

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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onmessage: (message: any) => this.handleMessage(message),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onerror: (e: any) => {
                        console.error('[GeminiLive] error', e);
                        this._alive = false;
                        this.stopMicCapture();
                        this._state = 'error';
                        this.callbacks.onError?.(e?.message || 'Connection error');
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onclose: (e: any) => {
                        console.log('[GeminiLive] closed', e?.reason);
                        this._alive = false;
                        this.stopMicCapture();
                        this._state = 'disconnected';
                        this.callbacks.onDisconnected?.(e?.reason);
                    },
                },
            });

            // Start the playback loop (runs for the lifetime of the session)
            this.startPlaybackLoop();

            // Start mic capture
            await this.startMicCapture();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Failed to connect';
            console.error('[GeminiLive] connect failed', err);
            this._state = 'error';
            this.callbacks.onError?.(msg);
            throw err;
        }
    }

    // ── incoming messages ────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleMessage(message: any): void {
        const sc = message?.serverContent;
        if (!sc) return;

        // Interrupted by user — flush audio instantly
        if (sc.interrupted) {
            this.audioQueue.length = 0;
            this.isPlayingAudio = false;
            this._nextPlayTime = 0;
            this._state = 'listening';
            this.callbacks.onInterrupted?.();
            return;
        }

        // Model audio data → push to queue (playback loop drains it)
        if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                    const float32 = pcm16Base64ToFloat32(part.inlineData.data);
                    this.audioQueue.push(float32);
                    if (!this.isPlayingAudio) {
                        this._state = 'modelSpeaking';
                        this.callbacks.onModelAudioStart?.();
                        this.isPlayingAudio = true;
                    }
                }
            }
        }

        // Output transcription (model's words)
        if (sc.outputTranscription?.text) {
            this.modelTranscriptBuffer += sc.outputTranscription.text;
        }

        // Input transcription (user's words)
        if (sc.inputTranscription?.text) {
            this.userTranscriptBuffer += sc.inputTranscription.text;
        }

        // Turn complete — flush transcription buffers
        if (sc.turnComplete) {
            if (this.userTranscriptBuffer.trim()) {
                this.callbacks.onUserTranscript?.(
                    this.userTranscriptBuffer.trim(),
                );
                this.userTranscriptBuffer = '';
            }
            if (this.modelTranscriptBuffer.trim()) {
                this.callbacks.onModelTranscript?.(
                    this.modelTranscriptBuffer.trim(),
                );
                this.modelTranscriptBuffer = '';
            }
        }
    }

    // ── text input ─────────────────────────────────────────────
    sendText(text: string): void {
        if (!this.session || !this._alive) return;
        try {
            this.session.sendClientContent({
                turns: text,
                turnComplete: true,
            });
        } catch {
            // session may have closed
        }
    }

    // ── mic capture ─────────────────────────────────────────────
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

            // Try AudioWorklet first (off-main-thread, best performance)
            const useWorklet = await this.tryAudioWorklet(source);

            if (!useWorklet) {
                // Fallback to ScriptProcessorNode
                this.setupScriptProcessor(source);
            }

            this._state = 'listening';
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : 'Microphone access denied';
            console.error('[GeminiLive] mic error', err);
            this.callbacks.onError?.(msg);
        }
    }

    /** Register and connect AudioWorkletNode. Returns true on success. */
    private async tryAudioWorklet(
        source: MediaStreamAudioSourceNode,
    ): Promise<boolean> {
        if (!this.micCtx || !('audioWorklet' in this.micCtx)) return false;

        try {
            const blob = new Blob([WORKLET_PROCESSOR_CODE], {
                type: 'application/javascript',
            });
            const url = URL.createObjectURL(blob);
            await this.micCtx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            this.workletNode = new AudioWorkletNode(
                this.micCtx,
                'pcm-capture-processor',
            );

            this.workletNode.port.onmessage = async (e) => {
                if (!this._alive || !this.session) return;

                let pcmData: Float32Array = e.data.audio;

                // Downsample if AudioContext rate differs from 16kHz
                if (this.micCtx && this.micCtx.sampleRate !== INPUT_SAMPLE_RATE) {
                    pcmData = await downsample(
                        pcmData,
                        this.micCtx.sampleRate,
                        INPUT_SAMPLE_RATE,
                    );
                }

                if (!this._alive) return;

                const base64 = float32ToPcm16Base64(pcmData);
                try {
                    this.session.sendRealtimeInput({
                        audio: {
                            data: base64,
                            mimeType: 'audio/pcm;rate=16000',
                        },
                    });
                } catch {
                    // session closed
                }
            };

            source.connect(this.workletNode);
            // AudioWorklet doesn't need to connect to destination
            this.workletNode.connect(this.micCtx.destination);

            console.log('[GeminiLive] Using AudioWorkletNode (off-main-thread)');
            return true;
        } catch (err) {
            console.warn(
                '[GeminiLive] AudioWorklet failed, falling back to ScriptProcessor',
                err,
            );
            return false;
        }
    }

    /** Fallback: ScriptProcessorNode for mic capture. */
    private setupScriptProcessor(source: MediaStreamAudioSourceNode): void {
        if (!this.micCtx) return;

        const processor = this.micCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = async (e) => {
            if (!this._alive || !this.session) return;

            const inputData = e.inputBuffer.getChannelData(0);
            let pcmData: Float32Array;

            if (this.micCtx!.sampleRate !== INPUT_SAMPLE_RATE) {
                pcmData = await downsample(
                    inputData,
                    this.micCtx!.sampleRate,
                    INPUT_SAMPLE_RATE,
                );
            } else {
                pcmData = new Float32Array(inputData);
            }

            if (!this._alive) return;

            const base64 = float32ToPcm16Base64(pcmData);
            try {
                this.session.sendRealtimeInput({
                    audio: {
                        data: base64,
                        mimeType: 'audio/pcm;rate=16000',
                    },
                });
            } catch {
                // session closed
            }
        };

        source.connect(processor);
        processor.connect(this.micCtx.destination);
        this.scriptNode = processor;

        console.log('[GeminiLive] Using ScriptProcessorNode (fallback)');
    }

    // ── audio playback loop (decoupled from message handler) ────
    /**
     * Continuously drains audioQueue and schedules chunks for seamless
     * playback via Web Audio. Runs for the lifetime of the session.
     *
     * This is the official pattern from the Gemini Live docs —
     * separating message ingestion from audio playback avoids
     * blocking and produces smooth, gap-free output.
     */
    private startPlaybackLoop(): void {
        if (this._playbackLoopRunning) return;
        this._playbackLoopRunning = true;

        const loop = async () => {
            // Create a dedicated playback context at 24kHz
            if (!this.playbackCtx) {
                this.playbackCtx = new AudioContext({
                    sampleRate: OUTPUT_SAMPLE_RATE,
                });
            }

            while (this._alive || this.audioQueue.length > 0) {
                if (this.audioQueue.length === 0) {
                    // Nothing to play — mark idle
                    if (this.isPlayingAudio) {
                        this.isPlayingAudio = false;
                        this._state = 'listening';
                        this.callbacks.onModelAudioEnd?.();
                    }
                    // Poll every 50ms
                    await new Promise((r) => setTimeout(r, 50));
                    continue;
                }

                const chunk = this.audioQueue.shift()!;

                // Create buffer at output rate
                const buffer = this.playbackCtx.createBuffer(
                    1,
                    chunk.length,
                    OUTPUT_SAMPLE_RATE,
                );
                buffer.getChannelData(0).set(chunk);

                const src = this.playbackCtx.createBufferSource();
                src.buffer = buffer;
                src.connect(this.playbackCtx.destination);

                // Schedule seamlessly — use currentTime or nextPlayTime
                const now = this.playbackCtx.currentTime;
                const startAt = Math.max(now, this._nextPlayTime);
                src.start(startAt);
                this._nextPlayTime = startAt + buffer.duration;

                // Wait for this chunk to finish before checking queue again
                const waitMs = (this._nextPlayTime - now) * 1000;
                if (waitMs > 0) {
                    await new Promise((r) => setTimeout(r, waitMs));
                }
            }

            this._playbackLoopRunning = false;
            if (this.isPlayingAudio) {
                this.isPlayingAudio = false;
                this._state = 'listening';
                this.callbacks.onModelAudioEnd?.();
            }
        };

        loop().catch((err) => {
            console.error('[GeminiLive] playback loop error', err);
            this._playbackLoopRunning = false;
        });
    }

    // ── stop mic ───────────────────────────────────────────────
    private stopMicCapture(): void {
        try {
            // Send audioStreamEnd to flush cached audio on API side
            if (this.session && this._alive) {
                try {
                    this.session.sendRealtimeInput({ audioStreamEnd: true });
                } catch {
                    // best effort
                }
            }

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
            if (this.micCtx) {
                this.micCtx.close().catch(() => { });
                this.micCtx = null;
            }
        } catch {
            // best effort
        }
    }

    // ── disconnect ─────────────────────────────────────────────
    disconnect(): void {
        this._alive = false;
        this.stopMicCapture();
        try {
            if (this.playbackCtx) {
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
        this.isPlayingAudio = false;
        this._nextPlayTime = 0;
        this._state = 'idle';
    }
}
