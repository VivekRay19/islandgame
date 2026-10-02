// ─── API client — wraps all calls to the Rust game-server ────────────────────
import { API_BASE } from './config.js';

let _token  = localStorage.getItem('ci_token')  || null;
let _player = JSON.parse(localStorage.getItem('ci_player') || 'null');

export const auth = {
  getToken:  () => _token,
  getPlayer: () => _player,
  isLoggedIn:() => !!_token,

  setSession(token, player) {
    _token  = token;
    _player = player;
    localStorage.setItem('ci_token',  token);
    localStorage.setItem('ci_player', JSON.stringify(player));
  },
  clearSession() {
    _token = null; _player = null;
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_player');
  },
};

async function req(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res  = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (username, password, display_name) =>
    req('POST', '/auth/register', { username, password, display_name }),
  login: (username, password) =>
    req('POST', '/auth/login', { username, password }),
  me: () => req('GET', '/auth/me'),

  // Games
  listGames:    ()                       => req('GET',  '/games'),
  createGame:   (game_mode, island_type, max_players) =>
    req('POST', '/games', { game_mode, island_type, max_players }),
  joinGame:     (id, island_type)        => req('POST', `/games/${id}/join`,          { island_type }),
  startGame:    (id)                     => req('POST', `/games/${id}/start`,          {}),
  getState:     (id)                     => req('GET',  `/games/${id}/state`),
  placeTile:    (id, q, r, tile_id, rotation) =>
    req('POST', `/games/${id}/place-tile`, { q, r, tile_id, rotation }),
  respondEvent: (id, action, water_spent) =>
    req('POST', `/games/${id}/respond-event`, { action, water_spent }),
  trade:        (id, trader_id)          => req('POST', `/games/${id}/trade`,          { trader_id }),
  completeTask: (id, task_id)            => req('POST', `/games/${id}/complete-task`,  { task_id }),
  endTurn:      (id)                     => req('POST', `/games/${id}/end-turn`,       {}),

  // Meta
  leaderboard: () => req('GET', '/leaderboard'),
  campaign:    () => req('GET', '/campaign'),
  makeChoice:  (event_key, choice_key) =>
    req('POST', '/campaign/make-choice', { event_key, choice_key }),
};
