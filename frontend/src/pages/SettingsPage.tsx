import { Bell, Globe, Shield, User, Moon, Volume2 } from 'lucide-react';
import { useDemoData } from '../hooks/useDemoData';

export const SettingsPage = () => {
  const { isDemoMode, toggleDemoMode, currentPatient } = useDemoData();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your MIMI preferences</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2 text-pink-500" />
              Profile
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={currentPatient?.name || 'User'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                type="text"
                value={currentPatient?.age || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={currentPatient?.location || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-pink-500" />
              Notifications
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Daily Check-ins</p>
                <p className="text-sm text-gray-600">Receive daily health reminders</p>
              </div>
              <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-pink-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Medication Reminders</p>
                <p className="text-sm text-gray-600">Get notified to take your vitamins</p>
              </div>
              <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-pink-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Appointment Alerts</p>
                <p className="text-sm text-gray-600">Reminders for scheduled visits</p>
              </div>
              <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-pink-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Volume2 className="w-5 h-5 mr-2 text-pink-500" />
              Voice & Audio
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Voice Responses</p>
                <p className="text-sm text-gray-600">MIMI speaks back to you</p>
              </div>
              <input type="checkbox" defaultChecked className="form-checkbox h-5 w-5 text-pink-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Background Recording</p>
                <p className="text-sm text-gray-600">Continue listening when app is minimized</p>
              </div>
              <input type="checkbox" className="form-checkbox h-5 w-5 text-pink-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-pink-500" />
              Language
            </h2>
          </div>
          <div className="p-6">
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent">
              <option value="en">English</option>
              <option value="pidgin">Pidgin English</option>
              <option value="yo">Yoruba</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Moon className="w-5 h-5 mr-2 text-pink-500" />
              Demo Mode
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Demo Mode</p>
                <p className="text-sm text-gray-600">Use sample data for demonstration</p>
              </div>
              <button
                onClick={toggleDemoMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDemoMode ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDemoMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-pink-500" />
              Privacy & Security
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="font-medium text-gray-800">Privacy Policy</p>
              <p className="text-sm text-gray-600">Learn how we protect your data</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="font-medium text-gray-800">Terms of Service</p>
              <p className="text-sm text-gray-600">Review our terms and conditions</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="font-medium text-gray-800">Data Export</p>
              <p className="text-sm text-gray-600">Download your health data</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-2">MIMI Version 1.0.0</p>
          <p className="text-xs text-gray-500">
            Built with care for maternal health in Nigeria
          </p>
        </div>
      </div>
    </div>
  );
};
