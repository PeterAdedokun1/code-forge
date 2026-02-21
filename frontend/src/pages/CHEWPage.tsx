import { useState, useEffect } from 'react';
import { CHEWDashboard, Patient } from '../components/CHEWDashboard';
import { HospitalMap } from '../components/HospitalMap';
import { CallAlertSimulator } from '../components/CallAlertSimulator';
import { useMimi } from '../context/MimiProvider';
import { AlertTriangle, Phone } from 'lucide-react';

export const CHEWPage = () => {
  const { chewPatients } = useMimi();
  const [patients, setPatients] = useState<Patient[]>(chewPatients);
  const [showMap, setShowMap] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [liveAlertCount, setLiveAlertCount] = useState(0);

  // Poll backend for live risk updates from voice conversations
  useEffect(() => {
    const check = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/alerts`);
        const data = await res.json();
        const liveAlerts = data.alerts || [];

        if (liveAlerts.length > liveAlertCount) {
          setLiveAlertCount(liveAlerts.length);

          const newPatients = [...chewPatients];
          liveAlerts.forEach((alert: any) => {
            const patientName = alert.user_id || 'Current Patient';
            const riskLevel = alert.risk_level || 'high';
            const symptoms = alert.symptoms ? JSON.parse(alert.symptoms) : [];

            const existingIndex = newPatients.findIndex(p => p.name === patientName);
            if (existingIndex === -1) {
              newPatients.unshift({
                id: `live_${alert.alert_id}`,
                name: patientName,
                age: 28,
                gestationalWeek: 32,
                riskLevel: riskLevel,
                lastConversation: 'Just now (via MIMI voice)',
                pendingActions: 2,
                location: 'Current Session',
                phone: '+234-800-000-0000',
                riskHistory: [
                  { date: 'Today', score: alert.risk_score || 75 }
                ],
                recentSymptoms: symptoms
              });
            } else {
              newPatients[existingIndex] = {
                ...newPatients[existingIndex],
                riskLevel: riskLevel,
                lastConversation: 'Just now (via MIMI voice)',
                pendingActions: riskLevel === 'high' ? 3 : 1,
                recentSymptoms: [
                  ...symptoms,
                  ...newPatients[existingIndex].recentSymptoms
                ].slice(0, 5)
              };
            }
          });

          setPatients(newPatients);
        }
      } catch (e) {
        // Silent fail
      }
    };

    const interval = setInterval(check, 2000);
    check();

    return () => clearInterval(interval);
  }, [chewPatients, liveAlertCount]);

  if (showMap) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
        <HospitalMap
          patientName="High Risk Patient"
          patientLocation="Lagos"
          onBack={() => setShowMap(false)}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
      {liveAlertCount > 0 && (
        <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-center space-x-2 animate-pulse">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {liveAlertCount} new alert{liveAlertCount > 1 ? 's' : ''} from live MIMI conversations!
          </span>
        </div>
      )}

      <CHEWDashboard patients={patients} chewName="Nurse Adaeze Nwankwo" />

      <div className="max-w-6xl mx-auto px-4 pb-6 space-y-3">
        <button
          onClick={() => setShowMap(true)}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/30 transition-all"
        >
          <span>🗺️ Find Nearest Hospital for High-Risk Patient</span>
        </button>

        <button
          onClick={() => setShowCall(true)}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-green-500/30 transition-all"
        >
          <Phone className="w-5 h-5" />
          <span>📞 Simulate Nurse Call to Patient</span>
        </button>
      </div>

      {showCall && (
        <CallAlertSimulator
          patientName="Amina Ibrahim"
          nurseName="Nurse Adaeze"
          onClose={() => setShowCall(false)}
        />
      )}
    </div>
  );
};
