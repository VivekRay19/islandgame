use crate::game_logic::{events as ev_logic, hex, scoring, trade as trade_logic};
use crate::handlers::auth::extract_player_id;
use crate::models::errors::AppError;
use crate::models::game::*;
use crate::AppState;
use actix_web::{web, HttpRequest, HttpResponse};
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use uuid::Uuid;

fn game_code() -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect::<String>()
        .to_uppercase()
}

async fn load_state(db: &sqlx::PgPool, game_id: &Uuid) -> Result<GameStateData, AppError> {
    let row = sqlx::query!(
        "SELECT state_data FROM game_states WHERE game_id = $1",
        game_id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::NotFound("Game state not found".into()))?;
    serde_json::from_value(row.state_data)
        .map_err(|e| AppError::Internal(format!("State deserialize: {e}")))
}

async fn save_state(
    db: &sqlx::PgPool,
    game_id: &Uuid,
    state: &GameStateData,
) -> Result<(), AppError> {
    let data = serde_json::to_value(state)
        .map_err(|e| AppError::Internal(format!("State serialize: {e}")))?;
    sqlx::query!(
        r#"INSERT INTO game_states (game_id, state_data)
           VALUES ($1, $2)
           ON CONFLICT (game_id) DO UPDATE SET state_data=$2, saved_at=NOW()"#,
        game_id,
        data
    )
    .execute(db)
    .await?;
    Ok(())
}

pub async fn list_games(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    extract_player_id(&req, &state.config.jwt_secret)?;
    let rows = sqlx::query!(
        r#"SELECT id, game_code, game_mode, status, max_players, current_round
           FROM games WHERE status IN ('waiting','in_progress')
           ORDER BY created_at DESC LIMIT 20"#
    )
    .fetch_all(&state.db)
    .await?;
    let games: Vec<_> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id, "game_code": r.game_code,
                "game_mode": r.game_mode, "status": r.status,
                "max_players": r.max_players, "current_round": r.current_round,
            })
        })
        .collect();
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "games": games })))
}

pub async fn create_game(
    req: HttpRequest,
    state: web::Data<AppState>,
    body: web::Json<CreateGameRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let mode = body
        .game_mode
        .clone()
        .unwrap_or_else(|| "turn_based".into());
    let max = body.max_players.unwrap_or(4).max(2).min(4);
    let code = game_code();
    let specialty = island_specialty(&body.island_type);

    let row = sqlx::query!(
        r#"INSERT INTO games (game_code, host_player_id, game_mode, max_players)
           VALUES ($1, $2, $3, $4)
           RETURNING id, game_code, status, current_round"#,
        code,
        pid,
        mode,
        max
    )
    .fetch_one(&state.db)
    .await?;

    sqlx::query!(
        "INSERT INTO game_players (game_id, player_id, turn_order, island_type, specialty_res) VALUES ($1,$2,0,$3,$4)",
        row.id, pid, body.island_type, specialty
    ).execute(&state.db).await?;

    let island = PlayerIsland::new(&pid.to_string(), &body.island_type, specialty);
    let gs = GameStateData {
        round: 1,
        current_player_id: pid.to_string(),
        player_order: vec![pid.to_string()],
        islands: vec![island],
        game_over: false,
        winner_id: None,
        action_log: vec![format!(
            "Game {} created. Waiting for players…",
            row.game_code
        )],
    };
    save_state(&state.db, &row.id, &gs).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "game": { "id": row.id, "game_code": row.game_code, "status": row.status }
    })))
}

pub async fn join_game(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<JoinGameRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let game_row = sqlx::query!(
        "SELECT host_player_id, status, max_players FROM games WHERE id=$1",
        gid
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Game not found".into()))?;
    if game_row.status != "waiting" {
        return Err(AppError::BadRequest("Game already started".into()));
    }
    let existing_ids: Vec<Uuid> =
        sqlx::query_scalar!("SELECT player_id FROM game_players WHERE game_id=$1", gid)
            .fetch_all(&state.db)
            .await?;
    if existing_ids.contains(&pid) {
        return Err(AppError::BadRequest("Already in this game".into()));
    }
    if existing_ids.len() as i32 >= game_row.max_players {
        return Err(AppError::BadRequest("Game is full".into()));
    }
    let turn_order = existing_ids.len() as i32;
    let specialty = island_specialty(&body.island_type);
    sqlx::query!(
        "INSERT INTO game_players (game_id, player_id, turn_order, island_type, specialty_res) VALUES ($1,$2,$3,$4,$5)",
        gid, pid, turn_order, body.island_type, specialty
    ).execute(&state.db).await?;
    let mut gs = load_state(&state.db, &gid).await?;
    gs.islands.push(PlayerIsland::new(
        &pid.to_string(),
        &body.island_type,
        specialty,
    ));
    gs.player_order.push(pid.to_string());
    gs.action_log
        .push(format!("Player joined (island: {}).", body.island_type));
    save_state(&state.db, &gid, &gs).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "message": "Joined!" })))
}

pub async fn start_game(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let row = sqlx::query!("SELECT host_player_id, status FROM games WHERE id=$1", gid)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Game not found".into()))?;
    if row.host_player_id != pid {
        return Err(AppError::Forbidden("Only host can start".into()));
    }
    if row.status != "waiting" {
        return Err(AppError::BadRequest("Game already started".into()));
    }
    sqlx::query!(
        "UPDATE games SET status='in_progress', updated_at=NOW() WHERE id=$1",
        gid
    )
    .execute(&state.db)
    .await?;
    let mut gs = load_state(&state.db, &gid).await?;
    if let Some(first) = gs.islands.first_mut() {
        if first.active_event.is_none() {
            first.active_event = ev_logic::trigger_random_event(first, 1);
        }
    }
    gs.action_log.push("Game started! Round 1 begins.".into());
    save_state(&state.db, &gid, &gs).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "message": "Game started!" })))
}

pub async fn get_game(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let row = sqlx::query!(
        "SELECT id, game_code, game_mode, status, max_players, current_round FROM games WHERE id=$1", gid
    ).fetch_optional(&state.db).await?
     .ok_or_else(|| AppError::NotFound("Game not found".into()))?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "game": { "id": row.id, "game_code": row.game_code, "game_mode": row.game_mode,
                  "status": row.status, "max_players": row.max_players, "current_round": row.current_round }
    })))
}

pub async fn get_state(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let gs = load_state(&state.db, &gid).await?;
    let my_island = gs.islands.iter().find(|i| i.player_id == pid.to_string());
    let tasks = my_island.map(|i| scoring::available_tasks(i, gs.round));
    let traders = trade_logic::all_traders();
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "state": gs,
        "available_tasks": tasks, "traders": traders,
    })))
}

pub async fn place_tile(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<PlaceTileRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let mut gs = load_state(&state.db, &gid).await?;
    if gs.current_player_id != pid.to_string() {
        return Err(AppError::Forbidden("Not your turn".into()));
    }
    let island = gs
        .islands
        .iter_mut()
        .find(|i| i.player_id == pid.to_string())
        .ok_or_else(|| AppError::NotFound("Island not found".into()))?;
    if !hex::is_valid_placement(&island.tiles, body.q, body.r) {
        return Err(AppError::BadRequest(
            "Invalid placement — must be adjacent to existing tile".into(),
        ));
    }
    let cost = crate::game_logic::tiles::tile_cost(&body.tile_id);
    if !island.resources.can_afford(&cost) {
        return Err(AppError::BadRequest("Insufficient resources".into()));
    }
    island.resources.spend(&cost);
    let bonus = hex::edge_match_score(&island.tiles, body.q, body.r, &body.tile_id, body.rotation);
    island.task_score += bonus;
    island.tiles.push(HexTile {
        q: body.q,
        r: body.r,
        tile_id: body.tile_id.clone(),
        rotation: body.rotation,
        is_damaged: false,
        placed_at_round: gs.round,
    });
    gs.action_log.push(format!(
        "Placed {} at ({},{}). Edge bonus +{}",
        body.tile_id, body.q, body.r, bonus
    ));
    save_state(&state.db, &gid, &gs).await?;
    let tasks = gs
        .islands
        .iter()
        .find(|i| i.player_id == pid.to_string())
        .map(|i| scoring::available_tasks(i, gs.round));
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "state": gs, "edge_bonus": bonus,
        "available_tasks": tasks,
    })))
}

pub async fn respond_event(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<RespondEventRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let mut gs = load_state(&state.db, &gid).await?;
    let island = gs
        .islands
        .iter_mut()
        .find(|i| i.player_id == pid.to_string())
        .ok_or_else(|| AppError::NotFound("Island not found".into()))?;
    let active = island
        .active_event
        .clone()
        .ok_or_else(|| AppError::BadRequest("No active event".into()))?;
    let success = match body.action.as_str() {
        "extinguish" | "resolve" => {
            let needed = ev_logic::extinguish_cost(&active.event_id);
            let used = body.water_spent.unwrap_or(needed);
            if island.resources.get("water") >= used {
                island.resources.add("water", -used);
                true
            } else {
                false
            }
        }
        "celebrate" | "harvest" => true,
        _ => false,
    };
    let (pts, msg) = ev_logic::resolve_event(&active.event_id, success, island);
    gs.action_log.push(msg.clone());
    save_state(&state.db, &gid, &gs).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "state": gs, "points": pts, "message": msg
    })))
}

pub async fn execute_trade(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<TradeRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let mut gs = load_state(&state.db, &gid).await?;
    let island = gs
        .islands
        .iter_mut()
        .find(|i| i.player_id == pid.to_string())
        .ok_or_else(|| AppError::NotFound("Island not found".into()))?;
    let (ok, msg) = trade_logic::execute_trade(&body.trader_id, island);
    if !ok {
        return Err(AppError::BadRequest(msg));
    }
    gs.action_log.push(msg.clone());
    save_state(&state.db, &gid, &gs).await?;
    Ok(
        HttpResponse::Ok()
            .json(serde_json::json!({ "success": true, "state": gs, "message": msg })),
    )
}

pub async fn complete_task(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<CompleteTaskRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let mut gs = load_state(&state.db, &gid).await?;
    let round = gs.round;
    let island = gs
        .islands
        .iter_mut()
        .find(|i| i.player_id == pid.to_string())
        .ok_or_else(|| AppError::NotFound("Island not found".into()))?;
    let (ok, msg, pts) = scoring::complete_task(&body.task_id, island, round);
    if !ok {
        return Err(AppError::BadRequest(msg));
    }
    gs.action_log.push(msg.clone());
    save_state(&state.db, &gid, &gs).await?;
    Ok(HttpResponse::Ok()
        .json(serde_json::json!({ "success": true, "state": gs, "points": pts, "message": msg })))
}

pub async fn end_turn(
    req: HttpRequest,
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let gid = path.into_inner();
    let mut gs = load_state(&state.db, &gid).await?;
    if gs.current_player_id != pid.to_string() {
        return Err(AppError::Forbidden("Not your turn".into()));
    }
    let player_idx = gs
        .player_order
        .iter()
        .position(|p| p == &pid.to_string())
        .unwrap_or(0);
    // Produce resources for this player's island
    if let Some(isl) = gs
        .islands
        .iter_mut()
        .find(|i| i.player_id == pid.to_string())
    {
        scoring::produce_resources(isl);
        isl.trades_this_round = 0;
    }
    // Advance to next player
    let total = gs.player_order.len();
    let next_idx = (player_idx + 1) % total;
    gs.current_player_id = gs.player_order[next_idx].clone();
    // Advance round when all players have gone
    if next_idx == 0 {
        gs.round += 1;
        sqlx::query!(
            "UPDATE games SET current_round=$1, updated_at=NOW() WHERE id=$2",
            gs.round,
            gid
        )
        .execute(&state.db)
        .await?;
        if gs.round > 6 {
            gs.game_over = true;
            let winner = gs
                .islands
                .iter()
                .max_by_key(|i| scoring::total_score(i))
                .map(|i| i.player_id.clone());
            gs.winner_id = winner.clone();
            sqlx::query!(
                "UPDATE games SET status='completed', updated_at=NOW() WHERE id=$1",
                gid
            )
            .execute(&state.db)
            .await?;
            // Update player stats
            for island in &gs.islands {
                let is_w = Some(&island.player_id) == winner.as_ref();
                if let Ok(iuuid) = Uuid::parse_str(&island.player_id) {
                    let sc = scoring::total_score(island);
                    let _ = sqlx::query!(
                        "UPDATE players SET total_games=total_games+1, wins=wins+$1, losses=losses+$2, xp=xp+$3, updated_at=NOW() WHERE id=$4",
                        is_w as i32, (!is_w) as i32, sc, iuuid
                    ).execute(&state.db).await;
                    // Season upsert
                    let sid: Option<Uuid> =
                        sqlx::query_scalar!("SELECT id FROM seasons WHERE is_active=true LIMIT 1")
                            .fetch_optional(&state.db)
                            .await
                            .unwrap_or(None);
                    if let Some(sid) = sid {
                        let _ = sqlx::query!(
                            r#"INSERT INTO season_rankings (season_id,player_id,score,wins,games_played) VALUES ($1,$2,$3,$4,1)
                               ON CONFLICT (season_id,player_id) DO UPDATE
                               SET score=season_rankings.score+$3, wins=season_rankings.wins+$4, games_played=season_rankings.games_played+1"#,
                            sid, iuuid, sc, is_w as i32
                        ).execute(&state.db).await;
                    }
                }
            }
            gs.action_log
                .push("🏁 Game Over! Final scores tallied.".into());
        } else {
            gs.action_log.push(format!("Round {} begins!", gs.round));
        }
    }
    // Trigger event for next player
    if !gs.game_over {
        let next_pid = gs.current_player_id.clone();
        if let Some(next_isl) = gs.islands.iter_mut().find(|i| i.player_id == next_pid) {
            if next_isl.active_event.is_none() {
                next_isl.active_event = ev_logic::trigger_random_event(next_isl, gs.round);
            }
        }
    }
    save_state(&state.db, &gid, &gs).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "state": gs })))
}

fn island_specialty(island_type: &str) -> &'static str {
    match island_type {
        "forest" => "wood",
        "farming" => "grain",
        "coastal" => "water",
        "mountain" => "stone",
        _ => "grain",
    }
}
