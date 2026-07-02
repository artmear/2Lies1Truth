import { useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function JoinView() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      // 1. Fetch the room ID first using the standard room code
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', 'GAME2026')
        .single();

      if (!roomData) throw new Error('Room not found!');

      // 2. Insert the new player into the players table
      const { data: playerData, error } = await supabase
        .from('players')
        .insert({ room_id: roomData.id, name: name.trim() })
        .select()
        .single();

      if (error) throw error;

      // 3. Persist the player ID locally so the user stays in the session
      localStorage.setItem('player_id', playerData.id);
      localStorage.setItem('player_name', playerData.name);
      
      alert('You are in the lobby! Watch the main screen.');
    } catch (err) {
      console.error('Error joining room:', err);
      alert('Failed to join the game. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleJoin} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h2>Enter your name to play:</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., John Doe"
        disabled={isSubmitting}
        style={{ padding: '10px', fontSize: '16px' }}
      />
      <button type="submit" disabled={isSubmitting} style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}>
        {isSubmitting ? 'Joining...' : 'Join Game'}
      </button>
    </form>
  );
}