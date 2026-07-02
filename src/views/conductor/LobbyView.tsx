import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface Player {
  id: string;
  name: string;
}

export default function LobbyView() {
  const [players, setPlayers] = useState<Player[]>([]);
  const roomCode = 'GAME2026'; // Fixed room code for simplicity

  useEffect(() => {
    // 1. Initialize the room state in the database
    const initializeRoom = async () => {
      await supabase
        .from('rooms')
        .upsert({ room_code: roomCode, status: 'LOBBY' }, { onConflict: 'room_code' });
    };

    initializeRoom();

    // 2. Subscribe to new players joining this room in real-time
    const playerSubscription = supabase
      .channel('lobby-players')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'players' },
        (payload) => {
          const newPlayer = payload.new as Player;
          // Append the newly joined player to the local screen state
          setPlayers((prev) => [...prev, newPlayer]);
        }
      )
      .subscribe();

    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(playerSubscription);
    };
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Room Code: {roomCode}</h1>
      <h3>Joined Players:</h3>
      <ul>
        {players.map((player) => (
          <li key={player.id} style={{ fontSize: '24px', listStyle: 'none' }}>
            👤 {player.name}
          </li>
        ))}
      </ul>
    </div>
  );
}