// ─── Top resource HUD bar ────────────────────────────────────────────────────
import { RES } from '../config.js';
import { C }   from '../ui/Colors.js';

const RES_ORDER = ['grain','fibre','wood','stone','clay','water','music','ore'];

export class HUD {
  constructor(scene) {
    this.scene    = scene;
    this.pills    = {};   // { resKey: { bg, label } }
    this.roundTxt = null;
    this.harmonyBar = null;
    this.harmonyBg  = null;
    this.eventAlert = null;
    this.playerTxt  = null;

    this._build();
  }

  _build() {
    const s = this.scene;
    const sw = s.scale.width;

    // HUD background strip
    s.add.rectangle(sw/2, 27, sw, 56, 0x180a04, 0.97).setDepth(10);
    s.add.rectangle(sw/2, 55, sw, 2, C.GOLD_DARK, 1).setDepth(10);

    // Resource pills
    const pillW = 72, pillH = 38, gap = 4;
    RES_ORDER.forEach((key, i) => {
      const x = 6 + i*(pillW+gap);
      const r = RES[key];
      // bg rect
      const bg = s.add.rectangle(x+pillW/2, 27, pillW, pillH, C.PANEL_MID).setDepth(10);
      s.add.rectangle(x+pillW/2, 27, pillW, pillH).setStrokeStyle(1.2, r.color, 1).setDepth(10);
      // colour dot
      s.add.circle(x+14, 27, 5, r.color).setDepth(11);
      // count label
      const lbl = s.add.text(x+22, 20, `${r.label} 0`, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'12px',
        color:C.WHITE, fontStyle:'bold',
      }).setDepth(11);
      this.pills[key] = lbl;
    });

    // Round + Harmony (centre)
    const cx = sw/2;
    s.add.rectangle(cx, 27, 180, 50, 0x000000, 0.55).setDepth(10);
    s.add.rectangle(cx, 27, 180, 50).setStrokeStyle(1.2, C.GOLD_DARK, 1).setDepth(10);
    this.roundTxt = s.add.text(cx, 14, 'Round 1 / 6', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px',
      color:C.GOLD_TEXT_S, fontStyle:'bold',
    }).setOrigin(0.5,0).setDepth(11);
    this.harmonyBg  = s.add.rectangle(cx, 36, 160, 10, 0x000000, 0.5).setDepth(11);
    this.harmonyBar = s.add.rectangle(cx-80, 36, 0, 10, 0x8b5cf6, 1).setDepth(12).setOrigin(0,0.5);
    this.harmonyTxt = s.add.text(cx, 47, 'Harmony 50', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px', color:C.STONE_S,
    }).setOrigin(0.5,0).setDepth(12);

    // Player name + event alert (right side)
    this.playerTxt = s.add.text(sw-230, 10, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'14px',
      color:C.GOLD_TEXT_S, fontStyle:'bold',
    }).setDepth(11);
    this.eventAlert = s.add.text(sw-230, 30, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'12px',
      color:C.WHITE, backgroundColor:'#bf1a10cc', padding:{x:5,y:2},
    }).setDepth(11);
  }

  update(island, round, maxRound, playerName) {
    if (!island) return;
    const r = island.resources;
    for (const key of RES_ORDER) {
      if (this.pills[key]) this.pills[key].setText(`${RES[key].label} ${r[key]||0}`);
    }
    this.roundTxt.setText(`Round ${round} / ${maxRound}`);
    const harmony = island.cultural_harmony || 0;
    this.harmonyBar.setDisplaySize(Math.max(0,(harmony/100)*160), 10);
    this.harmonyTxt.setText(`Harmony ${harmony}`);
    this.playerTxt.setText(playerName);

    if (island.active_event) {
      const labels = { fire_event:'🔥 FIRE — Use 2 Water', festival_event:'🎉 FESTIVAL!',
        harvest_bounty:'🌾 HARVEST!', drought:'☀️ DROUGHT — Use 2 Water', storm:'⛈️ STORM!' };
      this.eventAlert.setText(labels[island.active_event.event_id] || '⚠ EVENT!');
    } else {
      this.eventAlert.setText('');
    }
  }
}
