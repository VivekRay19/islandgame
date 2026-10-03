use crate::models::errors::AppError;
use crate::AppState;
use actix_web::{web, HttpResponse};

pub async fn get_leaderboard(state: web::Data<AppState>) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query!(
        r#"SELECT sr.player_id, p.username, p.display_name, p.avatar_id,
                  sr.score, sr.wins, sr.games_played,
                  ROW_NUMBER() OVER (ORDER BY sr.score DESC) AS rank
           FROM season_rankings sr
           JOIN players p ON p.id = sr.player_id
           JOIN seasons s  ON s.id = sr.season_id AND s.is_active = true
           ORDER BY sr.score DESC LIMIT 50"#
    )
    .fetch_all(&state.db)
    .await?;
    let entries: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "rank":         r.rank,
                "player_id":    r.player_id,
                "username":     r.username,
                "display_name": r.display_name,
                "avatar_id":    r.avatar_id,
                "score":        r.score,
                "wins":         r.wins,
                "games_played": r.games_played,
            })
        })
        .collect();
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "leaderboard": entries })))
}
