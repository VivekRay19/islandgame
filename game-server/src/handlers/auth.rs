use actix_web::{web, HttpRequest, HttpResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{Utc, Duration};
use crate::AppState;
use crate::models::player::{RegisterRequest, LoginRequest};
use crate::models::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: usize,
}

pub fn make_token(player_id: &Uuid, username: &str, secret: &str, hours: u64) -> String {
    let exp = (Utc::now() + Duration::hours(hours as i64)).timestamp() as usize;
    let claims = Claims { sub: player_id.to_string(), username: username.to_string(), exp };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes())).unwrap()
}

pub fn extract_player_id(req: &HttpRequest, secret: &str) -> Result<Uuid, AppError> {
    let auth = req.headers().get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Auth("Missing Bearer token".into()))?;
    let data = decode::<Claims>(
        auth,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ).map_err(|_| AppError::Auth("Invalid or expired token".into()))?;
    Uuid::parse_str(&data.claims.sub)
        .map_err(|_| AppError::Auth("Invalid player ID in token".into()))
}

pub async fn register(
    state: web::Data<AppState>,
    body:  web::Json<RegisterRequest>,
) -> Result<HttpResponse, AppError> {
    if body.username.len() < 3 || body.username.len() > 50 {
        return Err(AppError::BadRequest("Username must be 3–50 characters".into()));
    }
    if body.password.len() < 4 {
        return Err(AppError::BadRequest("Password must be at least 4 characters".into()));
    }
    let pw_hash = hash(&body.password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let display = body.display_name.clone().unwrap_or_else(|| body.username.clone());

    let row = sqlx::query!(
        r#"INSERT INTO players (username, password_hash, display_name)
           VALUES ($1, $2, $3)
           RETURNING id, username, display_name, avatar_id, level, xp, total_games, wins, losses, created_at"#,
        body.username, pw_hash, display
    ).fetch_one(&state.db).await.map_err(|e| {
        if e.to_string().contains("unique") {
            AppError::BadRequest("Username already taken".into())
        } else { AppError::Db(e) }
    })?;

    // Init progression + campaign rows
    let _ = sqlx::query!(
        "INSERT INTO player_progression (player_id) VALUES ($1) ON CONFLICT DO NOTHING", row.id
    ).execute(&state.db).await;
    let _ = sqlx::query!(
        "INSERT INTO campaign_progress (player_id) VALUES ($1) ON CONFLICT DO NOTHING", row.id
    ).execute(&state.db).await;

    let token = make_token(&row.id, &row.username,
                           &state.config.jwt_secret, state.config.jwt_expires_hours);
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "token": token,
        "player": {
            "id": row.id, "username": row.username,
            "display_name": row.display_name, "avatar_id": row.avatar_id,
            "level": row.level, "xp": row.xp,
            "total_games": row.total_games, "wins": row.wins,
        }
    })))
}

pub async fn login(
    state: web::Data<AppState>,
    body:  web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let row = sqlx::query!(
        r#"SELECT id, username, password_hash, display_name, avatar_id,
                  level, xp, total_games, wins, losses, created_at
           FROM players WHERE username = $1"#,
        body.username
    ).fetch_optional(&state.db).await?
     .ok_or_else(|| AppError::Auth("Invalid username or password".into()))?;

    let ok = verify(&body.password, &row.password_hash)
        .map_err(|_| AppError::Internal("Bcrypt error".into()))?;
    if !ok { return Err(AppError::Auth("Invalid username or password".into())); }

    let token = make_token(&row.id, &row.username,
                           &state.config.jwt_secret, state.config.jwt_expires_hours);
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true, "token": token,
        "player": {
            "id": row.id, "username": row.username,
            "display_name": row.display_name, "avatar_id": row.avatar_id,
            "level": row.level, "xp": row.xp,
            "total_games": row.total_games, "wins": row.wins,
        }
    })))
}

pub async fn me(
    req: HttpRequest, state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    let pid = extract_player_id(&req, &state.config.jwt_secret)?;
    let row = sqlx::query!(
        r#"SELECT id, username, display_name, avatar_id,
                  level, xp, total_games, wins, losses
           FROM players WHERE id = $1"#,
        pid
    ).fetch_optional(&state.db).await?
     .ok_or_else(|| AppError::NotFound("Player not found".into()))?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "player": {
            "id": row.id, "username": row.username,
            "display_name": row.display_name, "avatar_id": row.avatar_id,
            "level": row.level, "xp": row.xp,
            "total_games": row.total_games, "wins": row.wins,
        }
    })))
}
