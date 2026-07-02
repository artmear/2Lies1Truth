import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
}

export default function ConductorResultsView({ roomCode }: { roomCode: string }) {
  const [standings, setStandings] = useState<LeaderboardRecord[]>([]);

  useEffect(() => {
    const fetchStandings = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, score')
        .order('score', { ascending: false });
      if (data) setStandings(data);
    };
    fetchStandings();
  }, []);

  const handleNextRound = async () => {
    try {
      await supabase.from('rooms').update({ status: 'WRITING' }).eq('room_code', roomCode);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDestroyAndReset = async () => {
    if (!window.confirm("Delete room and purge all player history cascade metadata?")) return;
    try {
      await supabase.from('rooms').delete().eq('room_code', roomCode);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '60px' }}>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '40px', fontWeight: '900' }}>Leaderboard Standings</h1>
      
      <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '20px', border: '1px solid #262636', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {standings.map((player, idx) => (
          <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', backgroundColor: idx === 0 ? '#1e1b4b' : '#14141e', borderRadius: '12px', border: idx === 0 ? '2px solid var(--primary)' : '1px solid transparent' }}>
            <span style={{ fontSize: '2rem', fontWeight: idx === 0 ? '800' : '500' }}>
              {idx === 0 ? '👑' : `${idx + 1}.`} {player.name}
            </span>
            <span style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>{player.score || 0} PTS</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '25px', marginTop: '50px', width: '100%', maxWidth: '1000px' }}>
        <button onClick={handleNextRound} className="btn" style={{ flex: 2, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--primary)', color: '#fff' }}>
          Next Round
        </button>
        <button onClick={handleDestroyAndReset} className="btn" style={{ flex: 1, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--lie-red)', color: '#fff' }}>
          Wipe Arena & Exit
        </button>
      </div>
    </div>
  );
}