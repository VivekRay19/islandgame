import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.mjs';
import { animate } from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm';

const API_BASE = window.CI_API_BASE || '/api';
const TILE_SIZE = 78;
const SQRT3 = Math.sqrt(3);
const WORLD_ART = '/assets/island_world.webp';

const RESOURCES = [
  ['grain', 'grain', '🌾'], ['fibre', 'fibre', '🧵'], ['wood', 'wood', '🪵'], ['stone', 'stone', '🪨'],
  ['clay', 'clay', '🏺'], ['water', 'water', '💧'], ['music', 'music', '🥁'], ['ore', 'ore', '⛏']
];

const ISLANDS = [
  ['forest', 'Forest', 'WOOD', 'Higher fire risk', 'Dense timber and a dangerous dry edge.'],
  ['farming', 'Farming', 'GRAIN', 'Drought / crop stress', 'Abundant harvests, but water becomes precious.'],
  ['coastal', 'Coastal', 'WATER', 'Floods / storms', 'The sea pays well and punishes carelessness.'],
  ['mountain', 'Mountain', 'STONE', 'Landslides / construction', 'Stone and ore come easily; every slope matters.'],
];

const TILE_DEFS = {
  tile_farm: ['Terraced Farm', 'grain', { grain: 1, water: 1 }, 'farm', '🌾'],
  tile_textile_workshop: ['Textile Workshop', 'fibre', { fibre: 1, wood: 1 }, 'workshop', '🧵'],
  tile_haat_market: ['Haat Market', 'clay', { wood: 2, clay: 1 }, 'market', '🧺'],
  tile_community_house: ['Community Hall', 'wood', { wood: 2, stone: 1 }, 'hall', '🏠'],
  tile_music_pavilion: ['Music Pavilion', 'music', { wood: 1, music: 1 }, 'music', '🥁'],
  tile_sacred_shrine: ['Heritage Shrine', 'stone', { stone: 2, music: 1 }, 'shrine', '🛕'],
  tile_clay_pit: ['Clay Pit', 'clay', { water: 1 }, 'clay', '🏺'],
  tile_river_bend: ['River Bend', 'water', { water: 1 }, 'river', '💧'],
  tile_sacred_forest: ['Sacred Forest', 'wood', { wood: 1 }, 'forest', '🌳'],
  tile_quarry: ['Stone Quarry', 'stone', { stone: 1, ore: 1 }, 'quarry', '⛏'],
};

const BUILD_ART = {
  farm: '/assets/farm.webp', workshop: '/assets/workshop.webp', market: '/assets/market.webp',
  hall: '/assets/hall.webp', music: '/assets/music.webp', shrine: '/assets/shrine.webp'
};

const appState = {
  token: localStorage.getItem('ci_token') || '',
  player: JSON.parse(localStorage.getItem('ci_player') || 'null'),
  gameId: localStorage.getItem('ci_game_id') || '',
  gameMeta: null,
  state: null,
  tasks: [],
  traders: [],
  selectedIsland: 'forest',
  joinGameId: '',
  joinIsland: 'forest',
  selectedTile: null,
  rotation: 0,
  activeDock: 'build',
  polling: null,
  board: null,
  assetReady: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function toast(message, kind = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  $('#toast-root').appendChild(node);
  animate(node, { opacity: [0, 1, 0], translateY: [-12, 0, -4], duration: 2400, ease: 'inOutQuad' });
  setTimeout(() => node.remove(), 2350);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (appState.token) headers.set('Authorization', `Bearer ${appState.token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || 'Invalid server response' }; }
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}

function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
function saveSession() {
  if (appState.token) localStorage.setItem('ci_token', appState.token); else localStorage.removeItem('ci_token');
  if (appState.player) localStorage.setItem('ci_player', JSON.stringify(appState.player)); else localStorage.removeItem('ci_player');
  if (appState.gameId) localStorage.setItem('ci_game_id', appState.gameId); else localStorage.removeItem('ci_game_id');
}
function showView(id) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === id));
}
function setAuthMode(mode) {
  $$('.tab-btn').forEach((button) => button.classList.toggle('active', button.dataset.authTab === mode));
  $('#login-form').classList.toggle('active', mode === 'login');
  $('#register-form').classList.toggle('active', mode === 'register');
  $('#auth-error').textContent = '';
}

async function submitAuth(kind, payload) {
  $('#auth-error').textContent = '';
  try {
    const data = await api(`/auth/${kind}`, { method: 'POST', body: JSON.stringify(payload) });
    appState.token = data.token;
    appState.player = data.player;
    saveSession();
    await enterLobby();
  } catch (error) {
    $('#auth-error').textContent = error.message;
    animate('.auth-console', { translateX: [-8, 8, -5, 5, 0], duration: 360, ease: 'inOutQuad' });
  }
}

function islandThumb(islandId) {
  const positions = {
    forest: '50% 45%', farming: '54% 53%', coastal: '68% 60%', mountain: '55% 30%'
  };
  return positions[islandId] || '50% 50%';
}

function renderIslandOptions(target = $('#island-options'), join = false) {
  target.innerHTML = ISLANDS.map(([id, name, bonus, risk, desc]) => {
    const selected = (join ? appState.joinIsland : appState.selectedIsland) === id;
    return `<button class="${join ? 'join-option' : 'island-choice'} ${selected ? 'selected' : ''}" data-${join ? 'join-' : ''}island="${id}">
      <div class="${join ? 'join-bg' : 'thumb'}" style="background-position:${islandThumb(id)}"></div>${join ? '<div class="join-tint"></div>' : '<div class="wash"></div>'}
      <strong>${name} Island</strong><small>+${bonus.toLowerCase()} · ${risk}</small>${join ? `<span>${desc}</span>` : ''}
    </button>`;
  }).join('');
  target.querySelectorAll(`[data-${join ? 'join-' : ''}island]`).forEach((button) => button.addEventListener('click', () => {
    const key = join ? 'joinIsland' : 'selectedIsland';
    appState[key] = button.dataset[join ? 'joinIsland' : 'island'];
    renderIslandOptions(target, join);
  }));
}

async function enterLobby() {
  showView('lobby-view');
  $('#profile-chip').textContent = appState.player?.display_name || appState.player?.username || 'Steward';
  renderIslandOptions();
  await Promise.allSettled([refreshGames(), refreshLeaderboard()]);
  animate('.lobby-heading', { opacity: [0, 1], translateY: [16, 0], duration: 700, ease: 'outCubic' });
  animate('.island-choice', { opacity: [0, 1], translateY: [18, 0], duration: 520, delay: (_, index) => index * 70, ease: 'outBack' });
}

async function refreshGames() {
  try {
    const data = await api('/games');
    renderGames((data.games || []).filter((game) => game.status === 'waiting'));
  } catch (error) { toast(error.message, 'error'); }
}
function renderGames(games) {
  const list = $('#games-list');
  $('#games-empty').classList.toggle('hidden', games.length > 0);
  list.innerHTML = games.map((game) => `<button class="game-row" data-game-id="${game.id}"><span><strong>TABLE ${game.game_code}</strong><small>${game.game_mode.replace('_', ' ')} · ROUND ${game.current_round}</small></span><span class="game-badge">${game.max_players} SEATS</span></button>`).join('');
  list.querySelectorAll('.game-row').forEach((row) => row.addEventListener('click', () => openJoinDialog(row.dataset.gameId)));
}
async function refreshLeaderboard() {
  try {
    const data = await api('/leaderboard');
    $('#leaderboard-mini').innerHTML = (data.leaderboard || []).slice(0, 5).map((row) => `<div class="lb-row"><span class="lb-rank">${row.rank}</span><span>${row.display_name || row.username}</span><span class="lb-score">${row.score}</span></div>`).join('') || '<div class="scroll-empty">No scores recorded.</div>';
  } catch { $('#leaderboard-mini').innerHTML = '<div class="scroll-empty">Standings unavailable.</div>'; }
}
async function createGame() {
  try {
    const data = await api('/games', { method: 'POST', body: JSON.stringify({ game_mode: 'turn_based', max_players: Number($('#max-players').value), island_type: appState.selectedIsland }) });
    appState.gameId = data.game.id;
    saveSession();
    await openGame(appState.gameId);
    toast('Table prepared. Invite another steward.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}
function openJoinDialog(gameId) {
  appState.joinGameId = gameId;
  appState.joinIsland = appState.selectedIsland;
  renderIslandOptions($('#join-islands'), true);
  $('#join-modal').classList.remove('hidden');
  animate('.join-scroll', { opacity: [0, 1], scale: [.95, 1], duration: 380, ease: 'outBack' });
}
async function confirmJoin() {
  if (!appState.joinGameId) return;
  try {
    const data = await api(`/games/${appState.joinGameId}/join`, { method: 'POST', body: JSON.stringify({ island_type: appState.joinIsland }) });
    appState.gameId = appState.joinGameId;
    $('#join-modal').classList.add('hidden');
    saveSession();
    await openGame(appState.gameId);
    toast(data.message || 'Joined the table.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}

function meIsland() { return appState.state?.islands?.find((island) => island.player_id === appState.player?.id) || null; }
function isMyTurn() { return appState.gameMeta?.status === 'in_progress' && appState.state?.current_player_id === appState.player?.id && !appState.state?.game_over; }

async function openGame(gameId) {
  appState.gameId = gameId;
  saveSession();
  showView('game-view');
  await ensureBoard();
  await loadGame();
  startPolling();
  animate('.hud-top', { opacity: [0, 1], translateY: [-12, 0], duration: 500, ease: 'outCubic' });
  animate('.quest-ribbon', { opacity: [0, 1], translateX: [-16, 0], duration: 520, ease: 'outCubic' });
  animate('.build-wheel', { opacity: [0, 1], translateY: [25, 0], duration: 650, ease: 'outBack' });
}
async function loadGame() {
  if (!appState.gameId) return;
  try {
    const [game, state] = await Promise.all([api(`/games/${appState.gameId}`), api(`/games/${appState.gameId}/state`)]);
    appState.gameMeta = game.game;
    appState.state = state.state;
    appState.tasks = state.available_tasks || [];
    appState.traders = state.traders || [];
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}
function startPolling() {
  clearInterval(appState.polling);
  appState.polling = setInterval(loadGame, 2200);
}
function stopPolling() { clearInterval(appState.polling); appState.polling = null; }

async function ensureBoard() {
  if (appState.board) return;
  appState.board = new IslandBoard($('#pixi-root'));
  await appState.board.init();
}

function renderGame() {
  const island = meIsland();
  if (!island) return;
  const islandTitle = `${island.island_type.charAt(0).toUpperCase()}${island.island_type.slice(1)} Island`;
  $('#island-title').textContent = islandTitle;
  $('#game-code').textContent = appState.gameMeta?.game_code || '----';
  $('#round-label').textContent = appState.state?.round ?? 1;
  $('#turn-label').textContent = isMyTurn() ? 'YOUR TURN' : 'OTHER ISLAND';
  $('#sync-status').textContent = `SYNCED · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  $('#end-turn').disabled = !isMyTurn() || Boolean(island.active_event);
  $('#start-game').classList.toggle('hidden', appState.gameMeta?.status !== 'waiting');
  $('#cancel-build').classList.toggle('hidden', !appState.selectedTile);
  renderResources(island.resources || {});
  renderQuest(island);
  renderEvent(island);
  renderBuildWheel(island);
  if (!$('#side-panel').classList.contains('hidden')) renderSidePanel(island);
  appState.board.sync(island, appState.state);
}

function renderResources(resources) {
  $('#resource-strip').innerHTML = RESOURCES.map(([key, label, glyph]) => `<div class="resource-orb" title="${label}"><span class="res-glyph">${glyph}</span><strong>${resources[key] || 0}</strong><small>${label.slice(0,4)}</small></div>`).join('');
}
function renderQuest(island) {
  const event = island.active_event;
  if (event) {
    $('#quest-title').textContent = event.event_id === 'fire_event' ? 'Put out the fire.' : 'Respond to the island event.';
    $('#quest-subtitle').textContent = 'Events are decisions: spend, trade, or accept the consequence.';
    return;
  }
  const activeTask = appState.tasks.find((task) => !task.completed) || appState.tasks[0];
  $('#quest-title').textContent = activeTask?.name || 'Develop your island.';
  $('#quest-subtitle').textContent = activeTask?.description || 'Build, conserve, trade when short, and survive the season.';
}
function renderEvent(island) {
  const card = $('#event-card');
  const event = island.active_event;
  if (!event) { card.classList.add('hidden'); card.innerHTML = ''; return; }
  const positive = ['festival_event', 'harvest_bounty'].includes(event.event_id);
  const title = event.event_id === 'fire_event' ? 'FIRE ON THE ISLAND' : event.event_id === 'drought' ? 'THE DRY SEASON' : event.event_id === 'storm' ? 'STORM FRONT' : positive ? 'AN OPPORTUNITY' : 'ISLAND EVENT';
  const copy = event.event_id === 'fire_event' ? 'A tile is burning. Water is the clean response; trade can buy the reserve you lack.' : 'Choose how your island absorbs the problem. The world state will carry the consequence forward.';
  const need = ['fire_event', 'drought'].includes(event.event_id) ? 2 : event.event_id === 'storm' ? 1 : 0;
  card.classList.remove('hidden');
  card.innerHTML = `<div class="event-title"><div class="event-icon">!</div><div><strong>${title}</strong><small>ROUND ${event.round_triggered}</small></div></div><p>${copy}</p><div class="event-actions"><button id="event-resolve" class="game-button primary">${positive ? 'TAKE OPPORTUNITY' : 'RESPOND'}</button><button id="event-accept" class="game-button ghost">ACCEPT RISK</button></div>`;
  $('#event-resolve').disabled = !isMyTurn() || (!positive && (island.resources.water || 0) < need);
  $('#event-accept').disabled = !isMyTurn();
  $('#event-resolve').addEventListener('click', () => respondEvent(positive ? (event.event_id === 'harvest_bounty' ? 'harvest' : 'celebrate') : 'resolve'));
  $('#event-accept').addEventListener('click', () => respondEvent('accept'));
  animate(card, { opacity: [0, 1], translateX: [16, 0], duration: 450, ease: 'outCubic' });
}

function renderBuildWheel(island) {
  const root = $('#build-wheel');
  const canAct = isMyTurn() && !island.active_event;
  root.innerHTML = Object.entries(TILE_DEFS).map(([id, def]) => {
    const [name, resource, cost, art, glyph] = def;
    const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
    const selected = appState.selectedTile === id;
    const image = BUILD_ART[art];
    const costText = Object.entries(cost).map(([key, qty]) => `${qty}${RESOURCES.find((res) => res[0] === key)?.[2] || key}`).join(' ');
    return `<button class="build-slot ${selected ? 'selected' : ''} ${(!affordable || !canAct) ? 'locked' : ''}" data-tile-id="${id}" title="${name}">
      ${image ? `<div class="slot-art" style="background-image:url('${image}')"></div>` : `<div class="slot-art procedural-slot">${glyph}</div>`}<div class="slot-wash"></div><small>${costText}</small><strong>${name}</strong></button>`;
  }).join('');
  root.querySelectorAll('.build-slot').forEach((button) => button.addEventListener('click', () => {
    const tileId = button.dataset.tileId;
    const cost = TILE_DEFS[tileId][2];
    const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
    if (!canAct || !affordable) return;
    appState.selectedTile = tileId;
    appState.rotation = 0;
    $('#build-whisper').textContent = `${TILE_DEFS[tileId][0]} · choose a glowing hex · R rotates`;
    $('#side-panel').classList.add('hidden');
    animate(button, { scale: [1, 1.15, 1.04], translateY: [0, -12, -8], duration: 350, ease: 'outBack' });
    appState.board.sync(island, appState.state);
  }));
}

function renderSidePanel(island) {
  const root = $('#side-content');
  if (appState.activeDock === 'build') {
    $('#side-kicker').textContent = 'BUILD'; $('#side-title').textContent = 'Blueprints';
    root.innerHTML = Object.entries(TILE_DEFS).map(([id, def]) => {
      const [name, resource, cost] = def;
      const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
      return `<div class="panel-row"><div><strong>${name}</strong><small>Produces ${resource}. Cost: ${Object.entries(cost).map(([k,v])=>`${v} ${k}`).join(' · ')}</small></div><button data-pick="${id}" ${!isMyTurn() || !affordable || island.active_event ? 'disabled' : ''}>BUILD</button></div>`;
    }).join('');
    root.querySelectorAll('[data-pick]').forEach((button) => button.addEventListener('click', () => { appState.selectedTile = button.dataset.pick; $('#side-panel').classList.add('hidden'); renderGame(); }));
  } else if (appState.activeDock === 'trade') {
    $('#side-kicker').textContent = 'TRADE'; $('#side-title').textContent = 'Island merchants';
    root.innerHTML = appState.traders.map((trader) => {
      const enough = (island.resources[trader.requested_resource] || 0) >= trader.requested_qty;
      const allowed = isMyTurn() && !island.active_event && island.trades_this_round < 2 && trader.specialty !== island.specialty_res && enough;
      return `<div class="panel-row"><div><strong>${trader.name}</strong><small>${trader.island_name} · ${trader.requested_qty} ${trader.requested_resource} → ${trader.offered_qty} ${trader.offered_resource}</small></div><button data-trade="${trader.id}" ${allowed ? '' : 'disabled'}>TRADE</button></div>`;
    }).join('') || '<div class="scroll-empty">No merchants available.</div>';
    root.querySelectorAll('[data-trade]').forEach((button) => button.addEventListener('click', () => executeTrade(button.dataset.trade)));
  } else {
    $('#side-kicker').textContent = 'GOALS'; $('#side-title').textContent = 'Development tasks';
    root.innerHTML = appState.tasks.map((task) => {
      const cost = Object.fromEntries(task.cost || []);
      const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
      return `<div class="panel-row"><div><strong>${task.name}</strong><small>${task.description || 'Development objective'} · +${task.points} points</small></div><button data-task="${task.id}" ${!isMyTurn() || !affordable || island.active_event ? 'disabled' : ''}>CLAIM</button></div>`;
    }).join('') || '<div class="scroll-empty">No tasks are available.</div>';
    root.querySelectorAll('[data-task]').forEach((button) => button.addEventListener('click', () => completeTask(button.dataset.task)));
  }
}

function setDock(name) {
  appState.activeDock = name;
  $$('.dock-button').forEach((button) => button.classList.toggle('active', button.dataset.actionTab === name));
  $('#side-panel').classList.remove('hidden');
  const island = meIsland();
  if (island) renderSidePanel(island);
  animate('#side-panel', { opacity: [0, 1], translateX: [16, 0], duration: 320, ease: 'outCubic' });
}

async function placeTile(q, r) {
  if (!appState.selectedTile || !isMyTurn()) return;
  try {
    const data = await api(`/games/${appState.gameId}/place-tile`, { method: 'POST', body: JSON.stringify({ q, r, tile_id: appState.selectedTile, rotation: appState.rotation }) });
    appState.state = data.state; appState.tasks = data.available_tasks || appState.tasks; appState.selectedTile = null;
    $('#build-whisper').textContent = `Placed · edge bonus +${data.edge_bonus}`;
    toast(`Built ${TILE_DEFS[data.state?.last_tile_id || '']?.[0] || 'a new tile'}`, 'success');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}
async function respondEvent(action) {
  try { const data = await api(`/games/${appState.gameId}/respond-event`, { method: 'POST', body: JSON.stringify({ action }) }); appState.state = data.state; renderGame(); toast(data.message || 'Event resolved.', data.points > 0 ? 'success' : 'error'); }
  catch (error) { toast(error.message, 'error'); }
}
async function executeTrade(traderId) {
  try { const data = await api(`/games/${appState.gameId}/trade`, { method: 'POST', body: JSON.stringify({ trader_id: traderId }) }); appState.state = data.state; renderGame(); toast(data.message || 'Trade complete.', 'success'); }
  catch (error) { toast(error.message, 'error'); }
}
async function completeTask(taskId) {
  try {
    const data = await api(`/games/${appState.gameId}/complete-task`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) });
    appState.state = data.state; appState.tasks = (await api(`/games/${appState.gameId}/state`)).available_tasks || [];
    renderGame(); toast(data.message || 'Task complete.', 'success');
  } catch (error) { toast(error.message, 'error'); }
}
async function endTurn() {
  if (!isMyTurn() || meIsland()?.active_event) return;
  try { const data = await api(`/games/${appState.gameId}/end-turn`, { method: 'POST' }); appState.state = data.state; appState.selectedTile = null; renderGame(); toast(appState.state.game_over ? 'The season is complete.' : 'Turn passed.', 'success'); }
  catch (error) { toast(error.message, 'error'); }
}
async function startGame() {
  try { const data = await api(`/games/${appState.gameId}/start`, { method: 'POST' }); toast(data.message || 'Season started.', 'success'); await loadGame(); }
  catch (error) { toast(error.message, 'error'); }
}

class IslandBoard {
  constructor(host) {
    this.host = host; this.app = null; this.world = new Container(); this.art = null;
    this.hexLayer = new Container(); this.tileLayer = new Container(); this.fxLayer = new Container(); this.bgLayer = new Container();
    this.zoom = .95; this.dragging = false; this.dragStart = null; this.pointerStart = null; this.island = null;
  }
  async init() {
    this.app = new Application();
    await this.app.init({ resizeTo: this.host, antialias: true, backgroundColor: 0x0b1c16, preference: 'webgl', powerPreference: 'high-performance' });
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.bgLayer, this.world);
    this.artBaseX = 0;
    this.world.addChild(this.hexLayer, this.tileLayer, this.fxLayer);
    const texture = await Assets.load(WORLD_ART);
    this.art = new Sprite(texture); this.art.anchor.set(.5); this.bgLayer.addChild(this.art);
    this.app.stage.eventMode = 'static'; this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (event) => { this.dragging = false; this.pointerStart = event.global.clone(); this.dragStart = { x: this.world.x, y: this.world.y }; });
    this.app.stage.on('pointermove', (event) => { if (!this.pointerStart) return; const dx = event.global.x - this.pointerStart.x; const dy = event.global.y - this.pointerStart.y; if (Math.hypot(dx, dy) > 5) this.dragging = true; if (this.dragging) { this.world.position.set(this.dragStart.x + dx, this.dragStart.y + dy); } });
    this.app.stage.on('pointerup', () => { this.pointerStart = null; });
    this.app.stage.on('pointerupoutside', () => { this.pointerStart = null; });
    this.app.canvas.addEventListener('wheel', (event) => { event.preventDefault(); this.zoom = Math.min(1.35, Math.max(.72, this.zoom + (event.deltaY > 0 ? -.07 : .07))); this.layout(); }, { passive: false });
    window.addEventListener('resize', () => this.layout());
    this.app.ticker.add((ticker) => {
      const t = ticker.lastTime / 1000;
      if (this.fxLayer.children.length) this.fxLayer.children.forEach((node, index) => { node.alpha = .34 + Math.sin(t * 2.2 + index) * .16; });
      if (this.art) this.art.x = this.artBaseX + Math.sin(t * .12) * 0.9;
    });
    this.layout();
  }
  layout() {
    if (!this.app || !this.art) return;
    const w = this.host.clientWidth; const h = this.host.clientHeight;
    const cover = Math.max(w / this.art.texture.width, h / this.art.texture.height) * 1.05;
    this.art.scale.set(cover);
    this.bgLayer.position.set(w / 2, h / 2 + 15);
    if (!this.dragging && this.world.x === 0 && this.world.y === 0) this.world.position.set(w / 2, h / 2 + 30);
    this.world.scale.set(this.zoom);
  }
  cell(q, r) {
    return { x: (q * SQRT3 * TILE_SIZE) + (r * SQRT3 * TILE_SIZE / 2), y: r * TILE_SIZE * 1.5 };
  }
  polyPoints(radius) {
    return Array.from({ length: 6 }, (_, index) => { const angle = Math.PI / 180 * (60 * index - 30); return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }; });
  }
  clear(container) { container.removeChildren().forEach((child) => child.destroy({ children: true })); }
  sync(island, state) {
    this.island = island;
    this.clear(this.hexLayer); this.clear(this.tileLayer); this.clear(this.fxLayer);
    const occupied = new Set((island.tiles || []).map((tile) => `${tile.q},${tile.r}`));
    const cells = new Map();
    for (let q = -3; q <= 3; q += 1) for (let r = -3; r <= 3; r += 1) { if (Math.abs(q + r) > 4) continue; cells.set(`${q},${r}`, [q,r]); }
    for (const [key,[q,r]] of cells) {
      const p = this.cell(q,r);
      const cell = new Graphics();
      const color = occupied.has(key) ? 0x315e43 : 0x7aa173;
      cell.poly(this.polyPoints(TILE_SIZE - 3)).fill({ color, alpha: occupied.has(key) ? .08 : .035 }).stroke({ color: occupied.has(key) ? 0xd5c27b : 0xd4e0bd, width: 1.2, alpha: .14 });
      cell.x = p.x; cell.y = p.y; this.hexLayer.addChild(cell);
    }
    for (const tile of island.tiles || []) this.drawTile(tile);
    if (appState.selectedTile && isMyTurn() && !island.active_event) this.drawHints(occupied);
    if (island.active_event) this.drawEventPulse(island.active_event);
    this.layout();
  }
  drawTile(tile) {
    const def = TILE_DEFS[tile.tile_id] || ['Unknown Site','resource',{},'hall','•'];
    const group = new Container(); const p = this.cell(tile.q, tile.r); group.position.set(p.x, p.y - 10);
    const shadow = new Graphics().ellipse(0, 20, 58, 19).fill({ color: 0x0b140f, alpha: .42 }); group.addChild(shadow);
    const pad = new Graphics().poly(this.polyPoints(TILE_SIZE - 7)).fill({ color: 0x6d6a4a, alpha: .56 }).stroke({ color: 0xe5d6a6, width: 1.5, alpha: .22 }); group.addChild(pad);
    this.drawBuilding(group, def[3], def[4]);
    const name = new Text({ text: def[0], style: new TextStyle({ fontFamily:'Georgia', fontSize: 9, fill: 0xf3e5bf, fontWeight:'600', align:'center', stroke:{ color:0x26160d, width:3 } }) }); name.anchor.set(.5); name.y = 42; group.addChild(name);
    this.tileLayer.addChild(group);
  }
  drawBuilding(group, kind, glyph) {
    const g = new Graphics();
    const roof = kind === 'forest' ? 0x4e7d4c : kind === 'river' ? 0x2a94be : kind === 'quarry' ? 0x858f95 : kind === 'market' ? 0xc76f43 : 0xb3763d;
    if (kind === 'farm') {
      for (let i=0;i<4;i++) g.ellipse(-26 + i*17, 5 - (i%2)*8, 13, 7).fill({color:0x8aa45a});
      g.poly([{x:-20,y:-2},{x:0,y:-19},{x:20,y:-2}]).fill({color:0xc58d45}); g.rect(-18, -1, 36, 18).fill({color:0xb7793d}); g.rect(-4, 7, 8, 10).fill({color:0x4f3420});
    } else if (kind === 'forest') {
      for (let i=0;i<5;i++){const x=-24+i*12;g.rect(x-2,7,4,13).fill({color:0x654932});g.circle(x,0,13).fill({color:0x3f774b});g.circle(x+5,-6,9).fill({color:0x4e8a55});}
    } else if (kind === 'river') {
      g.moveTo(-30,-8).bezierCurveTo(-10,-20,4,2,27,-10).stroke({color:0x55c5e4,width:10,alpha:.9}); g.moveTo(-26,6).bezierCurveTo(-8,-6,5,15,27,3).stroke({color:0xb4e6ef,width:4,alpha:.55});
    } else if (kind === 'quarry' || kind === 'clay') {
      g.ellipse(0,9,30,15).fill({color:kind === 'clay'?0xa86849:0x737b7d}); g.poly([{x:-24,y:4},{x:-10,y:-22},{x:4,y:-8},{x:20,y:-28},{x:27,y:2}]).fill({color:roof}); g.rect(-17,4,34,7).fill({color:0x3d3327});
    } else {
      g.poly([{x:-24,y:4},{x:0,y:-19},{x:24,y:4}]).fill({color:roof}); g.rect(-19,2,38,23).fill({color:0xc58b52}); g.rect(-5,12,10,13).fill({color:0x55331e}); g.rect(-25,5,50,4).fill({color:0x4a2d1a});
      if (kind === 'shrine') { g.circle(0,-3,16).stroke({color:0xe7c46a,width:2}); g.rect(-2,-18,4,32).fill({color:0xe7c46a}); }
      if (kind === 'music') { g.rect(6,-18,4,22).fill({color:0x6c4730}); g.circle(0,9,7).fill({color:0xd5ad5a}); }
      if (kind === 'hall') { g.rect(-13,8,26,5).fill({color:0x6b4530}); }
      if (kind === 'market') { for(let x=-13;x<=13;x+=13) g.rect(x-5,-6,10,12).fill({color:0xe2b84c}); }
    }
    const glyphText = new Text({ text:glyph, style:new TextStyle({ fontSize:18, align:'center' }) }); glyphText.anchor.set(.5); glyphText.y=-30;
    group.addChild(g); group.addChild(glyphText);
  }
  drawHints(occupied) {
    const candidates = [];
    for (let q=-3;q<=3;q+=1) for(let r=-3;r<=3;r+=1){
      if(Math.abs(q+r)>4) continue; const key=`${q},${r}`; if(occupied.has(key)) continue;
      let adjacent=false; for(const [nq,nr] of [[q+1,r],[q+1,r-1],[q,r-1],[q-1,r],[q-1,r+1],[q,r+1]]) if(occupied.has(`${nq},${nr}`)){adjacent=true;break}
      if(adjacent) candidates.push([q,r]);
    }
    candidates.slice(0,18).forEach(([q,r])=>{
      const p=this.cell(q,r);const g=new Graphics().poly(this.polyPoints(TILE_SIZE-7)).fill({color:0x99d85c,alpha:.11}).stroke({color:0xdbe88b,width:2,alpha:.55});g.x=p.x;g.y=p.y;g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>{if(!this.dragging)placeTile(q,r);});this.hexLayer.addChild(g);
      const pulse=new Graphics().circle(0,-28,4).fill({color:0xe7c56c,alpha:.85});pulse.x=p.x;pulse.y=p.y;this.fxLayer.addChild(pulse);
    });
  }
  drawEventPulse(event) {
    const p=this.cell(event.target_q,event.target_r); const ring=new Graphics().circle(0,0,TILE_SIZE-8).stroke({color:0xff684e,width:5,alpha:.75});ring.x=p.x;ring.y=p.y;this.fxLayer.addChild(ring);
    const fire=new Text({text:'🔥',style:new TextStyle({fontSize:28})});fire.anchor.set(.5);fire.x=p.x;fire.y=p.y-46;this.fxLayer.addChild(fire);
  }
  resetView(){this.zoom=.95;this.dragging=false;this.world.position.set(this.host.clientWidth/2,this.host.clientHeight/2+30);this.layout();}
}

function wireEvents() {
  $$('.tab-btn').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authTab)));
  $('#login-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth('login', formObject(event.target)); });
  $('#register-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth('register', formObject(event.target)); });
  $('#logout-btn').addEventListener('click', () => { stopPolling(); appState.token=''; appState.player=null; appState.gameId=''; appState.state=null; saveSession(); showView('auth-view'); });
  $('#refresh-games').addEventListener('click', refreshGames); $('#create-game').addEventListener('click', createGame);
  $('#join-close').addEventListener('click', () => $('#join-modal').classList.add('hidden')); $('#join-confirm').addEventListener('click', confirmJoin);
  $('#back-lobby').addEventListener('click', async () => { stopPolling(); appState.gameId=''; saveSession(); showView('lobby-view'); await refreshGames(); });
  $('#end-turn').addEventListener('click', endTurn); $('#start-game').addEventListener('click', startGame);
  $('#cancel-build').addEventListener('click', () => { appState.selectedTile=null; $('#build-whisper').textContent='Choose a blueprint below.'; renderGame(); });
  $$('.dock-button').forEach((button) => button.addEventListener('click', () => setDock(button.dataset.actionTab)));
  $('#side-close').addEventListener('click', () => $('#side-panel').classList.add('hidden'));
  $('#zoom-in').addEventListener('click', () => { if (appState.board){appState.board.zoom=Math.min(1.35,appState.board.zoom+.1);appState.board.layout();} });
  $('#zoom-out').addEventListener('click', () => { if (appState.board){appState.board.zoom=Math.max(.72,appState.board.zoom-.1);appState.board.layout();} });
  $('#zoom-reset').addEventListener('click', () => appState.board?.resetView());
  window.addEventListener('keydown', (event) => {
    if (!appState.selectedTile || !isMyTurn()) return;
    if (event.key.toLowerCase()==='r'){appState.rotation=(appState.rotation+60)%360;$('#build-whisper').textContent=`${TILE_DEFS[appState.selectedTile][0]} · rotation ${appState.rotation}° · click a glowing hex`;}
    if (event.key==='Escape'){appState.selectedTile=null;renderGame();}
  });
}

async function boot() {
  wireEvents();
  if (!appState.token) { showView('auth-view'); return; }
  try { const data=await api('/auth/me'); appState.player=data.player; saveSession(); await enterLobby(); }
  catch { appState.token='';appState.player=null;saveSession();showView('auth-view'); }
}

boot();
