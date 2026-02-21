import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Clock, X, Check, FileText, Navigation } from 'lucide-react';

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gestationalWeek: number;
  riskType: string;
  symptoms: string[];
  timestamp: Date;
  location?: {
    address: string;
    coordinates: { lat: number; lng: number };
    eta?: string;
  };
  status: 'pending' | 'acknowledged' | 'resolved';
  priority: 'medium' | 'high' | 'critical';
}

interface HospitalAlertProps {
  alerts: Alert[];
  hospitalName: string;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onContact?: (patientId: string) => void;
  enableSound?: boolean;
}

export const HospitalAlert = ({
  alerts,
  hospitalName,
  onAcknowledge,
  onDismiss,
  onContact,
  enableSound = true
}: HospitalAlertProps) => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  useEffect(() => {
    if (soundEnabled && alerts.some(a => a.status === 'pending' && a.priority === 'critical')) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.play().catch(() => {});
    }
  }, [alerts, soundEnabled]);

  const getPriorityConfig = (priority: 'medium' | 'high' | 'critical') => {
    const config = {
      medium: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-800',
        badge: 'bg-yellow-500',
        icon: <AlertTriangle className="w-6 h-6" />
      },
      high: {
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        text: 'text-orange-800',
        badge: 'bg-orange-500',
        icon: <AlertTriangle className="w-6 h-6" />
      },
      critical: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-800',
        badge: 'bg-red-500',
        icon: <AlertTriangle className="w-6 h-6 animate-pulse" />
      }
    };
    return config[priority];
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const hours = Math.floor(diff / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const pendingAlerts = alerts.filter(a => a.status === 'pending');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  if (selectedAlert) {
    const config = getPriorityConfig(selectedAlert.priority);

    return (
      <div className="max-w-4xl mx-auto p-4">
        <button
          onClick={() => setSelectedAlert(null)}
          className="mb-4 text-pink-600 hover:text-pink-700 font-medium"
        >
          ← Back to alerts
        </button>

        <div className={`${config.bg} border-l-4 ${config.border} rounded-r-2xl shadow-lg overflow-hidden`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                <div className={`${config.badge} text-white p-3 rounded-full`}>
                  {config.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedAlert.patientName}</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedAlert.age} years, Week {selectedAlert.gestationalWeek}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{formatTime(selectedAlert.timestamp)}</span>
                  </div>
                </div>
              </div>
              <span className={`${config.badge} text-white px-4 py-2 rounded-full text-sm font-semibold uppercase`}>
                {selectedAlert.priority}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                Risk Type: {selectedAlert.riskType}
              </h3>
              <div className="mt-4">
                <p className="font-semibold text-gray-800 mb-2">Reported Symptoms:</p>
                <ul className="space-y-2">
                  {selectedAlert.symptoms.map((symptom, index) => (
                    <li key={index} className="flex items-center space-x-2 text-gray-700">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {selectedAlert.location && (
              <div className="bg-white rounded-xl p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-pink-500" />
                  Patient Location
                </h3>
                <p className="text-gray-700 mb-3">{selectedAlert.location.address}</p>
                {selectedAlert.location.eta && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Navigation className="w-4 h-4 text-green-500" />
                    <span>ETA: {selectedAlert.location.eta}</span>
                  </div>
                )}
                <div className="mt-4 bg-gray-200 rounded-lg h-40 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-gray-400" />
                  <span className="ml-2 text-gray-500">Map Preview</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (onContact) onContact(selectedAlert.patientId);
                  window.open(`tel:${selectedAlert.patientId}`);
                }}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>Call Patient</span>
              </button>

              {selectedAlert.status === 'pending' && (
                <button
                  onClick={() => {
                    if (onAcknowledge) onAcknowledge(selectedAlert.id);
                    setSelectedAlert({ ...selectedAlert, status: 'acknowledged' });
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  <span>Acknowledge</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (onDismiss) onDismiss(selectedAlert.id);
                  setSelectedAlert(null);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <h1 className="text-2xl font-bold">Hospital Emergency Dashboard</h1>
        <p className="text-pink-100 mt-1">{hospitalName}</p>
        <div className="mt-4 flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="form-checkbox h-5 w-5 text-white"
            />
            <span className="text-sm">Alert Sound</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Alerts</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{pendingAlerts.length}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {pendingAlerts.filter(a => a.priority === 'critical').length}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{acknowledgedAlerts.length}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {pendingAlerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Alerts</h2>
          <div className="space-y-4">
            {pendingAlerts.map((alert) => {
              const config = getPriorityConfig(alert.priority);
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`${config.bg} border-l-4 ${config.border} rounded-r-xl p-4 cursor-pointer hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`${config.badge} text-white p-2 rounded-full`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-bold text-gray-800">{alert.patientName}</h3>
                          <span className={`${config.badge} text-white px-2 py-1 rounded text-xs font-semibold uppercase`}>
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.age} years, Week {alert.gestationalWeek} • {alert.riskType}
                        </p>
                        <p className="text-sm text-gray-700 font-medium mb-2">
                          Symptoms: {alert.symptoms.slice(0, 2).join(', ')}
                          {alert.symptoms.length > 2 && ` +${alert.symptoms.length - 2} more`}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(alert.timestamp)}</span>
                          </span>
                          {alert.location && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{alert.location.eta || 'Location available'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {acknowledgedAlerts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">In Progress</h2>
          <div className="space-y-3">
            {acknowledgedAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="bg-white border border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <div>
                      <h3 className="font-bold text-gray-800">{alert.patientName}</h3>
                      <p className="text-sm text-gray-600">{alert.riskType}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(alert.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Alerts</h3>
          <p className="text-gray-600">All patients are being monitored. New alerts will appear here.</p>
        </div>
      )}
    </div>
  );
};
