import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
}

interface RoundMetadata {
  id: string;
  statement_1?: string;
  statement_2?: string;
  statement_3?: string;
  correct_option?: number;
  audio_key?: string;
  correct_answer?: string;
}

type GameType = '2L1T' | 'WYR' | 'GTS';

export default function ConductorResultsView({ roomCode }: { roomCode: string }) {
  const [standings, setStandings] = useState<LeaderboardRecord[]>([]);
  const [gameType, setGameType] = useState<string>('2L1T');
  const [round, setRound] = useState<RoundMetadata | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<GameType>('2L1T');
  
  const [wyrStats, setWyrStats] = useState({ opt1Count: 0, opt2Count: 0, total: 0 });
  const [gtsWinner, setGtsWinner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResultsAndContext = async () => {
      setLoading(true);
      
      const { data: room } = await supabase.from('rooms').select('id, game_type').eq('room_code', roomCode).single();
      if (!room) return;
      setGameType(room.game_type);
      setSelectedGame(room.game_type as GameType);

      let targetTable = 'tl_rounds';
      if (room.game_type === 'WYR') targetTable = 'wyr_rounds';
      if (room.game_type === 'GTS') targetTable = 'gts_rounds';

      const { data: latestRound } = await supabase
        .from(targetTable)
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRound) {
        setRound({
          id: latestRound.id,
          statement_1: latestRound.statement_1 || latestRound.option_a,
          statement_2: latestRound.statement_2 || latestRound.option_b,
          statement_3: latestRound.statement_3,
          correct_option: latestRound.correct_option,
          audio_key: latestRound.audio_key,
          correct_answer: latestRound.correct_answer
        });

        if (room.game_type === 'WYR') {
          const { data: votes } = await supabase.from('wyr_votes').select('chosen_option').eq('round_id', latestRound.id);
          if (votes) {
            const opt1 = votes.filter(v => v.chosen_option === 1).length;
            const opt2 = votes.filter(v => v.chosen_option === 2).length;
            setWyrStats({ opt1Count: opt1, opt2Count: opt2, total: votes.length || 1 });
          }
        }

        if (room.game_type === 'GTS') {
          const { data: fastestVote } = await supabase
            .from('gts_votes')
            .select('players(name)')
            .eq('round_id', latestRound.id)
            .eq('is_correct', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (fastestVote && fastestVote.players) {
            const playerContext = fastestVote.players as unknown as { name: string };
            setGtsWinner(playerContext.name);
          }
        }
      }

      const { data: players } = await supabase
        .from('players')
        .select('id, name, score')
        .eq('room_id', room.id)
        .order('score', { ascending: false });
      if (players) setStandings(players);
      
      setLoading(false);
    };

    fetchResultsAndContext();
  }, [roomCode]);

  const handleNextRound = async () => {
    try {
      await supabase
        .from('rooms')
        .update({ status: 'WRITING', game_type: selectedGame })
        .eq('room_code', roomCode);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#aaa' }}>
        <h2>Parsing round telemetry...</h2>
      </div>
    );
  }

  const p1 = Math.round((wyrStats.opt1Count / wyrStats.total) * 100);
  const p2 = Math.round((wyrStats.opt2Count / wyrStats.total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', padding: '40px 60px', gap: '40px' }}>
      
      {round && (
        gameType === 'WYR' ? (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '30px 40px', borderRadius: '20px', border: '1px solid #262636' }}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '25px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Audience Split Decisions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>
                  <span>🔵 {round.statement_1}</span>
                  <span>{p1}% ({wyrStats.opt1Count} votes)</span>
                </div>
                <div style={{ width: '100%', height: '24px', backgroundColor: '#13131a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #262636' }}>
                  <div style={{ width: `${p1}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 1s ease' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>
                  <span>🟣 {round.statement_2}</span>
                  <span>{p2}% ({wyrStats.opt2Count} votes)</span>
                </div>
                <div style={{ width: '100%', height: '24px', backgroundColor: '#13131a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #262636' }}>
                  <div style={{ width: `${p2}%`, height: '100%', backgroundColor: '#d946ef', transition: 'width 1s ease' }} />
                </div>
              </div>
            </div>
          </div>
        ) : gameType === 'GTS' ? (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '30px 40px', borderRadius: '20px', border: '1px solid #262636', textAlign: 'center' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Track Revealed</span>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)', fontWeight: '900', margin: '5px 0 15px' }}>🎵 THE CORRECT SONG WAS:</h2>
            <div style={{ padding: '16px 40px', backgroundColor: '#13131a', borderRadius: '12px', border: '2px solid var(--primary)', fontSize: '2.2rem', fontWeight: '900', display: 'inline-block', color: '#fff', marginBottom: '20px' }}>
              {round.correct_answer}
            </div>
            <div style={{ marginTop: '10px', fontSize: '1.4rem', color: 'var(--text-muted)' }}>
              {gtsWinner ? (
                <p>⚡ Fastest Correct Answer: <strong style={{ color: 'var(--truth-green)' }}>{gtsWinner}</strong> (+100 PTS)</p>
              ) : (
                <p style={{ color: 'var(--lie-red)' }}>Nobody managed to guess the track correctly this round!</p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '25px 40px', borderRadius: '20px', border: '1px solid #262636', textAlign: 'center' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Evaluation Complete</span>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--truth-green)', fontWeight: '900', margin: '5px 0 15px' }}>THE ABSOLUTE TRUTH WAS:</h2>
            <div style={{ padding: '16px 30px', backgroundColor: '#13131a', borderRadius: '10px', border: '2px solid var(--truth-green)', fontSize: '1.6rem', fontWeight: 'bold', display: 'inline-block' }}>
              {round.correct_option === 1 ? round.statement_1 : round.correct_option === 2 ? round.statement_2 : round.statement_3}
            </div>
          </div>
        )
      )}

      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', margin: '10px 0' }}>Leaderboard Standings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '20px', border: '1px solid #262636', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          {standings.map((player, idx) => (
            <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', backgroundColor: idx === 0 ? '#1e1b4b' : '#14141e', borderRadius: '12px', border: idx === 0 ? '2px solid var(--primary)' : '1px solid transparent' }}>
              <span style={{ fontSize: '2rem', fontWeight: idx === 0 ? '800' : '500' }}>
                {idx === 0 ? '👑' : `${idx + 1}.`} {player.name}
              </span>
              <span style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>{player.score || 0} PTS</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: '#13131a', padding: '20px', borderRadius: '12px', border: '1px solid #262636', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 'bold', fontSize: '1.1rem' }}>NEXT ROUND MODE:</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSelectedGame('2L1T')}
            style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: selectedGame === '2L1T' ? '2px solid var(--primary)' : '1px solid #262636', backgroundColor: selectedGame === '2L1T' ? '#1e1b4b' : 'transparent', color: '#fff', transition: 'all 0.2s' }}
          >
            2 Lies 1 Truth
          </button>
          <button 
            onClick={() => setSelectedGame('WYR')}
            style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: selectedGame === 'WYR' ? '2px solid var(--primary)' : '1px solid #262636', backgroundColor: selectedGame === 'WYR' ? '#1e1b4b' : 'transparent', color: '#fff', transition: 'all 0.2s' }}
          >
            Would You Rather
          </button>
          <button 
            onClick={() => setSelectedGame('GTS')}
            style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: selectedGame === 'GTS' ? '2px solid var(--primary)' : '1px solid #262636', backgroundColor: selectedGame === 'GTS' ? '#1e1b4b' : 'transparent', color: '#fff', transition: 'all 0.2s' }}
          >
            Guess The Song
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '25px', width: '100%', maxWidth: '1000px' }}>
        <button onClick={handleNextRound} className="btn" style={{ flex: 2, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--primary)', color: '#fff' }}>
          Advance to Next Round
        </button>
        <button onClick={handleDestroyAndReset} className="btn" style={{ flex: 1, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--lie-red)', color: '#fff' }}>
          Wipe Arena & Exit
        </button>
      </div>
    </div>
  );
}