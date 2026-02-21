import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mic, User, LayoutGrid, Bell, Settings, Stethoscope, AlertTriangle, Heart, WifiOff } from 'lucide-react';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';
import { CHEWPage } from '../pages/CHEWPage';
import { HospitalPage } from '../pages/HospitalPage';
import { SettingsPage } from '../pages/SettingsPage';
import { useMimi } from '../context/MimiProvider';
import { KickCounter } from './KickCounter';
import { MedicationTracker } from './MedicationTracker';
import { PregnancyTimeline } from './PregnancyTimeline';
import { EmergencySOS } from './EmergencySOS';

type UserRole = 'patient' | 'chew' | 'hospital';

interface AppLayoutProps {
  initialRole?: UserRole;
}

/* ── Patient Bottom Nav (dark themed) ──────────────────────────── */
const PatientBottomNav = () => {
  const location = useLocation();

  const items = [
    { path: '/', icon: <Mic className="nav-icon" />, label: 'MIMI' },
    { path: '/journey', icon: <LayoutGrid className="nav-icon" />, label: 'Journey' },
    { path: '/kicks', icon: <Heart className="nav-icon" />, label: 'Kicks' },
    { path: '/meds', icon: <Bell className="nav-icon" />, label: 'Meds' },
    { path: '/profile', icon: <User className="nav-icon" />, label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 mimi-bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/' && location.pathname === '/');
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mimi-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span className="mimi-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

/* ── CHEW / Hospital Bottom Nav (original light style) ─────────── */
const StandardBottomNav = ({ role }: { role: UserRole }) => {
  const location = useLocation();

  const chewNavItems = [
    { path: '/chew', icon: <Stethoscope className="w-6 h-6" />, label: 'Patients' },
    { path: '/settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  const hospitalNavItems = [
    { path: '/hospital', icon: <AlertTriangle className="w-6 h-6" />, label: 'Alerts' },
    { path: '/settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  const navItems = role === 'chew' ? chewNavItems : hospitalNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'
                }`}
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/* ── Navigation wrapper ────────────────────────────────────────── */
const NavigationBar = ({ role, isOnline }: { role: UserRole; isOnline: boolean }) => {
  return (
    <>
      {!isOnline && role !== 'patient' && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Some features may be limited.</span>
        </div>
      )}

      {/* Mobile bottom nav */}
      {role === 'patient' ? (
        <PatientBottomNav />
      ) : (
        <StandardBottomNav role={role} />
      )}

      {/* Desktop sidebar (shown for all roles) */}
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
          {role === 'patient' && (
            <>
              <DesktopNavLink path="/" icon={<Mic className="w-5 h-5" />} label="MIMI" />
              <DesktopNavLink path="/journey" icon={<LayoutGrid className="w-5 h-5" />} label="Journey" />
              <DesktopNavLink path="/kicks" icon={<Heart className="w-5 h-5" />} label="Kicks" />
              <DesktopNavLink path="/meds" icon={<Bell className="w-5 h-5" />} label="Meds" />
              <DesktopNavLink path="/profile" icon={<User className="w-5 h-5" />} label="Profile" />
              <DesktopNavLink path="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
            </>
          )}
          {role === 'chew' && (
            <>
              <DesktopNavLink path="/chew" icon={<Stethoscope className="w-5 h-5" />} label="Patients" />
              <DesktopNavLink path="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
            </>
          )}
          {role === 'hospital' && (
            <>
              <DesktopNavLink path="/hospital" icon={<AlertTriangle className="w-5 h-5" />} label="Alerts" />
              <DesktopNavLink path="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
            </>
          )}
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

/* ── Desktop nav link helper ───────────────────────────────────── */
const DesktopNavLink = ({ path, icon, label }: { path: string; icon: React.ReactNode; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  return (
    <Link
      to={path}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive
        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
        }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

/* ── App Layout Inner ──────────────────────────────────────────── */
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

      <main className={`flex-1 overflow-hidden md:ml-0 ${role === 'patient' ? 'pb-16 md:pb-0' : 'pb-16 md:pb-0'}`}>
        <Routes>
          {role === 'patient' && (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/journey" element={<PregnancyTimeline />} />
              <Route path="/kicks" element={<KickCounter />} />
              <Route path="/meds" element={<MedicationTracker />} />
              <Route path="/profile" element={<ProfilePage />} />
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
