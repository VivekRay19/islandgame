use actix_web::{HttpResponse, ResponseError};
use serde_json::json;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Db(sqlx::Error),
    Auth(String),
    NotFound(String),
    BadRequest(String),
    Forbidden(String),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::Db(e)          => write!(f, "Database error: {e}"),
            Self::Auth(m)        => write!(f, "Auth error: {m}"),
            Self::NotFound(m)    => write!(f, "Not found: {m}"),
            Self::BadRequest(m)  => write!(f, "Bad request: {m}"),
            Self::Forbidden(m)   => write!(f, "Forbidden: {m}"),
            Self::Internal(m)    => write!(f, "Internal error: {m}"),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, msg) = match self {
            Self::Auth(m)       => (401, m.clone()),
            Self::NotFound(m)   => (404, m.clone()),
            Self::BadRequest(m) => (400, m.clone()),
            Self::Forbidden(m)  => (403, m.clone()),
            Self::Db(e)         => (500, format!("DB: {e}")),
            Self::Internal(m)   => (500, m.clone()),
        };
        HttpResponse::build(actix_web::http::StatusCode::from_u16(status as u16).unwrap())
            .json(json!({ "success": false, "error": msg }))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self { Self::Db(e) }
}
