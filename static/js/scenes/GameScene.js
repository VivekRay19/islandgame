import { C }            from '../ui/Colors.js';
import { makePanel }    from '../ui/Panel.js';
import { makeButton }   from '../ui/Button.js';
import { HexBoard }     from '../game/HexBoard.js';
import { HUD }          from '../game/HUD.js';
import { EventPanel }   from '../game/EventPanel.js';
import { TilePicker }   from '../game/TilePicker.js';
import { api, auth }    from '../api.js';
import { TILE_DEFS }    from '../config.js';

export class GameScene extends Phaser.Scene {
  constructor() { super({ key:'GameScene' }); }

  init(data) { this.gameId = data.gameId; }

  create() {
    const sw=this.scale.width, sh=this.scale.height;
    this.state   = null;
    this.tasks   = [];
    this.traders = [];
    this.hoveredSlot = null;
    this.selectedTileId = null;
    this.selectedRotation = 0;
    this.msgTimer = 0;

    // ── Background ──────────────────────────────────────────────────────────
    for(let i=0;i<20;i++){
      const mix=i/20;
      this.add.rectangle(sw/2,i*(sh/20),sw,sh/20+1,
        Phaser.Display.Color.GetColor(
          Math.floor(0x0e+mix*0x10),Math.floor(0x1f+mix*0x28),Math.floor(0x09+mix*0x3a)));
    }
    this.add.rectangle(sw/2,sh*0.76,sw,sh*0.50,C.GRASS_DARK);
    this.add.rectangle(sw/2,sh*0.52,sw,4,C.GRASS_LIGHT);

    // ── HUD (top bar) ───────────────────────────────────────────────────────
    this.hud = new HUD(this);

    // ── Hex board (left area) ───────────────────────────────────────────────
    this.board = new HexBoard(this, sw*0.06, sh*0.44, 40);
    this.board.onSlotClick = (q,r) => this._placeTile(q,r);

    // Mouse move for hover
    this.input.on('pointermove', ptr=>{
      if(!this.selectedTileId){ this.hoveredSlot=null; return; }
      const slots = this.board.slots;
      let found=null;
      for(const [sq,sr] of slots){
        const [cx,cy]=this.board.hexToScreen(sq,sr);
        if(Math.abs(ptr.x-cx)<this.board.r*0.88 && Math.abs(ptr.y-cy)<this.board.r*0.6){
          found=[sq,sr]; break;
        }
      }
      this.hoveredSlot=found;
    });

    // ── Right panel ─────────────────────────────────────────────────────────
    this.rpX=sw*0.67; this.rpW=sw*0.30;
    this._buildRightPanel();

    // ── Event panel ─────────────────────────────────────────────────────────
    this.eventPanel = new EventPanel(this, this.rpX, 148,
      this.rpW,
      (action, evId) => this._respondEvent(action, evId),
      ()           => this._respondEvent('ignore', null)
    );

    // ── Tile picker (bottom) ─────────────────────────────────────────────────
    this.picker = new TilePicker(this, (tileId)=>{
      this.selectedTileId = tileId;
      this._renderBoard();
    });

    // ── Overlay containers (Trade, Tasks) ────────────────────────────────────
    this._tradeOverlay = null;
    this._taskOverlay  = null;

    // ── Floating message ─────────────────────────────────────────────────────
    this._msgBg  = this.add.rectangle(sw/2, sh*0.48, 440, 38, 0x000000, 0).setDepth(40);
    this._msgTxt = this.add.text(sw/2, sh*0.48, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px', color:C.GOLD_TEXT_S,
    }).setOrigin(0.5,0.5).setDepth(41);

    // ── Start polling ────────────────────────────────────────────────────────
    this._pollState();
    this.time.addEvent({ delay:2000, callback:this._pollState, callbackScope:this, loop:true });
  }

  // ── State polling ───────────────────────────────────────────────────────────
  async _pollState() {
    try {
      const data = await api.getState(this.gameId);
      this.state   = data.state;
      this.tasks   = data.available_tasks || [];
      this.traders = data.traders || [];
      this._applyState();
    } catch(e) { this._showMsg('⚠ ' + e.message, 3000); }
  }

  _applyState() {
    if (!this.state) return;
    const myId     = auth.getPlayer().id;
    const myIsland = this.state.islands.find(i=>i.player_id===myId);
    if (!myIsland) return;

    const isMyTurn = this.state.current_player_id === myId;

    // Update HUD
    const pname = auth.getPlayer().display_name || auth.getPlayer().username;
    this.hud.update(myIsland, this.state.round, 6, pname);

    // Update right panel turn indicator
    this._turnTxt.setText(isMyTurn ? 'YOUR TURN' : 'Waiting…');
    this._turnTxt.setColor(isMyTurn ? C.GREEN_S : C.STONE_MID_S);
    this._roundTxt.setText(`Round ${this.state.round}/6`);
    const score = myIsland.task_score + myIsland.event_score;
    this._scoreTxt.setText(`Score: ${score}`);

    // Event panel
    if (myIsland.active_event) {
      this.eventPanel.show(myIsland.active_event, isMyTurn);
    } else {
      this.eventPanel.hide();
    }

    // Picker only active on my turn and no active event
    this.picker.show(isMyTurn && !myIsland.active_event);

    // Re-render board
    this._renderBoard();

    // Action log last entry
    if (this.state.action_log?.length) {
      const last = this.state.action_log[this.state.action_log.length-1];
      if (last !== this._lastLog) { this._showMsg(last, 2500); this._lastLog=last; }
    }

    // Game over
    if (this.state.game_over) {
      this.time.removeAllEvents();
      this.scene.start('ResultsScene', { state: this.state });
    }
  }

  _renderBoard() {
    const myIsland = this._myIsland();
    this.board.render(myIsland, this.selectedTileId, this.hoveredSlot);
  }

  _myIsland() {
    if (!this.state) return null;
    const myId = auth.getPlayer().id;
    return this.state.islands.find(i=>i.player_id===myId);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async _placeTile(q,r) {
    if (!this.selectedTileId) return;
    try {
      await api.placeTile(this.gameId, q, r, this.selectedTileId, this.selectedRotation);
      this.selectedTileId = null;
      await this._pollState();
    } catch(e) { this._showMsg('⚠ '+e.message, 3000); }
  }

  async _respondEvent(action, evId) {
    const island = this._myIsland();
    if (!island?.active_event) return;
    const eventId = evId || island.active_event.event_id;
    const needsWater = (eventId==='fire_event'||eventId==='drought');
    try {
      await api.respondEvent(this.gameId, action, needsWater?2:null);
      await this._pollState();
    } catch(e) { this._showMsg('⚠ '+e.message, 3000); }
  }

  async _endTurn() {
    try {
      await api.endTurn(this.gameId);
      this.selectedTileId = null;
      await this._pollState();
    } catch(e) { this._showMsg('⚠ '+e.message, 3000); }
  }

  // ── Right panel ─────────────────────────────────────────────────────────────
  _buildRightPanel() {
    const s=this, rx=this.rpX, rw=this.rpW;

    // Turn card
    makePanel(s, rx, 62, rw, 80, null).setDepth(11);
    this._turnTxt  = s.add.text(rx+rw/2, 78, 'Loading…', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'18px',
      color:C.STONE_S, fontStyle:'bold',
    }).setOrigin(0.5,0).setDepth(12);
    this._roundTxt = s.add.text(rx+rw/2, 100, 'Round 1/6', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.GOLD_TEXT_S,
    }).setOrigin(0.5,0).setDepth(12);
    this._scoreTxt = s.add.text(rx+rw/2, 118, 'Score: 0', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'12px', color:C.WHITE,
    }).setOrigin(0.5,0).setDepth(12);

    // Action buttons (below event panel — will render at fixed positions)
    const abY = 288;
    makeButton(s, rx+4, abY,      rw-8, 42, '⚖  HAAT TRADE', C.BLUE_BTN,  ()=>this._showTrade(),      true, 12);
    makeButton(s, rx+4, abY+50,   rw-8, 42, '📜  TASKS',      C.PANEL_MID, ()=>this._showTasks(),      true, 12);
    makeButton(s, rx+4, abY+100,  rw-8, 46, '⏩  END TURN',   C.RED_BTN,   ()=>this._endTurn(),        true, 12);
    makeButton(s, rx+4, abY+154,  rw-8, 32, '📖  Rules',      C.PANEL_MID, ()=>this._showRulesOverlay(),true, 12);

    const halfW=(rw-12)/2;
    makeButton(s, rx+4,         abY+194, halfW, 28, '🚪 Leave',   C.RED_BTN,   ()=>this.scene.start('LobbyScene'), true, 12);
    makeButton(s, rx+6+halfW,   abY+194, halfW, 28, '🔄 Refresh', C.BLUE_BTN,  ()=>this._pollState(),              true, 12);

    // Score of other players (compact)
    this._othersY = abY + 232;
  }

  // ── Trade overlay ────────────────────────────────────────────────────────────
  _showTrade() {
    if (this._tradeOverlay) return;
    const sw=this.scale.width, sh=this.scale.height;
    const pw=580, ph=340, ox=sw/2-pw/2, oy=sh/2-ph/2;
    const overlay = this.add.container(0,0).setDepth(30);
    const panel = makePanel(this, ox, oy, pw, ph, '  ⚖  Haat Traders').setDepth(30);
    overlay.add(panel);

    const island = this._myIsland();
    this.traders.slice(0,5).forEach((t,i)=>{
      const ty=oy+46+i*52;
      const rowBg=this.add.rectangle(ox+pw/2-2,ty+24,pw-20,48,C.PANEL_MID).setDepth(31);
      rowBg.setStrokeStyle(1,C.PANEL_BORDER);
      overlay.add(rowBg);
      const info=this.add.text(ox+18, ty+14,
        `${t.avatar||'?'} ${t.name}  →  give ${t.requested_qty} ${t.requested_resource} → get ${t.offered_qty} ${t.offered_resource}`,
        {fontFamily:'system-ui',fontSize:'13px',color:C.WHITE}).setDepth(32);
      overlay.add(info);
      const sub=this.add.text(ox+18,ty+34,`from ${t.island_name}`,
        {fontFamily:'system-ui',fontSize:'11px',color:C.STONE_MID_S}).setDepth(32);
      overlay.add(sub);

      const canTrade = island && island.resources[t.requested_resource]>=(t.requested_qty||1)
        && island.trades_this_round < 2;
      const tBtn=makeButton(this,ox+pw-110,ty+8,90,32,'TRADE',
        canTrade?C.GREEN_BTN:C.DISABLED, async()=>{
          try {
            await api.trade(this.gameId, t.id);
            this._closeOverlay('_tradeOverlay');
            await this._pollState();
          } catch(e){ this._showMsg('⚠ '+e.message,3000); }
        }, canTrade, 32);
      overlay.add(tBtn);
    });

    makeButton(this,ox+pw/2-55,oy+ph-46,110,34,'Close',C.RED_BTN,
      ()=>this._closeOverlay('_tradeOverlay'),true,32);
    this._tradeOverlay = overlay;
  }

  // ── Tasks overlay ────────────────────────────────────────────────────────────
  _showTasks() {
    if (this._taskOverlay) return;
    const sw=this.scale.width, sh=this.scale.height;
    const pw=580, ph=340, ox=sw/2-pw/2, oy=sh/2-ph/2;
    const overlay = this.add.container(0,0).setDepth(30);
    const panel=makePanel(this,ox,oy,pw,ph,'  📜  Development Tasks').setDepth(30);
    overlay.add(panel);

    const island=this._myIsland();
    if (!this.tasks.length) {
      overlay.add(this.add.text(ox+pw/2,oy+ph/2,'No tasks available this round.',{
        fontFamily:'system-ui',fontSize:'15px',color:C.STONE_S,
      }).setOrigin(0.5,0.5).setDepth(31));
    }
    this.tasks.slice(0,5).forEach((t,i)=>{
      const ty=oy+46+i*52;
      const bg=this.add.rectangle(ox+pw/2-2,ty+24,pw-20,48,C.PANEL_MID).setDepth(31);
      bg.setStrokeStyle(1,C.PANEL_BORDER); overlay.add(bg);
      const done=island&&island.completed_tasks.includes(t.id);
      const costStr=t.cost?Object.entries(t.cost).map(([k,v])=>`${v} ${k}`).join(', '):'';
      overlay.add(this.add.text(ox+18,ty+12,`${t.name} — ${t.points} pts`,
        {fontFamily:'system-ui',fontSize:'14px',color:done?C.STONE_MID_S:C.WHITE,fontStyle:done?'':''}).setDepth(32));
      overlay.add(this.add.text(ox+18,ty+32,`Cost: ${costStr}`,
        {fontFamily:'system-ui',fontSize:'11px',color:C.STONE_MID_S}).setDepth(32));
      if (done) {
        overlay.add(this.add.text(ox+pw-110,ty+24,'✅ DONE',
          {fontFamily:'system-ui',fontSize:'13px',color:C.GREEN_S}).setOrigin(0.5,0.5).setDepth(32));
      } else {
        const buildBtn=makeButton(this,ox+pw-110,ty+8,90,32,'BUILD',C.GREEN_BTN, async()=>{
          try{
            await api.completeTask(this.gameId,t.id);
            this._closeOverlay('_taskOverlay');
            await this._pollState();
          }catch(e){this._showMsg('⚠ '+e.message,3000);}
        },true,32);
        overlay.add(buildBtn);
      }
    });

    makeButton(this,ox+pw/2-55,oy+ph-46,110,34,'Close',C.RED_BTN,
      ()=>this._closeOverlay('_taskOverlay'),true,32);
    this._taskOverlay=overlay;
  }

  _showRulesOverlay() {
    const sw=this.scale.width, sh=this.scale.height;
    const pw=600,ph=360,ox=sw/2-pw/2,oy=sh/2-ph/2;
    const overlay=this.add.container(0,0).setDepth(30);
    overlay.add(makePanel(this,ox,oy,pw,ph,'  📖  Rules').setDepth(30));
    const rules=['6 Rounds, 3 Levels (L1: rounds 1-2, L2: 3-4, L3: 5-6).',
      'Turn order: Event → Build Tile → Trade → Complete Task → End Turn.',
      'Tiles must be placed adjacent to your island (hex adjacency rule).',
      'Matching edges with neighbours = +15 pts each. All match? +25 bonus!',
      'Resources are produced each round from your tiles (1 per tile).',
      'Max 2 Haat Trades per round. Fire/Drought costs 2 Water to extinguish.',
      'Festival & Harvest are positive — always respond to collect resources.',
      'Cultural Harmony / 10 = bonus points added to final score.',
      'Highest total (Tasks + Events + Harmony Bonus) wins the island!'];
    rules.forEach((r,i)=>overlay.add(this.add.text(ox+20,oy+46+i*32,r,{
      fontFamily:'system-ui',fontSize:'13px',color:C.STONE_S,wordWrap:{width:pw-40},
    }).setDepth(31)));
    makeButton(this,ox+pw/2-60,oy+ph-46,120,34,'Got it!',C.GREEN_BTN,
      ()=>overlay.destroy(),true,32);
    overlay.setDepth(30);
  }

  _closeOverlay(key) {
    if (this[key]) { this[key].destroy(); this[key]=null; }
  }

  // ── Message toast ────────────────────────────────────────────────────────────
  _showMsg(txt, ms=2500) {
    this._msgTxt.setText(txt);
    this._msgBg.setFillStyle(0x000000,0.72);
    this.tweens.killTweensOf(this._msgTxt);
    this.tweens.killTweensOf(this._msgBg);
    this._msgTxt.setAlpha(1);
    this._msgBg.setAlpha(1);
    this.time.delayedCall(ms, ()=>{
      this.tweens.add({ targets:[this._msgTxt,this._msgBg], alpha:0, duration:500 });
    });
  }

  update() {
    // Board hover repaint when selected tile changes
    if (this.selectedTileId && this.hoveredSlot !== this._lastHover) {
      this._lastHover = this.hoveredSlot;
      this._renderBoard();
    }
  }
}
