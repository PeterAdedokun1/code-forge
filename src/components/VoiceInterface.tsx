import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, X, AlertCircle, MessageSquare,
  Loader2, Heart,
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
  onNewAlert?: (patientData: any) => void;
}

/** Get time-of-day greeting */
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── component ────────────────────────────────────────────────────
export const VoiceInterface = ({
  onRiskUpdate,
  onNewAlert,
}: VoiceInterfaceProps) => {

  /* ── state ──────────────────────────────────────────────────── */
  const [interfaceState, setInterfaceState] = useState<
    'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'
  >('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRisk, setCurrentRisk] = useState<RiskAssessmentResult | null>(null);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [ttsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showChat, setShowChat] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusText, setStatusText] = useState('Tap the microphone to talk to MIMI');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationTextRef = useRef<string>('');
  const hasGreetedRef = useRef(false);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);

  // Web Speech API fallback recorder
  const {
    transcript, error, isSupported,
    startRecording, stopRecording, resetRecording,
    isRecording,
  } = useVoiceRecorder();

  // Get user's name from memory
  const memory = getMemory();
  const userName = memory?.userName || 'Mama';

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

  /* ── context-aware greeting on first load ───────────────────── */
  useEffect(() => {
    if (!hasGreetedRef.current && messages.length === 0) {
      hasGreetedRef.current = true;
      const greeting = getContextGreeting();

      setMessages([{
        id: 'greeting', role: 'assistant',
        content: greeting, timestamp: new Date(),
      }]);

      const mem = getMemory();
      if (mem && mem.lastRiskScore > 0) {
        setCurrentRisk({
          score: mem.lastRiskScore,
          level: mem.lastRiskLevel,
          detectedSymptoms: [],
          recommendations: [],
          escalationRequired: mem.lastRiskLevel === 'high',
          riskFactors: mem.lastSymptoms,
        });
      }
    }
  }, [messages.length]);

  /* ── auto-scroll chat ───────────────────────────────────────── */
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
        setInterfaceState('listening');
        setStatusText('Listening — speak naturally');
        // Send context to seed the conversation
        const mem = getMemory();
        if (mem && mem.entries.length > 0 && mem.lastSymptoms.length > 0) {
          const context = `The patient previously reported: ${mem.lastSymptoms.join(', ')}. Follow up on these.`;
          liveSessionRef.current?.sendText(
            `[Context] ${context} Now greet the patient warmly.`
          );
        }
      },
      onDisconnected: (reason) => {
        console.log('[Live] disconnected:', reason);
        setLiveConnected(false);
        setInterfaceState('idle');
        setStatusText('Tap the microphone to talk to MIMI');
        setAudioLevel(0);
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
        const mem = getMemory();
        if (mem && mem.entries.length > 0) {
          const last = mem.entries[mem.entries.length - 1];
          last.mimiResponse = text;
        }
      },
      onModelAudioStart: () => {
        setInterfaceState('speaking');
        setStatusText('MIMI is speaking...');
      },
      onModelAudioEnd: () => {
        setInterfaceState('listening');
        setStatusText('Listening — speak naturally');
      },
      onInterrupted: () => {
        setInterfaceState('listening');
        setStatusText('Listening — speak naturally');
      },
      onError: (err) => {
        console.error('[Live] error:', err);
        setInterfaceState('idle');
        setLiveConnected(false);
        setStatusText('Connection error. Tap to try again.');
        setAudioLevel(0);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
    };

    const session = new GeminiLiveSession(callbacks);
    liveSessionRef.current = session;

    try {
      setInterfaceState('connecting');
      setStatusText('Connecting to MIMI...');
      await session.connect();
    } catch {
      liveSessionRef.current = null;
      setInterfaceState('idle');
      setStatusText('Failed to connect. Tap to try again.');
    }
  }, [runRiskEngine]);

  const stopLive = useCallback(() => {
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setLiveConnected(false);
    setInterfaceState('idle');
    setStatusText('Tap the microphone to talk to MIMI');
    setAudioLevel(0);
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

    if (ttsEnabled) {
      setInterfaceState('speaking');
      setStatusText('MIMI is speaking...');
      speakResponse(mimiText, () => {
        setInterfaceState('idle');
        setStatusText('Tap the microphone to talk to MIMI');
      });
    } else {
      setInterfaceState('idle');
      setStatusText('Tap the microphone to talk to MIMI');
    }
  }, [messages, runRiskEngine, ttsEnabled]);

  /* ── mic button handler ─────────────────────────────────────── */
  const handleMicrophoneClick = async () => {
    // If already live-connected, this is a disconnect action
    if (liveConnected) {
      stopLive();
      return;
    }

    // If connecting/processing, ignore
    if (interfaceState === 'connecting' || interfaceState === 'processing') return;

    // Try to start Gemini Live if available
    if (GeminiLiveSession.isAvailable()) {
      await startLive();
      return;
    }

    // Offline / fallback mode using Web Speech API
    if (!isSupported) {
      alert('Voice recording is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (isRecording) {
      setInterfaceState('processing');
      setStatusText('Processing...');
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

  /* ── cancel/end button ─────────────────────────────────────── */
  const handleCancel = () => {
    if (liveConnected) {
      stopLive();
    } else if (isRecording) {
      resetRecording();
      setInterfaceState('idle');
      setStatusText('Tap the microphone to talk to MIMI');
    }
  };

  /* ── reset (from chat) ──────────────────────────────────────── */
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

  /* ── orb scale based on state + audio level ─────────────────── */
  const getOrbScale = () => {
    if (interfaceState === 'speaking') {
      // Rhythmic pulse for model speaking
      return 1.0 + audioLevel * 0.4;
    }
    if (interfaceState === 'listening' && liveConnected) {
      // React to mic audio level
      return 0.85 + audioLevel * 0.6;
    }
    if (interfaceState === 'connecting') return 0.9;
    return 0.85; // idle
  };

  const orbScale = getOrbScale();
  const isActive = liveConnected || isRecording;

  /* ── JSX ────────────────────────────────────────────────────── */
  return (
    <div className="mimi-dark-screen">
      {/* ── header ─────────────────────────────────────────────── */}
      <div className="mimi-header">
        <div className="mimi-header-left">
          <span className={`mimi-status-dot ${isActive ? 'active' : ''}`} />
          <span className="mimi-header-title">MIMI LIVE</span>
        </div>
        <button
          className="mimi-icon-btn"
          onClick={() => setShowChat(!showChat)}
          title="Chat transcript"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* ── greeting ───────────────────────────────────────────── */}
      <div className="mimi-greeting-area">
        <h1 className="mimi-greeting-text">
          {getTimeGreeting()}, {userName}
        </h1>
        <p className="mimi-greeting-sub">{statusText}</p>
      </div>

      {/* ── glowing orb ────────────────────────────────────────── */}
      <div className="mimi-orb-container">
        <div
          className={`mimi-orb ${isActive ? 'active' : ''} ${interfaceState === 'speaking' ? 'speaking' : ''} ${interfaceState === 'connecting' ? 'connecting' : ''}`}
          style={{ transform: `scale(${orbScale})` }}
        >
          <div className="mimi-orb-inner" />
        </div>
      </div>

      {/* ── risk banner (subtle, above controls) ──────────────── */}
      {currentRisk && currentRisk.detectedSymptoms.length > 0 && (
        <div
          className="mimi-risk-banner"
          onClick={() => setShowRiskPanel(!showRiskPanel)}
        >
          <span className={`mimi-risk-badge ${currentRisk.level}`}>
            {currentRisk.level.toUpperCase()} RISK
          </span>
          <span className="mimi-risk-score">
            Score: {currentRisk.score}/100 • {currentRisk.detectedSymptoms.length} symptom{currentRisk.detectedSymptoms.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── risk detail overlay ────────────────────────────────── */}
      {showRiskPanel && currentRisk && (
        <div className="mimi-risk-panel">
          <h3 className="mimi-risk-panel-title">Detected Symptoms</h3>
          <div className="mimi-risk-symptoms">
            {currentRisk.detectedSymptoms.map((s, i) => (
              <span key={i} className={`mimi-risk-tag ${s.severity}`}>
                {s.symptom}
              </span>
            ))}
          </div>
          {currentRisk.recommendations.length > 0 && (
            <>
              <h3 className="mimi-risk-panel-title" style={{ marginTop: '12px' }}>Recommendations</h3>
              <ul className="mimi-risk-recs">
                {currentRisk.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ── bottom controls ────────────────────────────────────── */}
      <div className="mimi-controls">
        {/* Cancel / End button */}
        <button
          className="mimi-ctrl-btn mimi-ctrl-secondary"
          onClick={handleCancel}
          title="End session"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main mic button */}
        <button
          className={`mimi-mic-btn ${isActive ? 'active' : ''} ${interfaceState === 'connecting' || interfaceState === 'processing' ? 'busy' : ''}`}
          onClick={handleMicrophoneClick}
          disabled={interfaceState === 'processing'}
        >
          {interfaceState === 'connecting' || interfaceState === 'processing'
            ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#E91E63' }} />
            : <Mic className="w-8 h-8" style={{ color: '#E91E63' }} />
          }
        </button>

        {/* Alert / info button */}
        <button
          className="mimi-ctrl-btn mimi-ctrl-secondary"
          onClick={() => setShowRiskPanel(!showRiskPanel)}
          title="Health alerts"
        >
          <AlertCircle className="w-5 h-5" />
        </button>
      </div>

      {/* ── error banner ───────────────────────────────────────── */}
      {error && (
        <div className="mimi-error-banner">{error}</div>
      )}

      {/* ── offline indicator ──────────────────────────────────── */}
      {!isOnline && (
        <div className="mimi-offline-badge">📴 Offline mode</div>
      )}

      {/* ── chat overlay ───────────────────────────────────────── */}
      {showChat && (
        <div className="mimi-chat-overlay">
          <div className="mimi-chat-header">
            <h2 className="mimi-chat-title">Conversation</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="mimi-icon-btn"
                onClick={handleReset}
                title="Reset conversation"
                style={{ fontSize: '12px', color: '#aaa' }}
              >Clear</button>
              <button
                className="mimi-icon-btn"
                onClick={() => setShowChat(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mimi-chat-messages">
            {messages.length === 0 && (
              <div className="mimi-chat-empty">
                <Heart className="w-8 h-8" style={{ color: '#E91E63', marginBottom: '8px' }} />
                <p>No messages yet. Start speaking to MIMI.</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mimi-chat-bubble ${message.role}`}
              >
                {message.role === 'assistant' && (
                  <span className="mimi-chat-label">MIMI</span>
                )}
                <p>{message.content}</p>
                <span className="mimi-chat-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
