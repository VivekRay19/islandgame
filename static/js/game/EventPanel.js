// ─── Active event panel (right side) ─────────────────────────────────────────
import { C }          from '../ui/Colors.js';
import { makePanel }  from '../ui/Panel.js';
import { makeButton } from '../ui/Button.js';

const EVENT_META = {
  fire_event:     { icon:'🔥', name:'Fire!',       action:'extinguish', cost:'Costs 2 Water' },
  festival_event: { icon:'🎉', name:'Festival!',   action:'celebrate',  cost:'Free!'         },
  harvest_bounty: { icon:'🌾', name:'Harvest Day!',action:'harvest',    cost:'Free!'         },
  drought:        { icon:'☀️', name:'Drought!',     action:'resolve',    cost:'Costs 2 Water' },
  storm:          { icon:'⛈️', name:'Storm!',        action:'resolve',    cost:'Costs 1 Stone' },
};

export class EventPanel {
  constructor(scene, x, y, w, onResolve, onIgnore) {
    this.scene     = scene;
    this.x = x; this.y = y; this.w = w;
    this.onResolve = onResolve;
    this.onIgnore  = onIgnore;
    this.container = null;
    this.visible   = false;
  }

  show(event, isMyTurn) {
    this.hide();
    const h   = 124;
    const s   = this.scene;
    const meta= EVENT_META[event.event_id] || { icon:'⚠️', name:'Event!', action:'resolve', cost:'' };

    this.container = s.add.container(0,0).setDepth(15);

    const panel = makePanel(s, this.x, this.y, this.w, h).setDepth(15);
    this.container.add(panel);

    // Red title bar
    const bar = s.add.rectangle(this.x + this.w/2, this.y+16, this.w, 30, 0xbf1a10, 0.9).setDepth(16);
    const barTxt = s.add.text(this.x + this.w/2, this.y+7, '⚠  ACTIVE EVENT', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.WHITE, fontStyle:'bold',
    }).setOrigin(0.5,0).setDepth(17);
    this.container.add([bar, barTxt]);

    const evTxt = s.add.text(this.x + this.w/2, this.y+42, `${meta.icon}  ${meta.name}`, {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px', color:C.GOLD_TEXT_S, fontStyle:'bold',
    }).setOrigin(0.5,0).setDepth(16);
    const costTxt = s.add.text(this.x + this.w/2, this.y+63, meta.cost, {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'12px', color:C.STONE_S,
    }).setOrigin(0.5,0).setDepth(16);
    this.container.add([evTxt, costTxt]);

    if (isMyTurn) {
      const resBtn = makeButton(s, this.x+4, this.y+82, this.w-8, 34,
        'RESOLVE EVENT', C.GREEN_BTN,
        ()=>this.onResolve(meta.action, event.event_id), true, 16);
      this.container.add(resBtn);
    }
    this.visible = true;
  }

  hide() {
    if (this.container) { this.container.destroy(); this.container = null; }
    this.visible = false;
  }

  get height() { return this.visible ? 132 : 0; }
}
