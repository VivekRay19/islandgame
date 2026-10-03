// Plays real seasons with the WASM engine, submits them to the live server, and tries to cheat.
import { readFileSync } from 'node:fs';
import init, * as w from '../static/wasm/island_engine_wasm.js';
await init({ module_or_path: readFileSync(new URL('../static/wasm/island_engine_wasm_bg.wasm', import.meta.url)) });
const B = process.env.BASE || 'http://127.0.0.1:8067/api';
const call = async (p, o = {}, t) => { const r = await fetch(B + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) } }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const user = 'e2e_' + Date.now().toString(36);
const reg = await call('/auth/register', { method: 'POST', body: JSON.stringify({ username: user, password: 'pw1234' }) });
const tok = reg.j.token; console.log('register', reg.s);
const prof = (await call('/runs/profile', {}, tok)).j; console.log('profile level', prof.level, 'heat_allowed', prof.heat_allowed, 'daily', prof.daily.island);

function play(cfg, mutate) {
  const e = new w.Engine(JSON.stringify(cfg)); let n = 0;
  while (JSON.parse(e.view()).phase !== 'over' && n++ < 3000) {
    const v = JSON.parse(e.view());
    if (v.phase === 'draft') { e.apply(JSON.stringify({ cmd: 'pick_blessing', index: 0 })); continue; }
    const r = JSON.parse(e.apply(JSON.stringify(JSON.parse(e.hint())))); if (!r.ok) e.apply('{"cmd":"end_round"}');
  }
  return { cmds: JSON.parse(e.history()), view: JSON.parse(e.view()) };
}
let fails = 0; const check = (c, m) => { console.log(c ? '  ✔' : '  ✖', m); if (!c) fails++; };

// 1. honest ranked season at the player's real level
const cfg = { seed: 777001, island: 'farming', heat: 0, rounds: 12, unlocked: prof.unlocks.tiles };
const run = play(cfg);
let r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: cfg.seed, island: 'farming', heat: 0, commands: run.cmds, rules_version: w.rules_version() }) }, tok);
check(r.s === 200 && r.j.verified, `honest season verified (status ${r.s})`);
check(r.j.outcome?.score === run.view.outcome.score, `server replay score == client score (${r.j.outcome?.score} vs ${run.view.outcome.score})`);
check(r.j.xp_gained > 0, `xp awarded: ${r.j.xp_gained}, level ${r.j.level_before} -> ${r.j.level}`);

// 2. forged score cannot exist: tamper with a command => replay diverges / rejects
const forged = JSON.parse(JSON.stringify(run.cmds)); forged.splice(5, 0, { cmd: 'claim_project', id: 'task_l3_grand_haat' });
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: cfg.seed, island: 'farming', heat: 0, commands: forged }) }, tok);
check(r.s === 400, `tampered replay rejected (${r.s}: ${r.j.error})`);

// 3. unfinished season
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: cfg.seed, island: 'farming', heat: 0, commands: run.cmds.slice(0, 10) }) }, tok);
check(r.s === 400, `unfinished season rejected (${r.j.error})`);

// 4. locked content: coastal island and heat 3 at level 1, and a locked tile
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: 5, island: 'mountain', heat: 0, commands: run.cmds }) }, tok);
check(r.s === 400 && /not unlocked/.test(r.j.error), `locked island rejected (${r.j.error})`);
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: cfg.seed, island: 'farming', heat: 3, commands: run.cmds }) }, tok);
check(r.s === 400 && /Heat/.test(r.j.error), `locked Heat rejected (${r.j.error})`);
const cheat = play({ ...cfg, seed: 888, unlocked: null }); // all tiles unlocked on the client
const usedLocked = cheat.cmds.some((c) => c.cmd === 'build' && !prof.unlocks.tiles.includes(c.tile));
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: 888, island: 'farming', heat: 0, commands: cheat.cmds }) }, tok);
check(!usedLocked || r.s === 400, `run using locked tiles ${usedLocked ? 'rejected' : '(none used)'}: ${r.j.error ?? 'ok'}`);

// 5. daily: valid seed ok, wrong seed refused, second play pays no XP
const dcfg = { seed: prof.daily.seed, island: prof.daily.island, heat: 0, rounds: 12, unlocked: null };
const d = play(dcfg);
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'daily', seed: dcfg.seed, island: dcfg.island, commands: d.cmds }) }, tok);
check(r.s === 200 && r.j.verified && r.j.rank === 1, `daily verified, rank ${r.j.rank}`);
const xp1 = r.j.xp_gained;
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'daily', seed: dcfg.seed, island: dcfg.island, commands: d.cmds }) }, tok);
check(r.s === 200 && r.j.xp_gained === 0 && xp1 > 0, `second daily run pays no XP (first ${xp1}, second ${r.j.xp_gained})`);
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'daily', seed: 12345, island: 'farming', commands: d.cmds }) }, tok);
check(r.s === 400, `old/fake daily seed rejected (${r.j.error})`);

// 6. shared table code
const seed = w.seed_from_code('MONSOON-7');
const t = play({ seed, island: w.island_for_seed(seed), heat: 0, rounds: 12, unlocked: null });
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'code', seed, seed_code: 'MONSOON-7', island: w.island_for_seed(seed), commands: t.cmds }) }, tok);
check(r.s === 200 && r.j.xp_gained === 0, `table-code run verified, no XP (${r.s})`);
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'code', seed, seed_code: 'OTHER', island: w.island_for_seed(seed), commands: t.cmds }) }, tok);
check(r.s === 400, `code/seed mismatch rejected (${r.j.error})`);

// 6b. stale client files (old rules) are told to refresh, not accused of cheating
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season', seed: cfg.seed, island: 'farming', heat: 0, commands: run.cmds, rules_version: '0.0.1' }) }, tok);
check(r.s === 400 && /out of date/.test(r.j.error), `stale rules version gets a refresh message (${r.j.error?.slice(0, 40)}…)`);

// 7. board + profile + auth
const bd = await call('/runs/board?mode=daily', {}, tok); check(bd.j.entries?.some((e) => e.name === user), 'daily board lists the player (' + (bd.j.entries?.length ?? 0) + ' entries today)');
const p2 = (await call('/runs/profile', {}, tok)).j; check(p2.runs >= 3 && p2.streak === 1 && p2.played_today, `profile: ${p2.runs} runs, streak ${p2.streak}, level ${p2.level}`);
r = await call('/runs/submit', { method: 'POST', body: JSON.stringify({ mode: 'season' }) }); check(r.s === 401 || r.s === 400, `unauthenticated submit refused (${r.s})`);
const big = await fetch(B + '/runs/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ mode: 'season', seed: 1, island: 'farming', commands: Array(5000).fill({ cmd: 'end_round' }) }) });
check(big.status === 400, `5000-command payload refused (${big.status})`);
console.log(fails ? `\n${fails} FAILED` : '\nE2E: ALL SERVER CHECKS PASSED'); process.exit(fails ? 1 : 0);
