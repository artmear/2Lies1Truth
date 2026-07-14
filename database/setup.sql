CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'LOBBY',
    game_type TEXT NOT NULL DEFAULT '2L1T'
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tl_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    statement_1 TEXT NOT NULL,
    statement_2 TEXT NOT NULL,
    statement_3 TEXT NOT NULL,
    correct_option INT NOT NULL CHECK (correct_option IN (1, 2, 3))
);

CREATE TABLE tl_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES tl_rounds(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    chosen_option INT NOT NULL CHECK (chosen_option IN (1, 2, 3))
);

CREATE TABLE wyr_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL
);

CREATE TABLE wyr_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES wyr_rounds(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    chosen_option INT NOT NULL CHECK (chosen_option IN (1, 2))
);

CREATE TABLE gts_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    audio_key TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

CREATE TABLE gts_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES gts_rounds(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    typed_answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms, players, tl_votes, wyr_votes, gts_votes, gts_rounds;

ALTER TABLE wyr_rounds 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

ALTER TABLE tl_rounds 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

ALTER TABLE gts_rounds 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;