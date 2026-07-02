// src/screens/ConductorScreen.tsx
import LobbyView from '@/views/conductor/LobbyView';

export default function ConductorScreen() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#ffffff', fontFamily: 'sans-serif' }}>
      {/* Inject and render the real-time lobby component directly */}
      <LobbyView />
    </div>
  );
}