//! Root application state machine — owns all screens, drives the game loop.
use macroquad::prelude::*;
use crate::{
    network,
    types::{GameStateData, PlayerIsland, PublicPlayer, GameInfo},
    screens::{
        menu::{draw_menu, MenuAction},
        login::{draw_login, LoginState, LoginAction},
        lobby::{draw_lobby, LobbyState, LobbyAction},
        game_screen::{draw_game, GameScreenState, GameAction},
        results::{draw_results, ResultsAction},
    },
};

const POLL_INTERVAL: f32 = 1.5; // seconds between state polls

// ── App screen enum ──────────────────────────────────────────────────────────
enum Screen {
    Menu,
    Login,
    Lobby,
    InGame,
    Results,
    Leaderboard,
}

// ── Pending HTTP requests ────────────────────────────────────────────────────
struct Pending {
    req:  network::PendingRequest,
    kind: &'static str,
}

// ── Main App ─────────────────────────────────────────────────────────────────
pub struct App {
    screen:       Screen,
    // Auth
    token:        Option<String>,
    player:       Option<PublicPlayer>,
    // Game
    game_id:      Option<String>,
    game_state:   Option<GameStateData>,
    tasks:        Vec<serde_json::Value>,
    traders:      Vec<serde_json::Value>,
    leaderboard:  Vec<serde_json::Value>,
    // Screen states
    login_state:  LoginState,
    lobby_state:  LobbyState,
    game_ui:      GameScreenState,
    // Timing
    t:            f32,
    poll_timer:   f32,
    // Pending requests
    pending:      Option<Pending>,
}

impl App {
    pub fn new() -> Self {
        Self {
            screen:      Screen::Menu,
            token:       None,
            player:      None,
            game_id:     None,
            game_state:  None,
            tasks:       vec![],
            traders:     vec![],
            leaderboard: vec![],
            login_state: LoginState::default(),
            lobby_state: LobbyState::default(),
            game_ui:     GameScreenState::default(),
            t:           0.0,
            poll_timer:  0.0,
            pending:     None,
        }
    }

    // ── Send a request (one at a time) ──────────────────────────────────────
    fn send(&mut self, req: network::PendingRequest, kind: &'static str) {
        self.pending = Some(Pending { req, kind });
    }

    // ── Process completed HTTP responses ────────────────────────────────────
    fn poll_pending(&mut self) {
        let ready = if let Some(p) = &mut self.pending {
            p.req.try_recv()
        } else {
            return;
        };
        if let Some(result) = ready {
            let kind = self.pending.as_ref().unwrap().kind;
            self.pending = None;
            match result {
                Ok(v)  => self.handle_response(kind, v),
                Err(e) => {
                    tracing_set_msg(self, &format!("Network error: {}", e));
                }
            }
        }
    }

    fn handle_response(&mut self, kind: &str, v: serde_json::Value) {
        let ok = v["success"].as_bool().unwrap_or(false);
        if !ok {
            let err = v["error"].as_str().unwrap_or("Unknown error").to_string();
            tracing_set_msg(self, &err);
            self.login_state.loading = false;
            self.lobby_state.loading = false;
            return;
        }
        match kind {
            "login" | "register" => {
                if let (Some(token), Some(player)) = (
                    v["token"].as_str(),
                    serde_json::from_value::<PublicPlayer>(v["player"].clone()).ok(),
                ) {
                    self.token  = Some(token.to_string());
                    self.player = Some(player);
                    self.screen = Screen::Lobby;
                    self.lobby_state = LobbyState::default();
                    self.login_state.loading = false;
                }
            }
            "create_game" => {
                if let Some(id) = v["game"]["id"].as_str() {
                    self.game_id = Some(id.to_string());
                    self.lobby_state.loading = false;
                    self.lobby_state.message = format!("Game created! Code: {}", v["game"]["game_code"].as_str().unwrap_or(""));
                    self.request_state();
                }
            }
            "join_game" => {
                self.lobby_state.loading = false;
                self.lobby_state.message = "Joined! Starting soon…".into();
                self.request_state();
            }
            "list_games" => {
                if let Some(arr) = v["games"].as_array() {
                    self.lobby_state.games = arr.iter().filter_map(|g| {
                        Some(GameInfo {
                            id:           g["id"].as_str()?.to_string(),
                            game_code:    g["game_code"].as_str()?.to_string(),
                            game_mode:    g["game_mode"].as_str()?.to_string(),
                            status:       g["status"].as_str()?.to_string(),
                            max_players:  g["max_players"].as_i64()? as i32,
                            current_round: g["current_round"].as_i64()? as i32,
                        })
                    }).collect();
                }
            }
            "state" => {
                if let Ok(gs) = serde_json::from_value::<GameStateData>(v["state"].clone()) {
                    if gs.game_over { self.screen = Screen::Results; }
                    else if matches!(self.screen, Screen::Lobby) { self.screen = Screen::InGame; }
                    self.game_state = Some(gs);
                }
                if let Some(arr) = v["available_tasks"].as_array() {
                    self.tasks = arr.clone();
                }
                if let Some(arr) = v["traders"].as_array() {
                    self.traders = arr.clone();
                }
            }
            "action" => {
                if let Ok(gs) = serde_json::from_value::<GameStateData>(v["state"].clone()) {
                    let msg = v["message"].as_str()
                        .or(v.get("edge_bonus").map(|_| "Tile placed!"))
                        .unwrap_or("Action done").to_string();
                    self.game_ui.last_message = msg;
                    self.game_ui.message_timer = 2.5;
                    if gs.game_over { self.screen = Screen::Results; }
                    self.game_state = Some(gs);
                }
                if let Some(arr) = v["available_tasks"].as_array() {
                    self.tasks = arr.clone();
                }
            }
            "leaderboard" => {
                if let Some(arr) = v["leaderboard"].as_array() {
                    self.leaderboard = arr.clone();
                }
            }
            _ => {}
        }
    }

    fn request_state(&mut self) {
        if let (Some(token), Some(gid)) = (&self.token, &self.game_id) {
            let req = network::req_get_state(token, gid);
            self.send(req, "state");
        }
    }

    fn my_island(&self) -> Option<&PlayerIsland> {
        let gs  = self.game_state.as_ref()?;
        let pid = self.player.as_ref()?.id.as_str();
        gs.islands.iter().find(|i| i.player_id == pid)
    }

    // ── Main update + draw ───────────────────────────────────────────────────
    pub fn frame(&mut self) {
        let dt = get_frame_time();
        self.t += dt;
        self.poll_pending();

        // Auto-poll game state while in game
        if matches!(self.screen, Screen::InGame) && self.pending.is_none() {
            self.poll_timer += dt;
            if self.poll_timer >= POLL_INTERVAL {
                self.poll_timer = 0.0;
                self.request_state();
            }
        }

        match self.screen {
            Screen::Menu => {
                match draw_menu(self.t) {
                    MenuAction::Play        => { self.screen = Screen::Login; }
                    MenuAction::Leaderboard => {
                        self.screen = Screen::Leaderboard;
                        let req = network::req_leaderboard();
                        self.send(req, "leaderboard");
                    }
                    MenuAction::Rules => {}
                    MenuAction::None  => {}
                }
            }
            Screen::Login => {
                match draw_login(&mut self.login_state, self.t) {
                    LoginAction::Login { username, password } => {
                        let req = network::req_login(&username, &password);
                        self.send(req, "login");
                    }
                    LoginAction::Register { username, password, display_name } => {
                        let req = network::req_register(&username, &password, &display_name);
                        self.send(req, "register");
                        self.login_state.loading = true;
                    }
                    LoginAction::Back => { self.screen = Screen::Menu; }
                    LoginAction::None => {}
                }
            }
            Screen::Lobby => {
                match draw_lobby(&mut self.lobby_state, self.t) {
                    LobbyAction::Create { mode, island_type, max } => {
                        if let Some(tok) = &self.token {
                            let req = network::req_create_game(tok, &mode, &island_type, max);
                            self.send(req, "create_game");
                            self.lobby_state.loading = true;
                        }
                    }
                    LobbyAction::Join { game_id, island_type } => {
                        if let Some(tok) = &self.token {
                            self.game_id = Some(game_id.clone());
                            let req = network::req_join_game(tok, &game_id, &island_type);
                            self.send(req, "join_game");
                        }
                    }
                    LobbyAction::JoinByCode { code, island_type } => {
                        // Find game by code then join
                        self.lobby_state.message = format!("Joining {}…", code);
                        // For simplicity, treat code as game_id placeholder
                        // In production, add a GET /api/games?code=... endpoint
                        if let Some(tok) = &self.token {
                            let req = network::req_join_game(tok, &code, &island_type);
                            self.send(req, "join_game");
                        }
                    }
                    LobbyAction::Refresh => {
                        if let Some(tok) = &self.token {
                            let req = network::req_list_games(tok);
                            self.send(req, "list_games");
                        }
                    }
                    LobbyAction::Back => { self.screen = Screen::Menu; }
                    LobbyAction::None => {}
                }
            }
            Screen::InGame => {
                if let (Some(gs), Some(island)) = (self.game_state.clone(), self.my_island().cloned()) {
                    let name = self.player.as_ref()
                        .and_then(|p| p.display_name.as_deref().or(Some(p.username.as_str())))
                        .unwrap_or("Player");
                    let action = draw_game(
                        &gs, &island, &self.tasks, &self.traders,
                        &mut self.game_ui, name, dt, self.t,
                    );
                    if let (Some(tok), Some(gid)) = (&self.token.clone(), &self.game_id.clone()) {
                        match action {
                            GameAction::PlaceTile { q, r, tile_id, rotation } => {
                                let req = network::req_place_tile(tok, gid, q, r, &tile_id, rotation);
                                self.send(req, "action");
                            }
                            GameAction::RespondEvent { action: a, water } => {
                                let req = network::req_respond_event(tok, gid, &a, water);
                                self.send(req, "action");
                            }
                            GameAction::Trade { trader_id } => {
                                let req = network::req_trade(tok, gid, &trader_id);
                                self.send(req, "action");
                            }
                            GameAction::CompleteTask { task_id } => {
                                let req = network::req_complete_task(tok, gid, &task_id);
                                self.send(req, "action");
                            }
                            GameAction::EndTurn => {
                                let req = network::req_end_turn(tok, gid);
                                self.send(req, "action");
                                self.poll_timer = 0.0;
                            }
                            GameAction::Leave => { self.screen = Screen::Lobby; }
                            GameAction::PollState => { self.request_state(); }
                            GameAction::None => {}
                        }
                    }
                } else {
                    // State not loaded yet
                    let sw = screen_width();
                    let sh = screen_height();
                    clear_background(BG_DARK);
                    draw_text_centered("Loading game…", sw/2.0, sh/2.0, 28.0, GOLD_TEXT);
                    if self.pending.is_none() { self.request_state(); }
                }
            }
            Screen::Results => {
                if let (Some(gs), Some(player)) = (&self.game_state.clone(), &self.player) {
                    match draw_results(gs, &player.id, self.t) {
                        ResultsAction::MainMenu  => { self.screen = Screen::Menu; }
                        ResultsAction::PlayAgain => {
                            self.screen    = Screen::Lobby;
                            self.game_id   = None;
                            self.game_state= None;
                            self.lobby_state = LobbyState::default();
                        }
                        ResultsAction::None => {}
                    }
                }
            }
            Screen::Leaderboard => {
                self.draw_leaderboard();
            }
        }
    }

    fn draw_leaderboard(&mut self) {
        let sw = screen_width();
        let sh = screen_height();
        clear_background(BG_DARK);
        let pw = (sw * 0.70).min(640.0);
        let px = sw/2.0 - pw/2.0;
        draw_panel_titled(px, 40.0, pw, sh - 100.0, "  🏆  Leaderboard — Current Season");

        for (i, entry) in self.leaderboard.iter().enumerate().take(15) {
            let ey = 82.0 + i as f32 * 46.0;
            if ey + 44.0 > sh - 70.0 { break; }
            draw_rectangle(px+8.0, ey, pw-16.0, 42.0, PANEL_MID);
            let rank   = entry["rank"].as_i64().unwrap_or(i as i64 + 1);
            let uname  = entry["username"].as_str().unwrap_or("?");
            let score  = entry["score"].as_i64().unwrap_or(0);
            let wins   = entry["wins"].as_i64().unwrap_or(0);
            let played = entry["games_played"].as_i64().unwrap_or(0);
            let medal  = match rank { 1=>"🥇", 2=>"🥈", 3=>"🥉", _=>"  " };
            draw_text_shadow(&format!("{}  {:>2}.  {:<20}  Score: {:>5}  Wins: {}  Games: {}",
                medal, rank, uname, score, wins, played),
                px+14.0, ey+26.0, 15.0, WHITE);
        }
        if self.leaderboard.is_empty() {
            draw_text_centered("No rankings yet. Play some games!", sw/2.0, sh/2.0, 18.0, STONE_MID);
        }
        if crate::ui::draw::button("Back", px, sh-56.0, 100.0, 36.0, PANEL_MID) {
            self.screen = Screen::Menu;
        }
    }
}

fn tracing_set_msg(app: &mut App, msg: &str) {
    app.game_ui.last_message = msg.to_string();
    app.game_ui.message_timer = 3.0;
    app.login_state.error_msg = msg.to_string();
    app.lobby_state.message   = msg.to_string();
}

use crate::ui::{colors::*, draw::*};
