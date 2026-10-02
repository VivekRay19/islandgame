// ─── Bottom tile picker bar ───────────────────────────────────────────────────
import { TILE_DEFS, TILE_ORDER } from '../config.js';
import { C } from '../ui/Colors.js';

export class TilePicker {
  constructor(scene, onSelect) {
    this.scene    = scene;
    this.onSelect = onSelect;
    this.selected = null;
    this.rotation = 0;
    this.gfx      = null;
    this.labels   = [];
    this.zones    = scene.add.group();
    this.infoTxt  = null;
    this.rotTxt   = null;
    this._build();
  }

  _build() {
    const s  = this.scene;
    const sw = s.scale.width;
    const sh = s.scale.height;
    const barH = 72;
    const barY = sh - barH;

    // Background bar
    s.add.rectangle(sw/2, sh-barH/2, sw, barH, 0x1a0a04, 0.96).setDepth(9);
    s.add.rectangle(sw/2, barY, sw, 2, C.GOLD_DARK, 1).setDepth(9);

    // Tile buttons
    const tileW = 58;
    const totalW = TILE_ORDER.length * tileW;
    const startX = (sw - totalW) / 2 + tileW/2;
    this.gfx = s.add.graphics().setDepth(10);
    this.zones.clear(true,true);

    TILE_ORDER.forEach((tileId, i) => {
      const def = TILE_DEFS[tileId];
      const x   = startX + i*tileW;
      const y   = sh - barH/2;

      // Draw mini hex
      this._drawMiniHex(x, y-2, 20, def.color, tileId === this.selected);

      // Invisible hit zone
      const zone = s.add.rectangle(x, y, tileW-2, barH-4, 0x000000, 0)
        .setInteractive({useHandCursor:true}).setDepth(11);
      zone.on('pointerover', ()=>this._drawMiniHex(x,y-2,20,def.color,tileId===this.selected,true));
      zone.on('pointerout',  ()=>this._drawMiniHex(x,y-2,20,def.color,tileId===this.selected,false));
      zone.on('pointerup', ()=>{
        const wasSelected = this.selected === tileId;
        this.selected = wasSelected ? null : tileId;
        this.redraw();
        this.onSelect(this.selected);
      });
      this.zones.add(zone);

      // Label
      const lbl = s.add.text(x, y+22, def.label, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'9px', color:C.STONE_S,
      }).setOrigin(0.5,0).setDepth(11);
      this.labels.push(lbl);
    });

    // Rotation controls (left of picker)
    this.rotTxt = s.add.text(startX-80, sh-barH/2-8, 'Rotate', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px', color:C.GOLD_TEXT_S,
    }).setOrigin(0.5,0.5).setDepth(11);
    this.rotDeg = s.add.text(startX-80, sh-barH/2+8, '0°', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.WHITE,
    }).setOrigin(0.5,0.5).setDepth(11);

    const btnL = s.add.text(startX-108, sh-barH/2, '<', {
      fontSize:'20px', color:C.STONE_S,
    }).setOrigin(0.5,0.5).setDepth(11).setInteractive({useHandCursor:true});
    btnL.on('pointerup', ()=>{ this.rotation=(this.rotation+300)%360; this.rotDeg.setText(this.rotation+'°'); });

    const btnR = s.add.text(startX-54, sh-barH/2, '>', {
      fontSize:'20px', color:C.STONE_S,
    }).setOrigin(0.5,0.5).setDepth(11).setInteractive({useHandCursor:true});
    btnR.on('pointerup', ()=>{ this.rotation=(this.rotation+60)%360; this.rotDeg.setText(this.rotation+'°'); });

    // Cost info (right of picker)
    this.infoTxt = s.add.text(startX+totalW+10, sh-barH/2, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px', color:C.STONE_S,
    }).setOrigin(0,0.5).setDepth(11);
  }

  _drawMiniHex(cx, cy, r, color, selected, hover=false) {
    const g = this.scene.add.graphics().setDepth(10);
    const pts=[];
    for(let i=0;i<6;i++){const a=(30+60*i)*Math.PI/180;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)*0.60});}
    g.fillStyle(color,1);
    const px=pts.reduce((s,p)=>s+p.x,0)/6, py=pts.reduce((s,p)=>s+p.y,0)/6;
    for(let i=0;i<6;i++){const j=(i+1)%6;g.fillTriangle(px,py,pts[i].x,pts[i].y,pts[j].x,pts[j].y);}
    if(selected){g.lineStyle(2.5,0xffc800,1);g.strokePoints(pts,true);}
    else if(hover){g.lineStyle(1.5,0xffffff,0.5);g.strokePoints(pts,true);}
    this.labels.push(g); // reuse destroy list
  }

  redraw() {
    this.labels.forEach(l=>{ if(l&&l.destroy) l.destroy(); });
    this.labels=[];
    if(this.gfx){this.gfx.destroy();}
    this.zones.clear(true,true);
    this._build();
    if(this.selected){
      const def = TILE_DEFS[this.selected];
      const costStr = Object.entries(def.cost||{}).map(([k,v])=>`${v} ${k}`).join(', ');
      this.infoTxt && this.infoTxt.setText(`Cost: ${costStr}`);
    }
  }

  show(visible) {
    // picker is always drawn; only show/hide based on myTurn
    const alpha = visible ? 1 : 0.4;
    this.gfx && this.gfx.setAlpha(alpha);
  }

  destroy() {
    this.labels.forEach(l=>l&&l.destroy&&l.destroy());
    this.gfx&&this.gfx.destroy();
    this.zones.clear(true,true);
  }
}
