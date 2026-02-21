import { AppLayout } from './components/AppLayout';
import { MimiProvider } from './context/MimiProvider';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { Heart, Loader2 } from 'lucide-react';

/** Loading spinner shown while checking auth session */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/40 animate-pulse">
        <Heart className="w-10 h-10 text-white" />
      </div>
      <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-3" />
      <p className="text-gray-500 text-sm">Loading MIMI...</p>
    </div>
  );
}

/**
 * Auth gate — decides which screen to show:
 * 1. Loading → checking session
 * 2. LoginPage → not authenticated
 * 3. OnboardingPage → authenticated but no profile
 * 4. Main App → authenticated + has profile
 */
function AuthGate() {
  const { loading, user, profile } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  if (!profile) return <OnboardingPage />;

  const urlParams = new URLSearchParams(window.location.search);
  const role = (urlParams.get('role') || 'patient') as 'patient' | 'chew' | 'hospital';

  return (
    <MimiProvider>
      <AppLayout initialRole={role} />
    </MimiProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
