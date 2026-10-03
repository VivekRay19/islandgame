#![allow(dead_code)]
use actix_cors::Cors;
use actix_files as fs;
use actix_web::{middleware, web, App, HttpServer};

mod config;
mod db;
mod game_logic;
mod handlers;
mod models;
mod ws;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub config: config::Config,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("cultural_islands_server=info".parse().unwrap()),
        )
        .init();

    let cfg = config::Config::from_env();
    let pool = db::create_pool(&cfg).await;
    let workers = num_cpus::get().min(8);

    tracing::info!("═══════════════════════════════════════════════");
    tracing::info!("  Cultural Islands Server  v0.1.0");
    tracing::info!("  HTTP → http://{}:{}", cfg.host, cfg.http_port);
    tracing::info!("  WS   → ws://{}:{}/ws", cfg.host, cfg.ws_port);
    tracing::info!(
        "  DB   → {}",
        &cfg.database_url.split('@').last().unwrap_or("?")
    );
    tracing::info!("  Workers: {}", workers);
    tracing::info!("═══════════════════════════════════════════════");

    let http_bind = format!("{}:{}", cfg.host, cfg.http_port);
    let ws_bind = format!("{}:{}", cfg.host, cfg.ws_port);
    let static_dir = cfg.static_dir.clone();

    let data = web::Data::new(AppState {
        db: pool,
        config: cfg,
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(data.clone())
            .app_data(
                web::JsonConfig::default()
                    .limit(512 * 1024)
                    .error_handler(|err, _| {
                        actix_web::error::InternalError::from_response(
                            err,
                            actix_web::HttpResponse::BadRequest()
                                .json(serde_json::json!({"success":false,"error":"Invalid JSON"})),
                        )
                        .into()
                    }),
            )
            .wrap(cors)
            .wrap(middleware::Logger::default())
            // ── Health Check ───────────────────────────────────
            .route(
                "/health",
                web::get().to(|| async {
                    actix_web::HttpResponse::Ok().json(serde_json::json!({
                        "status": "ok",
                        "service": "cultural-islands"
                    }))
                }),
            )
            // ── WebSocket ──────────────────────────────────────
            .route("/ws", web::get().to(ws::handler::ws_handler))
            // ── REST API ───────────────────────────────────────
            .service(
                web::scope("/api")
                    .service(
                        web::scope("/auth")
                            .route("/register", web::post().to(handlers::auth::register))
                            .route("/login", web::post().to(handlers::auth::login))
                            .route("/me", web::get().to(handlers::auth::me)),
                    )
                    .service(
                        web::scope("/games")
                            .route("", web::get().to(handlers::game::list_games))
                            .route("", web::post().to(handlers::game::create_game))
                            .route("/{id}", web::get().to(handlers::game::get_game))
                            .route("/{id}/join", web::post().to(handlers::game::join_game))
                            .route("/{id}/start", web::post().to(handlers::game::start_game))
                            .route("/{id}/state", web::get().to(handlers::game::get_state))
                            .route(
                                "/{id}/place-tile",
                                web::post().to(handlers::game::place_tile),
                            )
                            .route(
                                "/{id}/respond-event",
                                web::post().to(handlers::game::respond_event),
                            )
                            .route("/{id}/trade", web::post().to(handlers::game::execute_trade))
                            .route(
                                "/{id}/complete-task",
                                web::post().to(handlers::game::complete_task),
                            )
                            .route("/{id}/end-turn", web::post().to(handlers::game::end_turn)),
                    )
                    .route(
                        "/leaderboard",
                        web::get().to(handlers::leaderboard::get_leaderboard),
                    )
                    .service(
                        web::scope("/runs")
                            .route("/profile", web::get().to(handlers::runs::profile))
                            .route("/submit", web::post().to(handlers::runs::submit))
                            .route("/board", web::get().to(handlers::runs::board)),
                    )
                    .service(
                        web::scope("/campaign")
                            .route("", web::get().to(handlers::campaign::get_campaign))
                            .route(
                                "/island-history",
                                web::get().to(handlers::campaign::island_history),
                            )
                            .route(
                                "/make-choice",
                                web::post().to(handlers::campaign::make_choice),
                            ),
                    ),
            )
            // ── Static (PixiJS client + Rust/WASM engine) ──────────────────────
            .service(fs::Files::new("/", &static_dir).index_file("index.html"))
    })
    .workers(workers)
    .bind(&http_bind)?
    .bind(&ws_bind)?
    .run()
    .await
}
