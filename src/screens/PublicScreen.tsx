// src/screens/PublicScreen.tsx
import { useEffect, useState } from 'react';
import JoinView from '@/views/public/JoinView';

export default function PublicScreen() {
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    // Check if the player already registered in a previous session
    const playerId = localStorage.getItem('player_id');
    if (playerId) {
      setHasJoined(true);
    }
  }, []);

  // If the player hasn't joined yet, show the registration form
  if (!hasJoined) {
    return <JoinView />;
  }

  // Temporary view while waiting for the game loop state machine
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>📱 Connected to Lobby</h2>
      <p>Look at the big screen! The game will start shortly.</p>
    </div>
  );
}