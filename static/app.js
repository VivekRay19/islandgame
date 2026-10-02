import { Application, Container, Graphics, Text, TextStyle } from 'https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.mjs';

const API_BASE = window.CI_API_BASE || '/api';
const TILE_SIZE = 82;
const HEX_W = Math.sqrt(3) * TILE_SIZE;

const RESOURCES = [
  ['grain', 'grain', '#e6bd70'], ['fibre', 'fibre', '#90b7dc'], ['wood', 'wood', '#7fd29c'],
  ['stone', 'stone', '#b7bfc6'], ['clay', 'clay', '#d6976d'], ['water', 'water', '#6ec4ec'],
  ['music', 'music', '#bf95df'], ['ore', 'ore', '#d6a768']
];

const ISLANDS = [
  ['forest', 'Forest', 'WOOD', 'Higher fire risk'],
  ['farming', 'Farming', 'GRAIN', 'Drought / crop stress'],
  ['coastal', 'Coastal', 'WATER', 'Floods / storms'],
  ['mountain', 'Mountain', 'STONE', 'Landslides / construction']
];

const TILE_DEFS = {
  tile_farm: ['Terraced Grain Farm', 'grain', 0x6d9b63, { grain: 1, water: 1 }, 'farm'],
  tile_textile_workshop: ['Textile Workshop', 'fibre', 0x7e779f, { fibre: 1, wood: 1 }, 'craft'],
  tile_haat_market: ['Haat Trading Square', 'clay', 0xc18b58, { wood: 2, clay: 1 }, 'market'],
  tile_community_house: ['Community Gathering Hall', 'wood', 0x7c8b9a, { wood: 2, stone: 1 }, 'hall'],
  tile_music_pavilion: ['Melodic Music Pavilion', 'music', 0xa37cbf, { wood: 1, music: 1 }, 'music'],
  tile_sacred_shrine: ['Ancestral Heritage Shrine', 'stone', 0x9f9274, { stone: 2, music: 1 }, 'shrine'],
  tile_clay_pit: ['Riverbed Clay Pit', 'clay', 0xa76e59, { water: 1 }, 'pit'],
  tile_river_bend: ['Scenic River Waterway', 'water', 0x4a8daf, { water: 1 }, 'river'],
  tile_sacred_forest: ['Ancient Banyan Forest', 'wood', 0x3f7659, { wood: 1 }, 'forest'],
  tile_quarry: ['Stone Quarry & Mine', 'stone', 0x707d84, { stone: 1, ore: 1 }, 'quarry']
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
  activeTab: 'build',
  polling: null,
  pixi: null,
  board: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function toast(message, kind = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  $('#toast-root').appendChild(node);
  setTimeout(() => node.remove(), 3600);
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

function saveSession() {
  if (appState.token) localStorage.setItem('ci_token', appState.token); else localStorage.removeItem('ci_token');
  if (appState.player) localStorage.setItem('ci_player', JSON.stringify(appState.player)); else localStorage.removeItem('ci_player');
  if (appState.gameId) localStorage.setItem('ci_game_id', appState.gameId); else localStorage.removeItem('ci_game_id');
}

function showView(id) {
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === id));
}

function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

function setAuthMode(mode) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.authTab === mode));
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
  }
}

function renderIslandOptions() {
  $('#island-options').innerHTML = ISLANDS.map(([id, name, bonus, risk]) => `
    <button class="island-option ${appState.selectedIsland === id ? 'selected' : ''}" data-island="${id}">
      <strong>${name} Island</strong>
      <small>+ ${bonus.toLowerCase()} · risk: ${risk}</small>
    </button>
  `).join('');
  $$('.island-option').forEach((button) => button.addEventListener('click', () => {
    appState.selectedIsland = button.dataset.island;
    renderIslandOptions();
  }));
}

async function enterLobby() {
  showView('lobby-view');
  $('#profile-chip').textContent = appState.player?.display_name || appState.player?.username || 'Player';
  renderIslandOptions();
  await Promise.allSettled([refreshGames(), refreshLeaderboard()]);
}

async function refreshGames() {
  try {
    const data = await api('/games');
    renderGames((data.games || []).filter((game) => game.status === 'waiting'));
  } catch (error) {
    toast(error.message, 'error');
  }
}

function renderGames(games) {
  const list = $('#games-list');
  $('#games-empty').classList.toggle('hidden', games.length > 0);
  list.innerHTML = games.map((game) => `
    <button class="game-row" data-game-id="${game.id}">
      <span><strong>Table ${game.game_code}</strong><small>${game.game_mode.replace('_', ' ')} · round ${game.current_round}</small></span>
      <span class="game-badge">${game.status}</span>
      <span class="game-badge">${game.max_players} seats</span>
    </button>
  `).join('');
  $$('.game-row').forEach((row) => row.addEventListener('click', () => openJoinDialog(row.dataset.gameId)));
}

async function refreshLeaderboard() {
  try {
    const data = await api('/leaderboard');
    $('#leaderboard-mini').innerHTML = (data.leaderboard || []).slice(0, 5).map((row) => `
      <div class="lb-row"><span class="lb-rank">#${row.rank}</span><span class="lb-name">${row.display_name || row.username}</span><span class="lb-score">${row.score}</span></div>
    `).join('') || '<div class="empty-state" style="min-height:120px">No scores yet.</div>';
  } catch {
    $('#leaderboard-mini').innerHTML = '<div class="empty-state" style="min-height:120px">Standings unavailable.</div>';
  }
}

async function createGame() {
  try {
    const data = await api('/games', { method: 'POST', body: JSON.stringify({ game_mode: 'turn_based', max_players: Number($('#max-players').value), island_type: appState.selectedIsland }) });
    appState.gameId = data.game.id;
    saveSession();
    await openGame(appState.gameId);
    toast('Table created. Invite another player to join.', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openJoinDialog(gameId) {
  appState.joinGameId = gameId;
  appState.joinIsland = appState.selectedIsland;
  $('#join-islands').innerHTML = ISLANDS.map(([id, name, bonus, risk]) => `
    <button class="island-option ${appState.joinIsland === id ? 'selected' : ''}" data-join-island="${id}">
      <strong>${name} Island</strong><small>+ ${bonus.toLowerCase()} · risk: ${risk}</small>
    </button>
  `).join('');
  $$('#join-islands .island-option').forEach((button) => button.addEventListener('click', () => {
    appState.joinIsland = button.dataset.joinIsland;
    $$('#join-islands .island-option').forEach((node) => node.classList.toggle('selected', node.dataset.joinIsland === appState.joinIsland));
  }));
  $('#join-modal').classList.remove('hidden');
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
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function openGame(gameId) {
  appState.gameId = gameId;
  saveSession();
  showView('game-view');
  await loadGame();
  startPolling();
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
  } catch (error) {
    toast(error.message, 'error');
  }
}

function startPolling() {
  clearInterval(appState.polling);
  appState.polling = setInterval(loadGame, 2500);
}

function stopPolling() {
  clearInterval(appState.polling);
  appState.polling = null;
}

function meIsland() { return appState.state?.islands?.find((i) => i.player_id === appState.player?.id) || null; }
function isMyTurn() { return appState.gameMeta?.status === 'in_progress' && appState.state?.current_player_id === appState.player?.id && !appState.state?.game_over; }

function renderGame() {
  const island = meIsland();
  if (!island) return;
  $('#game-code').textContent = appState.gameMeta?.game_code || '——';
  $('#round-label').textContent = appState.state.round;
  $('#turn-label').textContent = isMyTurn() ? 'Your turn' : 'Another island is acting';
  $('#turn-summary-label').textContent = isMyTurn() ? 'Your turn' : 'Waiting for the next island';
  $('#turn-summary-hint').textContent = appState.state.game_over ? 'The table is complete.' : appState.gameMeta?.status === 'waiting' ? 'The table is waiting for the host to start the first round.' : isMyTurn() ? 'Build, trade, resolve an event, then continue.' : 'Watch the island order and prepare your next move.';
  $('#start-game').classList.toggle('hidden', appState.gameMeta?.status !== 'waiting');
  $('#start-game').disabled = appState.gameMeta?.status !== 'waiting';
  $('#island-title').textContent = `${island.island_type.charAt(0).toUpperCase() + island.island_type.slice(1)} Island`;
  $('#end-turn').disabled = !isMyTurn() || Boolean(island.active_event);
  $('#cancel-build').classList.toggle('hidden', !appState.selectedTile);
  renderResources(island.resources);
  renderEvent(island);
  renderActions(island);
  renderLog();
  if (!appState.pixi) initPixi();
  appState.board?.sync(island, appState.state);
}

function renderResources(resources) {
  $('#resource-strip').innerHTML = RESOURCES.map(([key, label, color]) => `
    <div class="res-chip" style="--res-color:${color}"><i></i><span>${label}</span><strong>${resources[key] || 0}</strong></div>
  `).join('');
}

function renderEvent(island) {
  const card = $('#event-card');
  const event = island.active_event;
  if (!event) { card.classList.add('hidden'); card.innerHTML = ''; return; }
  const positive = ['festival_event', 'harvest_bounty'].includes(event.event_id);
  const eventMeta = event.event_id === 'fire_event' ? ['Fire at the craft centre', 'A tile is burning. Water is the immediate response.'] : event.event_id === 'drought' ? ['Long dry season', 'Stored water protects the farm.'] : event.event_id === 'storm' ? ['Cyclone warning', 'Protect the community building.'] : event.event_id === 'festival_event' ? ['Seasonal community festival', 'A positive opportunity is waiting at the pavilion.'] : ['Golden harvest', 'A productive harvest is ready to collect.'];
  card.classList.remove('hidden');
  card.innerHTML = `
    <div class="event-title"><div class="event-icon">!</div><div><strong>${eventMeta[0]}</strong><small>Round ${event.round_triggered} · tile (${event.target_q}, ${event.target_r})</small></div></div>
    <p class="event-copy">${eventMeta[1]}</p>
    <div class="event-actions"><button id="event-resolve" class="primary-btn">${positive ? 'Take opportunity' : 'Use water'}</button><button id="event-accept" class="ghost-btn">Accept risk</button></div>
  `;
  const waterNeeded = ['fire_event', 'drought'].includes(event.event_id) ? 2 : event.event_id === 'storm' ? 1 : 0;
  const waterAvailable = island.resources.water || 0;
  $('#event-resolve').disabled = !isMyTurn() || (!positive && waterAvailable < waterNeeded);
  $('#event-accept').disabled = !isMyTurn();
  $('#event-resolve').addEventListener('click', () => respondEvent(positive ? (event.event_id === 'harvest_bounty' ? 'harvest' : 'celebrate') : 'resolve'));
  $('#event-accept').addEventListener('click', () => respondEvent('accept'));
}

function renderActions(island) {
  $$('.action-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.actionTab === appState.activeTab));
  $$('.action-content').forEach((panel) => panel.classList.remove('active'));
  $(`#${appState.activeTab}-panel`).classList.add('active');
  renderBuildPanel(island);
  renderTradePanel(island);
  renderTaskPanel(island);
}

function renderBuildPanel(island) {
  const canAct = isMyTurn() && !island.active_event;
  $('#build-panel').innerHTML = `<div class="build-list">${Object.entries(TILE_DEFS).map(([id, def]) => {
    const [name, resource, color, cost] = def;
    const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
    const label = Object.entries(cost).map(([key, qty]) => `${qty} ${key}`).join(' · ');
    return `<div class="build-card"><div class="tile-thumb" style="background:${hex(color)}">${resource[0].toUpperCase()}</div><div><strong>${name}</strong><small>Generates ${resource}</small><div class="cost-line">${label.split(' · ').map((x) => `<span class="cost-dot">${x}</span>`).join('')}</div></div><button class="ghost-btn build-pick" data-tile-id="${id}" ${!canAct || !affordable ? 'disabled' : ''}>${affordable ? 'Build' : 'Locked'}</button></div>`;
  }).join('')}</div>`;
  $$('.build-pick').forEach((button) => button.addEventListener('click', () => {
    appState.selectedTile = button.dataset.tileId;
    appState.rotation = 0;
    $('#board-help').textContent = `${TILE_DEFS[appState.selectedTile][0]} selected · press R to rotate. Click a glowing adjacent cell.`;
    toast('Placement mode: choose a highlighted cell on the island.', 'success');
    appState.board?.sync(island, appState.state);
  }));
}

function renderTradePanel(island) {
  $('#trade-panel').innerHTML = `<div class="trade-list">${appState.traders.map((trader) => {
    const enough = (island.resources[trader.requested_resource] || 0) >= trader.requested_qty;
    const allowed = isMyTurn() && !island.active_event && island.trades_this_round < 2 && trader.specialty !== island.specialty_res && enough;
    return `<div class="trade-card"><div><strong>${trader.name} · ${trader.island_name}</strong><small>Specialty: ${trader.specialty}</small></div><div class="trade-flow"><span>${trader.requested_qty} ${trader.requested_resource}</span><span class="arrow">→</span><strong>${trader.offered_qty} ${trader.offered_resource}</strong></div><button class="ghost-btn trade-pick" data-trader-id="${trader.id}" ${allowed ? '' : 'disabled'}>Trade</button></div>`;
  }).join('')}</div>`;
  $$('.trade-pick').forEach((button) => button.addEventListener('click', () => executeTrade(button.dataset.traderId)));
}

function renderTaskPanel(island) {
  $('#tasks-panel').innerHTML = `<div class="task-list">${appState.tasks.map((task) => {
    const cost = Object.fromEntries(task.cost || []);
    const affordable = Object.entries(cost).every(([key, qty]) => (island.resources[key] || 0) >= qty);
    const allowed = isMyTurn() && !island.active_event && affordable;
    return `<div class="task-card"><div><strong>${task.name}</strong><small>${task.description || 'Development objective for this round.'}</small></div><div class="task-meta"><span>${Object.entries(cost).map(([k,v])=>`${v} ${k}`).join(' · ')}</span><span>+${task.points} pts</span></div><button class="ghost-btn task-pick" data-task-id="${task.id}" ${allowed ? '' : 'disabled'}>Complete task</button></div>`;
  }).join('') || '<div class="empty-state" style="min-height:160px">No tasks available this round.</div>'}</div>`;
  $$('.task-pick').forEach((button) => button.addEventListener('click', () => completeTask(button.dataset.taskId)));
}

function renderLog() {
  const log = appState.state?.action_log || [];
  $('#action-log').innerHTML = [...log].reverse().slice(0, 16).map((item) => `<div class="log-item">${item}</div>`).join('');
  $('#sync-status').textContent = `Live · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function placeTile(q, r) {
  if (!appState.selectedTile || !isMyTurn()) return;
  try {
    const data = await api(`/games/${appState.gameId}/place-tile`, { method: 'POST', body: JSON.stringify({ q, r, tile_id: appState.selectedTile, rotation: appState.rotation }) });
    appState.state = data.state;
    appState.tasks = data.available_tasks || appState.tasks;
    appState.selectedTile = null;
    $('#board-help').textContent = `Placed with an edge bonus of +${data.edge_bonus}.`;
    toast(`Tile placed · edge bonus +${data.edge_bonus}`, 'success');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}

async function respondEvent(action) {
  try {
    const data = await api(`/games/${appState.gameId}/respond-event`, { method: 'POST', body: JSON.stringify({ action }) });
    appState.state = data.state;
    toast(data.message || 'Event resolved.', data.points > 0 ? 'success' : 'error');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}

async function executeTrade(traderId) {
  try {
    const data = await api(`/games/${appState.gameId}/trade`, { method: 'POST', body: JSON.stringify({ trader_id: traderId }) });
    appState.state = data.state;
    toast(data.message || 'Trade complete.', 'success');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}

async function completeTask(taskId) {
  try {
    const data = await api(`/games/${appState.gameId}/complete-task`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) });
    appState.state = data.state;
    appState.tasks = (await api(`/games/${appState.gameId}/state`)).available_tasks || [];
    toast(data.message || 'Task complete.', 'success');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}

async function endTurn() {
  if (!isMyTurn() || meIsland()?.active_event) return;
  try {
    const data = await api(`/games/${appState.gameId}/end-turn`, { method: 'POST' });
    appState.state = data.state;
    appState.selectedTile = null;
    toast(appState.state.game_over ? 'The table is complete.' : 'Turn passed.', 'success');
    renderGame();
  } catch (error) { toast(error.message, 'error'); }
}

async function startGame() {
  try {
    const data = await api(`/games/${appState.gameId}/start`, { method: 'POST' });
    toast(data.message || 'Game started.', 'success');
    await loadGame();
  } catch (error) { toast(error.message, 'error'); }
}

function hex(value) { return `#${value.toString(16).padStart(6, '0')}`; }
function hexToPoint(q, r, centerX, centerY, zoom = 1) { return { x: centerX + (q * HEX_W + r * HEX_W / 2) * zoom, y: centerY + r * TILE_SIZE * 1.5 * zoom }; }
function neighbors(q, r) { return [[q+1,r],[q+1,r-1],[q,r-1],[q-1,r],[q-1,r+1],[q,r+1]]; }
function tileAt(tiles, q, r) { return tiles.find((tile) => tile.q === q && tile.r === r); }
function legalCells(tiles) {
  const occupied = new Set(tiles.map((t) => `${t.q},${t.r}`));
  const result = new Set();
  tiles.forEach((tile) => neighbors(tile.q, tile.r).forEach(([q,r]) => { if (!occupied.has(`${q},${r}`)) result.add(`${q},${r}`); }));
  return [...result].map((key) => key.split(',').map(Number));
}

class IslandBoard {
  constructor(host) {
    this.host = host;
    this.app = null;
    this.world = new Container();
    this.background = new Graphics();
    this.tiles = new Container();
    this.hints = new Container();
    this.fx = new Container();
    this.zoom = 1;
    this.dragging = false;
    this.dragStart = null;
  }
  async init() {
    this.app = new Application();
    await this.app.init({ resizeTo: this.host, backgroundColor: 0x071d25, antialias: true, preference: 'webgl' });
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.background, this.world);
    this.world.addChild(this.hints, this.tiles, this.fx);
    this.drawBackground();
    this.app.canvas.addEventListener('wheel', (event) => { event.preventDefault(); this.zoom = Math.max(.65, Math.min(1.55, this.zoom + (event.deltaY > 0 ? -.08 : .08))); this.layout(); }, { passive: false });
    this.app.canvas.addEventListener('pointerdown', (event) => { this.dragging = true; this.dragStart = { x: event.clientX, y: event.clientY, px: this.world.x, py: this.world.y }; });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    window.addEventListener('pointermove', (event) => { if (!this.dragging || !this.dragStart) return; this.world.x = this.dragStart.px + (event.clientX - this.dragStart.x); this.world.y = this.dragStart.py + (event.clientY - this.dragStart.y); });
    this.app.ticker.add(() => { this.fx.children.forEach((child) => { child.alpha = .58 + Math.sin(performance.now() / 300) * .18; }); });
    window.addEventListener('resize', () => this.layout());
  }
  drawBackground() {
    const g = this.background;
    g.clear();
    g.rect(0, 0, Math.max(window.innerWidth, this.host.clientWidth), Math.max(window.innerHeight, this.host.clientHeight)).fill({ color: 0x071d25 });
    for (let x = 20; x < Math.max(window.innerWidth, this.host.clientWidth); x += 72) {
      g.moveTo(x, 80).lineTo(x - 16, Math.max(window.innerHeight, this.host.clientHeight)).stroke({ color: 0x143b43, width: 1, alpha: .18 });
    }
  }
  sync(island, state) {
    this.island = island;
    this.state = state;
    this.tiles.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.hints.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.fx.removeChildren().forEach((child) => child.destroy({ children: true }));
    island.tiles.forEach((tile) => this.drawTile(tile));
    if (appState.selectedTile && isMyTurn() && !island.active_event) this.drawHints();
    if (island.active_event) this.drawEventPulse(island.active_event);
    this.layout();
  }
  layout() {
    if (!this.app || !this.island) return;
    const rect = this.host.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2 + 25;
    this.world.x = this.world.x || centerX;
    this.world.y = this.world.y || centerY;
    if (!this.dragging) { this.world.x = centerX + (this.world.x - centerX) * .15; this.world.y = centerY + (this.world.y - centerY) * .15; }
    this.world.scale.set(this.zoom);
  }
  drawTile(tile) {
    const tileDef = TILE_DEFS[tile.tile_id] || ['Tile', 'resource', 0x56727b, {}, 'hall'];
    const graphics = new Container();
    const shadow = new Graphics().poly(hexPoints(0, 0, TILE_SIZE)).fill({ color: 0x000000, alpha: .25 });
    shadow.y = 6; graphics.addChild(shadow);
    const body = new Graphics().poly(hexPoints(0, 0, TILE_SIZE)).fill({ color: tileDef[2] }).stroke({ color: 0xd9f3eb, width: 2, alpha: .16 });
    graphics.addChild(body);
    drawIcon(graphics, tileDef[4], tileDef[2]);
    const label = new Text({ text: shortTileName(tileDef[0]), style: new TextStyle({ fontFamily: 'DM Sans', fontSize: 8, fontWeight: '700', fill: 0xf0f8f4, align: 'center' }) });
    label.anchor.set(.5); label.y = 41; graphics.addChild(label);
    const pos = hexToPoint(tile.q, tile.r, 0, 0, 1);
    graphics.x = pos.x; graphics.y = pos.y; graphics.eventMode = 'none';
    this.tiles.addChild(graphics);
  }
  drawHints() {
    legalCells(this.island.tiles).forEach(([q,r]) => {
      const pos = hexToPoint(q,r,0,0,1);
      const cell = new Graphics().poly(hexPoints(0,0,TILE_SIZE - 3)).fill({ color:0x5be7cd, alpha:.10 }).stroke({ color:0x71efda, width:2, alpha:.72 });
      cell.x=pos.x;cell.y=pos.y;cell.eventMode='static';cell.cursor='pointer';cell.on('pointertap',()=>placeTile(q,r));
      this.hints.addChild(cell);
    });
  }
  drawEventPulse(event) {
    const pos = hexToPoint(event.target_q,event.target_r,0,0,1);
    const pulse = new Graphics().poly(hexPoints(0,0,TILE_SIZE - 2)).fill({ color:0xef766a, alpha:.10 }).stroke({ color:0xff9c92, width:4, alpha:.95 });
    pulse.x=pos.x;pulse.y=pos.y;this.fx.addChild(pulse);
  }
  resetView() { this.zoom = 1; this.world.position.set(this.host.clientWidth/2, this.host.clientHeight/2 + 25); this.layout(); }
}

function hexPoints(cx, cy, radius) {
  const points=[];
  for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);points.push({x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a)});}
  return points;
}

function shortTileName(name) { return name.replace(/^(Terraced |Ancestral |Scenic |Ancient |Riverbed |Stone Quarry & |Community Gathering |Melodic |Haat Trading |Textile )/,'').slice(0,22); }

function drawIcon(container, kind, color) {
  const g = new Graphics();
  const light = 0xeef8f3;
  if (kind === 'farm') {
    g.moveTo(-12,16).lineTo(-8,-2).lineTo(-4,16).stroke({ color:light,width:3 });
    g.moveTo(-2,16).lineTo(2,-2).lineTo(6,16).stroke({ color:light,width:3 });
    g.moveTo(7,16).lineTo(10,-2).lineTo(14,16).stroke({ color:light,width:3 });
  } else if (kind === 'forest') {
    g.circle(0,-9,15).fill({color:light,alpha:.86});g.rect(-3,5,6,12).fill({color:0x654f3d});
  } else if (kind === 'market') {
    g.rect(-18,-2,36,15).fill({color:light,alpha:.9});g.poly([{x:-18,y:-2},{x:-12,y:-12},{x:-4,y:-2},{x:4,y:-12},{x:12,y:-2},{x:18,y:-12},{x:18,y:-2}]).fill({color:light});
  } else if (kind === 'hall') {
    g.poly([{x:-18,y:5},{x:0,y:-10},{x:18,y:5},{x:18,y:14},{x:-18,y:14}]).fill({color:light,alpha:.9});g.rect(-5,7,10,7).fill({color:0x43606b});
  } else if (kind === 'craft') {
    g.circle(0,0,15).stroke({color:light,width:5});g.circle(0,0,5).fill({color:0x365d63});
  } else if (kind === 'music') {
    g.rect(3,-14,5,24).fill({color:light});g.circle(-2,10,7).fill({color:light});g.moveTo(7,-14).lineTo(16,-8).stroke({color:light,width:4});
  } else if (kind === 'shrine') {
    g.moveTo(0,-16).lineTo(0,14).stroke({color:light,width:4});g.arc(0,-4,18,Math.PI,Math.PI*2).stroke({color:light,width:4});g.lineTo(12,14).stroke({color:light,width:4});
  } else if (kind === 'river') {
    for(let y=-12;y<=12;y+=8) g.moveTo(-20,y).bezierCurveTo(-10,y-7,0,y+7,10,y).bezierCurveTo(16,y-4,19,y-4,20,y).stroke({color:light,width:3,alpha:.9});
  } else if (kind === 'quarry') {
    g.poly([{x:-17,y:10},{x:-8,y:-12},{x:2,y:-2},{x:10,y:-15},{x:18,y:10}]).fill({color:light,alpha:.9});
  } else { g.circle(0,0,12).fill({color:light,alpha:.9}); }
  container.addChild(g);
}

async function initPixi() {
  if (appState.pixi) return;
  appState.board = new IslandBoard($('#pixi-host'));
  await appState.board.init();
  appState.pixi = appState.board.app;
  renderGame();
}

async function boot() {
  $$('.tab-btn').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authTab)));
  $('#login-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth('login', formObject(event.target)); });
  $('#register-form').addEventListener('submit', (event) => { event.preventDefault(); submitAuth('register', formObject(event.target)); });
  $('#logout-btn').addEventListener('click', () => { stopPolling(); appState.token='';appState.player=null;appState.gameId='';appState.state=null;saveSession();showView('auth-view'); });
  $('#refresh-games').addEventListener('click', refreshGames);
  $('#create-game').addEventListener('click', createGame);
  $('#join-close').addEventListener('click', () => $('#join-modal').classList.add('hidden'));
  $('#join-confirm').addEventListener('click', confirmJoin);
  $('#join-modal').addEventListener('click', (event) => { if (event.target.id === 'join-modal') $('#join-modal').classList.add('hidden'); });
  $('#back-lobby').addEventListener('click', async () => { stopPolling(); appState.gameId=''; saveSession(); showView('lobby-view'); await refreshGames(); });
  $('#end-turn').addEventListener('click', endTurn);
  $('#start-game').addEventListener('click', startGame);
  $('#cancel-build').addEventListener('click', () => { appState.selectedTile=null; $('#board-help').textContent='Select Build to add your next tile.'; renderGame(); });
  $$('.action-tab').forEach((button) => button.addEventListener('click', () => { appState.activeTab = button.dataset.actionTab; renderGame(); }));
  $('#zoom-in').addEventListener('click', () => { if (appState.board) { appState.board.zoom = Math.min(1.55, appState.board.zoom + .12); appState.board.layout(); } });
  $('#zoom-out').addEventListener('click', () => { if (appState.board) { appState.board.zoom = Math.max(.65, appState.board.zoom - .12); appState.board.layout(); } });
  $('#zoom-reset').addEventListener('click', () => appState.board?.resetView());
  window.addEventListener('keydown', (event) => {
    if (!appState.selectedTile || !isMyTurn()) return;
    if (event.key.toLowerCase() === 'r') {
      appState.rotation = (appState.rotation + 60) % 360;
      $('#board-help').textContent = `${TILE_DEFS[appState.selectedTile][0]} · rotation ${appState.rotation}°. Click a glowing adjacent cell.`;
    }
    if (event.key === 'Escape') {
      appState.selectedTile = null;
      renderGame();
    }
  });

  if (!appState.token) { showView('auth-view'); return; }
  try {
    const data = await api('/auth/me');
    appState.player = data.player;
    saveSession();
    await enterLobby();
  } catch {
    appState.token=''; appState.player=null; saveSession(); showView('auth-view');
  }
}

boot();
