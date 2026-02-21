import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, X, AlertCircle, MessageSquare, Loader2,
} from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNewAlert?: (patientData: any) => void;
}

// ── helpers ──────────────────────────────────────────────────────
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
  const [showChat, setShowChat] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [liveConnected, setLiveConnected] = useState(false);
  const [statusText, setStatusText] = useState('Tap the microphone to talk to MIMI');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationTextRef = useRef<string>('');
  const hasGreetedRef = useRef(false);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);

  // Web Speech API fallback recorder
  const {
    transcript, isSupported, startRecording, stopRecording, resetRecording,
  } = useVoiceRecorder();

  const userName = getMemory()?.userName || 'Amina';

  /* ── online / offline tracking ──────────────────────────────── */
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => {
      setIsOnline(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
        liveSessionRef.current = null;
        setLiveConnected(false);
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

  /* ── greeting on first load ─────────────────────────────────── */
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
    }
  }, [messages.length]);

  /* ── auto-scroll ────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── risk helper ────────────────────────────────────────────── */
  const runRiskEngine = useCallback((text: string) => {
    conversationTextRef.current += ' ' + text;
    const result = assessRisk(conversationTextRef.current, 32);
    setCurrentRisk(result);
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
        setStatusText('Listening — speak naturally');
        // Seed with context
        const memory = getMemory();
        if (memory && memory.entries.length > 0 && memory.lastSymptoms.length > 0) {
          const context = `The patient previously reported: ${memory.lastSymptoms.join(', ')}. Follow up on these.`;
          liveSessionRef.current?.sendText(
            `[Context] ${context} Now greet the patient warmly.`,
          );
        }
      },
      onDisconnected: (reason) => {
        console.log('[Live] disconnected:', reason);
        setLiveConnected(false);
        setInterfaceState('idle');
        setStatusText('Disconnected — tap mic to reconnect');
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
        const memory = getMemory();
        if (memory && memory.entries.length > 0) {
          memory.entries[memory.entries.length - 1].mimiResponse = text;
        }
      },
      onModelAudioStart: () => {
        setInterfaceState('speaking');
        setStatusText('MIMI is speaking...');
      },
      onModelAudioEnd: () => {
        setInterfaceState('live');
        setStatusText('Listening — speak naturally');
      },
      onInterrupted: () => {
        setInterfaceState('live');
        setStatusText('Listening — speak naturally');
      },
      onError: (err) => {
        console.error('[Live] error:', err);
        setInterfaceState('idle');
        setLiveConnected(false);
        setStatusText('Connection error — tap mic to retry');
      },
    };

    const session = new GeminiLiveSession(callbacks);
    liveSessionRef.current = session;

    try {
      setInterfaceState('processing');
      setStatusText('Connecting to MIMI...');
      await session.connect();
    } catch {
      liveSessionRef.current = null;
      setInterfaceState('idle');
      setStatusText('Could not connect — tap mic to retry');
    }
  }, [runRiskEngine]);

  const stopLive = useCallback(() => {
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setLiveConnected(false);
    setInterfaceState('idle');
    setStatusText('Tap the microphone to talk to MIMI');
  }, []);

  /* ══════════════════════════════════════════════════════════════
     OFFLINE / FALLBACK MODE
     ═══════════════════════════════════════════════════════════ */
  const processMessageOffline = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    setMessages((prev) => [...prev, {
      id: `user_${Date.now()}`, role: 'user',
      content: userText, timestamp: new Date(),
    }]);

    const riskResult = runRiskEngine(userText);
    setInterfaceState('processing');
    setStatusText('MIMI is thinking...');

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

    setInterfaceState('speaking');
    setStatusText('MIMI is speaking...');
    speakResponse(mimiText, () => {
      setInterfaceState('idle');
      setStatusText('Tap the microphone to talk to MIMI');
    });
  }, [messages, runRiskEngine]);

  /* ── mic button handler ─────────────────────────────────────── */
  const handleMicrophoneClick = async () => {
    // If Gemini Live is available and we're online, always use Live mode
    if (GeminiLiveSession.isAvailable()) {
      if (liveConnected) {
        stopLive();
      } else {
        await startLive();
      }
      return;
    }

    // Offline / fallback mode
    if (!isSupported) {
      alert('Voice recording is not supported in your browser.');
      return;
    }

    if (interfaceState === 'listening') {
      setInterfaceState('processing');
      await stopRecording();
      if (transcript) await processMessageOffline(transcript);
      else {
        setInterfaceState('idle');
        setStatusText('Tap the microphone to talk to MIMI');
      }
      resetRecording();
    } else {
      setInterfaceState('listening');
      setStatusText('Listening...');
      await startRecording();
    }
  };

  /* ── text input (chat view) ─────────────────────────────────── */
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');

    if (liveConnected && liveSessionRef.current) {
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
    setShowChat(false);
    conversationTextRef.current = '';
    hasGreetedRef.current = false;
    setStatusText('Tap the microphone to talk to MIMI');
    localStorage.removeItem('mimi_latest_risk');
    localStorage.removeItem('mimi_chew_alerts');
  };

  /* ── cleanup ────────────────────────────────────────────────── */
  useEffect(() => {
    return () => { liveSessionRef.current?.disconnect(); };
  }, []);

  /* ── derived state ──────────────────────────────────────────── */
  const orbClass =
    interfaceState === 'speaking' ? 'orb-speaking' :
      interfaceState === 'listening' || interfaceState === 'live' || liveConnected ? 'orb-listening' :
        'orb-idle';

  const isActive = liveConnected || interfaceState === 'listening' || interfaceState === 'live';
  const greeting = `${getTimeGreeting()}, ${userName}`;

  /* ── JSX ────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a0a0a] via-[#1a0a14] to-[#0a0a0a] relative overflow-hidden">

      {/* ── CHAT VIEW (overlay) ────────────────────────────────── */}
      {showChat && (
        <div className="absolute inset-0 z-30 flex flex-col bg-[#0a0a0a]/95 backdrop-blur-sm">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-white font-semibold text-lg">Conversation</h2>
            <button
              onClick={() => setShowChat(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-pink-600/80 text-white'
                    : 'bg-white/10 text-white/90 border border-white/10'
                  }`}>
                  {message.role === 'assistant' && (
                    <span className="text-xs font-semibold text-pink-400 block mb-1">MIMI</span>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-pink-200' : 'text-white/40'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                disabled={interfaceState === 'processing'}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || interfaceState === 'processing'}
                className="px-5 py-3 bg-pink-600 text-white rounded-xl text-sm font-medium hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Send</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MAIN ORB VIEW ──────────────────────────────────────── */}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 z-10">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-red-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-white/80 text-sm font-semibold tracking-wide">
            MIMI LIVE
          </span>
        </div>
        <button
          onClick={() => setShowChat(true)}
          className="text-white/60 hover:text-white transition-colors p-2"
        >
          <MessageSquare className="w-5 h-5" />
          {messages.length > 1 && (
            <span className="absolute -mt-5 ml-3 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Greeting text */}
      <div className="px-6 pt-4 z-10">
        <h1 className="text-white text-3xl font-bold leading-tight">
          {greeting}
        </h1>
        <p className="text-white/40 text-sm mt-1.5">
          {statusText}
        </p>
      </div>

      {/* Risk banner (small, overlaid) */}
      {currentRisk && currentRisk.detectedSymptoms.length > 0 && (
        <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className={`w-4 h-4 ${currentRisk.level === 'high' ? 'text-red-400' :
                  currentRisk.level === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                }`} />
              <span className="text-white/80 text-xs font-medium">
                Risk: {currentRisk.score}/100 ({currentRisk.level})
              </span>
            </div>
            <span className="text-white/40 text-xs">
              {currentRisk.detectedSymptoms.length} symptom{currentRisk.detectedSymptoms.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Animated Orb ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center z-0 -mt-4">
        <div className="relative">
          {/* Outer glow */}
          <div
            className={`w-56 h-56 rounded-full ${orbClass}`}
            style={{
              background: 'radial-gradient(circle at 40% 35%, #e91e63, #b91c47 40%, #880e4f 65%, #4a0029 90%)',
              filter: 'blur(2px)',
              boxShadow: '0 0 60px 20px rgba(233, 30, 99, 0.25), 0 0 120px 50px rgba(233, 30, 99, 0.1)',
            }}
          />
          {/* Inner highlight */}
          <div
            className="absolute inset-0 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }}
          />
        </div>
      </div>

      {/* ── Bottom controls ───────────────────────────────────── */}
      <div className="flex items-center justify-center space-x-8 pb-8 pt-4 z-10">
        {/* X / Reset button */}
        <button
          onClick={handleReset}
          className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all active:scale-95"
          title="Reset conversation"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Mic button */}
        <button
          onClick={handleMicrophoneClick}
          disabled={interfaceState === 'processing'}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isActive
              ? 'bg-white text-pink-600 mic-pulse'
              : interfaceState === 'processing'
                ? 'bg-white/80 text-pink-400'
                : 'bg-white text-pink-600 hover:shadow-lg hover:shadow-white/20'
            }`}
        >
          {interfaceState === 'processing' ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>

        {/* Alert / Info button */}
        <button
          onClick={() => {
            if (currentRisk) {
              setShowChat(true);
            }
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${currentRisk && currentRisk.level === 'high'
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
            }`}
          title="View alerts"
        >
          <AlertCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-yellow-600/90 text-white text-xs font-medium px-4 py-1.5 rounded-full z-20">
          📴 Offline — using local AI
        </div>
      )}
    </div>
  );
};
