// Drives the REAL client code (app.js / game.js / engine.js) + REAL wasm engine in jsdom.
// Pixi and Anime are stubbed (no GPU). Catches wiring bugs: missing ids, undefined vars, bad JSON shapes.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
register('./ui_hooks.mjs', import.meta.url);

const STATIC = path.resolve(process.env.STATIC_DIR || 'static');
const dom = new JSDOM(readFileSync(path.join(STATIC, 'index.html'), 'utf8'), { url: 'http://localhost:8068/', pretendToBeVisual: true });
const g = globalThis;
for (const k of ['document', 'window', 'localStorage', 'HTMLElement', 'Node']) Object.defineProperty(g, k, { value: dom.window[k], configurable: true });
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
g.window.addEventListener = g.window.addEventListener.bind(g.window);
g.confirm = () => true;
g.requestAnimationFrame = (f) => setTimeout(f, 0);

const errors = [];
process.on('unhandledRejection', (e) => errors.push('unhandledRejection: ' + (e?.stack || e)));
dom.window.addEventListener('error', (e) => errors.push('window error: ' + e.message));

// fetch mock: wasm from disk, API from memory
const WASM = readFileSync(path.join(STATIC, 'wasm/island_engine_wasm_bg.wasm'));
const submitted = [];
const profile = { success: true, level: 1, xp: 0, next_xp: 100, unlocks: { level: 1, tiles: ['tile_farm','tile_sacred_forest','tile_river_bend','tile_community_house','tile_textile_workshop','tile_haat_market'], islands: ['forest','farming'] },
  best_heat: -1, max_heat: 5, heat_allowed: 0, streak: 0, best_streak: 0, played_today: false, daily: { date: '2026-10-03', seed: 3593883587016303, island: 'mountain', best: null }, best_season: null, runs: 0 };
g.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.endsWith('.wasm')) return new Response(WASM, { headers: { 'Content-Type': 'application/wasm' } });
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
  if (u.endsWith('/auth/me')) return j({ player: { username: 'tester', display_name: 'Tester' } });
  if (u.endsWith('/runs/profile')) return j(profile);
  if (u.includes('/runs/board')) return j({ entries: [{ rank: 1, name: 'Asha', score: 301, stars: 2 }] });
  if (u.endsWith('/runs/submit')) { const b = JSON.parse(opts.body); submitted.push(b); return j({ success: true, verified: true, outcome: {}, xp_gained: 120, xp: 120, next_xp: 250, level: 2, level_before: 1, leveled_up: true, unlocks: { tiles: [...profile.unlocks.tiles, 'tile_clay_pit', 'tile_stepwell'], islands: ['forest','farming'] }, unlocked_before: profile.unlocks, streak: 1, best_heat: 0, heat_allowed: 1, rank: 1 }); }
  return j({ error: 'not mocked: ' + u }, 404);
};
localStorage.setItem('ci_token', 'x'); localStorage.setItem('ci_player', JSON.stringify({ username: 'tester' }));

const ok = (c, m) => { if (!c) { errors.push('FAIL: ' + m); console.log('  ✖', m); } else console.log('  ✔', m); };
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await import(path.join(STATIC, 'app.js'));
await sleep(600);
console.log('LOBBY');
ok($('#lobby-view').classList.contains('active'), 'lobby shown after /auth/me');
ok(document.querySelectorAll('.island-choice').length === 4, '4 islands rendered');
ok(document.querySelectorAll('.island-choice.locked').length === 2, 'coastal + mountain locked at level 1');
ok(document.querySelectorAll('.heat-chip').length === 6 && document.querySelectorAll('.heat-chip:disabled').length === 5, 'heat ladder: only Calm unlocked');
ok($('#leaderboard-mini').textContent.includes('Asha'), 'daily leaderboard rendered');

console.log('SEASON');
$('#start-season').click(); await sleep(800);
ok($('#game-view').classList.contains('active'), 'game view active');
ok($('#draft-modal') && !$('#draft-modal').classList.contains('hidden'), 'blessing draft opens first');
ok(document.querySelectorAll('.draft-card').length === 3, '3 blessings offered');
$('.draft-card').click(); await sleep(50);
ok($('#draft-modal').classList.contains('hidden'), 'draft closes after pick');
ok(document.querySelectorAll('.resource-orb').length === 8, '8 resource orbs');
ok(document.querySelectorAll('#build-wheel .build-slot').length === 13, '13 blueprints in build wheel');
ok(document.querySelectorAll('#build-wheel .locked-tile').length === 7, 'level-locked blueprints are marked (7 locked at lvl 1)');
ok(document.querySelectorAll('#goal-list li').length === 4, '4 charter goals');
ok($('#omen-strip').children.length === 2, 'two-round outlook shown');
ok(document.querySelectorAll('.pip').length >= 3, 'action pips');

// legal build via UI
const slot = document.querySelector('[data-tile-id="tile_farm"]'); slot.click(); await sleep(20);
ok(!$('#cancel-build').classList.contains('hidden'), 'picking a blueprint enters build mode');
// ask the controller state through DOM-less route: read engine via window hook
const gc = (await import(path.join(STATIC, 'js/game.js')));
console.log('PLAYTHROUGH');
// Drive a whole season through the controller's own command path using the Advisor.
const ctl = globalThis.__ctl;
ok(!!ctl, 'controller exposed for tests');
let guard = 0;
while (ctl.run.v.phase !== 'over' && guard++ < 1500) {
  const v = ctl.run.v;
  if (v.phase === 'draft') { ctl.do({ cmd: 'pick_blessing', index: 0 }); continue; }
  const h = ctl.run.hint();
  const r = ctl.do(h, true);
  if (!r?.ok) ctl.do({ cmd: 'end_round' }, true);
}
await sleep(1500);
ok(ctl.run.v.phase === 'over', 'season reached its end through the UI controller');
ok(!$('#result-modal').classList.contains('hidden'), 'result screen shown');
ok(/Verified by the server/.test($('#seal-status').textContent), 'server verification line rendered');
ok(document.querySelector('.unlock') !== null, 'level-up / unlock chips rendered');
ok(submitted.length === 1 && submitted[0].commands.length > 20 && submitted[0].mode === 'season', `run submitted with ${submitted[0]?.commands.length} commands`);
ok(localStorage.getItem('ci_run_v2') === null, 'saved run cleared on completion');

console.log('RESUME');
$('#again-new').click(); await sleep(800);
ok($('#game-view').classList.contains('active') && ctl.run.v.round === 1, 'Play again starts a fresh season');
ctl.do({ cmd: 'pick_blessing', index: 0 }); ctl.do({ cmd: 'end_round' });
ok(localStorage.getItem('ci_run_v2') !== null, 'in-progress run is saved after each move');
const before = JSON.stringify(ctl.run.v.res), rnd = ctl.run.v.round;
const { Run, loadEngine } = await import(path.join(STATIC, 'js/engine.js'));
const re = Run.resume(await loadEngine(), Run.savedInfo());
ok(re.v.round === rnd && JSON.stringify(re.v.res) === before, 'resume reproduces the exact state by replay');

console.log('DAILY / CODE');
$('#back-lobby').click(); await sleep(500);
ok($('#lobby-view').classList.contains('active'), 'back to lobby');
$('#start-daily').click(); await sleep(700);
ok(ctl.run.cfg.island === 'mountain' && ctl.run.meta.mode === 'daily', 'daily island uses the server-provided seed + island');
$('#back-lobby').click(); await sleep(400);
$('#table-code').value = 'friends-1'; $('#start-code').click(); await sleep(700);
ok(ctl.run.meta.mode === 'code' && ctl.run.cfg.seed === 431068022493949, 'table code maps to the same seed as the server hash');

console.log(errors.length ? `\n${errors.length} PROBLEM(S):\n` + errors.join('\n') : '\nALL UI CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
