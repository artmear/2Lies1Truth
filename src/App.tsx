import PublicScreen from '@/screens/PublicScreen';
import ConductorScreen from '@/screens/ConductorScreen';

export default function App() {
  const path = window.location.pathname;

  if (path === '/conductor' || path === '/admin') {
    return <ConductorScreen />;
  }

  return <PublicScreen />;
}