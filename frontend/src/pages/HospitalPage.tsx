import { useState } from 'react';
import { HospitalAlert } from '../components/HospitalAlert';
import { HospitalMap } from '../components/HospitalMap';
import { CallAlertSimulator } from '../components/CallAlertSimulator';
import { useMimi } from '../context/MimiProvider';
import { Phone, MapPin } from 'lucide-react';

type HospitalView = 'alerts' | 'map' | 'call';

export const HospitalPage = () => {
  const { alerts, acknowledgeAlert, dismissAlert } = useMimi();
  const [view, setView] = useState<HospitalView>('alerts');
  const [selectedPatientForCall, setSelectedPatientForCall] = useState<string>('');

  const handleShowMap = () => setView('map');
  const handleShowAlerts = () => setView('alerts');

  const handleSimulateCall = (patientName: string) => {
    setSelectedPatientForCall(patientName);
    setView('call');
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
      {/* View Toggle */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center space-x-2">
          <button
            onClick={handleShowAlerts}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${view === 'alerts'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Phone className="w-4 h-4" />
            <span>Alerts</span>
          </button>
          <button
            onClick={handleShowMap}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${view === 'map'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Find Hospital</span>
          </button>
        </div>
      </div>

      {view === 'alerts' && (
        <>
          <HospitalAlert
            alerts={alerts}
            hospitalName="Lagos University Teaching Hospital (LUTH)"
            onAcknowledge={acknowledgeAlert}
            onDismiss={dismissAlert}
            enableSound={true}
          />
          {alerts.some(a => a.priority === 'critical' && a.status === 'pending') && (
            <div className="max-w-6xl mx-auto px-4 pb-6">
              <button
                onClick={() => handleSimulateCall('Amina Ibrahim')}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-semibold flex items-center justify-center space-x-3 shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02]"
              >
                <Phone className="w-6 h-6" />
                <span>📞 Simulate Nurse Call to Patient</span>
              </button>
            </div>
          )}
        </>
      )}

      {view === 'map' && (
        <HospitalMap
          patientName="Amina Ibrahim"
          patientLocation="Ajegunle, Lagos"
          onBack={handleShowAlerts}
        />
      )}

      {view === 'call' && (
        <CallAlertSimulator
          patientName={selectedPatientForCall || 'Amina Ibrahim'}
          nurseName="Nurse Adaeze"
          onClose={() => setView('alerts')}
        />
      )}
    </div>
  );
};
