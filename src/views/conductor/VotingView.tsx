import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function ConductorVotingView({ currentRoundId, roomCode }: { currentRoundId: string | null, roomCode: string }) {
  const [voteCount, setVoteCount] = useState(0);
  const [timer, setTimer] = useState(45);
  const [isEnding, setIsEnding] = useState(false);
  const [gameType, setGameType] = useState<string>('2L1T');
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string>('medium');

  useEffect(() => {
    const fetchGameContext = async () => {
      if (!currentRoundId) return;

      const { data: room } = await supabase.from('rooms').select('id, game_type').eq('room_code', roomCode).maybeSingle();
      if (!room) return;
      
      setGameType(room.game_type);

      if (room.game_type === 'GTS') {
        const { data: gtsRound } = await supabase
          .from('gts_rounds')
          .select('audio_key, difficulty')
          .eq('id', currentRoundId)
          .maybeSingle();

        if (gtsRound) {
          setAudioKey(gtsRound.audio_key);
          setActiveDifficulty(gtsRound.difficulty);
          setAudioUrl(`/audio/${gtsRound.audio_key}_${gtsRound.difficulty}.mp3`);
        }
      }
    };

    fetchGameContext();
  }, [roomCode, currentRoundId]);

  useEffect(() => {
    if (!currentRoundId || gameType !== 'GTS') return;

    const uniqueRoundSync = `gts-round-hint-${Math.random().toString(36).substring(2, 9)}`;
    const roundChannel = supabase
      .channel(uniqueRoundSync)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gts_rounds', filter: `id=eq.${currentRoundId}` },
        (payload) => {
          if (audioKey && payload.new.difficulty) {
            setActiveDifficulty(payload.new.difficulty);
            setAudioUrl(`/audio/${audioKey}_${payload.new.difficulty}.mp3`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundChannel);
    };
  }, [currentRoundId, gameType, audioKey]);

  const handleEndVoting = async () => {
    if (!currentRoundId || isEnding) return;
    setIsEnding(true);
    try {
      const playersRes = await supabase.from('players').select('id, score');
      if (!playersRes.data) return;
      const players = playersRes.data;

      if (gameType === 'GTS') {
        const { data: round } = await supabase.from('gts_rounds').select('correct_answer').eq('id', currentRoundId).single();
        const { data: votes } = await supabase.from('gts_votes').select('id, player_id, typed_answer, created_at').eq('round_id', currentRoundId);
        
        if (!round || !votes) return;
        const cleanCorrect = round.correct_answer.trim().toLowerCase();
        const correctVotes = votes
          .filter(v => v.typed_answer.trim().toLowerCase() === cleanCorrect)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const fastestPlayerId = correctVotes[0]?.player_id || null;

        for (const vote of votes) {
          const isCorrect = vote.typed_answer.trim().toLowerCase() === cleanCorrect;
          await supabase.from('gts_votes').update({ is_correct: isCorrect }).eq('id', vote.id);
        }

        for (const player of players) {
          let pointsEarned = 0;
          const hasCorrectVote = correctVotes.some(v => v.player_id === player.id);
          if (hasCorrectVote) {
            pointsEarned = player.id === fastestPlayerId ? 100 : 50;
          }
          await supabase.from('players').update({ score: (player.score || 0) + pointsEarned }).eq('id', player.id);
        }
      } else if (gameType === 'WYR') {
        const { data: votes } = await supabase.from('wyr_votes').select('player_id, chosen_option').eq('round_id', currentRoundId);
        if (!votes) return;
        const opt1Count = votes.filter(v => v.chosen_option === 1).length;
        const opt2Count = votes.filter(v => v.chosen_option === 2).length;

        for (const player of players) {
          const playerVote = votes.find(v => v.player_id === player.id);
          let pointsEarned = 0;
          if (playerVote) {
            const chosen = playerVote.chosen_option;
            const votedMajority = (chosen === 1 && opt1Count >= opt2Count) || (chosen === 2 && opt2Count >= opt1Count);
            if (votedMajority) pointsEarned = 50;
          }
          await supabase.from('players').update({ score: (player.score || 0) + pointsEarned }).eq('id', player.id);
        }
      } else {
        const { data: round } = await supabase.from('tl_rounds').select('correct_option').eq('id', currentRoundId).single();
        const { data: votes } = await supabase.from('tl_votes').select('player_id, chosen_option').eq('round_id', currentRoundId);
        if (!round || !votes) return;

        for (const player of players) {
          const playerVote = votes.find(v => v.player_id === player.id);
          let pointsEarned = 0;
          if (playerVote && playerVote.chosen_option === round.correct_option) {
            pointsEarned = 100;
          }
          await supabase.from('players').update({ score: (player.score || 0) + pointsEarned }).eq('id', player.id);
        }
      }
      await supabase.from('rooms').update({ status: 'RESULTS' }).eq('room_code', roomCode);
    } catch (err) {
      console.error(err);
      setIsEnding(false);
    }
  };

  useEffect(() => {
    if (timer === 0) handleEndVoting();
  }, [timer]);

  useEffect(() => {
    if (!currentRoundId) return;
    const targetVoteTable = gameType === 'GTS' ? 'gts_votes' : gameType === 'WYR' ? 'wyr_votes' : 'tl_votes';
    const uniqueVotingChannel = `live-votes-${Math.random().toString(36).substring(2, 9)}`;
    const voteChannel = supabase.channel(uniqueVotingChannel);

    const fetchVotes = async () => {
      const { count } = await supabase.from(targetVoteTable).select('*', { count: 'exact', head: true }).eq('round_id', currentRoundId);
      if (count !== null) setVoteCount(count);
    };
    fetchVotes();

    voteChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: targetVoteTable, filter: `round_id=eq.${currentRoundId}` }, () => setVoteCount((prev) => prev + 1))
      .subscribe();

    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(voteChannel);
      clearInterval(countdown);
    };
  }, [currentRoundId, gameType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px', gap: '30px', textAlign: 'center' }}>
      {audioUrl && <audio src={audioUrl} autoPlay style={{ display: 'none' }} key={audioUrl} />}

      <h1 style={{ fontSize: '3rem', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        ⏱️ {gameType === 'WYR' ? 'Dilemma Voting' : gameType === 'GTS' ? `Guess the Track (${activeDifficulty.toUpperCase()})` : 'Vote Running'}
      </h1>
      
      <div style={{ fontSize: '11rem', fontWeight: '900', color: timer < 10 ? 'var(--lie-red)' : '#fff', fontFamily: 'monospace' }}>
        {timer}<span style={{ fontSize: '4rem' }}>s</span>
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px 60px', borderRadius: '15px', border: '1px solid #262636' }}>
        <h3 style={{ fontSize: '2.5rem', fontWeight: '700' }}>Incoming Ballots: <span style={{ color: 'var(--primary)' }}>{voteCount}</span></h3>
      </div>
      
      <button onClick={handleEndVoting} disabled={isEnding} className="btn" style={{ maxWidth: '500px', height: '65px', fontSize: '1.4rem', backgroundColor: isEnding ? '#555' : 'var(--lie-red)', color: '#fff', marginTop: '40px' }}>
        {isEnding ? 'Computing Scores...' : 'Terminate Round & Compute Scores'}
      </button>
    </div>
  );
}