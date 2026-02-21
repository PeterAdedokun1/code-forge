import { VoiceInterface } from '../components/VoiceInterface';

export const HomePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRiskUpdate = (result: any) => {
    localStorage.setItem('mimi_latest_risk', JSON.stringify({
      timestamp: new Date().toISOString(),
      riskScore: result.score,
      riskLevel: result.level,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      symptoms: result.detectedSymptoms.map((s: any) => s.symptom),
      escalation: result.escalationRequired,
    }));
  };

  const handleNewAlert = () => {
    // Backend handles CHEW alerts automatically based on risk
  };

  return (
    <div className="h-full">
      <VoiceInterface
        onRiskUpdate={handleRiskUpdate}
        onNewAlert={handleNewAlert}
      />
    </div>
  );
};
