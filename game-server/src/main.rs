#![allow(dead_code)]
use actix_web::{web, App, HttpServer, middleware};
use actix_files as fs;
use actix_cors::Cors;

mod config;
mod db;
mod models;
mod game_logic;
mod handlers;
mod ws;

pub struct AppState {
    pub db:     sqlx::PgPool,
    pub config: config::Config,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("cultural_islands_server=info".parse().unwrap())
        )
        .init();

    let cfg  = config::Config::from_env();
    let pool = db::create_pool(&cfg).await;
    let workers = num_cpus::get().min(8);

    tracing::info!("═══════════════════════════════════════════════");
    tracing::info!("  Cultural Islands Server  v0.1.0");
    tracing::info!("  HTTP → http://{}:{}", cfg.host, cfg.http_port);
    tracing::info!("  WS   → ws://{}:{}/ws", cfg.host, cfg.ws_port);
    tracing::info!("  DB   → {}", &cfg.database_url.split('@').last().unwrap_or("?"));
    tracing::info!("  Workers: {}", workers);
    tracing::info!("═══════════════════════════════════════════════");

    let http_bind = format!("{}:{}", cfg.host, cfg.http_port);
    let ws_bind   = format!("{}:{}", cfg.host, cfg.ws_port);
    let static_dir = cfg.static_dir.clone();

    // Make it obvious which directory is being served. A wrong STATIC_DIR (or a
    // stray Vite-style index.html) is the classic cause of a blank page + 404 on /src/main.ts.
    match std::fs::canonicalize(&static_dir) {
        Ok(p) => tracing::info!("  Static → {}", p.display()),
        Err(e) => tracing::error!("  Static dir '{}' is not accessible: {}", static_dir, e),
    }
    let index_path = std::path::Path::new(&static_dir).join("index.html");
    match std::fs::read_to_string(&index_path) {
        Ok(html) if html.contains("/src/main.ts") => tracing::error!(
            "  {} references /src/main.ts (a Vite page) - replace it with the Macroquad loader page!",
            index_path.display()),
        Ok(_) => {}
        Err(e) => tracing::error!("  Cannot read {}: {}", index_path.display(), e),
    }
    for f in ["gl.js", "sapp_jsutils.js", "quad-net.js", "cultural_islands_client.wasm"] {
        if !std::path::Path::new(&static_dir).join(f).exists() {
            tracing::warn!("  Missing static file: {}/{}", static_dir, f);
        }
    }

    let data = web::Data::new(AppState { db: pool, config: cfg });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(data.clone())
            .app_data(web::JsonConfig::default().error_handler(|err, _| {
                actix_web::error::InternalError::from_response(
                    err,
                    actix_web::HttpResponse::BadRequest()
                        .json(serde_json::json!({"success":false,"error":"Invalid JSON"}))
                ).into()
            }))
            .wrap(cors)
            .wrap(middleware::Logger::default())
            // Always revalidate: a stale cached index.html / .wasm after a redeploy
            // is another way to end up with a blank screen.
            .wrap(middleware::DefaultHeaders::new().add(("Cache-Control", "no-cache")))
            // ── Health Check ───────────────────────────────────
            .route("/health", web::get().to(|| async {
                actix_web::HttpResponse::Ok().json(serde_json::json!({
                    "status": "ok",
                    "service": "cultural-islands"
                }))
            }))
            // ── WebSocket ──────────────────────────────────────
            .route("/ws", web::get().to(ws::handler::ws_handler))
            // ── REST API ───────────────────────────────────────
            .service(web::scope("/api")
                .service(web::scope("/auth")
                    .route("/register", web::post().to(handlers::auth::register))
                    .route("/login",    web::post().to(handlers::auth::login))
                    .route("/me",       web::get() .to(handlers::auth::me))
                )
                .service(web::scope("/games")
                    .route("",                   web::get() .to(handlers::game::list_games))
                    .route("",                   web::post().to(handlers::game::create_game))
                    .route("/{id}",              web::get() .to(handlers::game::get_game))
                    .route("/{id}/join",         web::post().to(handlers::game::join_game))
                    .route("/{id}/start",        web::post().to(handlers::game::start_game))
                    .route("/{id}/state",        web::get() .to(handlers::game::get_state))
                    .route("/{id}/place-tile",   web::post().to(handlers::game::place_tile))
                    .route("/{id}/respond-event",web::post().to(handlers::game::respond_event))
                    .route("/{id}/trade",        web::post().to(handlers::game::execute_trade))
                    .route("/{id}/complete-task",web::post().to(handlers::game::complete_task))
                    .route("/{id}/end-turn",     web::post().to(handlers::game::end_turn))
                )
                .route("/leaderboard", web::get().to(handlers::leaderboard::get_leaderboard))
                .service(web::scope("/campaign")
                    .route("",               web::get() .to(handlers::campaign::get_campaign))
                    .route("/island-history",web::get() .to(handlers::campaign::island_history))
                    .route("/make-choice",   web::post().to(handlers::campaign::make_choice))
                )
            )
            // ── Static (WASM game client) ──────────────────────
            .service(fs::Files::new("/", &static_dir).index_file("index.html"))
    })
    .workers(workers)
    .bind(&http_bind)?
    .bind(&ws_bind)?
    .run()
    .await
}
