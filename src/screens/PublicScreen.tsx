import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import JoinView from '@/views/players/JoinView';
import PlayerVoteView from '@/views/players/VoteView';
import PlayerScoreView from '@/views/players/ScoreView';

type GameType = '2L1T' | 'WYR' | 'GTS';

export default function PublicScreen() {
  const [hasJoined, setHasJoined] = useState(false);
  const [roomStatus, setRoomStatus] = useState<string>('LOBBY');
  const [gameType, setGameType] = useState<GameType>('2L1T');
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [roomCode, setRoomCode] = useState<string>(() => localStorage.getItem('active_room_code') || '');

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

  const clearLocalSession = () => {
    localStorage.removeItem('player_id');
    localStorage.removeItem('player_name');
    localStorage.removeItem('active_room_code');
    setHasJoined(false);
    setRoomCode('');
    setRoomStatus('LOBBY');
    setGameType('2L1T');
    setCurrentRoundId(null);
    setIsVerifying(false);
  };

  useEffect(() => {
    let playerRoomChannel: any;

    const syncAndListen = async () => {
      if (!roomCode) {
        setIsVerifying(false);
        return;
      }

      const { data: room } = await supabase
        .from('rooms')
        .select('id, status, game_type')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (!room) {
        clearLocalSession();
        return;
      }

      const activeGameType = (room.game_type || '2L1T') as GameType;
      setRoomStatus(room.status);
      setGameType(activeGameType);

      const storedPlayerId = localStorage.getItem('player_id');
      if (storedPlayerId) {
        const { data: activePlayer } = await supabase
          .from('players')
          .select('id')
          .eq('id', storedPlayerId)
          .eq('room_id', room.id)
          .maybeSingle();

        if (activePlayer) {
          setHasJoined(true);
        } else {
          localStorage.removeItem('player_id');
          localStorage.removeItem('player_name');
          setHasJoined(false);
        }
      }

      setIsVerifying(false);

      if (room.status === 'VOTING' || room.status === 'RESULTS') {
        const roundId = await fetchLatestRound(room.id, activeGameType);
        setCurrentRoundId(roundId);
      }

      const uniqueChannel = `player-sync-${roomCode}-${Math.random().toString(36).substring(2, 9)}`;
      playerRoomChannel = supabase
        .channel(uniqueChannel)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
          async (payload) => {
            if (payload.eventType === 'DELETE') {
              clearLocalSession();
            } else if (payload.eventType === 'UPDATE') {
              const nextStatus = payload.new.status;
              const nextGameType = (payload.new.game_type || '2L1T') as GameType;
              
              setRoomStatus(nextStatus);
              setGameType(nextGameType);
              
              if (nextStatus === 'VOTING' || nextStatus === 'RESULTS') {
                const roundId = await fetchLatestRound(payload.new.id, nextGameType);
                setCurrentRoundId(roundId);
              }
            }
          }
        )
        .subscribe();
    };

    syncAndListen();

    return () => {
      if (playerRoomChannel) supabase.removeChannel(playerRoomChannel);
    };
  }, [roomCode]);

  const handleLeaveRoom = async () => {
    const confirmLeave = window.confirm("Are you sure you want to leave this game room?");
    if (!confirmLeave) return;

    const playerId = localStorage.getItem('player_id');
    if (playerId) {
      await supabase.from('players').delete().eq('id', playerId);
    }

    clearLocalSession();
  };

  if (isVerifying) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', color: '#aaa' }}>
        <h3>Connecting to session...</h3>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <JoinView 
        onJoinSuccess={(verifiedCode) => {
          localStorage.setItem('active_room_code', verifiedCode);
          setRoomCode(verifiedCode);
          setHasJoined(true);
        }} 
      />
    );
  }

  const renderGameView = () => {
    switch (roomStatus) {
      case 'LOBBY':
      case 'WRITING':
        return (
          <div className="mobile-container" style={{ justifyContent: 'center' }}>
            <div className="mobile-card" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <span style={{ fontSize: '2.5rem' }}>⏳</span>
              <h2 style={{ marginTop: '15px' }}>Room: {roomCode}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '0.95rem', lineHeight: '1.4' }}>
                The host is setting up the stage. Look up at the primary screen!
              </p>
            </div>
          </div>
        );
      case 'VOTING':
        return <PlayerVoteView currentRoundId={currentRoundId} />;
      case 'RESULTS':
        return <PlayerScoreView currentRoundId={currentRoundId} />;
      default:
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading phase...</div>;
    }
  };

  const getMiniLabel = () => {
    if (gameType === 'WYR') return 'WYR';
    if (gameType === 'GTS') return 'Song Guess';
    return '2L1T';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 20px', 
        backgroundColor: 'var(--bg-card)', 
        borderBottom: '1px solid #262636' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            ROOM: <span style={{ color: 'var(--primary)' }}>{roomCode}</span>
          </span>
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#1e1b4b', borderRadius: '10px', color: 'var(--primary)', fontWeight: 'bold' }}>
            {getMiniLabel()}
          </span>
        </div>
        
        <button 
          onClick={handleLeaveRoom}
          style={{ 
            backgroundColor: 'transparent', 
            color: 'var(--lie-red)', 
            border: '1px solid var(--lie-red)', 
            padding: '6px 12px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2a1414')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Leave
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderGameView()}
      </div>
      
    </div>
  );
}