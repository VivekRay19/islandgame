//! Verified runs. The browser plays the season with the WASM engine; here the
//! SAME rules (the `island-core` crate) replay the submitted commands. The
//! score, XP and unlocks come from OUR replay, never from the client's claim.
//!
//! Cost to this server per submission: one replay of a few hundred commands
//! (well under a millisecond). No rendering, no per-frame traffic.

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{Duration, NaiveDate, Utc};
use island_core::{
    daily_seed, hash_seed, island_for_seed, level_for_xp, tiles_unlocked_at, xp_for_next_level,
    Command, Config, Game, IslandKind, Phase, MAX_HEAT,
};
use serde::Deserialize;
use sqlx::Row;

use crate::handlers::auth::extract_player_id;
use crate::models::errors::AppError;
use crate::AppState;

const MAX_COMMANDS: usize = 2500;

#[derive(Deserialize)]
pub struct SubmitRun {
    pub mode: String,
    pub seed: u64,
    pub seed_code: Option<String>,
    pub island: IslandKind,
    #[serde(default)]
    pub heat: u8,
    pub commands: Vec<Command>,
    #[serde(default)]
    pub rules_version: Option<String>,
}

fn today() -> NaiveDate {
    Utc::now().date_naive()
}

fn bad(m: &str) -> AppError {
    AppError::BadRequest(m.to_string())
}

struct Profile {
    xp: i32,
    level: i32,
    best_heat: i32,
    streak: i32,
    best_streak: i32,
    last_day: Option<NaiveDate>,
}

async fn load_profile(state: &AppState, pid: uuid::Uuid) -> Result<Profile, AppError> {
    sqlx::query("INSERT INTO player_progression (player_id) VALUES ($1) ON CONFLICT DO NOTHING")
        .bind(pid)
        .execute(&state.db)
        .await?;
    let row = sqlx::query(
        "SELECT p.xp, p.level, g.best_heat, g.current_streak, g.best_streak,
                (g.last_played_at AT TIME ZONE 'UTC')::date AS last_day
         FROM players p JOIN player_progression g ON g.player_id = p.id WHERE p.id = $1",
    )
    .bind(pid)
    .fetch_one(&state.db)
    .await?;
    Ok(Profile {
        xp: row.try_get("xp")?,
        level: row.try_get("level")?,
        best_heat: row.try_get("best_heat")?,
        streak: row.try_get("current_streak")?,
        best_streak: row.try_get("best_streak")?,
        last_day: row.try_get("last_day")?,
    })
}

pub async fn profile(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let p = load_profile(&state, pid).await?;
    let level = level_for_xp(p.xp.max(0) as u32).max(1);
    let date = today().format("%Y-%m-%d").to_string();
    let seed = daily_seed(&date);

    let best: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(score) FROM runs WHERE player_id=$1 AND mode='daily' AND seed=$2",
    )
    .bind(pid)
    .bind(seed as i64)
    .fetch_one(&state.db)
    .await?;
    let best_season: Option<i32> =
        sqlx::query_scalar("SELECT MAX(score) FROM runs WHERE player_id=$1 AND mode='season'")
            .bind(pid)
            .fetch_one(&state.db)
            .await?;
    let runs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM runs WHERE player_id=$1")
        .bind(pid)
        .fetch_one(&state.db)
        .await?;
    // A streak is only alive if the last run was today or yesterday.
    let alive = matches!(p.last_day, Some(d) if d == today() || d == today() - Duration::days(1));

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "rules_version": island_core::RULES_VERSION,
        "level": level, "xp": p.xp, "next_xp": xp_for_next_level(p.xp.max(0) as u32),
        "unlocks": island_core::view::unlocks(level),
        "best_heat": p.best_heat, "max_heat": MAX_HEAT, "heat_allowed": (p.best_heat + 1).clamp(0, MAX_HEAT as i32),
        "streak": if alive { p.streak } else { 0 }, "best_streak": p.best_streak,
        "played_today": matches!(p.last_day, Some(d) if d == today()),
        "daily": { "date": date, "seed": seed, "island": island_for_seed(seed).id(), "best": best },
        "best_season": best_season, "runs": runs,
    })))
}

pub async fn submit(
    req: HttpRequest,
    state: web::Data<AppState>,
    body: web::Json<SubmitRun>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let b = body.into_inner();
    if let Some(v) = &b.rules_version {
        if v != island_core::RULES_VERSION {
            return Err(bad(&format!(
                "Your game files (rules {v}) are out of date; the server runs rules {}. Hard-refresh the page (Ctrl+Shift+R).",
                island_core::RULES_VERSION
            )));
        }
    }
    if b.commands.is_empty() || b.commands.len() > MAX_COMMANDS {
        return Err(bad("Run has an invalid length."));
    }
    let prof = load_profile(&state, pid).await?;
    let level = level_for_xp(prof.xp.max(0) as u32).max(1);

    // Build the config from SERVER-side truth, not from what the client says it was allowed.
    let mut cfg = Config::new(b.seed, b.island);
    let mut seed_code = None;
    match b.mode.as_str() {
        "season" => {
            if level < b.island.unlock_level() {
                return Err(bad("That island is not unlocked yet."));
            }
            if b.heat > MAX_HEAT || (b.heat as i32) > prof.best_heat + 1 {
                return Err(bad("That Heat is not unlocked yet."));
            }
            cfg.heat = b.heat;
            cfg.unlocked = Some(tiles_unlocked_at(level));
        }
        "daily" => {
            let ok = [today(), today() - Duration::days(1)]
                .iter()
                .any(|d| daily_seed(&d.format("%Y-%m-%d").to_string()) == b.seed);
            if !ok {
                return Err(bad("That is not a current Daily Island."));
            }
            cfg.island = island_for_seed(b.seed);
        }
        "code" => {
            let code = b
                .seed_code
                .clone()
                .unwrap_or_default()
                .trim()
                .to_uppercase();
            if code.len() < 3 || code.len() > 24 || hash_seed(&code) != b.seed {
                return Err(bad("Table code does not match its seed."));
            }
            cfg.island = island_for_seed(b.seed);
            seed_code = Some(code);
        }
        _ => return Err(bad("Unknown run mode.")),
    }

    let commands = b.commands.clone();
    let cfg2 = cfg.clone();
    let replayed = web::block(move || Game::replay(cfg2, &commands))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let g = replayed.map_err(|(i, e)| bad(&format!("Replay rejected at move {i}: {e}")))?;
    if g.phase != Phase::Over {
        return Err(bad("That season was not finished."));
    }
    let out = g.outcome.clone().ok_or_else(|| bad("No outcome."))?;

    // XP: ranked seasons always; the daily pays once per day; shared codes pay nothing (no farming).
    let already_daily: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM runs WHERE player_id=$1 AND mode='daily' AND created_at::date = (NOW() AT TIME ZONE 'UTC')::date)",
    )
    .bind(pid)
    .fetch_one(&state.db)
    .await?;
    let xp_gain: i32 = match b.mode.as_str() {
        "season" => out.xp as i32,
        "daily" if !already_daily => out.xp as i32,
        _ => 0,
    };
    let new_xp = prof.xp + xp_gain;
    let new_level = level_for_xp(new_xp.max(0) as u32).max(1) as i32;

    // Streak: consecutive days with at least one verified run.
    let t = today();
    let streak = match prof.last_day {
        Some(d) if d == t => prof.streak.max(1),
        Some(d) if d == t - Duration::days(1) => prof.streak + 1,
        _ => 1,
    };
    let best_streak = prof.best_streak.max(streak);
    let best_heat = if b.mode == "season" && out.won {
        prof.best_heat.max(b.heat as i32)
    } else {
        prof.best_heat
    };

    let mut tx = state.db.begin().await?;
    sqlx::query(
        "INSERT INTO runs (player_id, mode, seed, seed_code, island, heat, rounds, score, won, stars, xp_gained, outcome, commands)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    )
    .bind(pid)
    .bind(&b.mode)
    .bind(b.seed as i64)
    .bind(&seed_code)
    .bind(cfg.island.id())
    .bind(cfg.heat as i32)
    .bind(cfg.rounds as i32)
    .bind(out.score)
    .bind(out.won)
    .bind(out.stars as i32)
    .bind(xp_gain)
    .bind(serde_json::to_value(&out).unwrap_or_default())
    .bind(serde_json::to_value(&g.history).unwrap_or_default())
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "UPDATE players SET xp=$2, level=$3, total_games=total_games+1, wins=wins+$4, losses=losses+$5, updated_at=NOW() WHERE id=$1",
    )
    .bind(pid)
    .bind(new_xp)
    .bind(new_level)
    .bind(out.won as i32)
    .bind(!out.won as i32)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "UPDATE player_progression SET total_xp=$2, best_heat=$3, current_streak=$4, best_streak=$5, last_played_at=NOW() WHERE player_id=$1",
    )
    .bind(pid)
    .bind(new_xp)
    .bind(best_heat)
    .bind(streak)
    .bind(best_streak)
    .execute(&mut *tx)
    .await?;
    if b.mode == "season" {
        // Feeds the existing lobby "Season Board".
        sqlx::query(
            "INSERT INTO season_rankings (season_id, player_id, score, wins, games_played)
             SELECT id, $1, $2, $3, 1 FROM seasons WHERE is_active = true ORDER BY season_number DESC LIMIT 1
             ON CONFLICT (season_id, player_id) DO UPDATE SET
               score = season_rankings.score + EXCLUDED.score,
               wins = season_rankings.wins + EXCLUDED.wins,
               games_played = season_rankings.games_played + 1",
        )
        .bind(pid)
        .bind(out.score)
        .bind(out.won as i32)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    let rank: Option<i64> = if b.mode != "season" {
        sqlx::query_scalar(
            "SELECT COUNT(*) + 1 FROM (SELECT player_id, MAX(score) s FROM runs WHERE mode=$1 AND seed=$2 GROUP BY player_id) x
             WHERE x.s > $3",
        )
        .bind(&b.mode)
        .bind(b.seed as i64)
        .bind(out.score)
        .fetch_one(&state.db)
        .await
        .ok()
    } else {
        None
    };

    let before = island_core::view::unlocks(level as u32);
    let after = island_core::view::unlocks(new_level as u32);
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "verified": true, "outcome": out,
        "xp_gained": xp_gain, "xp": new_xp, "next_xp": xp_for_next_level(new_xp.max(0) as u32),
        "level_before": level, "level": new_level, "leveled_up": new_level > level as i32,
        "unlocked_before": before, "unlocks": after,
        "streak": streak, "best_heat": best_heat,
        "heat_allowed": (best_heat + 1).clamp(0, MAX_HEAT as i32),
        "rank": rank,
    })))
}

#[derive(Deserialize)]
pub struct BoardQuery {
    pub mode: Option<String>,
    pub seed: Option<u64>,
}

pub async fn board(
    req: HttpRequest,
    state: web::Data<AppState>,
    q: web::Query<BoardQuery>,
) -> Result<HttpResponse, AppError> {
    extract_player_id(&req, &state.config.jwt_secret)?;
    let mode = q.mode.clone().unwrap_or_else(|| "daily".into());
    if !["daily", "code"].contains(&mode.as_str()) {
        return Err(bad("Unknown board."));
    }
    let seed = q
        .seed
        .unwrap_or_else(|| daily_seed(&today().format("%Y-%m-%d").to_string()));
    let rows = sqlx::query(
        "SELECT COALESCE(p.display_name, p.username) AS name, MAX(r.score) AS score,
                BOOL_OR(r.won) AS won, MAX(r.stars) AS stars
         FROM runs r JOIN players p ON p.id = r.player_id
         WHERE r.mode = $1 AND r.seed = $2
         GROUP BY p.id, p.display_name, p.username
         ORDER BY score DESC LIMIT 20",
    )
    .bind(&mode)
    .bind(seed as i64)
    .fetch_all(&state.db)
    .await?;
    let entries: Vec<serde_json::Value> = rows
        .iter()
        .enumerate()
        .map(|(i, r)| {
            serde_json::json!({
                "rank": i + 1,
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "score": r.try_get::<i32, _>("score").unwrap_or(0),
                "won": r.try_get::<bool, _>("won").unwrap_or(false),
                "stars": r.try_get::<i32, _>("stars").unwrap_or(0),
            })
        })
        .collect();
    Ok(HttpResponse::Ok().json(
        serde_json::json!({ "success": true, "seed": seed, "mode": mode, "entries": entries }),
    ))
}
