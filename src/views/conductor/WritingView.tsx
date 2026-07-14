import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function ConductorWritingView({ roomCode }: { roomCode: string }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameType, setGameType] = useState<string>('2L1T');
  const [loading, setLoading] = useState(false);

  const [statement1, setStatement1] = useState('');
  const [statement2, setStatement2] = useState('');
  const [statement3, setStatement3] = useState('');
  const [correctOption, setCorrectOption] = useState<number>(1);

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioKey, setAudioKey] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [processingAudio, setProcessingAudio] = useState(false);
  const [audioSuccess, setAudioSuccess] = useState(false);
  const [downloadedTracks, setDownloadedTracks] = useState<string[]>([]);

  const fetchDownloadedTracks = async () => {
    try {
      const response = await fetch('/api/tracks');
      const data = await response.json();
      if (data.success) {
        setDownloadedTracks(data.tracks);
      }
    } catch (err) {
      console.error('Failed to fetch local tracks list:', err);
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('id, game_type')
        .eq('room_code', roomCode)
        .single();
      
      if (data) {
        setRoomId(data.id);
        setGameType(data.game_type);
        
        if (data.game_type === 'GTS') {
          fetchDownloadedTracks();
        }
      }
    };
    fetchRoom();
  }, [roomCode]);

  const handleLaunchTlRound = async () => {
    if (!roomId || !statement1 || !statement2 || !statement3) {
      alert("Please fill in all three statements.");
      return;
    }
    setLoading(true);
    try {
      const { data: newRound, error: roundError } = await supabase
        .from('tl_rounds')
        .insert({
          room_id: roomId,
          statement_1: statement1.trim(),
          statement_2: statement2.trim(),
          statement_3: statement3.trim(),
          correct_option: correctOption
        })
        .select()
        .single();

      if (roundError) throw roundError;

      if (newRound) {
        await supabase
          .from('rooms')
          .update({ status: 'VOTING', current_round_id: newRound.id })
          .eq('id', roomId);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to launch 2L1T round.");
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchWyrRound = async () => {
    if (!roomId || !optionA || !optionB) {
      alert("Please fill in both options.");
      return;
    }
    setLoading(true);
    try {
      const { data: newRound, error: roundError } = await supabase
        .from('wyr_rounds')
        .insert({
          room_id: roomId,
          option_a: optionA.trim(),
          option_b: optionB.trim()
        })
        .select()
        .single();

      if (roundError) throw roundError;

      if (newRound) {
        await supabase
          .from('rooms')
          .update({ status: 'VOTING', current_round_id: newRound.id })
          .eq('id', roomId);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to launch WYR round.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessYoutubeLink = async () => {
    if (!youtubeUrl.trim() || processingAudio) return;

    setProcessingAudio(true);
    setAudioSuccess(false);
    setAudioKey('');
    setCorrectAnswer('');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });

      if (!response.ok) throw new Error("Server returned an error");

      const data = await response.json();
      if (data.success && data.audioKey) {
        setAudioKey(data.audioKey);
        setCorrectAnswer(data.correctAnswer);
        setAudioSuccess(true);
        fetchDownloadedTracks();
      } else {
        alert('Failed to extract audio. Check terminal logs.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to local downloader. Ensure Vite is running.');
    } finally {
      setProcessingAudio(false);
    }
  };

  const handleSelectLocalTrack = (trackName: string) => {
    setAudioKey(trackName);
    const formattedTitle = trackName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    setCorrectAnswer(formattedTitle);
    setAudioSuccess(true);
  };

  const handleLaunchGtsRound = async () => {
    if (!roomId || !audioKey || !correctAnswer.trim()) return;
    setLoading(true);
    try {
      const { data: newRound, error: roundError } = await supabase
        .from('gts_rounds')
        .insert({
          room_id: roomId,
          audio_key: audioKey,
          correct_answer: correctAnswer.trim(),
          difficulty: 'medium'
        })
        .select()
        .single();

      if (roundError) throw roundError;

      if (newRound) {
        await supabase
          .from('rooms')
          .update({ status: 'VOTING', current_round_id: newRound.id })
          .eq('id', roomId);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to launch GTS round.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px' }}>
      <div className="mobile-card" style={{ width: '100%', maxWidth: '600px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {gameType === '2L1T' && (
          <>
            <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--primary)', fontWeight: '900' }}>
              Set Up 2 Lies 1 Truth
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Statement 1:</label>
                <input 
                  type="text" 
                  value={statement1} 
                  onChange={(e) => setStatement1(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Statement 2:</label>
                <input 
                  type="text" 
                  value={statement2} 
                  onChange={(e) => setStatement2(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Statement 3:</label>
                <input 
                  type="text" 
                  value={statement3} 
                  onChange={(e) => setStatement3(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff' }}
                />
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Which one is the TRUTH?</label>
                <select 
                  value={correctOption} 
                  onChange={(e) => setCorrectOption(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff', fontSize: '1rem' }}
                >
                  <option value={1}>Statement 1 is Truth</option>
                  <option value={2}>Statement 2 is Truth</option>
                  <option value={3}>Statement 3 is Truth</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleLaunchTlRound} 
              disabled={loading}
              className="btn"
              style={{ width: '100%', height: '55px', fontSize: '1.2rem', backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 'bold', marginTop: '10px' }}
            >
              {loading ? 'Launching...' : 'Launch Live Round'}
            </button>
          </>
        )}

        {gameType === 'WYR' && (
          <>
            <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--primary)', fontWeight: '900' }}>
              Set Up Would You Rather
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Option A:</label>
                <input 
                  type="text" 
                  value={optionA} 
                  onChange={(e) => setOptionA(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Option B:</label>
                <input 
                  type="text" 
                  value={optionB} 
                  onChange={(e) => setOptionB(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff' }}
                />
              </div>
            </div>
            <button 
              onClick={handleLaunchWyrRound} 
              disabled={loading}
              className="btn"
              style={{ width: '100%', height: '55px', fontSize: '1.2rem', backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 'bold', marginTop: '10px' }}
            >
              {loading ? 'Launching...' : 'Launch Live Round'}
            </button>
          </>
        )}

        {gameType === 'GTS' && (
          <>
            <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--primary)', fontWeight: '900' }}>
              Set Up Guess The Song
            </h2>

            {downloadedTracks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #262636', paddingBottom: '20px' }}>
                <label style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Select Pre-Downloaded Track:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '5px' }}>
                  {downloadedTracks.map(track => (
                    <button
                      key={track}
                      onClick={() => handleSelectLocalTrack(track)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: audioKey === track ? 'var(--primary)' : '#13131a',
                        color: '#fff',
                        border: audioKey === track ? '1px solid #fff' : '1px solid #262636',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {track}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Or download new YouTube Video:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text"
                  placeholder="https://www.youtube.com/watch?..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={processingAudio || loading}
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff', fontSize: '1rem' }}
                />
                <button 
                  onClick={handleProcessYoutubeLink}
                  disabled={processingAudio || !youtubeUrl.trim() || loading}
                  className="btn btn-primary"
                  style={{ width: '140px', backgroundColor: processingAudio ? '#555' : 'var(--primary)' }}
                >
                  {processingAudio ? 'Processing...' : 'Prepare Track'}
                </button>
              </div>
            </div>

            {audioSuccess && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #262636', paddingTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Identified Song Title (Verify and Clean):</label>
                  <input 
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #262636', backgroundColor: '#13131a', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}
                  />
                  <p style={{ fontSize: '0.85rem', color: '#059669' }}>
                    Track downloaded as: <code style={{ backgroundColor: '#111', padding: '2px 6px', borderRadius: '4px' }}>{audioKey}</code>
                  </p>
                </div>

                <button 
                  onClick={handleLaunchGtsRound}
                  disabled={loading || !correctAnswer.trim()}
                  className="btn"
                  style={{ width: '100%', height: '55px', fontSize: '1.2rem', backgroundColor: '#059669', color: '#fff', fontWeight: 'bold' }}
                >
                  {loading ? 'Launching...' : 'Launch Live Round'}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}