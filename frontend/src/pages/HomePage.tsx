import { useEffect, useState } from 'react';
import { VoiceInterface } from '../components/VoiceInterface';

export const HomePage = () => {
  const [backendStatus, setBackendStatus] = useState<string>('Testing connection...');

  useEffect(() => {
    const testBackend = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/health`);
        const data = await res.json();
        setBackendStatus(data.status === 'ok' ? `Connected! Supabase status: ${data.supabase}` : 'Failed to connect');
      } catch (err) {
        setBackendStatus('Connection Error: Backend might not be running');
      }
    };
    testBackend();
  }, []);

  const handleRiskUpdate = (result: any) => {
    // Store latest risk for cross-page access (CHEW integration)
    localStorage.setItem('mimi_latest_risk', JSON.stringify({
      timestamp: new Date().toISOString(),
      riskScore: result.score,
      riskLevel: result.level,
      symptoms: result.detectedSymptoms.map((s: any) => s.symptom),
      escalation: result.escalationRequired
    }));
  };

  const handleNewAlert = () => {
    // The SQLite backend now handles generating CHEW alerts automatically based on risk.
    // No more local storage "mimi_chew_alerts" needed here.
  };

  return (
    <div className="h-full relative">
      <div className="absolute top-2 right-2 bg-slate-800 text-white text-xs px-3 py-1 rounded-full z-50">
        Backend: {backendStatus}
      </div>
      <VoiceInterface
        onRiskUpdate={handleRiskUpdate}
        onNewAlert={handleNewAlert}
      />
    </div>
  );
};
