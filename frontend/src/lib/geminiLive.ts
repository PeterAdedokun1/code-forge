/**
 * Gemini Live API — Real-time bi-directional voice streaming
 *
 * Uses the @google/genai SDK to open a WebSocket session with
 * Gemini's Live API. Streams raw PCM audio from the microphone,
 * receives audio chunks back, and plays them through a Web Audio
 * AudioContext. Also captures input/output transcriptions for
 * the risk engine and chat display.
 *
 * Falls back gracefully when offline or when the API key is missing.
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
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
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

/**
 * Convert a Float32Array (–1…+1) to 16-bit PCM encoded as base-64.
 */
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

/**
 * Decode base-64 PCM16 → Float32Array for Web Audio playback.
 */
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
    private session: any = null;
    private audioCtx: AudioContext | null = null;
    private micStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | ScriptProcessorNode | null = null;
    private callbacks: GeminiLiveCallbacks;
    private audioQueue: Float32Array[] = [];
    private isPlayingAudio = false;
    private _state: LiveSessionState = 'idle';
    private _alive = false;  // true only while WS is open
    private modelTranscriptBuffer = '';
    private userTranscriptBuffer = '';

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
                inputAudioTranscription: {},
                outputAudioTranscription: {},
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
                    onmessage: (message: any) => this.handleMessage(message),
                    onerror: (e: any) => {
                        console.error('[GeminiLive] error', e);
                        this._alive = false;
                        this.stopMicCapture();
                        this._state = 'error';
                        this.callbacks.onError?.(e?.message || 'Connection error');
                    },
                    onclose: (e: any) => {
                        console.log('[GeminiLive] closed', e?.reason);
                        this._alive = false;
                        this.stopMicCapture();
                        this._state = 'disconnected';
                        this.callbacks.onDisconnected?.(e?.reason);
                    },
                },
            });

            // Start mic capture
            await this.startMicCapture();
        } catch (err: any) {
            console.error('[GeminiLive] connect failed', err);
            this._state = 'error';
            this.callbacks.onError?.(err?.message || 'Failed to connect');
            throw err;
        }
    }

    // ── incoming messages ────────────────────────────────────────
    private handleMessage(message: any): void {
        const sc = message?.serverContent;
        if (!sc) return;

        // Interrupted by user
        if (sc.interrupted) {
            this.audioQueue = [];
            this.isPlayingAudio = false;
            this._state = 'listening';
            this.callbacks.onInterrupted?.();
            return;
        }

        // Model audio data
        if (sc.modelTurn?.parts) {
            for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                    const float32 = pcm16Base64ToFloat32(part.inlineData.data);
                    this.audioQueue.push(float32);
                    if (!this.isPlayingAudio) {
                        this._state = 'modelSpeaking';
                        this.callbacks.onModelAudioStart?.();
                        this.playAudioQueue();
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
            if (this.modelTranscriptBuffer.trim()) {
                this.callbacks.onModelTranscript?.(this.modelTranscriptBuffer.trim());
            }
            if (this.userTranscriptBuffer.trim()) {
                this.callbacks.onUserTranscript?.(this.userTranscriptBuffer.trim());
            }
            this.modelTranscriptBuffer = '';
            this.userTranscriptBuffer = '';
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

            this.audioCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            const source = this.audioCtx.createMediaStreamSource(this.micStream);

            // Use ScriptProcessorNode (wide compat, fine for demo)
            const processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = async (e) => {
                // Guard: only send if the WS is still alive
                if (!this._alive || !this.session || this._state === 'modelSpeaking') return;
                const inputData = e.inputBuffer.getChannelData(0);

                // Downsample to 16 kHz if needed
                let pcmData: Float32Array;
                if (this.audioCtx!.sampleRate !== INPUT_SAMPLE_RATE) {
                    pcmData = await downsample(
                        inputData,
                        this.audioCtx!.sampleRate,
                        INPUT_SAMPLE_RATE,
                    );
                } else {
                    pcmData = new Float32Array(inputData);
                }

                // Double-check alive after potential async downsample
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
                    // session closed between the check and the send — ignore
                }
            };

            source.connect(processor);
            processor.connect(this.audioCtx.destination); // must connect for onaudioprocess to fire
            this.workletNode = processor;
            this._state = 'listening';
        } catch (err: any) {
            console.error('[GeminiLive] mic error', err);
            this.callbacks.onError?.('Microphone access denied');
        }
    }

    // ── audio playback via Web Audio ─────────────────────────────
    private async playAudioQueue(): Promise<void> {
        this.isPlayingAudio = true;

        if (!this.audioCtx) {
            this.audioCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        }

        while (this.audioQueue.length > 0) {
            const chunk = this.audioQueue.shift()!;

            // Create buffer at output rate
            const buffer = this.audioCtx.createBuffer(
                1,
                chunk.length,
                OUTPUT_SAMPLE_RATE,
            );
            buffer.getChannelData(0).set(chunk);

            const src = this.audioCtx.createBufferSource();
            src.buffer = buffer;
            src.connect(this.audioCtx.destination);
            src.start();

            // Wait for chunk to finish playing
            await new Promise<void>((resolve) => {
                src.onended = () => resolve();
                // Safety timeout in case onended doesn't fire
                setTimeout(resolve, (chunk.length / OUTPUT_SAMPLE_RATE) * 1000 + 50);
            });
        }

        this.isPlayingAudio = false;
        this._state = 'listening';
        this.callbacks.onModelAudioEnd?.();
    }

    // ── stop mic (without tearing down the whole session) ────────
    private stopMicCapture(): void {
        try {
            if (this.workletNode) {
                this.workletNode.disconnect();
                this.workletNode = null;
            }
            if (this.micStream) {
                this.micStream.getTracks().forEach((t) => t.stop());
                this.micStream = null;
            }
        } catch {
            // best effort
        }
    }

    // ── disconnect ───────────────────────────────────────────────
    disconnect(): void {
        this._alive = false;
        this.stopMicCapture();
        try {
            if (this.audioCtx) {
                this.audioCtx.close().catch(() => { });
                this.audioCtx = null;
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
        this._state = 'idle';
    }
}
