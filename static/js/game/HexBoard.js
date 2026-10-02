// ─── Hex board renderer + interaction ────────────────────────────────────────
import { TILE_DEFS } from '../config.js';
import { C } from '../ui/Colors.js';

const HEX_DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

export class HexBoard {
  constructor(scene, originX, originY, hexRadius = 44) {
    this.scene   = scene;
    this.ox      = originX;
    this.oy      = originY;
    this.r       = hexRadius;
    this.squish  = 0.60;
    this.depth3d = hexRadius * 0.28;

    this.gfx        = scene.add.graphics().setDepth(2);
    this.labelPool  = [];   // Text objects reused for tile labels
    this.fireMarkers= [];   // pulsing fire circles
    this.slots      = [];   // current valid placement slots
    this.onSlotClick= null; // callback(q,r)
    this.selectedTile = null;

    // Invisible hit areas for slots
    this.slotZones = scene.add.group();
  }

  // ── coord utils ─────────────────────────────────────────────────────────────
  hexToScreen(q, r) {
    const x = this.ox + q * (this.r * 1.73) + r * (this.r * 0.866);
    const y = this.oy + r * (this.r * 1.0 * this.squish * 1.66);
    return [x, y];
  }

  hexCorners(cx, cy) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (30 + 60*i) * Math.PI / 180;
      pts.push({ x: cx + this.r * Math.cos(a), y: cy + this.r * Math.sin(a) * this.squish });
    }
    return pts;
  }

  getValidSlots(tiles) {
    const placed = new Set(tiles.map(t=>`${t.q},${t.r}`));
    const result = new Set();
    if (tiles.length === 0) { result.add('0,0'); return [...result].map(s=>s.split(',').map(Number)); }
    for (const t of tiles) {
      for (const [dq,dr] of HEX_DIRS) {
        const key = `${t.q+dq},${t.r+dr}`;
        if (!placed.has(key)) result.add(key);
      }
    }
    return [...result].map(s=>s.split(',').map(Number));
  }

  // ── drawing helpers ──────────────────────────────────────────────────────────
  drawQuad(pts, color) {
    this.gfx.fillStyle(color, 1);
    this.gfx.fillTriangle(pts[0].x,pts[0].y, pts[1].x,pts[1].y, pts[2].x,pts[2].y);
    this.gfx.fillTriangle(pts[0].x,pts[0].y, pts[2].x,pts[2].y, pts[3].x,pts[3].y);
  }

  fillHex(pts, color, alpha=1) {
    const cx = pts.reduce((s,p)=>s+p.x,0)/6;
    const cy = pts.reduce((s,p)=>s+p.y,0)/6;
    this.gfx.fillStyle(color, alpha);
    for (let i=0;i<6;i++) {
      const j=(i+1)%6;
      this.gfx.fillTriangle(cx,cy, pts[i].x,pts[i].y, pts[j].x,pts[j].y);
    }
  }

  drawHex(cx, cy, def, damaged, selected, isFireTarget) {
    const d   = this.depth3d;
    const top = this.hexCorners(cx, cy);
    const bot = this.hexCorners(cx, cy + d);

    // Ground shadow
    this.gfx.fillStyle(0x000000, 0.15);
    this.gfx.fillEllipse(cx+3, cy+d+5, this.r*1.3, this.r*0.45);

    // 3-D walls
    this.drawQuad([top[1],top[2],bot[2],bot[1]], def.sideL);
    this.drawQuad([top[2],top[3],bot[3],bot[2]], def.sideL);
    this.drawQuad([top[3],top[4],bot[4],bot[3]], def.sideR);

    // Top surface
    const surfColor = damaged ? this.dimColor(def.color) : def.color;
    this.fillHex(top, surfColor);

    // Inner sheen
    const shinePts = this.hexCorners(cx-this.r*0.08, cy-this.r*0.1, );
    // simplified sheen rectangle
    this.gfx.fillStyle(0xffffff, 0.06);
    this.gfx.fillEllipse(cx-3, cy-3, this.r*0.9, this.r*0.4*this.squish);

    // Outline
    const rimColor = selected ? C.GOLD : (isFireTarget ? 0xff2200 : 0x000000);
    const rimAlpha = selected ? 1 : (isFireTarget ? 0.9 : 0.5);
    const rimW     = selected ? 2.5 : (isFireTarget ? 2 : 1);
    this.gfx.lineStyle(rimW, rimColor, rimAlpha);
    this.gfx.strokePoints(top, true);
  }

  drawSlotGhost(cx, cy, hovered) {
    const top = this.hexCorners(cx, cy);
    this.fillHex(top, hovered ? 0xffc800 : 0xffffff, hovered ? 0.28 : 0.10);
    this.gfx.lineStyle(1.5, hovered ? C.GOLD : 0xffffff, hovered ? 1 : 0.30);
    this.gfx.strokePoints(top, true);
    if (hovered) {
      this.gfx.fillStyle(0xffc800, 0.80);
      this.gfx.fillCircle(cx, cy, 7);
    }
  }

  dimColor(hex) {
    return ((hex & 0xfefefe) >> 1); // ~50% darker
  }

  // ── main render call ─────────────────────────────────────────────────────────
  render(island, selectedTileId, hoveredSlot) {
    this.gfx.clear();

    // Destroy old labels / fire markers
    this.labelPool.forEach(t=>t.destroy());
    this.labelPool = [];
    this.fireMarkers.forEach(c=>c.destroy());
    this.fireMarkers = [];
    this.slotZones.clear(true, true);

    if (!island) return;

    const eventTarget = island.active_event
      ? `${island.active_event.target_q},${island.active_event.target_r}` : null;

    // Draw slots first (behind tiles)
    if (selectedTileId) {
      this.slots = this.getValidSlots(island.tiles);
      for (const [q,r] of this.slots) {
        const [cx,cy] = this.hexToScreen(q,r);
        const hovered = hoveredSlot && hoveredSlot[0]===q && hoveredSlot[1]===r;
        this.drawSlotGhost(cx, cy, hovered);

        // Invisible hit zone for click
        const zone = this.scene.add.circle(cx, cy, this.r*0.8, 0x000000, 0)
          .setInteractive({useHandCursor:true}).setDepth(3);
        zone.on('pointerup', ()=>{ if(this.onSlotClick) this.onSlotClick(q,r); });
        this.slotZones.add(zone);
      }
    } else {
      this.slots = [];
    }

    // Draw placed tiles
    for (const tile of island.tiles) {
      const [cx,cy] = this.hexToScreen(tile.q, tile.r);
      const def = TILE_DEFS[tile.tile_id] || { label:'??', color:0x444444, sideL:0x222222, sideR:0x333333 };
      const isFireTarget = eventTarget === `${tile.q},${tile.r}`;
      this.drawHex(cx, cy, def, tile.is_damaged, false, isFireTarget);

      // Label
      const lbl = this.scene.add.text(cx, cy+2, def.label, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px',
        color:'#ffffff', fontStyle:'bold',
        shadow:{x:1,y:1,color:'#000',blur:0,fill:true},
      }).setOrigin(0.5,0.5).setDepth(5);
      this.labelPool.push(lbl);

      // Damaged overlay
      if (tile.is_damaged) {
        const dmg = this.scene.add.text(cx, cy-this.r*0.3, '💥', {fontSize:'14px'})
          .setOrigin(0.5,0.5).setDepth(6);
        this.labelPool.push(dmg);
      }

      // Fire/event marker
      if (isFireTarget) {
        const fc = this.scene.add.circle(cx, cy-this.r*0.25, 9, 0xff2200, 0.9).setDepth(7);
        this.fireMarkers.push(fc);
        this.scene.tweens.add({ targets:fc, alpha:{from:0.5,to:1}, duration:400, yoyo:true, repeat:-1 });
      }
    }
  }

  destroy() {
    this.gfx.destroy();
    this.labelPool.forEach(t=>t.destroy());
    this.fireMarkers.forEach(c=>c.destroy());
    this.slotZones.clear(true,true);
  }
}
