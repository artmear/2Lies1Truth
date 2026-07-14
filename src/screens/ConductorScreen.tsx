import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import LobbyView from '@/views/conductor/LobbyView';
import WritingView from '@/views/conductor/WritingView';
import ConductorVotingView from '@/views/conductor/VotingView';
import ConductorResultsView from '@/views/conductor/ResultsView';

type GameType = '2L1T' | 'WYR' | 'GTS';

const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function ConductorScreen() {
  const [status, setStatus] = useState<'LOBBY' | 'WRITING' | 'VOTING' | 'RESULTS'>('LOBBY');
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [gameType, setGameType] = useState<GameType>('2L1T');
  const [roomCode] = useState<string>(() => generateRandomCode());

  const fetchLatestRound = async (roomId: string, activeGameType: GameType) => {
    let targetTable = 'tl_rounds';
    if (activeGameType === 'WYR') targetTable = 'wyr_rounds';
    if (activeGameType === 'GTS') targetTable = 'gts_rounds';

    const { data } = await supabase
      .from(targetTable)
      .select('id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    return data?.id || null;
  };

  useEffect(() => {
    const uniqueChannel = `conductor-sync-${roomCode}-${Math.random().toString(36).substring(2, 9)}`;
    let roomChannel: any;

    const initSync = async () => {
      roomChannel = supabase
        .channel(uniqueChannel)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` },
          async (payload) => {
            const nextStatus = payload.new.status;
            const nextGameType = (payload.new.game_type || '2L1T') as GameType;
            
            setStatus(nextStatus);
            setGameType(nextGameType);
            
            if (nextStatus === 'VOTING' || nextStatus === 'RESULTS') {
              const roundId = await fetchLatestRound(payload.new.id, nextGameType);
              setCurrentRoundId(roundId);
            }
          }
        )
        .subscribe();
    };

    initSync();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [roomCode]);

  const getGameLabel = () => {
    if (gameType === 'WYR') return 'Would You Rather';
    if (gameType === 'GTS') return 'Guess The Song';
    return '2 Lies 1 Truth';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 40px', 
        backgroundColor: 'var(--bg-card, #171721)', 
        borderBottom: '1px solid #262636',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Presenter Dashboard
          </span>
          {status !== 'LOBBY' && (
            <>
              <span style={{ fontSize: '0.85rem', padding: '4px 12px', backgroundColor: '#1e1b4b', borderRadius: '20px', color: 'var(--primary, #6366f1)', fontWeight: 'bold' }}>
                {getGameLabel()}
              </span>
              <span style={{ fontSize: '0.85rem', padding: '4px 12px', backgroundColor: '#262636', borderRadius: '20px', color: '#fff', opacity: 0.8 }}>
                {status} PHASE
              </span>
            </>
          )}
        </div>

        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          URL: <span style={{ color: 'var(--primary, #6366f1)', padding: '8px 18px', borderRadius: '8px', marginLeft: '8px', fontFamily: 'monospace', fontWeight: '900' }}>{"http://10.227.150.144:5173/"}</span>
        </div>

        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ROOM CODE: <span style={{ color: 'var(--primary, #6366f1)', backgroundColor: '#1e1b4b', padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--primary, #6366f1)', marginLeft: '8px', fontFamily: 'monospace', fontWeight: '900' }}>{roomCode}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {status === 'LOBBY' && <LobbyView roomCode={roomCode} />}
        {status === 'WRITING' && <WritingView roomCode={roomCode} />}
        {status === 'VOTING' && <ConductorVotingView currentRoundId={currentRoundId} roomCode={roomCode} />}
        {status === 'RESULTS' && <ConductorResultsView roomCode={roomCode} />}
      </div>

    </div>
  );
}