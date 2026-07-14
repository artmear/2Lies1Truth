import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import '@/App.css';

export default function PlayerVoteView({ currentRoundId }: { currentRoundId: string | null }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gameType, setGameType] = useState<string>('2L1T');

  const [statements, setStatements] = useState<{ s1: string; s2: string; s3?: string } | null>(null);

  const [typedGuess, setTypedGuess] = useState('');

  useEffect(() => {
    if (!currentRoundId) return;

    const fetchRoundContext = async () => {
      const roomCode = localStorage.getItem('active_room_code');
      if (!roomCode) return;

      const { data: room } = await supabase
        .from('rooms')
        .select('game_type')
        .eq('room_code', roomCode.toUpperCase())
        .maybeSingle();

      const activeGameType = room?.game_type || '2L1T';
      setGameType(activeGameType);

      if (activeGameType === 'GTS') {
        setStatements(null);
      } else if (activeGameType === 'WYR') {
        const { data } = await supabase.from('wyr_rounds').select('option_a, option_b').eq('id', currentRoundId).maybeSingle();
        if (data) {
          setStatements({ s1: data.option_a, s2: data.option_b });
        }
      } else {
        const { data } = await supabase.from('tl_rounds').select('statement_1, statement_2, statement_3').eq('id', currentRoundId).maybeSingle();
        if (data) {
          setStatements({ s1: data.statement_1, s2: data.statement_2, s3: data.statement_3 });
        }
      }
    };

    fetchRoundContext();
    setHasVoted(false);
    setTypedGuess('');
  }, [currentRoundId]);

  const castChoiceVote = async (optionNumber: number) => {
    const playerId = localStorage.getItem('player_id');
    if (!currentRoundId || !playerId || loading) return;

    setLoading(true);
    try {
      const targetTable = gameType === 'WYR' ? 'wyr_votes' : 'tl_votes';
      await supabase.from(targetTable).insert({
        round_id: currentRoundId,
        player_id: playerId,
        chosen_option: optionNumber,
      });
      setHasVoted(true);
    } catch (err) {
      console.error('Error inserting option vote row:', err);
    } finally {
      setLoading(false);
    }
  };

  const castTextVote = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerId = localStorage.getItem('player_id');
    const cleanGuess = typedGuess.trim();

    if (!currentRoundId || !playerId || !cleanGuess || loading) return;

    setLoading(true);
    try {
      await supabase.from('gts_votes').insert({
        round_id: currentRoundId,
        player_id: playerId,
        typed_answer: cleanGuess,
        is_correct: false
      });
      setHasVoted(true);
    } catch (err) {
      console.error('Error casting text speed-run guess:', err);
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center' }}>
        <div className="mobile-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--truth-green)' }}>Vote Locked In!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Look at the projector for the final countdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      <div className="mobile-card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
          Round Active
        </p>
        
        <h2 style={{ marginTop: '8px', fontSize: '1.4rem' }}>
          {gameType === 'WYR' 
            ? 'Which option do you prefer?' 
            : gameType === 'GTS' 
            ? 'What is the name of this song?' 
            : 'Identify the absolute TRUTH:'}
        </h2>
      </div>

      {gameType === 'GTS' ? (
        <form onSubmit={castTextVote} className="mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid #262636', marginTop: '10px' }}>
          <input 
            type="text"
            value={typedGuess}
            onChange={(e) => setTypedGuess(e.target.value)}
            disabled={loading}
            placeholder="Type your track guess here..."
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '1.2rem', 
              borderRadius: 'var(--radius)', 
              border: '1px solid #3e3e56', 
              backgroundColor: '#13131a', 
              color: '#fff',
              textAlign: 'center'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !typedGuess.trim()} 
            className="btn btn-primary" 
            style={{ height: '55px', fontSize: '1.2rem', background: 'var(--primary)' }}
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </button>
        </form>
      ) : (
        <div className="game-options-grid">
          <button 
            onClick={() => castChoiceVote(1)} 
            disabled={loading || !statements} 
            className="btn btn-primary" 
            style={{ backgroundColor: gameType === 'WYR' ? '#1e3a8a' : '#1e1b4b', border: gameType === 'WYR' ? '2px solid #3b82f6' : '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
          >
            {statements ? statements.s1 : 'Loading Option A...'}
          </button>

          <button 
            onClick={() => castChoiceVote(2)} 
            disabled={loading || !statements} 
            className="btn btn-primary" 
            style={{ backgroundColor: gameType === 'WYR' ? '#701a75' : '#1e1b4b', border: gameType === 'WYR' ? '2px solid #d946ef' : '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
          >
            {statements ? statements.s2 : 'Loading Option B...'}
          </button>

          {gameType === '2L1T' && (
            <button 
              onClick={() => castChoiceVote(3)} 
              disabled={loading || !statements} 
              className="btn btn-primary" 
              style={{ backgroundColor: '#1e1b4b', border: '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
            >
              {statements ? statements.s3 : 'Loading statement 3...'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}