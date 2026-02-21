import { VoiceInterface } from '../components/VoiceInterface';

export const HomePage = () => {
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

  const handleNewAlert = (patientData: any) => {
    // Push high-risk patient to CHEW dashboard alerts
    const existingAlerts = JSON.parse(localStorage.getItem('mimi_chew_alerts') || '[]');
    existingAlerts.push({
      ...patientData,
      timestamp: new Date().toISOString(),
      id: `live_alert_${Date.now()}`
    });
    localStorage.setItem('mimi_chew_alerts', JSON.stringify(existingAlerts));
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
