import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mic, User, LayoutGrid, Bell, Stethoscope, AlertTriangle, Heart, WifiOff, Settings } from 'lucide-react';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';
import { CHEWPage } from '../pages/CHEWPage';
import { HospitalPage } from '../pages/HospitalPage';
import { SettingsPage } from '../pages/SettingsPage';

type UserRole = 'patient' | 'chew' | 'hospital';

interface AppLayoutProps {
  initialRole?: UserRole;
}

const NavigationBar = ({ role, isOnline }: { role: UserRole; isOnline: boolean }) => {
  const location = useLocation();

  // Patient nav — matches reference design: MIMI, Profile, Health, Alerts
  const patientNavItems = [
    { path: '/', icon: <Mic className="w-5 h-5" />, label: 'MIMI' },
    { path: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
    { path: '/health', icon: <LayoutGrid className="w-5 h-5" />, label: 'Health' },
    { path: '/settings', icon: <Bell className="w-5 h-5" />, label: 'Alerts' },
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
        <div className="bg-yellow-600/90 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Some features may be limited.</span>
        </div>
      )}

      {/* Mobile bottom nav — dark theme for patient, light for others */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom ${role === 'patient'
          ? 'bg-[#0a0a0a] border-t border-white/10'
          : 'bg-white border-t border-gray-200'
        }`}>
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const patientColors = isActive
              ? 'text-pink-500'
              : 'text-white/40 hover:text-white/70';
            const otherColors = isActive
              ? 'text-pink-500'
              : 'text-gray-500 hover:text-pink-400';

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${role === 'patient' ? patientColors : otherColors
                  }`}
              >
                {item.icon}
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col w-64 h-full ${role === 'patient'
          ? 'bg-[#0f0f0f] border-r border-white/10'
          : 'bg-white border-r border-gray-200'
        }`}>
        <div className={`p-6 border-b ${role === 'patient' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${role === 'patient' ? 'text-white' : 'text-gray-800'}`}>MIMI</h1>
              <p className={`text-xs ${role === 'patient' ? 'text-white/50' : 'text-gray-500'}`}>Maternal Intelligence</p>
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
                    : role === 'patient'
                      ? 'text-white/60 hover:bg-white/5'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t ${role === 'patient' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className={`text-sm ${role === 'patient' ? 'text-white/50' : 'text-gray-600'}`}>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

const AppLayoutInner = ({ initialRole = 'patient' }: AppLayoutProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showWelcome, setShowWelcome] = useState(false);
  const [role] = useState<UserRole>(initialRole);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const hasSeenWelcome = localStorage.getItem('mimi_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleWelcomeClose = () => {
    localStorage.setItem('mimi_welcome_seen', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <NavigationBar role={role} isOnline={isOnline} />

      <main className="flex-1 overflow-hidden md:ml-0 pb-16 md:pb-0">
        <Routes>
          {role === 'patient' && (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/health" element={<SettingsPage />} />
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

      {showWelcome && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-3xl max-w-md w-full p-8 shadow-2xl border border-white/10">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Welcome to MIMI
            </h2>

            <p className="text-white/60 text-center mb-6">
              Your caring maternal health companion. I'm here to support you through your pregnancy journey, answer your questions, and ensure you and your baby are healthy.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-400 font-bold text-xs">1</span>
                </div>
                <p className="text-white/70">
                  <span className="font-semibold text-white/90">Daily Check-ins:</span> I'll ask about your wellbeing every day
                </p>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-400 font-bold text-xs">2</span>
                </div>
                <p className="text-white/70">
                  <span className="font-semibold text-white/90">Smart Monitoring:</span> I remember your history and watch for warning signs
                </p>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <div className="w-6 h-6 bg-pink-600/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-pink-400 font-bold text-xs">3</span>
                </div>
                <p className="text-white/70">
                  <span className="font-semibold text-white/90">Connected Care:</span> I'll alert your health worker if anything concerns me
                </p>
              </div>
            </div>

            <button
              onClick={handleWelcomeClose}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all transform hover:scale-105"
            >
              Get Started
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
