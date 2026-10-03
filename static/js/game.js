// @ts-check
// Game-view controller: engine <-> board <-> HUD. Rules live in Rust; this is feel.
import { animate } from '/vendor/anime.esm.min.js';
import { IslandBoard, GLYPH, RES_GLYPH } from './board.js';
import { Run, loadEngine } from './engine.js';
import { api } from './api.js';

const $ = (s) => /** @type {HTMLElement} */ (document.querySelector(s));
const $$ = (s) => [...document.querySelectorAll(s)];
const RES = ['grain', 'fibre', 'wood', 'stone', 'clay', 'water', 'music', 'ore'];
const art = { farm: 'farm', workshop: 'workshop', market: 'market', hall: 'hall', music: 'music', shrine: 'shrine' };
const ART_URL = (a) => (art[a] ? `/assets/${art[a]}.webp` : null);
const SEASON_HAZARD = { fire: '🔥', drought: '☀️', flood: '🌊', storm: '⛈️', landslide: '⛰️' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const costText = (c) => Object.entries(c || {}).map(([k, n]) => `${n}${RES_GLYPH[k]}`).join(' ');

export function toast(message, kind = 'info') {
  const n = document.createElement('div'); n.className = `toast ${kind}`; n.textContent = message; $('#toast-root').appendChild(n);
  animate(n, { opacity: [0, 1, 0], translateY: [-12, 0, -4], duration: 2600, ease: 'inOutQuad' }); setTimeout(() => n.remove(), 2550);
}

export class GameController {
  /** @param {{onExit:()=>void, onFinished:(run:Run)=>Promise<any>, onNewSeason:(sameIsland:boolean)=>void}} hooks */
  constructor(hooks) {
    this.hooks = hooks; this.run = null; this.board = null; this.sel = null; this.selCell = null; this.map = []; this.advisor = null;
    this.tab = 'build'; this.endArmed = 0; this.finished = false; this.w = null; this.previewCache = new Map();
    this.wire();
    /** @type {any} */ (globalThis).__ctl = this; // handy for tests and the dev console
  }

  async boot() {
    this.w = await loadEngine();
    if (!this.board) {
      this.board = new IslandBoard($('#pixi-root'), {
        onTap: (c) => this.tapCell(c), onHover: (c, e) => this.hoverCell(c, e),
      });
      await this.board.init();
    }
    return this.w;
  }

  /** Start (or resume) a run object, then show it. */
  async show(run, fresh = true) {
    await this.boot();
    this.run = run; this.sel = null; this.selCell = null; this.map = []; this.advisor = null; this.finished = false; this.previewCache.clear();
    this.board.resetView();
    $('#mode-label').textContent = { season: 'RANKED SEASON', daily: 'DAILY ISLAND', code: `TABLE ${run.meta.seed_code || ''}` }[run.meta.mode] || 'SEASON';
    this.setTab(null); this.render(); this.board.play([{ t: 'dawn', round: run.v.round, season: run.v.season }]);
    if (fresh) {
      animate('.hud-top', { opacity: [0, 1], translateY: [-12, 0], duration: 500, ease: 'outCubic' });
      animate('.build-wheel', { opacity: [0, 1], translateY: [25, 0], duration: 650, ease: 'outBack' });
    }
    this.afterState();
  }

  // ───────────── commands ─────────────
  do(cmd, quiet = false) {
    if (!this.run || this.run.over) return null;
    const r = this.run.do(cmd);
    if (!r.ok) { if (!quiet) toast(r.error, 'error'); return r; }
    this.advisor = null; this.previewCache.clear();
    if (cmd.cmd === 'build') this.sel = (this.run.v.ap > 0 && this.afford(this.sel)) ? this.sel : null;
    if (this.sel) this.map = this.run.buildMap(this.sel);
    this.render(); this.board.play(r.events);
    if (cmd.cmd === 'end_round') { this.selCell = null; this.endArmed = 0; }
    this.afterState();
    return r;
  }
  afford(kind) { return !!kind && !!this.run.v.build.find((b) => b.kind === kind)?.affordable; }

  afterState() {
    const v = this.run.v;
    if (v.phase === 'draft') this.openDraft();
    else $('#draft-modal').classList.add('hidden');
    if (v.phase === 'over' && !this.finished) { this.finished = true; setTimeout(() => this.openResult(), 900); }
  }

  // ───────────── interaction ─────────────
  tapCell(c) {
    if (!this.run || this.run.over || this.run.v.phase === 'draft') return;
    if (this.sel && !c.tile) { this.do({ cmd: 'build', tile: this.sel, q: c.q, r: c.r }); this.hideTip(); return; }
    this.selCell = c.tile || c.ruin || c.terrain ? { q: c.q, r: c.r } : null;
    this.sel = null; this.map = []; this.render(); this.setTab('tile');
  }

  hoverCell(c, e) {
    if (!c) { this.hideTip(); return; }
    const v = this.run.v; let html = '';
    if (this.sel && !c.tile) {
      const k = `${this.sel}|${c.q},${c.r}|${v.moves}`;
      let p = this.previewCache.get(k); if (!p) { p = this.run.preview(this.sel, c.q, c.r); this.previewCache.set(k, p); }
      const def = v.build.find((b) => b.kind === this.sel);
      if (!p.legal) html = `<strong>${esc(def.name)}</strong><span class="no">${esc(p.reason)}</span>`;
      else {
        const d = Object.entries(p.delta.res).filter(([, n]) => n !== 0).map(([r, n]) => `<span class="${n > 0 ? 'good' : 'bad'}">${n > 0 ? '+' : ''}${n}${RES_GLYPH[r]}</span>`);
        const extra = [];
        if (p.delta.harmony) extra.push(`<span class="${p.delta.harmony > 0 ? 'good' : 'bad'}">${p.delta.harmony > 0 ? '+' : ''}${p.delta.harmony} harmony</span>`);
        if (p.delta.eco) extra.push(`<span class="${p.delta.eco > 0 ? 'good' : 'bad'}">${p.delta.eco > 0 ? '+' : ''}${p.delta.eco} ecology</span>`);
        html = `<strong>${esc(def.name)} · ${costText(p.cost)}</strong>Each dawn: ${[...d, ...extra].join(' ') || 'nothing yet'}`;
        for (const n of p.notes) html += `<br><span class="good">${esc(n)}</span>`;
        if (p.flam > 0) html += `<br>🔥 ${p.flam}% fire risk${p.wet ? ' (damp: safer)' : ''}${p.flammable_neighbours ? ` · ${p.flammable_neighbours} flammable neighbours` : ''}`;
        if (p.upkeep_after > p.upkeep_now) html += `<br><span class="bad">Upkeep rises to ${p.upkeep_after} grain</span>`;
      }
    } else if (c.tile) {
      const t = c.tile; html = `<strong>${esc(t.name)}</strong>`;
      if (t.burning) html += `<span class="bad">On fire — ${t.douse}💧 to put out</span>`;
      else if (t.hp < 2) html += `<span class="bad">Damaged — repair to resume</span>`;
      else html += Object.entries(t.yield).filter(([, n]) => n > 0).map(([r, n]) => `+${n}${RES_GLYPH[r]}`).join(' ') || 'No direct output';
      for (const n of t.notes) html += `<br>${esc(n)}`;
    } else html = `<strong>${esc(c.terrain[0].toUpperCase() + c.terrain.slice(1))}</strong>${c.ruin ? 'Ruins — rebuild here' : c.cleared ? 'Cleared woodland' : 'Open ground'}`;
    this.showTip(html, e);
  }
  showTip(html, e) {
    const t = $('#tooltip'); if (!t || !e) return; t.innerHTML = html; t.classList.remove('hidden');
    const x = e.client?.x ?? e.clientX ?? e.global?.x ?? 0, y = e.client?.y ?? e.clientY ?? e.global?.y ?? 0;
    t.style.left = Math.min(window.innerWidth - 270, x + 18) + 'px'; t.style.top = Math.min(window.innerHeight - 140, y + 14) + 'px';
  }
  hideTip() { $('#tooltip').classList.add('hidden'); }

  pickTile(kind) {
    const b = this.run.v.build.find((x) => x.kind === kind);
    if (!b?.unlocked) { toast(`Unlocks at player level ${b.unlock_level}.`, 'error'); return; }
    if (this.run.v.phase !== 'play') return;
    if (this.run.v.ap < 1) { toast('No actions left. End the round.', 'error'); return; }
    if (!b.affordable) { toast(`Not enough resources for ${b.name}. Trade, or wait for dawn.`, 'error'); return; }
    this.sel = this.sel === kind ? null : kind; this.selCell = null; this.map = this.sel ? this.run.buildMap(kind) : [];
    $('#side-panel').classList.add('hidden'); this.render();
  }

  setTab(name) {
    this.tab = name;
    $$('.dock-button[data-action-tab]').forEach((b) => b.classList.toggle('active', /** @type {HTMLElement} */ (b).dataset.actionTab === name));
    const p = $('#side-panel');
    if (!name) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden'); this.renderPanel(); animate(p, { opacity: [0, 1], translateX: [16, 0], duration: 280, ease: 'outCubic' });
  }

  advise() {
    const h = this.run.hint(); this.advisor = null; let msg = '';
    switch (h.cmd) {
      case 'build': { this.advisor = { q: h.q, r: h.r }; const d = this.run.v.build.find((b) => b.kind === h.tile); msg = `Advisor: build a ${d.name} on the glowing hex.`; break; }
      case 'douse': this.advisor = { q: h.q, r: h.r }; msg = 'Advisor: put out the burning tile.'; break;
      case 'repair': this.advisor = { q: h.q, r: h.r }; msg = 'Advisor: repair the damaged tile.'; break;
      case 'respond': msg = 'Advisor: answer the threat in the event card.'; break;
      case 'trade': { const o = this.run.v.offers[h.offer]; msg = `Advisor: trade with ${o.trader.name} for ${o.sells.n}${RES_GLYPH[o.sells.res]}.`; this.setTab('trade'); break; }
      case 'claim_project': { msg = 'Advisor: a project is ready to claim.'; this.setTab('tasks'); break; }
      case 'claim_boon': msg = 'Advisor: take the opportunity in the event card.'; break;
      default: msg = 'Advisor: nothing more worth doing. End the round.';
    }
    toast(msg, 'info'); this.render();
  }

  endRound() {
    const v = this.run.v; if (v.phase !== 'play') return;
    const danger = v.problems.some((p) => !p.resolved) || v.cells.some((c) => c.tile?.burning);
    if (danger && Date.now() - this.endArmed > 3500) {
      this.endArmed = Date.now(); $('#end-turn').classList.add('warn'); toast('A threat is unanswered. Tap again to end the round anyway.', 'error');
      setTimeout(() => $('#end-turn').classList.remove('warn'), 3500); return;
    }
    $('#end-turn').classList.remove('warn'); this.do({ cmd: 'end_round' });
  }

  // ───────────── rendering ─────────────
  render() {
    const v = this.run.v;
    $('#island-title').textContent = `${v.island[0].toUpperCase()}${v.island.slice(1)} Island${v.heat ? ` · ${v.heat_name}` : ''}`;
    $('#season-label').textContent = v.season.toUpperCase(); $('#round-label').textContent = Math.min(v.round, v.rounds); $('#turn-label').textContent = `OF ${v.rounds}`;
    $('#score-now').textContent = v.score_now;
    this.renderResources(v); this.renderMeters(v); this.renderGoals(v); this.renderOmens(v); this.renderEvents(v); this.renderBuild(v);
    if (!$('#side-panel').classList.contains('hidden')) this.renderPanel();
    const end = $('#end-turn'); /** @type {HTMLButtonElement} */ (end).disabled = v.phase !== 'play';
    end.classList.toggle('ready', v.phase === 'play' && v.ap === 0);
    $('#cancel-build').classList.toggle('hidden', !this.sel);
    $('#build-whisper').textContent = this.coach(v);
    this.board.setView(v, { selectedTile: this.sel, buildMap: this.map, selected: this.selCell, advisor: this.advisor });
    $('#sync-status').textContent = `${v.moves} MOVES · LOCAL ENGINE`;
  }

  coach(v) {
    if (this.sel) return `${v.build.find((b) => b.kind === this.sel).name} · tap a glowing hex · Esc cancels`;
    if (v.phase === 'draft') return 'Choose a blessing to begin the season.';
    if (v.phase === 'over') return 'The season is over.';
    if (v.cells.some((c) => c.tile?.burning)) return 'Fire! Tap the burning tile and douse it with water — or clear a neighbour to stop it spreading.';
    if (v.problems.some((p) => !p.resolved)) return 'A threat is on the island. Answer it in the event card (top right).';
    const o = v.omens.find((x) => x.round === v.round + 1);
    if (o) return `Omen: ${o.title} strikes next round${o.epi ? ' near the marked hex' : ''}. Prepare now.`;
    if (v.ap === 0) return 'No actions left — end the round.';
    return `${v.ap} action${v.ap === 1 ? '' : 's'} left. Build, trade, or claim a project.`;
  }

  renderResources(v) {
    const d = v.dawn.res;
    $('#resource-strip').innerHTML = RES.map((k) => {
      const have = v.res[k], delta = d[k] - (k === 'grain' ? v.dawn.upkeep : 0);
      return `<div class="resource-orb ${have >= v.cap ? 'full' : ''} ${have === 0 ? 'low' : ''}" title="${k}: ${have}/${v.cap}. Next dawn ${delta >= 0 ? '+' : ''}${delta}">
        <span class="res-glyph">${RES_GLYPH[k]}</span><strong>${have}</strong><small class="${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta ? (delta > 0 ? '+' : '') + delta : ' '}</small></div>`;
    }).join('');
  }

  renderMeters(v) {
    const pips = Array.from({ length: v.ap_max }, (_, i) => `<span class="pip ${i < v.ap ? '' : 'off'}"></span>`).join('');
    const dh = v.dawn.harmony, de = v.dawn.eco;
    const sgn = (n) => (n > 0 ? '+' : '') + n;
    $('#meters').innerHTML = `
      <div class="ap-row">ACTIONS<span class="pips">${pips}</span></div>
      <div class="meter"><div class="lab"><span>HARMONY</span><em>${v.harmony} <small class="${dh >= 0 ? 'good' : 'bad'}">${sgn(dh)}</small></em></div><div class="bar harmony"><i style="width:${v.harmony}%"></i></div></div>
      <div class="meter"><div class="lab"><span>LAND · ${v.eco_band.toUpperCase()}</span><em>${v.ecology} <small class="${de >= 0 ? 'good' : 'bad'}">${sgn(de)}</small></em></div><div class="bar eco ${v.eco_band === 'degraded' ? 'degraded' : ''}"><i style="width:${v.ecology}%"></i></div></div>
      <div class="dawn-line">Upkeep <b>${v.dawn.upkeep}🌾</b> per dawn · Storage <b>${v.cap}</b>${v.dawn.culture_links ? ` · Culture links <b>${v.dawn.culture_links}</b>` : ''}</div>`;
  }

  renderGoals(v) {
    $('#goal-list').innerHTML = v.goals.map((g) => `<li class="${g.met ? 'met' : ''}"><i>${g.met ? '✓' : ''}</i><span>${esc(g.label)}</span><b>${g.id === 'balance' ? '' : `${Math.min(g.have, 99)}/${g.need}`}</b></li>`).join('');
  }

  renderOmens(v) {
    const chip = (slot, i) => {
      if (!slot) return '';
      const when = i === 0 ? 'NEXT ROUND' : 'IN 2 ROUNDS';
      if (slot.slot === 'hazard') return `<div class="omen hazard"><b>${SEASON_HAZARD[slot.kind]}</b><div>${esc(slot.title)}<br><small>${when}</small></div></div>`;
      if (slot.slot === 'boon') return `<div class="omen boon"><b>${slot.title.includes('Caravan') ? '🐫' : slot.title.includes('Harvest') ? '🌾' : '🥁'}</b><div>${esc(slot.title)}<br><small>${when}</small></div></div>`;
      return `<div class="omen"><b>🌤</b><div>Calm<br><small>${when}</small></div></div>`;
    };
    $('#omen-strip').innerHTML = v.outlook.map(chip).join('');
  }

  renderEvents(v) {
    const card = $('#event-card'); const rows = [];
    v.cells.forEach((c) => {
      if (!c.tile?.burning) return;
      const ok = v.res.water >= c.tile.douse;
      rows.push(`<div class="event-row"><div class="event-title"><div class="event-icon">🔥</div><div><strong>FIRE · ${esc(c.tile.name.toUpperCase())}</strong><small>SPREADS AT ROUND END</small></div></div>
        <p>${c.tile.douse}💧 puts it out${ok ? '.' : ` — you have ${v.res.water}. Trade for water, or clear a neighbouring tile as a firebreak.`}</p>
        <div class="btn-row"><button class="sm-btn" data-douse="${c.q},${c.r}" ${ok ? '' : 'disabled'}>PUT OUT (${c.tile.douse}💧)</button><button class="sm-btn ghost" data-focus="${c.q},${c.r}">SHOW</button></div></div>`);
    });
    v.problems.forEach((p) => {
      if (p.resolved) return;
      rows.push(`<div class="event-row"><div class="event-title"><div class="event-icon">${SEASON_HAZARD[p.kind]}</div><div><strong>${esc(p.title.toUpperCase())} · SEVERITY ${p.sev}</strong><small>${p.cells.length} TILE${p.cells.length === 1 ? '' : 'S'} AT RISK</small></div></div>
        <p>${esc(p.text)}</p><div class="btn-row"><button class="sm-btn" data-respond="${p.index}" ${p.affordable ? '' : 'disabled'}>RESPOND (${p.cost}${RES_GLYPH[p.res]})</button></div></div>`);
    });
    if (v.boon && !v.boon.claimed) {
      const caravan = v.boon.kind === 'caravan';
      rows.push(`<div class="event-row boon"><div class="event-title"><div class="event-icon">${caravan ? '🐫' : '✨'}</div><div><strong>${esc(v.boon.title.toUpperCase())}</strong><small>THIS ROUND ONLY</small></div></div>
        <p>${caravan ? 'Traders have set up at your shore. Trades cost less and the first two are free of actions.' : 'A gift of the season. Claim it before the round ends.'}</p>
        ${caravan ? '' : '<div class="btn-row"><button class="sm-btn" data-boon="1">CLAIM</button></div>'}</div>`);
    }
    if (!rows.length) { card.classList.add('hidden'); card.innerHTML = ''; return; }
    const was = card.classList.contains('hidden'); card.classList.remove('hidden'); card.innerHTML = rows.join('');
    if (was) animate(card, { opacity: [0, 1], translateX: [16, 0], duration: 420, ease: 'outCubic' });
    card.querySelectorAll('[data-douse]').forEach((b) => b.addEventListener('click', () => { const [q, r] = b.dataset.douse.split(',').map(Number); this.do({ cmd: 'douse', q, r }); }));
    card.querySelectorAll('[data-focus]').forEach((b) => b.addEventListener('click', () => { const [q, r] = b.dataset.focus.split(',').map(Number); this.selCell = { q, r }; this.render(); this.setTab('tile'); }));
    card.querySelectorAll('[data-respond]').forEach((b) => b.addEventListener('click', () => this.do({ cmd: 'respond', index: Number(b.dataset.respond) })));
    card.querySelectorAll('[data-boon]').forEach((b) => b.addEventListener('click', () => this.do({ cmd: 'claim_boon' })));
  }

  renderBuild(v) {
    const can = v.phase === 'play' && v.ap > 0;
    $('#build-wheel').innerHTML = v.build.map((b) => {
      const img = ART_URL(b.art); const selected = this.sel === b.kind;
      const locked = !b.unlocked;
      return `<button class="build-slot ${selected ? 'selected' : ''} ${locked ? 'locked-tile' : ''} ${(!b.affordable || !can) && !locked ? 'locked' : ''}" data-tile-id="${b.kind}" title="${esc(b.name)} — ${esc(b.blurb)}">
        ${img ? `<div class="slot-art" style="background-image:url('${img}')"></div>` : `<div class="slot-art procedural-slot">${GLYPH[b.kind] || '•'}</div>`}
        <div class="slot-wash"></div>${locked ? `<span class="lv">LV ${b.unlock_level}</span>` : `<em>${GLYPH[b.kind] || ''}</em>`}<small>${costText(b.cost)}</small><strong>${esc(b.name)}</strong></button>`;
    }).join('');
    $$('#build-wheel .build-slot').forEach((el) => el.addEventListener('click', () => { this.pickTile(/** @type {HTMLElement} */ (el).dataset.tileId); animate(el, { scale: [1, 1.12, 1.04], duration: 300, ease: 'outBack' }); }));
  }

  renderPanel() {
    const v = this.run.v; const root = $('#side-content');
    if (this.tab === 'build') {
      $('#side-kicker').textContent = 'BUILD'; $('#side-title').textContent = 'Blueprints';
      root.innerHTML = v.build.filter((b) => b.unlocked).map((b) => `<div class="panel-row"><div><strong>${esc(b.name)}</strong><small>${esc(b.blurb)}<br>Cost ${costText(b.cost)}${Object.keys(b.prod).length ? ` · makes ${costText(b.prod)}` : ''}</small></div><button data-pick="${b.kind}" ${v.ap < 1 || !b.affordable || v.phase !== 'play' ? 'disabled' : ''}>BUILD</button></div>`).join('');
      root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => this.pickTile(b.dataset.pick)));
    } else if (this.tab === 'trade') {
      $('#side-kicker').textContent = 'TRADE'; $('#side-title').textContent = v.caravan ? 'Traders\' Caravan' : 'Island merchants';
      const note = `<div class="panel-row"><small>${v.trades_left} trade${v.trades_left === 1 ? '' : 's'} left this round · ${v.free_left} free of actions${v.free_left ? '' : ' (a Haat Market or caravan makes trades free)'}.</small></div>`;
      root.innerHTML = note + v.offers.map((o) => {
        const cheaper = o.wants.n < o.wants.base_n ? ` <span class="good">(was ${o.wants.base_n})</span>` : '';
        const ok = !o.taken && o.affordable && v.trades_left > 0 && v.phase === 'play' && (o.free || v.ap > 0);
        return `<div class="panel-row"><div><strong>${o.trader.avatar} ${esc(o.trader.name)}</strong><small>${esc(o.trader.island)} · you give ${o.wants.n}${RES_GLYPH[o.wants.res]}${cheaper} → get ${o.sells.n}${RES_GLYPH[o.sells.res]}${o.free ? ' · free' : ' · 1 action'}</small></div><button data-trade="${o.index}" ${ok ? '' : 'disabled'}>${o.taken ? 'DONE' : 'TRADE'}</button></div>`;
      }).join('');
      root.querySelectorAll('[data-trade]').forEach((b) => b.addEventListener('click', () => this.do({ cmd: 'trade', offer: Number(b.dataset.trade) })));
    } else if (this.tab === 'tasks') {
      $('#side-kicker').textContent = 'PROJECTS'; $('#side-title').textContent = 'Development projects';
      root.innerHTML = v.projects.map((p) => `<div class="panel-row"><div><strong>${p.symbol} ${esc(p.name)} <small>· +${p.points} pts · tier ${p.level}</small></strong><small>${esc(p.blurb)} Needs ${esc(p.requires.join(' + '))}. Cost ${costText(p.cost)}.${!p.ready && !p.claimed ? `<br><span class="bad">${esc(p.reason)}</span>` : ''}</small></div><button data-task="${p.id}" ${p.ready ? '' : 'disabled'}>${p.claimed ? '✔' : 'CLAIM'}</button></div>`).join('');
      root.querySelectorAll('[data-task]').forEach((b) => b.addEventListener('click', () => this.do({ cmd: 'claim_project', id: b.dataset.task })));
    } else if (this.tab === 'tile') {
      $('#side-kicker').textContent = 'ISLAND'; $('#side-title').textContent = 'Tile';
      root.innerHTML = this.tileHtml(v); this.wireTile(root);
    }
  }

  tileHtml(v) {
    const sc = this.selCell; if (!sc) return '<div class="scroll-empty">Tap a tile.</div>';
    const c = v.cells.find((x) => x.q === sc.q && x.r === sc.r); if (!c) return '';
    const ter = c.terrain[0].toUpperCase() + c.terrain.slice(1);
    if (!c.tile) return `<div class="tile-detail"><h4>${ter} ground</h4><div class="chips"><span class="chip">${ter}</span>${c.ruin ? '<span class="chip warn">Ruins</span>' : ''}${c.cleared ? '<span class="chip">Cleared woodland</span>' : ''}</div><p>${c.ruin ? 'Rebuild here; the old foundations help.' : 'Pick a blueprint, then tap a glowing hex to build.'}</p></div>`;
    const t = c.tile; const y = Object.entries(t.yield).filter(([, n]) => n > 0).map(([r, n]) => `+${n}${RES_GLYPH[r]}`).join(' ') || '—';
    const act = [];
    if (t.burning) act.push(`<button class="sm-btn" data-a="douse" ${v.res.water >= t.douse && v.phase === 'play' ? '' : 'disabled'}>PUT OUT FIRE (${t.douse}💧)</button>`);
    if (t.hp < 2 && !t.burning) act.push(`<button class="sm-btn" data-a="repair" ${v.ap > 0 ? '' : 'disabled'}>REPAIR (${costText(t.repair)})</button>`);
    if (t.kind === 'tile_sacred_forest' && !t.burning) act.push(`<button class="sm-btn ghost" data-a="clear_fell" ${v.ap > 0 ? '' : 'disabled'}>CLEAR-FELL (+4🪵, −8 land)</button>`);
    act.push(`<button class="sm-btn ghost" data-a="demolish" ${v.ap > 0 ? '' : 'disabled'}>${t.burning ? 'CLEAR AS FIREBREAK' : 'DEMOLISH'}</button>`);
    return `<div class="tile-detail"><h4>${esc(t.name)}</h4><div class="chips"><span class="chip">${ter}</span><span class="chip">Each dawn ${y}</span>${t.harmony ? `<span class="chip">+${t.harmony} harmony</span>` : ''}${t.eco ? `<span class="chip">${t.eco > 0 ? '+' : ''}${t.eco} land</span>` : ''}${t.flam ? `<span class="chip warn">🔥 ${t.flam}%${t.wet ? ' (damp)' : ''}</span>` : '<span class="chip">Fireproof</span>'}${t.hp < 2 ? '<span class="chip warn">Damaged</span>' : ''}</div>
      ${t.notes.length ? `<ul>${t.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}<div class="btn-col">${act.join('')}</div></div>`;
  }
  wireTile(root) {
    const c = this.selCell; if (!c) return;
    root.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a; const cmd = { cmd: a, q: c.q, r: c.r };
      if (a === 'demolish' && !confirm('Clear this tile? You recover one resource.')) return;
      if (a === 'clear_fell' && !confirm('Clear-fell the forest? Quick timber, but the land will suffer.')) return;
      this.do(cmd);
    }));
  }

  openDraft() {
    const v = this.run.v; const box = $('#draft-cards');
    $('#draft-kicker').textContent = `${v.season.toUpperCase()} · CHOOSE A BLESSING`;
    box.innerHTML = v.draft.map((d) => `<button class="draft-card" data-b="${d.index}"><small>BLESSING</small><strong>${esc(d.name)}</strong><span>${esc(d.text)}</span></button>`).join('');
    box.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { $('#draft-modal').classList.add('hidden'); this.do({ cmd: 'pick_blessing', index: Number(b.dataset.b) }); }));
    const m = $('#draft-modal'); if (m.classList.contains('hidden')) { m.classList.remove('hidden'); animate('.draft-card', { opacity: [0, 1], translateY: [20, 0], delay: (_, i) => i * 90, duration: 480, ease: 'outBack' }); }
  }

  async openResult() {
    const v = this.run.v; const o = v.outcome; const box = $('#result-box');
    const stars = [1, 2, 3].map((n) => `<span class="${n <= o.stars ? '' : 'off'}">★</span>`).join('');
    const goals = o.goals.map((g) => `<div class="${g.met ? 'ok' : 'no'}">${esc(g.label)}</div>`).join('');
    const chronicle = v.log.map((l) => esc(l)).join('<br>');
    box.innerHTML = `<div><small class="level-chip">${esc(v.season.toUpperCase())} · ROUND ${v.round}</small><h2>${o.won ? 'The island thrives' : o.reason.startsWith('The island survived') ? 'A hard season' : 'The island falls'}</h2></div>
      <div class="stars">${stars}</div><div><div class="big">${o.score}</div><div class="sub">${esc(o.reason)}</div></div>
      <div class="result-grid">${goals}</div>
      <div class="sub" id="seal-status">Sealing your chronicle with the server…</div><div id="seal-extra"></div>
      <div class="chronicle">${chronicle}</div>
      <div class="result-actions"><button class="game-button primary" id="again-same">PLAY AGAIN ↻</button><button class="game-button ghost" id="again-new">NEW ISLAND</button><button class="game-button ghost" id="to-lobby">LOBBY</button></div>`;
    $('#result-modal').classList.remove('hidden'); animate('#result-box', { opacity: [0, 1], scale: [0.95, 1], duration: 420, ease: 'outBack' });
    $('#again-same').addEventListener('click', () => { $('#result-modal').classList.add('hidden'); this.hooks.onNewSeason(true); });
    $('#again-new').addEventListener('click', () => { $('#result-modal').classList.add('hidden'); this.hooks.onNewSeason(false); });
    $('#to-lobby').addEventListener('click', () => { $('#result-modal').classList.add('hidden'); this.hooks.onExit(); });
    let res = null;
    try { res = await this.hooks.onFinished(this.run); } catch (e) { $('#seal-status').innerHTML = `<span class="bad">Could not reach the server (${esc(e.message)}). Your season is kept and will be submitted next time.</span>`; return; }
    if (!res) { $('#seal-status').textContent = 'Played offline — not ranked.'; return; }
    $('#seal-status').textContent = res.verified ? `Verified by the server${res.xp_gained ? ` · +${res.xp_gained} XP` : ''}${res.rank ? ` · rank #${res.rank} on this seed` : ''}${res.streak > 1 ? ` · 🔥 ${res.streak}-day streak` : ''}` : 'Not verified.';
    const newT = res.unlocks.tiles.filter((t) => !res.unlocked_before.tiles.includes(t)); const newI = res.unlocks.islands.filter((t) => !res.unlocked_before.islands.includes(t));
    const names = Object.fromEntries(v.build.map((b) => [b.kind, b.name]));
    const extra = [...newT.map((t) => `🔓 ${esc(names[t] || t)}`), ...newI.map((i) => `🏝 ${esc(i)} island`)];
    if (res.leveled_up) extra.unshift(`⬆ Level ${res.level}`);
    if (o.won && res.heat_allowed > v.heat) extra.push(`🔥 Heat ${res.heat_allowed} unlocked`);
    $('#seal-extra').innerHTML = extra.length ? `<div class="unlock-row">${extra.map((e) => `<span class="unlock">${e}</span>`).join('')}</div>` : (res.next_xp ? `<div class="sub">${res.next_xp - res.xp} XP to level ${res.level + 1}.</div>` : '');
  }

  wire() {
    $$('.dock-button[data-action-tab]').forEach((b) => b.addEventListener('click', () => this.setTab(/** @type {HTMLElement} */ (b).dataset.actionTab)));
    $('#advisor-btn').addEventListener('click', () => this.advise());
    $('#side-close').addEventListener('click', () => this.setTab(null));
    $('#end-turn').addEventListener('click', () => this.endRound());
    $('#cancel-build').addEventListener('click', () => { this.sel = null; this.map = []; this.render(); });
    $('#back-lobby').addEventListener('click', () => this.hooks.onExit());
    $('#zoom-in').addEventListener('click', () => this.board?.setZoom(this.board.zoom + 0.1));
    $('#zoom-out').addEventListener('click', () => this.board?.setZoom(this.board.zoom - 0.1));
    $('#zoom-reset').addEventListener('click', () => this.board?.resetView());
    window.addEventListener('keydown', (e) => {
      if (!this.run || document.getElementById('game-view')?.classList.contains('active') === false) return;
      if (e.key === 'Escape') { this.sel = null; this.map = []; this.setTab(null); this.render(); }
      if (e.key === 'Enter' && !e.repeat && this.run.v.phase === 'play' && !/input|textarea/i.test(/** @type {HTMLElement} */ (e.target).tagName)) this.endRound();
      if (e.key.toLowerCase() === 'h') this.advise();
    });
  }
}

export { api };
