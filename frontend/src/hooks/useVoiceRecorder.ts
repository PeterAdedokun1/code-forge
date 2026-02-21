import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'inactive' | 'recording' | 'paused' | 'processing';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingState: RecordingState;
  audioLevel: number;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

/**
 * Custom hook for voice recording using MediaRecorder API and Web Speech API
 *
 * Features:
 * - Records audio from microphone
 * - Real-time audio level monitoring
 * - Speech-to-text transcription (if supported)
 * - Pause/resume functionality
 * - Browser support detection
 *
 * @returns {UseVoiceRecorderReturn} Voice recorder controls and state
 */
export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported = !!(
    navigator.mediaDevices &&
    'getUserMedia' in navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined'
  );

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalized = Math.min(average / 128, 1);

    setAudioLevel(normalized);

    if (recordingState === 'recording') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [recordingState]);

  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (err) {
      console.error('Error setting up audio analyser:', err);
    }
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(prev => {
          const newTranscript = prev + finalTranscript;
          return interimTranscript ? newTranscript + interimTranscript : newTranscript;
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Error setting up speech recognition:', err);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      setupAudioAnalyser(stream);
      setupSpeechRecognition();

      mediaRecorder.start(100);
      setRecordingState('recording');

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      updateAudioLevel();
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording. Please check microphone permissions.');
      setRecordingState('inactive');
    }
  }, [isSupported, setupAudioAnalyser, setupSpeechRecognition, updateAudioLevel]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || recordingState === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm'
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (err) {
            console.error('Error stopping recognition:', err);
          }
        }

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        setRecordingState('inactive');
        setAudioLevel(0);

        resolve(audioBlob);
      };

      setRecordingState('processing');
      mediaRecorderRef.current.stop();
    });
  }, [recordingState]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error pausing recognition:', err);
        }
      }
    }
  }, [recordingState]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('Error resuming recognition:', err);
        }
      }

      updateAudioLevel();
    }
  }, [recordingState, updateAudioLevel]);

  const resetRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    audioChunksRef.current = [];
    setRecordingState('inactive');
    setAudioLevel(0);
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isRecording: recordingState === 'recording',
    isPaused: recordingState === 'paused',
    recordingState,
    audioLevel,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
};
