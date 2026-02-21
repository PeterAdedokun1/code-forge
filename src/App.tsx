import { AppLayout } from './components/AppLayout';
import { MimiProvider } from './context/MimiProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * App entry point.
 *
 * Auth is available (see context/AuthProvider.tsx, pages/LoginPage.tsx,
 * pages/OnboardingPage.tsx) but bypassed for hackathon demo so judges
 * land directly on the AI voice interface.
 *
 * To enable auth, wrap with <AuthProvider> and add the <AuthGate> component.
 */
function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const role = (urlParams.get('role') || 'patient') as 'patient' | 'chew' | 'hospital';

  return (
    <ErrorBoundary>
      <MimiProvider>
        <AppLayout initialRole={role} />
      </MimiProvider>
    </ErrorBoundary>
  );
}

export default App;
