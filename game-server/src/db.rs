use sqlx::{postgres::PgPoolOptions, PgPool};
use crate::config::Config;

pub async fn create_pool(cfg: &Config) -> PgPool {
    PgPoolOptions::new()
        .max_connections(cfg.db_pool_size)
        .connect(&cfg.database_url)
        .await
        .expect("Failed to connect to PostgreSQL. Check DATABASE_URL in .env")
}
