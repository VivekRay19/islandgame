-- Cultural Islands — Complete Schema v1.0
-- psql -U postgres -d cultural_islands -f database/001_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PLAYERS & AUTH
CREATE TABLE IF NOT EXISTS players (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    display_name  VARCHAR(100),
    avatar_id     INT          DEFAULT 0,
    level         INT          DEFAULT 1,
    xp            INT          DEFAULT 0,
    total_games   INT          DEFAULT 0,
    wins          INT          DEFAULT 0,
    losses        INT          DEFAULT 0,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- GAMES
CREATE TABLE IF NOT EXISTS games (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_code          VARCHAR(8)  UNIQUE NOT NULL,
    host_player_id     UUID        NOT NULL REFERENCES players(id),
    game_mode          VARCHAR(20) NOT NULL DEFAULT 'turn_based',
    status             VARCHAR(20) NOT NULL DEFAULT 'waiting',
    max_players        INT         NOT NULL DEFAULT 4,
    current_player_idx INT         DEFAULT 0,
    current_round      INT         DEFAULT 1,
    max_rounds         INT         DEFAULT 6,
    winner_id          UUID        REFERENCES players(id),
    settings           JSONB       DEFAULT '{}',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id     UUID NOT NULL REFERENCES players(id),
    turn_order    INT  NOT NULL,
    island_type   VARCHAR(30) NOT NULL DEFAULT 'farming',
    specialty_res VARCHAR(20) NOT NULL DEFAULT 'grain',
    is_eliminated BOOLEAN     DEFAULT false,
    final_rank    INT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id),
    UNIQUE(game_id, turn_order)
);


CREATE TABLE IF NOT EXISTS game_states (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    saved_at   TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS & TRADES
CREATE TABLE IF NOT EXISTS game_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id         UUID NOT NULL REFERENCES players(id),
    event_type        VARCHAR(30) NOT NULL,
    target_q          INT,
    target_r          INT,
    was_resolved      BOOLEAN     DEFAULT false,
    resolution_action TEXT,
    resources_spent   JSONB       DEFAULT '{}',
    round_triggered   INT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    from_player_id UUID NOT NULL REFERENCES players(id),
    trader_id      VARCHAR(50),
    offer_resource VARCHAR(20) NOT NULL,
    offer_amount   INT         NOT NULL,
    want_resource  VARCHAR(20) NOT NULL,
    want_amount    INT         NOT NULL,
    status         VARCHAR(20) DEFAULT 'completed',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- SEASONS & LEADERBOARD
CREATE TABLE IF NOT EXISTS seasons (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_number INT UNIQUE NOT NULL,
    name          VARCHAR(100),
    starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at       TIMESTAMPTZ,
    is_active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS season_rankings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id    UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    player_id    UUID NOT NULL REFERENCES players(id),
    rank         INT,
    score        INT DEFAULT 0,
    wins         INT DEFAULT 0,
    games_played INT DEFAULT 0,
    UNIQUE(season_id, player_id)
);

-- PROGRESSION
CREATE TABLE IF NOT EXISTS player_progression (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id          UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE UNIQUE,
    unlocked_tiles     JSONB DEFAULT '["tile_farm","tile_sacred_forest","tile_river_bend","tile_community_house"]',
    unlocked_islands   JSONB DEFAULT '["farming","forest"]',
    unlocked_cosmetics JSONB DEFAULT '[]',
    total_xp           INT  DEFAULT 0,
    current_streak     INT  DEFAULT 0,
    last_played_at     TIMESTAMPTZ
);

-- CAMPAIGN — LIGHT (island ages)
CREATE TABLE IF NOT EXISTS island_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_number   INT  DEFAULT 1,
    island_snapshot  JSONB NOT NULL,
    resource_drift   JSONB DEFAULT '{}',
    degraded_tiles   JSONB DEFAULT '[]',
    grown_tiles      JSONB DEFAULT '[]',
    narrative_note   TEXT,
    final_score      INT  DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPAIGN — MEDIUM (world map)
CREATE TABLE IF NOT EXISTS world_regions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code     VARCHAR(10) UNIQUE NOT NULL,
    owner_player_id UUID REFERENCES players(id),
    region_type     VARCHAR(30) NOT NULL DEFAULT 'forest',
    health          INT DEFAULT 100,
    deforestation_lvl INT DEFAULT 0,
    flood_risk      INT DEFAULT 0,
    trade_connections JSONB DEFAULT '[]',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPAIGN — DEEP (civilisation arc)
CREATE TABLE IF NOT EXISTS campaign_progress (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id              UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE UNIQUE,
    current_act            INT  DEFAULT 1,
    session_count          INT  DEFAULT 0,
    story_flags            JSONB DEFAULT '{}',
    active_story_events    JSONB DEFAULT '[]',
    completed_story_events JSONB DEFAULT '[]',
    civilization_name      TEXT,
    legacy_score           INT  DEFAULT 0,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_events (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key          VARCHAR(100) UNIQUE NOT NULL,
    act                INT  NOT NULL,
    trigger_session    INT,
    trigger_conditions JSONB DEFAULT '{}',
    title              TEXT NOT NULL,
    narrative          TEXT NOT NULL,
    choices            JSONB NOT NULL,
    is_branching       BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS player_story_choices (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id            UUID NOT NULL REFERENCES players(id),
    event_key            VARCHAR(100) NOT NULL,
    choice_key           TEXT NOT NULL,
    consequences_applied JSONB DEFAULT '{}',
    session_number       INT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_games_status          ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_code            ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_game_players_game     ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player   ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_island_history_player ON island_history(player_id);
CREATE INDEX IF NOT EXISTS idx_season_rankings       ON season_rankings(season_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_game_states_game ON game_states(game_id);
