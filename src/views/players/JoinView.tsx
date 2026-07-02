import { useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import '@/App.css';

interface JoinViewProps {
  onJoinSuccess: (roomCode: string) => void;
}

export default function JoinView({ onJoinSuccess }: JoinViewProps) {
  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomInput.trim().toUpperCase();
    const cleanName = nameInput.trim();

    if (!cleanRoom || !cleanName || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', cleanRoom)
        .eq('status', 'LOBBY')
        .maybeSingle();

      if (roomError || !room) {
        alert('Room not found or game has already started!');
        setIsSubmitting(false);
        return;
      }

      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .eq('name', cleanName)
        .maybeSingle();

      if (existingPlayer) {
        alert('That name is already taken in this room! Please choose a unique name.');
        setIsSubmitting(false);
        return;
      }

      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: cleanName })
        .select()
        .single();

      if (insertError) throw insertError;

      localStorage.setItem('player_id', newPlayer.id);
      localStorage.setItem('player_name', newPlayer.name);
      
      onJoinSuccess(cleanRoom);

    } catch (err) {
      console.error(err);
      alert('Error trying to register into the room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-container" style={{ justifyContent: 'center' }}>
      <form onSubmit={handleJoin} className="mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Join Party Room</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Room Code:</label>
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="e.g. B7K9"
            maxLength={4}
            disabled={isSubmitting}
            style={{ padding: '14px', fontSize: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid #262636', backgroundColor: '#1f1f2e', color: '#fff' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Your Name:</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Pedro"
            maxLength={15}
            disabled={isSubmitting}
            style={{ padding: '14px', fontSize: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid #262636', backgroundColor: '#1f1f2e', color: '#fff' }}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ marginTop: '10px', height: '54px' }}>
          {isSubmitting ? 'Connecting...' : 'Enter Arena'}
        </button>
      </form>
    </div>
  );
}