// @ts-check
// Cultural Islands — app shell. Rust/WASM engine (rules) + PixiJS (render) + Anime.js (motion).
// Pinned: PixiJS 8.22.0, Anime.js 4.5.0 (see js/board.js, js/game.js).
import { animate } from '/vendor/anime.esm.min.js';
import { api, session } from './js/api.js';
import { Run, loadEngine } from './js/engine.js';
import { GameController, toast, esc } from './js/game.js';

const $ = (s) => /** @type {HTMLElement} */ (document.querySelector(s));
const $$ = (s) => [...document.querySelectorAll(s)];
const PENDING_KEY = 'ci_pending_runs';

const ISLANDS = [
  ['forest', 'Forest', 'WOOD', 'Higher fire risk', 'Dense timber and a dangerous dry edge.', 1],
  ['farming', 'Farming', 'GRAIN', 'Drought / crop stress', 'Abundant harvests, but water becomes precious.', 1],
  ['coastal', 'Coastal', 'WATER', 'Floods / storms', 'The sea pays well and punishes carelessness.', 3],
  ['mountain', 'Mountain', 'STONE', 'Landslides / hard building', 'Stone and ore come easily; every slope matters.', 5],
];
const THUMB = { forest: '50% 45%', farming: '54% 53%', coastal: '68% 60%', mountain: '55% 30%' };

const S = { profile: null, island: 'forest', heat: 0, last: null, game: null };

function showView(id) { $$('.view').forEach((v) => v.classList.toggle('active', v.id === id)); }
const formObject = (f) => Object.fromEntries(new FormData(f).entries());

// ───────────── auth ─────────────
function setAuthMode(mode) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.authTab === mode));
  $('#login-form').classList.toggle('active', mode === 'login'); $('#register-form').classList.toggle('active', mode === 'register'); $('#auth-error').textContent = '';
}
async function submitAuth(kind, payload) {
  $('#auth-error').textContent = '';
  try {
    const d = await api(`/auth/${kind}`, { method: 'POST', body: JSON.stringify(payload) });
    session.token = d.token; session.player = d.player; session.save(); await enterLobby();
  } catch (e) { $('#auth-error').textContent = e.message; animate('.auth-console', { translateX: [-8, 8, -5, 5, 0], duration: 360, ease: 'inOutQuad' }); }
}

// ───────────── lobby ─────────────
async function refreshProfile() {
  try { const d = await api('/runs/profile'); S.profile = d; } catch (e) { toast(e.message, 'error'); }
  return S.profile;
}

function renderIslands() {
  const lvl = S.profile?.level ?? 1;
  $('#island-options').innerHTML = ISLANDS.map(([id, name, bonus, risk, , need]) => {
    const locked = lvl < need;
    return `<button class="island-choice ${S.island === id ? 'selected' : ''} ${locked ? 'locked' : ''}" data-island="${id}" ${locked ? 'aria-disabled="true"' : ''}>
      <div class="thumb" style="background-position:${THUMB[id]}"></div><div class="wash"></div>${locked ? `<span class="lockmsg">🔒 LEVEL ${need}</span>` : ''}
      <strong>${name} Island</strong><small>+${bonus.toLowerCase()} · ${risk}</small></button>`;
  }).join('');
  $$('#island-options .island-choice').forEach((b) => b.addEventListener('click', () => {
    const need = ISLANDS.find((i) => i[0] === b.dataset.island)[5];
    if (lvl < need) { toast(`Reach level ${need} to unlock this island.`, 'error'); return; }
    S.island = b.dataset.island; renderIslands();
  }));
}

function renderHeat() {
  const allowed = S.profile?.heat_allowed ?? 0; const names = ['Calm', 'Restless', 'Hard', 'Cruel', 'Long Night', 'Cataclysm'];
  $('#heat-row').innerHTML = `<small class="level-chip">HEAT</small>` + names.map((n, h) => `<button class="heat-chip ${S.heat === h ? 'selected' : ''}" data-heat="${h}" ${h > allowed ? 'disabled title="Win the previous Heat to unlock"' : ''}>${h} · ${n}</button>`).join('');
  $$('#heat-row .heat-chip').forEach((b) => b.addEventListener('click', () => { S.heat = Number(b.dataset.heat); renderHeat(); }));
}

async function enterLobby() {
  showView('lobby-view');
  $('#profile-chip').textContent = session.player?.display_name || session.player?.username || 'Steward';
  await refreshProfile(); const p = S.profile;
  if (p) {
    if (S.heat > p.heat_allowed) S.heat = 0;
    if (p.level < (ISLANDS.find((i) => i[0] === S.island)?.[5] ?? 1)) S.island = 'forest';
    $('#level-chip').textContent = `LEVEL ${p.level}`;
    const base = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200][p.level - 1] ?? 0;
    $('#xp-fill').style.width = p.next_xp ? `${Math.min(100, ((p.xp - base) / (p.next_xp - base)) * 100)}%` : '100%';
    $('#streak-chip').textContent = `🔥 ${p.streak}${p.played_today ? ' ✓' : ''}`;
    $('#season-blurb').textContent = p.runs === 0 ? 'Your first season. Twelve rounds: choose a blessing, build, keep water in reserve, and meet the charter.' : `Best season ${p.best_season ?? '—'} pts · ${p.runs} played. Win to unlock a harder Heat.`;
    $('#daily-blurb').textContent = `Today: a ${p.daily.island} island. ${p.daily.best != null ? `Your best: ${p.daily.best} pts.` : 'Not played yet.'}`;
  }
  renderIslands(); renderHeat();
  const saved = Run.savedInfo(); $('#resume-season').classList.toggle('hidden', !saved);
  retryPending(); refreshBoard();
  animate('.lobby-heading', { opacity: [0, 1], translateY: [16, 0], duration: 700, ease: 'outCubic' });
  animate('.island-choice', { opacity: [0, 1], translateY: [18, 0], duration: 520, delay: (_, i) => i * 70, ease: 'outBack' });
}

async function refreshBoard() {
  const box = $('#leaderboard-mini');
  try {
    const d = await api('/runs/board?mode=daily'); const me = session.player?.display_name || session.player?.username;
    box.innerHTML = (d.entries || []).slice(0, 5).map((r) => `<div class="lb-row ${r.name === me ? 'me' : ''}"><span class="lb-rank">${r.rank}</span><span>${esc(r.name)} ${'★'.repeat(r.stars)}</span><span class="lb-score">${r.score}</span></div>`).join('') || '<div class="scroll-empty">No one has played today. Be first.</div>';
  } catch { box.innerHTML = '<div class="scroll-empty">Standings unavailable.</div>'; }
}

// ───────────── starting runs ─────────────
function randomSeed() { const a = new Uint32Array(2); crypto.getRandomValues(a); return (a[0] & 0xfffff) * 4294967296 + a[1]; } // < 2^52

async function launch(cfg, meta) {
  try {
    const w = await loadEngine();
    if (S.profile?.rules_version && S.profile.rules_version !== w.rules_version()) {
      toast('Game files are out of date — hard-refresh the page (Ctrl+Shift+R).', 'error'); return;
    }
    const run = new Run(w, cfg, meta); showView('game-view'); await S.game.show(run); S.last = { cfg, meta };
  } catch (e) { toast(`Could not start: ${e.message}`, 'error'); showView('lobby-view'); }
}

async function startSeason(sameAs) {
  const p = S.profile ?? (await refreshProfile());
  const cfg = sameAs ? { ...S.last.cfg, seed: randomSeed() } : { seed: randomSeed(), island: S.island, heat: S.heat, rounds: 12, unlocked: p?.unlocks?.tiles ?? null };
  if (sameAs) cfg.unlocked = p?.unlocks?.tiles ?? cfg.unlocked;
  await launch(cfg, { mode: 'season' });
}
async function startDaily() {
  const p = S.profile ?? (await refreshProfile()); if (!p) return;
  await launch({ seed: p.daily.seed, island: p.daily.island, heat: 0, rounds: 12, unlocked: null }, { mode: 'daily' });
}
async function startCode() {
  const code = $('#table-code').value.trim().toUpperCase();
  if (code.length < 3) { toast('Enter a table code (3+ characters).', 'error'); return; }
  const w = await loadEngine(); const seed = w.seed_from_code(code);
  await launch({ seed, island: w.island_for_seed(seed), heat: 0, rounds: 12, unlocked: null }, { mode: 'code', seed_code: code });
}
async function resume() {
  try {
    const w = await loadEngine(); const run = Run.resume(w, Run.savedInfo()); showView('game-view'); await S.game.show(run, false); S.last = { cfg: run.cfg, meta: run.meta };
  } catch (e) { toast(e.message, 'error'); Run.clearSave(); $('#resume-season').classList.add('hidden'); }
}

// ───────────── submitting finished runs ─────────────
function payload(run) {
  return { mode: run.meta.mode, seed: run.cfg.seed, seed_code: run.meta.seed_code ?? null, island: run.cfg.island, heat: run.cfg.heat ?? 0, commands: run.cmds, rules_version: run.w.rules_version() };
}
function queue(p) { const q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); q.push(p); localStorage.setItem(PENDING_KEY, JSON.stringify(q.slice(-5))); }
async function onFinished(run) {
  const p = payload(run);
  try {
    const res = await api('/runs/submit', { method: 'POST', body: JSON.stringify(p) });
    S.profile = null; refreshProfile(); return res;
  } catch (e) {
    if (/rejected|not unlocked|not a current|does not match|not finished|invalid length|out of date/i.test(e.message)) return { verified: false };
    queue(p); throw e;
  }
}
async function retryPending() {
  const q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); if (!q.length) return;
  const left = [];
  for (const p of q) { try { await api('/runs/submit', { method: 'POST', body: JSON.stringify(p) }); } catch (e) { if (!/rejected|not a current|not finished/i.test(e.message)) left.push(p); } }
  localStorage.setItem(PENDING_KEY, JSON.stringify(left)); if (left.length < q.length) { toast('Earlier season sealed.', 'success'); refreshProfile().then(enterLobbyQuiet); }
}
function enterLobbyQuiet() { if (S.profile) { $('#level-chip').textContent = `LEVEL ${S.profile.level}`; renderIslands(); renderHeat(); } }

// ───────────── boot ─────────────
function wire() {
  $$('.tab-btn').forEach((b) => b.addEventListener('click', () => setAuthMode(b.dataset.authTab)));
  $('#login-form').addEventListener('submit', (e) => { e.preventDefault(); submitAuth('login', formObject(/** @type {HTMLFormElement} */ (e.target))); });
  $('#register-form').addEventListener('submit', (e) => { e.preventDefault(); submitAuth('register', formObject(/** @type {HTMLFormElement} */ (e.target))); });
  $('#logout-btn').addEventListener('click', () => { session.clear(); S.profile = null; showView('auth-view'); });
  $('#start-season').addEventListener('click', () => startSeason(false));
  $('#start-daily').addEventListener('click', startDaily);
  $('#start-code').addEventListener('click', startCode);
  $('#table-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') startCode(); });
  $('#resume-season').addEventListener('click', resume);
}

async function boot() {
  wire();
  S.game = new GameController({
    onExit: async () => { showView('lobby-view'); await enterLobby(); },
    onFinished,
    onNewSeason: (same) => { if (S.last?.meta.mode === 'season') startSeason(same); else if (S.last?.meta.mode === 'daily') startDaily(); else launch({ ...S.last.cfg }, S.last.meta); },
  });
  loadEngine().catch((e) => toast(`Engine failed to load: ${e.message}`, 'error')); // warm the WASM while the player logs in
  if (!session.token) { showView('auth-view'); return; }
  try { const d = await api('/auth/me'); session.player = d.player; session.save(); await enterLobby(); }
  catch { session.clear(); showView('auth-view'); }
}
boot();
