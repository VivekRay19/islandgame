// @ts-check
// PixiJS board: draws whatever the Rust engine says exists. It owns pixels,
// camera and juice (fire, embers, steam, floating numbers) and never rules.
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from '/vendor/pixi.min.mjs';
import { animate } from '/vendor/anime.esm.min.js';

export const TILE_SIZE = 78;
const SQRT3 = Math.sqrt(3);
const WORLD_ART = '/assets/island_world.webp';
const TERRAIN = {
  meadow: { fill: 0x8fb35f, glyph: '' },
  woods:  { fill: 0x3f7d4b, glyph: '🌲' },
  hill:   { fill: 0x9a927c, glyph: '⛰' },
  shore:  { fill: 0xd6c88f, glyph: '' },
};
export const GLYPH = {
  tile_farm: '🌾', tile_textile_workshop: '🧵', tile_haat_market: '🧺', tile_community_house: '🏠',
  tile_music_pavilion: '🥁', tile_sacred_shrine: '🛕', tile_clay_pit: '🏺', tile_river_bend: '💧',
  tile_sacred_forest: '🌳', tile_quarry: '⛏', tile_stepwell: '🕳', tile_bund: '🧱', tile_granary: '🏚',
};
const KIND = {
  tile_farm: 'farm', tile_textile_workshop: 'workshop', tile_haat_market: 'market', tile_community_house: 'hall',
  tile_music_pavilion: 'music', tile_sacred_shrine: 'shrine', tile_clay_pit: 'clay', tile_river_bend: 'river',
  tile_sacred_forest: 'forest', tile_quarry: 'quarry', tile_stepwell: 'well', tile_bund: 'bund', tile_granary: 'granary',
};
const HAZARD_GLYPH = { fire: '🔥', drought: '☀️', flood: '🌊', storm: '⛈️', landslide: '⛰️' };
const key = (q, r) => `${q},${r}`;

export class IslandBoard {
  /** @param {HTMLElement} host @param {{onTap:(c:any)=>void, onHover:(c:any, e:any)=>void}} hooks */
  constructor(host, hooks) {
    this.host = host; this.hooks = hooks;
    this.world = new Container(); this.bgLayer = new Container();
    this.hexLayer = new Container(); this.tileLayer = new Container(); this.markLayer = new Container();
    this.fxLayer = new Container(); this.hitLayer = new Container(); this.textLayer = new Container();
    this.zoom = 0.95; this.dragging = false; this.pointerStart = null; this.dragStart = null;
    this.nodes = new Map(); this.burning = []; this.particles = []; this.pulses = [];
    this.v = null; this.opts = {};
  }

  async init() {
    this.app = new Application();
    await this.app.init({ resizeTo: this.host, antialias: true, backgroundColor: 0x0b1c16, preference: 'webgl', powerPreference: 'high-performance' });
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.bgLayer, this.world);
    this.world.addChild(this.hexLayer, this.tileLayer, this.markLayer, this.fxLayer, this.hitLayer, this.textLayer);
    const texture = await Assets.load(WORLD_ART);
    this.art = new Sprite(texture); this.art.anchor.set(0.5); this.bgLayer.addChild(this.art);
    const st = this.app.stage; st.eventMode = 'static'; st.hitArea = this.app.screen;
    st.on('pointerdown', (e) => { this.dragging = false; this.pointerStart = e.global.clone(); this.dragStart = { x: this.world.x, y: this.world.y }; });
    st.on('pointermove', (e) => {
      if (!this.pointerStart) return;
      const dx = e.global.x - this.pointerStart.x, dy = e.global.y - this.pointerStart.y;
      if (Math.hypot(dx, dy) > 6) this.dragging = true;
      if (this.dragging) this.world.position.set(this.dragStart.x + dx, this.dragStart.y + dy);
    });
    const up = () => { this.pointerStart = null; setTimeout(() => { this.dragging = false; }, 0); };
    st.on('pointerup', up); st.on('pointerupoutside', up);
    this.app.canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.setZoom(this.zoom + (e.deltaY > 0 ? -0.07 : 0.07)); }, { passive: false });
    window.addEventListener('resize', () => this.layout());
    this.app.ticker.add((t) => this.tick(t));
    this.layout();
  }

  setZoom(z) { this.zoom = Math.min(1.45, Math.max(0.6, z)); this.layout(); }
  resetView() { this.zoom = 0.95; this.world.position.set(this.host.clientWidth / 2, this.host.clientHeight / 2 + 30); this.layout(); }
  layout() {
    if (!this.app || !this.art) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    const cover = Math.max(w / this.art.texture.width, h / this.art.texture.height) * 1.05;
    this.art.scale.set(cover); this.bgLayer.position.set(w / 2, h / 2 + 15);
    if (!this.dragging && this.world.x === 0 && this.world.y === 0) this.world.position.set(w / 2, h / 2 + 30);
    this.world.scale.set(this.zoom);
  }
  cell(q, r) { return { x: q * SQRT3 * TILE_SIZE + r * SQRT3 * TILE_SIZE / 2, y: r * TILE_SIZE * 1.5 }; }
  poly(radius) {
    return Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return { x: radius * Math.cos(a), y: radius * Math.sin(a) }; });
  }
  clear(c) { c.removeChildren().forEach((ch) => ch.destroy({ children: true })); }

  /** Redraw the persistent layers from an engine view. */
  setView(v, opts = {}) {
    this.v = v; this.opts = opts;
    for (const l of [this.hexLayer, this.tileLayer, this.markLayer, this.hitLayer]) this.clear(l);
    this.nodes.clear(); this.burning = []; this.pulses = [];
    const buildOk = new Map((opts.buildMap || []).map((b) => [key(b.q, b.r), b]));
    const wetRings = new Set();
    for (const c of v.cells) {
      const p = this.cell(c.q, c.r); const t = TERRAIN[c.terrain] || TERRAIN.meadow;
      const g = new Graphics();
      g.poly(this.poly(TILE_SIZE - 2)).fill({ color: t.fill, alpha: c.tile ? 0.5 : 0.34 })
        .stroke({ color: 0xf0e4b8, width: 1.2, alpha: 0.2 });
      g.position.set(p.x, p.y); this.hexLayer.addChild(g);
      if (!c.tile && t.glyph) {
        const m = new Text({ text: t.glyph, style: new TextStyle({ fontSize: 17 }) }); m.anchor.set(0.5); m.alpha = c.cleared ? 0.18 : 0.38; m.position.set(p.x, p.y + 4); this.hexLayer.addChild(m);
      }
      if (c.ruin) this.drawRuin(p);
      if (c.tile) this.drawTile(c, p);
      if (c.tile?.wet) wetRings.add(key(c.q, c.r));
    }
    // Ground-level markers: omens, problems, selected, build sites
    for (const o of v.omens) if (o.epi) this.drawOmen(o);
    for (const pr of v.problems) if (!pr.resolved) for (const c of pr.cells) this.drawThreat(c, pr);
    if (opts.selected) this.drawSelect(opts.selected);
    if (opts.advisor) this.drawAdvisor(opts.advisor);
    // Hit areas for interaction (above everything)
    for (const c of v.cells) {
      const p = this.cell(c.q, c.r); const h = new Graphics();
      h.poly(this.poly(TILE_SIZE - 2)).fill({ color: 0xffffff, alpha: 0.001 });
      h.position.set(p.x, p.y); h.eventMode = 'static'; h.cursor = 'pointer';
      const info = buildOk.get(key(c.q, c.r));
      h.on('pointertap', () => { if (!this.dragging) this.hooks.onTap(c); });
      h.on('pointerover', (e) => { this.hover(c, p, info); this.hooks.onHover(c, e); });
      h.on('pointerout', () => { this.hover(null); this.hooks.onHover(null, null); });
      this.hitLayer.addChild(h);
      if (opts.selectedTile && !c.tile) {
        const ok = info?.ok; const hint = new Graphics();
        hint.poly(this.poly(TILE_SIZE - 6)).fill({ color: ok ? 0x99d85c : 0x1b1b1b, alpha: ok ? 0.16 : 0.32 })
          .stroke({ color: ok ? 0xdbe88b : 0x6a5a4a, width: ok ? 2.2 : 1, alpha: ok ? 0.7 : 0.35 });
        hint.position.set(p.x, p.y); this.markLayer.addChild(hint); if (ok) this.pulses.push({ g: hint, ph: Math.random() * 6 });
      }
    }
    this.layout();
  }

  hover(c, p, info) {
    if (this.hoverG) { this.hoverG.destroy(); this.hoverG = null; }
    if (!c) return;
    this.hoverG = new Graphics().poly(this.poly(TILE_SIZE - 4)).stroke({ color: 0xffefb0, width: 2.2, alpha: 0.85 });
    this.hoverG.position.set(p.x, p.y); this.markLayer.addChild(this.hoverG);
  }

  drawRuin(p) {
    const g = new Graphics();
    g.ellipse(0, 6, 26, 12).fill({ color: 0x2a2520, alpha: 0.7 });
    for (const [x, y, w] of [[-14, 0, 10], [-2, -4, 12], [12, 2, 9], [4, 8, 8]]) g.rect(x, y, w, 6).fill({ color: 0x5a4f43 });
    g.position.set(p.x, p.y); this.tileLayer.addChild(g);
  }

  drawTile(c, p) {
    const t = c.tile; const group = new Container(); group.position.set(p.x, p.y - 10);
    group.addChild(new Graphics().ellipse(0, 20, 58, 19).fill({ color: 0x0b140f, alpha: 0.42 }));
    group.addChild(new Graphics().poly(this.poly(TILE_SIZE - 7)).fill({ color: 0x6d6a4a, alpha: 0.56 }).stroke({ color: 0xe5d6a6, width: 1.5, alpha: 0.22 }));
    const art = new Container(); group.addChild(art);
    this.drawBuilding(art, KIND[t.kind] || 'hall', GLYPH[t.kind] || '•');
    if (t.hp < 2) { art.alpha = 0.55; art.tint = 0x998877; this.drawCracks(group); }
    const name = new Text({ text: t.name, style: new TextStyle({ fontFamily: 'Georgia', fontSize: 9, fill: 0xf3e5bf, fontWeight: '600', align: 'center', stroke: { color: 0x26160d, width: 3 } }) });
    name.anchor.set(0.5); name.y = 42; group.addChild(name);
    // Yield pips: what this tile makes each dawn
    const pips = Object.entries(t.yield).filter(([, n]) => n > 0).map(([r, n]) => `${n > 1 ? n : ''}${RES_GLYPH[r]}`).join('');
    if (pips && t.hp >= 2 && !t.burning) {
      const y = new Text({ text: pips, style: new TextStyle({ fontSize: 10, fill: 0xfff1c9, stroke: { color: 0x1a1008, width: 3 } }) });
      y.anchor.set(0.5); y.position.set(0, -52); y.alpha = 0.92; group.addChild(y);
    }
    if (t.wet) { const d = new Text({ text: '💧', style: new TextStyle({ fontSize: 9 }) }); d.position.set(24, -40); d.alpha = 0.8; group.addChild(d); }
    this.tileLayer.addChild(group); this.nodes.set(key(c.q, c.r), group);
    if (t.burning) this.burning.push({ x: p.x, y: p.y - 12 });
  }

  drawCracks(group) {
    const g = new Graphics();
    g.moveTo(-14, -10).lineTo(-4, 0).lineTo(-10, 12).stroke({ color: 0x1b120c, width: 2, alpha: 0.8 });
    g.moveTo(10, -14).lineTo(4, -2).lineTo(14, 10).stroke({ color: 0x1b120c, width: 2, alpha: 0.8 });
    group.addChild(g);
  }

  drawBuilding(group, kind, glyph) {
    const g = new Graphics();
    const roof = { forest: 0x4e7d4c, river: 0x2a94be, well: 0x2a94be, quarry: 0x858f95, bund: 0x8b7551, market: 0xc76f43, granary: 0xa87c3e }[kind] || 0xb3763d;
    if (kind === 'farm') {
      for (let i = 0; i < 4; i++) g.ellipse(-26 + i * 17, 5 - (i % 2) * 8, 13, 7).fill({ color: 0x8aa45a });
      g.poly([{ x: -20, y: -2 }, { x: 0, y: -19 }, { x: 20, y: -2 }]).fill({ color: 0xc58d45 }); g.rect(-18, -1, 36, 18).fill({ color: 0xb7793d }); g.rect(-4, 7, 8, 10).fill({ color: 0x4f3420 });
    } else if (kind === 'forest') {
      for (let i = 0; i < 5; i++) { const x = -24 + i * 12; g.rect(x - 2, 7, 4, 13).fill({ color: 0x654932 }); g.circle(x, 0, 13).fill({ color: 0x3f774b }); g.circle(x + 5, -6, 9).fill({ color: 0x4e8a55 }); }
    } else if (kind === 'river') {
      g.moveTo(-30, -8).bezierCurveTo(-10, -20, 4, 2, 27, -10).stroke({ color: 0x55c5e4, width: 10, alpha: 0.9 });
      g.moveTo(-26, 6).bezierCurveTo(-8, -6, 5, 15, 27, 3).stroke({ color: 0xb4e6ef, width: 4, alpha: 0.55 });
    } else if (kind === 'well') {
      g.ellipse(0, 6, 28, 14).fill({ color: 0x7c7466 }); g.ellipse(0, 4, 22, 10).fill({ color: 0x1f6f8f }); g.ellipse(0, 2, 14, 6).fill({ color: 0x55c5e4, alpha: 0.8 });
      for (let i = 0; i < 3; i++) g.rect(-22 + i * 4, 6 + i * 4, 44 - i * 8, 2).fill({ color: 0xa79d86, alpha: 0.7 });
    } else if (kind === 'bund') {
      g.poly([{ x: -32, y: 14 }, { x: -22, y: -6 }, { x: 22, y: -6 }, { x: 32, y: 14 }]).fill({ color: 0x8b7551 });
      g.poly([{ x: -22, y: -6 }, { x: 22, y: -6 }, { x: 16, y: -12 }, { x: -16, y: -12 }]).fill({ color: 0x6f8f4a });
    } else if (kind === 'granary') {
      g.rect(-20, -2, 40, 24).fill({ color: 0xc9a05c }); g.poly([{ x: -26, y: -2 }, { x: 0, y: -24 }, { x: 26, y: -2 }]).fill({ color: roof });
      g.rect(-6, 10, 12, 12).fill({ color: 0x55331e }); g.circle(0, -8, 4).fill({ color: 0x55331e });
    } else if (kind === 'quarry' || kind === 'clay') {
      g.ellipse(0, 9, 30, 15).fill({ color: kind === 'clay' ? 0xa86849 : 0x737b7d });
      g.poly([{ x: -24, y: 4 }, { x: -10, y: -22 }, { x: 4, y: -8 }, { x: 20, y: -28 }, { x: 27, y: 2 }]).fill({ color: roof }); g.rect(-17, 4, 34, 7).fill({ color: 0x3d3327 });
    } else {
      g.poly([{ x: -24, y: 4 }, { x: 0, y: -19 }, { x: 24, y: 4 }]).fill({ color: roof }); g.rect(-19, 2, 38, 23).fill({ color: 0xc58b52 });
      g.rect(-5, 12, 10, 13).fill({ color: 0x55331e }); g.rect(-25, 5, 50, 4).fill({ color: 0x4a2d1a });
      if (kind === 'shrine') { g.circle(0, -3, 16).stroke({ color: 0xe7c46a, width: 2 }); g.rect(-2, -18, 4, 32).fill({ color: 0xe7c46a }); }
      if (kind === 'music') { g.rect(6, -18, 4, 22).fill({ color: 0x6c4730 }); g.circle(0, 9, 7).fill({ color: 0xd5ad5a }); }
      if (kind === 'hall') g.rect(-13, 8, 26, 5).fill({ color: 0x6b4530 });
      if (kind === 'market') for (let x = -13; x <= 13; x += 13) g.rect(x - 5, -6, 10, 12).fill({ color: 0xe2b84c });
    }
    const gt = new Text({ text: glyph, style: new TextStyle({ fontSize: 18 }) }); gt.anchor.set(0.5); gt.y = -30;
    group.addChild(g, gt);
  }

  ring(p, radius, color, width, alpha) {
    const g = new Graphics().circle(0, 0, radius).stroke({ color, width, alpha }); g.position.set(p.x, p.y); return g;
  }
  drawOmen(o) {
    const p = this.cell(o.epi.q, o.epi.r); const col = { fire: 0xff7a4e, drought: 0xf0c04a, flood: 0x4ab8d9, storm: 0x9aa7d8, landslide: 0xb59a74 }[o.kind] || 0xffffff;
    const g = this.ring(p, TILE_SIZE - 14, col, 3, 0.8); g.alpha = 0.7; this.markLayer.addChild(g); this.pulses.push({ g, ph: 0, ring: true });
    const t = new Text({ text: `${HAZARD_GLYPH[o.kind]} ${o.round - this.v.round === 1 ? 'next' : '+2'}`, style: new TextStyle({ fontSize: 13, fill: 0xffffff, stroke: { color: 0x150c08, width: 4 }, fontWeight: '700' }) });
    t.anchor.set(0.5); t.position.set(p.x, p.y - TILE_SIZE + 6); this.markLayer.addChild(t);
  }
  drawThreat(c, pr) {
    const p = this.cell(c.q, c.r); const col = pr.kind === 'drought' ? 0xf0c04a : 0x4ab8d9;
    const g = new Graphics().poly(this.poly(TILE_SIZE - 5)).stroke({ color: col, width: 3, alpha: 0.9 }); g.position.set(p.x, p.y);
    this.markLayer.addChild(g); this.pulses.push({ g, ph: Math.random() * 6 });
  }
  drawSelect(s) {
    const p = this.cell(s.q, s.r);
    const g = new Graphics().poly(this.poly(TILE_SIZE - 3)).stroke({ color: 0xffe08a, width: 3, alpha: 0.95 }); g.position.set(p.x, p.y); this.markLayer.addChild(g);
  }
  drawAdvisor(a) {
    const p = this.cell(a.q, a.r);
    const g = new Graphics().poly(this.poly(TILE_SIZE - 5)).fill({ color: 0xffe08a, alpha: 0.14 }).stroke({ color: 0xffe08a, width: 3, alpha: 0.9 });
    g.position.set(p.x, p.y); this.markLayer.addChild(g); this.pulses.push({ g, ph: 0 });
  }

  // ───────────── juice ─────────────
  spawn(p) { if (this.particles.length < 260) { this.fxLayer.addChild(p.g); this.particles.push(p); } }
  puff(x, y, color, n, spread = 1, up = 1) {
    for (let i = 0; i < n; i++) {
      const g = new Graphics().circle(0, 0, 2 + Math.random() * 3).fill({ color }); g.position.set(x, y);
      this.spawn({ g, vx: (Math.random() - 0.5) * 2.2 * spread, vy: -(0.4 + Math.random() * 1.6) * up, life: 0, max: 30 + Math.random() * 26, grav: 0.02 });
    }
  }
  floatText(q, r, text, tone = 'good', delay = 0) {
    const p = this.cell(q, r); const col = tone === 'bad' ? 0xff9a8a : tone === 'good' ? 0xcdf29a : 0xfff1c9;
    const t = new Text({ text, style: new TextStyle({ fontSize: 15, fontWeight: '700', fill: col, stroke: { color: 0x120a06, width: 4 } }) });
    t.anchor.set(0.5); t.position.set(p.x, p.y - 30); t.alpha = 0; this.textLayer.addChild(t);
    animate(t, { alpha: [0, 1, 1, 0], y: [p.y - 30, p.y - 62, p.y - 80, p.y - 96], duration: 1500, delay, ease: 'outQuad', onComplete: () => t.destroy() });
  }
  banner(text, sub) {
    const el = document.getElementById('banner'); if (!el) return;
    el.querySelector('strong').textContent = text; el.querySelector('small').textContent = sub || '';
    el.classList.remove('hidden'); animate(el, { opacity: [0, 1, 1, 0], translateY: [-14, 0, 0, -6], duration: 2200, ease: 'outQuad', onComplete: () => el.classList.add('hidden') });
  }
  shake(mag = 6) { const x0 = this.world.x, y0 = this.world.y; const o = { t: 0 }; animate(o, { t: 1, duration: 360, ease: 'linear', onUpdate: () => { const k = (1 - o.t) * mag; this.world.position.set(x0 + (Math.random() - 0.5) * k, y0 + (Math.random() - 0.5) * k); }, onComplete: () => this.world.position.set(x0, y0) }); }

  /** Animate what just happened (engine events), over the freshly drawn state. */
  play(events) {
    let d = 0;
    for (const e of events) {
      const node = e.q !== undefined ? this.nodes.get(key(e.q, e.r)) : null; const p = e.q !== undefined ? this.cell(e.q, e.r) : null;
      switch (e.t) {
        case 'built': if (node) { node.scale.set(0.2); node.alpha = 0; animate(node.scale, { x: [0.2, 1.12, 1], y: [0.2, 1.12, 1], duration: 520, ease: 'outBack' }); animate(node, { alpha: [0, 1], duration: 220 }); } this.puff(p.x, p.y, 0xe6d3a1, 12); break;
        case 'removed': this.puff(p.x, p.y, 0x9a8f7e, 14); break;
        case 'repaired': this.puff(p.x, p.y, 0xcdf29a, 10); break;
        case 'ignite': this.puff(p.x, p.y - 10, 0xff8a3d, 14, 1.4, 1.6); break;
        case 'doused': this.puff(p.x, p.y - 6, 0xeaf6fb, 22, 1.6, 1.3); this.floatText(e.q, e.r, '💨', 'info'); break;
        case 'hit': this.puff(p.x, p.y, e.ruin ? 0x3a322b : 0x7a6a58, e.ruin ? 26 : 12, 1.6); if (e.ruin) this.shake(8); break;
        case 'spread': this.ember(this.cell(e.fq, e.fr), this.cell(e.tq, e.tr)); break;
        case 'shielded': this.puff(p.x, p.y, 0x9fe1f5, 12); break;
        case 'yield': this.floatText(e.q, e.r, `+${e.n}${RES_GLYPH[e.res]}`, 'good', Math.min(d * 18, 900)); d++; break;
        case 'float': this.floatText(e.q, e.r, e.text, e.tone); break;
        case 'dawn': this.banner(`Round ${e.round}`, e.season); break;
        case 'hazard': if (p && !e.harmless) this.shake(5); if (e.harmless) this.banner('Spared', 'Your island was ready.'); break;
        case 'project': this.banner('Project complete', ''); break;
        default: break;
      }
    }
  }
  ember(a, b) {
    const g = new Graphics().circle(0, 0, 5).fill({ color: 0xffa24a }); g.position.set(a.x, a.y - 14); this.fxLayer.addChild(g);
    animate(g, { x: b.x, y: b.y - 14, duration: 650, ease: 'inOutQuad', onComplete: () => { this.puff(b.x, b.y - 10, 0xff8a3d, 10); g.destroy(); } });
  }

  tick(t) {
    const time = t.lastTime / 1000;
    if (this.art) this.art.x = Math.sin(time * 0.12) * 0.9;
    for (const p of this.pulses) { if (p.g.destroyed) continue; p.g.alpha = p.ring ? 0.55 + Math.sin(time * 3 + p.ph) * 0.3 : 0.6 + Math.sin(time * 3 + p.ph) * 0.3; }
    if (this.burning.length) for (const b of this.burning) {
      if (Math.random() < 0.55) {
        const g = new Graphics().circle(0, 0, 3 + Math.random() * 4).fill({ color: [0xff5a1f, 0xff8a1f, 0xffc44a][(Math.random() * 3) | 0] });
        g.position.set(b.x + (Math.random() - 0.5) * 30, b.y + 6); this.spawn({ g, vx: (Math.random() - 0.5) * 0.5, vy: -(0.8 + Math.random() * 1.4), life: 0, max: 26 + Math.random() * 14, grav: -0.01 });
      }
    }
    const dt = Math.min(2, t.deltaTime);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life += dt; p.g.x += p.vx * dt; p.g.y += p.vy * dt; p.vy += p.grav * dt;
      p.g.alpha = Math.max(0, 1 - p.life / p.max); p.g.scale.set(1 - 0.5 * (p.life / p.max));
      if (p.life >= p.max) { p.g.destroy(); this.particles.splice(i, 1); }
    }
  }
}

export const RES_GLYPH = { grain: '🌾', fibre: '🧵', wood: '🪵', stone: '🪨', clay: '🏺', water: '💧', music: '🥁', ore: '⛏' };
