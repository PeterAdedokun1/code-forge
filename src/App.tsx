import { AppLayout } from './components/AppLayout';
import { MimiProvider } from './context/MimiProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

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
