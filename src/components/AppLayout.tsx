import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Settings, Stethoscope, AlertTriangle, Heart, WifiOff, Baby, Pill, Calendar } from 'lucide-react';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';
import { CHEWPage } from '../pages/CHEWPage';
import { HospitalPage } from '../pages/HospitalPage';
import { SettingsPage } from '../pages/SettingsPage';
import { KickCounter } from './KickCounter';
import { MedicationTracker } from './MedicationTracker';
import { PregnancyTimeline } from './PregnancyTimeline';
import { EmergencySOS } from './EmergencySOS';
import { useMimi } from '../context/MimiProvider';

type UserRole = 'patient' | 'chew' | 'hospital';

interface AppLayoutProps {
  initialRole?: UserRole;
}

const NavigationBar = ({ role }: { role: UserRole }) => {
  const location = useLocation();
  const { isOnline } = useMimi();

  const patientNavItems = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { path: '/timeline', icon: <Calendar className="w-5 h-5" />, label: 'Journey' },
    { path: '/kicks', icon: <Baby className="w-5 h-5" />, label: 'Kicks' },
    { path: '/meds', icon: <Pill className="w-5 h-5" />, label: 'Meds' },
    { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const chewNavItems = [
    { path: '/chew', icon: <Stethoscope className="w-5 h-5" />, label: 'Patients' },
    { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const hospitalNavItems = [
    { path: '/hospital', icon: <AlertTriangle className="w-5 h-5" />, label: 'Alerts' },
    { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const navItems = role === 'patient' ? patientNavItems : role === 'chew' ? chewNavItems : hospitalNavItems;

  return (
    <>
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Some features may be limited.</span>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 safe-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${isActive
                  ? 'text-pink-500 scale-105'
                  : 'text-gray-400 hover:text-pink-400'
                  }`}
              >
                {item.icon}
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-pink-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">MIMI</h1>
              <p className="text-xs text-gray-500">Maternal Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">{isOnline ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

const AppLayoutInner = ({ initialRole = 'patient' }: AppLayoutProps) => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [role] = useState<UserRole>(initialRole);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('mimi_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    localStorage.setItem('mimi_welcome_seen', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <NavigationBar role={role} />

      <main className="flex-1 overflow-hidden md:ml-0">
        <Routes>
          {role === 'patient' && (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/timeline" element={<PregnancyTimeline />} />
              <Route path="/kicks" element={<KickCounter />} />
              <Route path="/meds" element={<MedicationTracker />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          )}

          {role === 'chew' && (
            <>
              <Route path="/" element={<CHEWPage />} />
              <Route path="/chew" element={<CHEWPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          )}

          {role === 'hospital' && (
            <>
              <Route path="/" element={<HospitalPage />} />
              <Route path="/hospital" element={<HospitalPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </>
          )}

          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Emergency SOS — always visible for patients */}
      {role === 'patient' && <EmergencySOS />}

      {/* Welcome modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-fadeIn">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Welcome to MIMI
            </h2>

            <p className="text-gray-600 text-center mb-6">
              Your caring maternal health companion. I'm here to support you through your pregnancy journey, answer your questions, and ensure you and your baby are healthy.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-600 font-bold">1</span>
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Voice Conversations:</span> Talk to MIMI about how you're feeling
                </p>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-600 font-bold">2</span>
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Track Baby Kicks:</span> Count kicks to monitor baby's health
                </p>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-600 font-bold">3</span>
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Emergency SOS:</span> Hold the red button for instant help
                </p>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-600 font-bold">4</span>
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">Connected Care:</span> I'll alert your health worker if anything concerns me
                </p>
              </div>
            </div>

            <button
              onClick={handleWelcomeClose}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-pink-500/30"
            >
              Get Started 💕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AppLayout = (props: AppLayoutProps) => {
  return (
    <BrowserRouter>
      <AppLayoutInner {...props} />
    </BrowserRouter>
  );
};
