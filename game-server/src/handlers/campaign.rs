use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use crate::AppState;
use crate::handlers::auth::extract_player_id;
use crate::models::errors::AppError;

#[derive(Deserialize)]
pub struct MakeChoiceRequest {
    pub event_key:  String,
    pub choice_key: String,
}

pub async fn get_campaign(
    req: HttpRequest, state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let camp = sqlx::query!(
        r#"SELECT current_act, session_count, story_flags,
                  active_story_events, completed_story_events,
                  civilization_name, legacy_score
           FROM campaign_progress WHERE player_id=$1"#, pid
    ).fetch_optional(&state.db).await?
     .ok_or_else(|| AppError::NotFound("Campaign not found".into()))?;

    // Check for new story events to unlock
    let events = sqlx::query!(
        "SELECT event_key, act, title, narrative, choices, is_branching
         FROM story_events WHERE act=$1 AND (trigger_session IS NULL OR trigger_session<=$2)",
        camp.current_act, camp.session_count
    ).fetch_all(&state.db).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "campaign": {
            "current_act":  camp.current_act,
            "session_count": camp.session_count,
            "story_flags":  camp.story_flags,
            "active_events": camp.active_story_events,
            "completed_events": camp.completed_story_events,
            "civilization_name": camp.civilization_name,
            "legacy_score": camp.legacy_score,
        },
        "available_story_events": events.iter().map(|e| serde_json::json!({
            "event_key":    e.event_key,
            "act":          e.act,
            "title":        e.title,
            "narrative":    e.narrative,
            "choices":      e.choices,
            "is_branching": e.is_branching,
        })).collect::<Vec<_>>(),
    })))
}

pub async fn island_history(
    req: HttpRequest, state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let rows = sqlx::query!(
        r#"SELECT session_number, narrative_note, resource_drift,
                  degraded_tiles, grown_tiles, final_score, created_at
           FROM island_history WHERE player_id=$1
           ORDER BY session_number DESC LIMIT 10"#, pid
    ).fetch_all(&state.db).await?;
    let history: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "session":        r.session_number,
        "narrative":      r.narrative_note,
        "resource_drift": r.resource_drift,
        "degraded_tiles": r.degraded_tiles,
        "grown_tiles":    r.grown_tiles,
        "final_score":    r.final_score,
        "played_at":      r.created_at,
    })).collect();
    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true, "history": history })))
}

pub async fn make_choice(
    req: HttpRequest, state: web::Data<AppState>,
    body: web::Json<MakeChoiceRequest>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let camp = sqlx::query!(
        "SELECT session_count FROM campaign_progress WHERE player_id=$1", pid
    ).fetch_optional(&state.db).await?
     .ok_or_else(|| AppError::NotFound("Campaign not found".into()))?;

    sqlx::query!(
        r#"INSERT INTO player_story_choices (player_id, event_key, choice_key, session_number)
           VALUES ($1,$2,$3,$4)"#,
        pid, body.event_key, body.choice_key, camp.session_count
    ).execute(&state.db).await?;

    // Apply consequences (look up from story_events.choices JSON)
    let event = sqlx::query!(
        "SELECT choices FROM story_events WHERE event_key=$1", body.event_key
    ).fetch_optional(&state.db).await?;
    let consequences = event.and_then(|e| {
        let arr = e.choices.as_array()?;
        arr.iter().find(|c| c["key"] == body.choice_key)
            .map(|c| c["consequence"].clone())
    });

    // Mark as completed in campaign_progress
    sqlx::query!(
        r#"UPDATE campaign_progress
           SET completed_story_events = completed_story_events || $1::jsonb,
               story_flags = story_flags || $2::jsonb,
               updated_at  = NOW()
           WHERE player_id=$3"#,
        serde_json::json!([body.event_key]),
        serde_json::json!({ body.event_key: body.choice_key }),
        pid
    ).execute(&state.db).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "choice":       body.choice_key,
        "consequences": consequences,
    })))
}
