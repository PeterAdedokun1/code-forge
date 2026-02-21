import { useState } from 'react';
import { Bell, Globe, Shield, User, Moon, Volume2, Check } from 'lucide-react';
import { useMimi } from '../context/MimiProvider';
import {
  SUPPORTED_LANGUAGES,
  getSelectedLanguageCode,
  setSelectedLanguage,
} from '../lib/languageStore';

export const SettingsPage = () => {
  const { isDemoMode, toggleDemoMode, currentPatient } = useMimi();
  const [selectedLang, setSelectedLang] = useState(getSelectedLanguageCode());
  const [showSaved, setShowSaved] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (code: string) => {
    setSelectedLang(code);
    setSelectedLanguage(code);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

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

        {/* ── Language Section ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-pink-500" />
              AI Language
            </h2>
            {showSaved && (
              <span className="flex items-center text-sm text-green-600 font-medium animate-fadeIn">
                <Check className="w-4 h-4 mr-1" /> Saved!
              </span>
            )}
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Choose the language MIMI will use to converse with you.
              This affects both text and voice responses.
            </p>

            {/* Language cards */}
            <div className="grid gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === selectedLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                      ? 'border-pink-500 bg-pink-50 shadow-md shadow-pink-500/10'
                      : 'border-gray-200 bg-gray-50 hover:border-pink-300 hover:bg-pink-50/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-pink-700' : 'text-gray-800'}`}>
                            {lang.label}
                          </p>
                          <p className="text-xs text-gray-500">{lang.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live preview */}
            <div className="mt-4 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
              <p className="text-xs font-semibold text-pink-600 mb-2 uppercase tracking-wide">
                Preview — MIMI will say:
              </p>
              <p className="text-sm text-gray-800 italic leading-relaxed">
                "{currentLang.sampleGreeting}"
              </p>
            </div>
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDemoMode ? 'bg-pink-500' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDemoMode ? 'translate-x-6' : 'translate-x-1'
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
