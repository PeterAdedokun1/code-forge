import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Loader2, Volume2, AlertTriangle,
  Shield, Heart, RotateCcw, Wifi, WifiOff, Radio,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { VoiceVisualizer } from './VoiceVisualizer';
import { getMimiResponse, speakResponse, preloadVoices } from '../lib/mimiBrain';
import { assessRisk, type RiskAssessmentResult } from '../lib/riskEngine';
import {
  getContextGreeting, addMemoryEntry,
  initializeMemory, clearMemory, getMemory,
} from '../lib/memory';
import { GeminiLiveSession, type GeminiLiveCallbacks } from '../lib/geminiLive';

// ── types ────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceInterfaceProps {
  onRiskUpdate?: (result: RiskAssessmentResult) => void;
  onNewAlert?: (patientData: any) => void;
}

// ── component ────────────────────────────────────────────────────
export const VoiceInterface = ({
  onRiskUpdate,
  onNewAlert,
}: VoiceInterfaceProps) => {
  /* ── state ──────────────────────────────────────────────────── */
  const [interfaceState, setInterfaceState] = useState<
    'idle' | 'listening' | 'processing' | 'speaking' | 'live'
  >('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRisk, setCurrentRisk] = useState<RiskAssessmentResult | null>(null);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [useLiveMode, setUseLiveMode] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationTextRef = useRef<string>('');
  const hasGreetedRef = useRef(false);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);

  // Web Speech API fallback recorder
  const {
    isRecording, recordingState, audioLevel, transcript,
    error, isSupported, startRecording, stopRecording, resetRecording,
  } = useVoiceRecorder();

  /* ── online / offline tracking ──────────────────────────────── */
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => {
      setIsOnline(false);
      // Disconnect live session if we go offline
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
        liveSessionRef.current = null;
        setLiveConnected(false);
        setUseLiveMode(false);
      }
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ── init memory + voices ───────────────────────────────────── */
  useEffect(() => {
    initializeMemory();
    preloadVoices();
  }, []);

  /* ── context-aware greeting on first load ───────────────────── */
  useEffect(() => {
    if (!hasGreetedRef.current && messages.length === 0) {
      hasGreetedRef.current = true;
      const greeting = getContextGreeting();
      const memory = getMemory();

      setMessages([{
        id: 'greeting', role: 'assistant',
        content: greeting, timestamp: new Date(),
      }]);

      if (memory && memory.lastRiskScore > 0) {
        setCurrentRisk({
          score: memory.lastRiskScore,
          level: memory.lastRiskLevel,
          detectedSymptoms: [],
          recommendations: [],
          escalationRequired: memory.lastRiskLevel === 'high',
          riskFactors: memory.lastSymptoms,
        });
      }

      if (ttsEnabled && !useLiveMode) {
        setTimeout(() => {
          setInterfaceState('speaking');
          speakResponse(greeting, () => setInterfaceState('idle'));
        }, 500);
      }
    }
  }, [messages.length, ttsEnabled, useLiveMode]);

  /* ── auto-scroll ────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── risk helper (shared by both modes) ─────────────────────── */
  const runRiskEngine = useCallback((text: string) => {
    conversationTextRef.current += ' ' + text;
    const result = assessRisk(conversationTextRef.current, 32);
    setCurrentRisk(result);
    if (result.detectedSymptoms.length > 0) setShowRiskPanel(true);
    onRiskUpdate?.(result);

    if (result.escalationRequired) {
      const mem = getMemory();
      onNewAlert?.({
        patientName: mem?.userName || 'Patient',
        riskScore: result.score,
        riskLevel: result.level,
        symptoms: result.detectedSymptoms.map((s) => s.symptom),
        riskType: result.riskFactors[0] || 'Unknown',
      });
      const alertData = {
        timestamp: new Date().toISOString(),
        riskScore: result.score,
        riskLevel: result.level,
        symptoms: result.detectedSymptoms.map((s) => s.symptom),
        escalation: true,
        patientName: mem?.userName || 'Current Patient',
        id: `live_alert_${Date.now()}`,
      };
      const existing = JSON.parse(localStorage.getItem('mimi_chew_alerts') || '[]');
      existing.push(alertData);
      localStorage.setItem('mimi_chew_alerts', JSON.stringify(existing));
    }

    localStorage.setItem('mimi_latest_risk', JSON.stringify({
      timestamp: new Date().toISOString(),
      riskScore: result.score, riskLevel: result.level,
      symptoms: result.detectedSymptoms.map((s) => s.symptom),
      escalation: result.escalationRequired,
      patientName: getMemory()?.userName || 'Current Patient',
    }));
    return result;
  }, [onRiskUpdate, onNewAlert]);

  /* ══════════════════════════════════════════════════════════════
     GEMINI LIVE MODE
     ═══════════════════════════════════════════════════════════ */
  const startLive = useCallback(async () => {
    if (liveSessionRef.current) return;

    const callbacks: GeminiLiveCallbacks = {
      onConnected: () => {
        setLiveConnected(true);
        setInterfaceState('live');
        // Send context greeting to seed the conversation
        const memory = getMemory();
        if (memory && memory.entries.length > 0) {
          const context = memory.lastSymptoms.length > 0
            ? `The patient previously reported: ${memory.lastSymptoms.join(', ')}. Follow up on these.`
            : '';
          if (context) {
            liveSessionRef.current?.sendText(
              `[Context] ${context} Now greet the patient warmly.`
            );
          }
        }
      },
      onDisconnected: (reason) => {
        console.log('[Live] disconnected:', reason);
        setLiveConnected(false);
        setUseLiveMode(false);
        setInterfaceState('idle');
        liveSessionRef.current = null;
      },
      onUserTranscript: (text) => {
        setMessages((prev) => [...prev, {
          id: `u_${Date.now()}`, role: 'user',
          content: text, timestamp: new Date(),
        }]);
        const risk = runRiskEngine(text);
        addMemoryEntry({
          userMessage: text,
          mimiResponse: '',
          detectedSymptoms: risk.detectedSymptoms.map((s) => s.symptom),
          riskScore: risk.score,
          riskLevel: risk.level,
        });
      },
      onModelTranscript: (text) => {
        setMessages((prev) => [...prev, {
          id: `m_${Date.now()}`, role: 'assistant',
          content: text, timestamp: new Date(),
        }]);
        // Update the last memory entry with the model response
        const memory = getMemory();
        if (memory && memory.entries.length > 0) {
          const last = memory.entries[memory.entries.length - 1];
          last.mimiResponse = text;
        }
      },
      onModelAudioStart: () => setInterfaceState('speaking'),
      onModelAudioEnd: () => setInterfaceState('live'),
      onInterrupted: () => setInterfaceState('live'),
      onError: (err) => {
        console.error('[Live] error:', err);
        setInterfaceState('idle');
        setLiveConnected(false);
      },
    };

    const session = new GeminiLiveSession(callbacks);
    liveSessionRef.current = session;

    try {
      setInterfaceState('processing');
      await session.connect();
    } catch {
      liveSessionRef.current = null;
      setUseLiveMode(false);
      setInterfaceState('idle');
    }
  }, [runRiskEngine]);

  const stopLive = useCallback(() => {
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setLiveConnected(false);
    setUseLiveMode(false);
    setInterfaceState('idle');
  }, []);

  /* ══════════════════════════════════════════════════════════════
     OFFLINE / FALLBACK MODE (Web Speech API + local brain)
     ═══════════════════════════════════════════════════════════ */
  const processMessageOffline = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    setMessages((prev) => [...prev, {
      id: `user_${Date.now()}`, role: 'user',
      content: userText, timestamp: new Date(),
    }]);

    const riskResult = runRiskEngine(userText);
    setInterfaceState('processing');

    const history = messages.map((m) => ({
      role: m.role as 'user' | 'assistant', content: m.content,
    }));
    const mimiText = await getMimiResponse(userText, history);

    setMessages((prev) => [...prev, {
      id: `mimi_${Date.now()}`, role: 'assistant',
      content: mimiText, timestamp: new Date(),
    }]);

    addMemoryEntry({
      userMessage: userText, mimiResponse: mimiText,
      detectedSymptoms: riskResult.detectedSymptoms.map((s) => s.symptom),
      riskScore: riskResult.score, riskLevel: riskResult.level,
    });

    if (ttsEnabled) {
      setInterfaceState('speaking');
      speakResponse(mimiText, () => setInterfaceState('idle'));
    } else {
      setInterfaceState('idle');
    }
  }, [messages, runRiskEngine, ttsEnabled]);

  /* ── mic button handler ─────────────────────────────────────── */
  const handleMicrophoneClick = async () => {
    // Live mode toggle
    if (useLiveMode) {
      if (liveConnected) {
        stopLive();
      } else {
        await startLive();
      }
      return;
    }

    // Offline / fallback mode
    if (!isSupported) {
      alert('Voice recording is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (isRecording) {
      setInterfaceState('processing');
      await stopRecording();
      if (transcript) await processMessageOffline(transcript);
      else setInterfaceState('idle');
      resetRecording();
    } else {
      setInterfaceState('listening');
      await startRecording();
    }
  };

  /* ── text input ─────────────────────────────────────────────── */
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');

    if (useLiveMode && liveConnected && liveSessionRef.current) {
      // In live mode, send text through the live session
      setMessages((prev) => [...prev, {
        id: `u_${Date.now()}`, role: 'user',
        content: msg, timestamp: new Date(),
      }]);
      runRiskEngine(msg);
      liveSessionRef.current.sendText(msg);
    } else {
      await processMessageOffline(msg);
    }
  };

  /* ── reset ──────────────────────────────────────────────────── */
  const handleReset = () => {
    stopLive();
    clearMemory();
    setMessages([]);
    setCurrentRisk(null);
    setShowRiskPanel(false);
    conversationTextRef.current = '';
    hasGreetedRef.current = false;
    localStorage.removeItem('mimi_latest_risk');
    localStorage.removeItem('mimi_chew_alerts');
  };

  /* ── cleanup ────────────────────────────────────────────────── */
  useEffect(() => {
    return () => { liveSessionRef.current?.disconnect(); };
  }, []);

  /* ── render helpers ─────────────────────────────────────────── */
  const getButtonContent = () => {
    if (useLiveMode && liveConnected) {
      if (interfaceState === 'speaking') return {
        icon: <Volume2 className="w-10 h-10 animate-pulse" />,
        text: 'MIMI is speaking...',
        color: 'bg-pink-600 shadow-pink-600/50',
      };
      return {
        icon: <Radio className="w-10 h-10 animate-pulse" />,
        text: 'Live — speak anytime',
        color: 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/40',
      };
    }
    if (useLiveMode && !liveConnected) return {
      icon: <Radio className="w-10 h-10" />,
      text: 'Tap to go live with MIMI',
      color: 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/40',
    };
    switch (interfaceState) {
      case 'listening': return {
        icon: <Mic className="w-10 h-10" />,
        text: 'Listening...',
        color: 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/50',
      };
      case 'processing': return {
        icon: <Loader2 className="w-10 h-10 animate-spin" />,
        text: 'MIMI is thinking...',
        color: 'bg-purple-500 shadow-purple-500/50',
      };
      case 'speaking': return {
        icon: <Volume2 className="w-10 h-10 animate-pulse" />,
        text: 'MIMI is speaking...',
        color: 'bg-pink-600 shadow-pink-600/50',
      };
      default: return {
        icon: <MicOff className="w-10 h-10" />,
        text: 'Tap to talk to MIMI',
        color: 'bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/40',
      };
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'from-red-500 to-red-600';
      case 'medium': return 'from-yellow-500 to-orange-500';
      default: return 'from-green-500 to-emerald-500';
    }
  };
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Shield className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  const btn = getButtonContent();
  const isPulsing = interfaceState === 'listening' || (useLiveMode && liveConnected);

  /* ── JSX ────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">

      {/* ── online / offline badge ───────────────────────────── */}
      <div className={`px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center space-x-1.5
        ${isOnline ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
        {isOnline
          ? <><Wifi className="w-3.5 h-3.5" /><span>Online{useLiveMode && liveConnected ? ' • Gemini Live Active' : ''}</span></>
          : <><WifiOff className="w-3.5 h-3.5" /><span>Offline Mode — responses from local AI</span></>}
      </div>

      {/* ── risk banner ──────────────────────────────────────── */}
      {currentRisk && currentRisk.detectedSymptoms.length > 0 && (
        <div
          className={`bg-gradient-to-r ${getRiskColor(currentRisk.level)} text-white px-4 py-3 cursor-pointer transition-all`}
          onClick={() => setShowRiskPanel(!showRiskPanel)}
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center space-x-2">
              {getRiskIcon(currentRisk.level)}
              <span className="font-semibold text-sm">
                Risk Score: {currentRisk.score}/100 ({currentRisk.level.toUpperCase()})
              </span>
            </div>
            <span className="text-xs opacity-80">
              {currentRisk.detectedSymptoms.length} symptom{currentRisk.detectedSymptoms.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── risk detail panel ─────────────────────────────────── */}
      {showRiskPanel && currentRisk && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 max-h-48 overflow-y-auto">
          <div className="max-w-lg mx-auto">
            <h3 className="font-bold text-gray-800 text-sm mb-2">Detected Symptoms</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {currentRisk.detectedSymptoms.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${s.severity === 'severe' ? 'bg-red-100 text-red-700'
                    : s.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>{s.symptom}</span>
              ))}
            </div>
            {currentRisk.recommendations.length > 0 && (
              <>
                <h3 className="font-bold text-gray-800 text-sm mb-2">Recommendations</h3>
                <ul className="space-y-1">
                  {currentRisk.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="text-xs text-gray-700">• {rec}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── chat messages ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center shadow-xl shadow-pink-500/30">
              <Heart className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to MIMI</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your caring maternal health companion. Tap the microphone to start talking, or type below.
            </p>
            {isOnline && GeminiLiveSession.isAvailable() && (
              <p className="text-green-600 text-sm mt-3 font-medium">
                🟢 Gemini Live available — toggle Live Mode for real-time voice
              </p>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                : 'bg-white text-gray-800 shadow-lg shadow-gray-200/50 border border-gray-100'
              }`}>
              {message.role === 'assistant' && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Heart className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-pink-600">MIMI</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-pink-100' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── input area ────────────────────────────────────────── */}
      <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-md">
        {/* Visualizer (offline mode only) */}
        {interfaceState === 'listening' && !useLiveMode && (
          <div className="px-4 py-3">
            <VoiceVisualizer
              isRecording={isRecording}
              audioLevel={audioLevel}
              width={Math.min(window.innerWidth - 32, 500)}
              height={50}
            />
            {transcript && (
              <div className="mt-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
                <p className="text-sm text-gray-700 italic">"{transcript}"</p>
              </div>
            )}
          </div>
        )}

        {/* Live mode pulsing indicator */}
        {useLiveMode && liveConnected && (
          <div className="px-4 py-3 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-sm text-green-700 font-medium">
                {interfaceState === 'speaking' ? 'MIMI is speaking — you can interrupt anytime' : 'Listening live — just speak naturally'}
              </span>
            </div>
          </div>
        )}

        {/* Text input */}
        <form onSubmit={handleTextSubmit} className="px-4 pt-2">
          <div className="flex items-center space-x-2 max-w-lg mx-auto">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your message here..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50"
              disabled={interfaceState === 'processing'}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || interfaceState === 'processing'}
              className="px-4 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >Send</button>
          </div>
        </form>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center py-5 px-4">
          <div className="flex items-center space-x-4">
            {/* TTS toggle (offline mode) */}
            {!useLiveMode && (
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`p-2 rounded-full transition-colors ${ttsEnabled ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'
                  }`}
                title={ttsEnabled ? 'Voice On' : 'Voice Off'}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}

            {/* MAIN BUTTON */}
            <button
              onClick={handleMicrophoneClick}
              disabled={interfaceState === 'processing'}
              className={`${btn.color} ${isPulsing ? 'animate-pulse' : ''}
                w-24 h-24 rounded-full shadow-2xl flex items-center justify-center
                text-white transition-all duration-300 transform hover:scale-105
                active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >{btn.icon}</button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-2 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset Conversation"
            ><RotateCcw className="w-5 h-5" /></button>
          </div>

          <p className="mt-3 text-xs font-medium text-gray-500">{btn.text}</p>

          {recordingState === 'recording' && !useLiveMode && (
            <p className="mt-1 text-xs text-pink-500 animate-pulse">Tap again to send</p>
          )}

          {/* Live Mode toggle */}
          {GeminiLiveSession.isAvailable() && (
            <button
              onClick={() => {
                if (useLiveMode) { stopLive(); }
                setUseLiveMode(!useLiveMode);
              }}
              className={`mt-3 text-xs font-semibold px-4 py-1.5 rounded-full transition-all ${useLiveMode
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {useLiveMode ? '🟢 Live Mode ON' : '⚡ Enable Live Mode'}
            </button>
          )}

          {!isOnline && (
            <p className="mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              📴 Offline — using local AI brain
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
