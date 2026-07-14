import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import '@/App.css';

export default function PlayerScoreView({ currentRoundId }: { currentRoundId: string | null }) {
  const [feedback, setFeedback] = useState('Evaluating scores...');
  const [totalScore, setTotalScore] = useState(0);
  const [gameType, setGameType] = useState('2L1T');

  useEffect(() => {
    const playerId = localStorage.getItem('player_id');
    const roomCode = localStorage.getItem('active_room_code');
    
    if (!currentRoundId || !playerId || !roomCode) return;

    const evaluatePerformance = async () => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('game_type')
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();

        const activeGameType = room?.game_type || '2L1T';
        setGameType(activeGameType);

        const { data: player } = await supabase
          .from('players')
          .select('score')
          .eq('id', playerId)
          .single();

        if (player) setTotalScore(player.score);

        if (activeGameType === 'GTS') {
          const { data: vote } = await supabase
            .from('gts_votes')
            .select('is_correct')
            .eq('round_id', currentRoundId)
            .eq('player_id', playerId)
            .maybeSingle();

          if (vote) {
            if (vote.is_correct) {
              const { data: fastestCorrect } = await supabase
                .from('gts_votes')
                .select('player_id')
                .eq('round_id', currentRoundId)
                .eq('is_correct', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

              if (fastestCorrect && fastestCorrect.player_id === playerId) {
                setFeedback('Fastest Answer! Perfect +100 PTS!');
              } else {
                setFeedback('Correct Answer! You earned +50 PTS!');
              }
            } else {
              setFeedback('Wrong Guess! 0 points this round.');
            }
          } else {
            setFeedback('Out of time! No guess submitted.');
          }

        } else if (activeGameType === 'WYR') {
          const { data: vote } = await supabase
            .from('wyr_votes')
            .select('chosen_option')
            .eq('round_id', currentRoundId)
            .eq('player_id', playerId)
            .maybeSingle();

          const { data: allVotes } = await supabase
            .from('wyr_votes')
            .select('chosen_option')
            .eq('round_id', currentRoundId);

          if (vote && allVotes) {
            const opt1Count = allVotes.filter(v => v.chosen_option === 1).length;
            const opt2Count = allVotes.filter(v => v.chosen_option === 2).length;
            const chosen = vote.chosen_option;

            const votedMajority = (chosen === 1 && opt1Count >= opt2Count) || (chosen === 2 && opt2Count >= opt1Count);

            if (votedMajority) {
              setFeedback('Majority Side! Secured +50 PTS!');
            } else {
              setFeedback('Minority Side! 0 points this round.');
            }
          } else {
            setFeedback('Out of time! No option selected.');
          }

        } else {
          const { data: round } = await supabase
            .from('tl_rounds')
            .select('correct_option')
            .eq('id', currentRoundId)
            .single();

          const { data: vote } = await supabase
            .from('tl_votes')
            .select('chosen_option')
            .eq('round_id', currentRoundId)
            .eq('player_id', playerId)
            .maybeSingle();

          if (round && vote) {
            if (vote.chosen_option === round.correct_option) {
              setFeedback('Correct! You earned +100 PTS!');
            } else {
              setFeedback('Tricked! 0 points this round.');
            }
          } else {
            setFeedback('Out of time! No vote recorded.');
          }
        }
      } catch (err) {
        console.error('Error compiling score feedback card:', err);
        setFeedback('Synchronization tracking error.');
      }
    };

    evaluatePerformance();
  }, [currentRoundId]);

  const isPositiveFeedback = 
    feedback.includes('Correct') || 
    feedback.includes('Fastest') || 
    feedback.includes('Majority');

  const isNeutralFeedback = 
    feedback.startsWith('Evaluating') || 
    feedback.startsWith('Out of time') || 
    feedback.startsWith('Synchronization');

  const getFeedbackColor = () => {
    if (isNeutralFeedback) return 'var(--text-muted)';
    if (gameType === 'WYR' && isPositiveFeedback) return 'var(--primary)';
    return isPositiveFeedback ? 'var(--truth-green)' : 'var(--lie-red)';
  };

  const getPhaseHeader = () => {
    if (gameType === 'WYR') return 'Poll Concluded';
    if (gameType === 'GTS') return 'Track Evaluated';
    return 'Round Concluded';
  };

  return (
    <div className="mobile-container" style={{ justifyContent: 'center' }}>
      <div className="mobile-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 24px' }}>
        <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {getPhaseHeader()}
        </p>
        
        <h2 style={{ fontSize: '1.6rem', color: getFeedbackColor(), lineHeight: '1.4' }}>
          {feedback}
        </h2>
        
        <div style={{ margin: '10px 0', height: '1px', backgroundColor: '#262636' }} />
        <p style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>
          Your Balance: <strong style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>{totalScore} pts</strong>
        </p>
      </div>
    </div>
  );
}