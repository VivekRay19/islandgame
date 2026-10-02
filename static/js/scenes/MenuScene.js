import { C }          from '../ui/Colors.js';
import { makeButton } from '../ui/Button.js';
import { auth }       from '../api.js';
import { TILE_DEFS, TILE_ORDER } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key:'MenuScene' }); }

  create() {
    const sw = this.scale.width, sh = this.scale.height;

    // Sky gradient
    for (let i=0;i<24;i++){
      const mix=i/24;
      const r=Math.floor((0x0e+mix*0x14));
      const g=Math.floor((0x1f+mix*0x3b));
      const b=Math.floor((0x09+mix*0x22));
      this.add.rectangle(sw/2, i*(sh/24)+sh/48, sw, sh/24+1,
        Phaser.Display.Color.GetColor(r,g,b));
    }
    // Grass strip
    this.add.rectangle(sw/2, sh*0.75, sw, sh*0.5, 0x1a4010);
    this.add.rectangle(sw/2, sh*0.55, sw, 4, 0x2d6b1a);

    // Animated floating hex tiles
    const hexKeys = TILE_ORDER.slice(0,6);
    this.floaters=[];
    hexKeys.forEach((tid,i)=>{
      const def = TILE_DEFS[tid];
      const gfx = this.add.graphics();
      const ox  = sw*0.08 + i*(sw*0.16);
      const oy  = sh*0.42;
      this.floaters.push({ gfx, ox, oy, color:def.color, phase:i*1.1 });
      this._drawFloatHex(gfx, ox, oy, 36, def.color);
    });

    // Title plate
    const ty = sh*0.18;
    this.add.rectangle(sw/2, ty, 540, 78, 0x000000, 0.55);
    this.add.rectangle(sw/2, ty, 540, 78).setStrokeStyle(2.5,C.GOLD_DARK,1);
    this.titleTxt = this.add.text(sw/2, ty-18, 'CULTURAL ISLANDS', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'50px',
      color:C.GOLD_S, fontStyle:'bold',
      shadow:{x:2,y:3,color:'#4d3300',blur:0,fill:true},
    }).setOrigin(0.5,0.5);
    this.add.text(sw/2, ty+20, 'Island Development & Survival', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'17px', color:C.STONE_S,
    }).setOrigin(0.5,0.5);

    // Buttons
    const bx = sw/2 - 135, bw = 270, bh = 50;
    makeButton(this, bx, sh*0.50,     bw, bh, '▶  PLAY',         C.GREEN_BTN, ()=>this._play());
    makeButton(this, bx, sh*0.50+62,  bw, bh, '🏆  LEADERBOARD', C.BLUE_BTN,  ()=>this.scene.start('LeaderboardScene'));
    makeButton(this, bx, sh*0.50+124, bw, bh, '📖  RULES',       C.PANEL_MID, ()=>this._showRules());

    // If already logged in, show who's playing
    if (auth.isLoggedIn()) {
      const p = auth.getPlayer();
      this.add.text(sw-12, 12, `👤 ${p.display_name||p.username}`, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'14px', color:C.GOLD_TEXT_S,
      }).setOrigin(1,0);
    }

    // Version
    this.add.text(10, sh-14, 'v0.1.0 — LAN Edition  |  192.168.8.10:8067', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px', color:C.STONE_MID_S,
    }).setOrigin(0,1);

    this.time.addEvent({ delay:50, callback:this._pulse, callbackScope:this, loop:true });
    this._t = 0;
  }

  _drawFloatHex(gfx, cx, cy, r, color) {
    gfx.clear();
    const pts=[];
    for(let i=0;i<6;i++){const a=(30+60*i)*Math.PI/180;pts.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)*0.6});}
    gfx.fillStyle(color,1);
    const px=pts.reduce((s,p)=>s+p.x,0)/6,py=pts.reduce((s,p)=>s+p.y,0)/6;
    for(let i=0;i<6;i++){const j=(i+1)%6;gfx.fillTriangle(px,py,pts[i].x,pts[i].y,pts[j].x,pts[j].y);}
    // Wall depth
    gfx.fillStyle(this._darker(color),1);
    for(let i=2;i<=4;i++){const j=(i+1)%6;
      const d=10;
      gfx.fillTriangle(pts[i].x,pts[i].y,pts[j].x,pts[j].y,pts[j].x,pts[j].y+d);
      gfx.fillTriangle(pts[i].x,pts[i].y,pts[j].x,pts[j].y+d,pts[i].x,pts[i].y+d);}
  }

  _darker(hex) { return ((hex&0xfefefe)>>1); }

  _pulse() {
    this._t = (this._t||0) + 0.016;
    this.floaters.forEach(f=>{
      const y = f.oy + Math.sin(this._t*0.6 + f.phase)*12;
      this._drawFloatHex(f.gfx, f.ox, y, 36, f.color);
    });
    // Pulse title gold
    const pulse = 0.84 + 0.16*Math.sin(this._t*2);
    const r=Math.floor(255*pulse), g=Math.floor(200*pulse);
    this.titleTxt.setColor(`rgb(${r},${g},0)`);
  }

  _play() {
    if (auth.isLoggedIn()) this.scene.start('LobbyScene');
    else this.scene.start('LoginScene');
  }

  _showRules() {
    const sw=this.scale.width, sh=this.scale.height;
    const pw=620, ph=400;
    const overlay = this.add.container(sw/2, sh/2).setDepth(30);
    overlay.add(this.add.rectangle(0,0,sw,sh,0x000000,0.6));
    const bg=this.add.rectangle(0,0,pw,ph,0x1e0f06);bg.setStrokeStyle(2,0x8c591a);
    overlay.add(bg);
    const rules=[
      '6 Rounds — 3 Levels (2 rounds each).',
      'Turn: Respond to Event → Build Tile → Haat Trade → Task → End Turn.',
      'Tiles must connect (hex adjacency). Matching edges = bonus points (+15 each).',
      '2+ edges matched: +25 bonus!   Resources produced each turn by your tiles.',
      'Max 2 Haat Trades per round. Fire/Drought needs 2 Water to extinguish.',
      'Festival & Harvest events give free resources — always respond!',
      'Cultural Harmony bonus = harmony/10 added to final score.',
      'Highest (Tasks + Events + Harmony bonus) wins!',
    ];
    overlay.add(this.add.text(0,-ph/2+14,'📖  Game Rules',{
      fontFamily:'system-ui',fontSize:'20px',color:'#ffe46b',fontStyle:'bold',
    }).setOrigin(0.5,0));
    rules.forEach((r,i)=>overlay.add(this.add.text(-pw/2+20,-ph/2+52+i*38,r,{
      fontFamily:'system-ui',fontSize:'14px',color:'#c7bfab',wordWrap:{width:pw-40},
    })));
    const btn=this.add.text(0,ph/2-22,'✕  Close',{
      fontFamily:'system-ui',fontSize:'16px',color:'#ffc800',fontStyle:'bold',
    }).setOrigin(0.5,1).setInteractive({useHandCursor:true});
    btn.on('pointerup',()=>overlay.destroy());
    overlay.add(btn);
  }
}
