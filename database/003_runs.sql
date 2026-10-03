-- Cultural Islands — run history (server-verified replays), v0.2
-- psql -U jofrey -d cultural_islands -f database/003_runs.sql

CREATE TABLE IF NOT EXISTS runs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id   UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    mode        VARCHAR(10) NOT NULL,           -- season | daily | code
    seed        BIGINT      NOT NULL,
    seed_code   VARCHAR(32),
    island      VARCHAR(20) NOT NULL,
    heat        INT         NOT NULL DEFAULT 0,
    rounds      INT         NOT NULL DEFAULT 12,
    score       INT         NOT NULL,
    won         BOOLEAN     NOT NULL,
    stars       INT         NOT NULL DEFAULT 0,
    xp_gained   INT         NOT NULL DEFAULT 0,
    outcome     JSONB       NOT NULL,
    commands    JSONB       NOT NULL,           -- full replay; re-verifiable at any time
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_board  ON runs(mode, seed, score DESC);
CREATE INDEX IF NOT EXISTS idx_runs_player ON runs(player_id, created_at DESC);

-- Highest Heat (difficulty) the player has WON at; -1 = none yet. Heat n+1 unlocks after winning n.
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS best_heat INT NOT NULL DEFAULT -1;
ALTER TABLE player_progression ADD COLUMN IF NOT EXISTS best_streak INT NOT NULL DEFAULT 0;
