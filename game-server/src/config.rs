use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url:     String,
    pub db_pool_size:     u32,
    pub http_port:        u16,
    pub ws_port:          u16,
    pub host:             String,
    pub static_dir:       String,
    pub jwt_secret:       String,
    pub jwt_expires_hours: u64,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url:      env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://jofrey:2025@127.0.0.1:5432/cultural_islands".into()),
            db_pool_size:      env::var("DB_POOL_SIZE")
                .unwrap_or_else(|_| "15".into()).parse().unwrap_or(15),
            http_port:         env::var("HTTP_PORT")
                .unwrap_or_else(|_| "8067".into()).parse().unwrap_or(8067),
            ws_port:           env::var("WS_PORT")
                .unwrap_or_else(|_| "8068".into()).parse().unwrap_or(8068),
            host:              env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            static_dir:        env::var("STATIC_DIR").unwrap_or_else(|_| "./static".into()),
            jwt_secret:        env::var("JWT_SECRET")
                .unwrap_or_else(|_| "cultural_islands_dev_secret".into()),
            jwt_expires_hours: env::var("JWT_EXPIRES_HOURS")
                .unwrap_or_else(|_| "72".into()).parse().unwrap_or(72),
        }
    }
}
