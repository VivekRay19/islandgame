import { C }          from '../ui/Colors.js';
import { makePanel }  from '../ui/Panel.js';
import { makeButton } from '../ui/Button.js';
import { makeTextInput } from '../ui/TextInput.js';
import { api, auth }  from '../api.js';
import { ISLAND_TYPES } from '../config.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key:'LobbyScene' }); }

  create() {
    this.tab         = 0;   // 0=Create 1=Join 2=Browse
    this.selIsland   = 0;
    this.selMode     = 0;   // 0=turn_based 1=real_time
    this.maxPlayers  = 2;
    this.games       = [];
    this._buildUI();
    this._loadGames();
  }

  _buildUI() {
    const sw=this.scale.width, sh=this.scale.height;
    this.add.rectangle(sw/2,sh/2,sw,sh,C.BG_DARK);

    // Floating hex decorations
    this._hexDeco(sw,sh);

    const pw=Math.min(sw*0.72, 680), ph=sh*0.82;
    const px=sw/2-pw/2, py=sh*0.08;
    makePanel(this, px, py, pw, ph, '  🏝  Game Lobby');

    // Player banner
    const p=auth.getPlayer();
    this.add.text(sw/2, py+14, `Welcome, ${p.display_name||p.username}!`, {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.STONE_S,
    }).setOrigin(0.5,0).setDepth(5);

    // Tabs
    const tabW=(pw-20)/3;
    ['Create Game','Join by Code','Browse Games'].forEach((lbl,i)=>{
      this[`_tab${i}`] = makeButton(this, px+10+i*tabW, py+38, tabW-4, 30, lbl,
        i===this.tab?C.GOLD_DARK:C.PANEL_MID, ()=>this._switchTab(i), true, 5);
    });

    this._contentY = py+78;
    this._px=px; this._pw=pw; this._py=py; this._ph=ph;

    // Back button
    makeButton(this, px, py+ph+12, 100, 32, '← Back', C.PANEL_MID,
      ()=>this.scene.start('MenuScene'), true, 5);

    // Status message
    this._msgTxt = this.add.text(px+pw/2, py+ph-16, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px',
      color:C.GOLD_TEXT_S, backgroundColor:'#00000099', padding:{x:6,y:3},
    }).setOrigin(0.5,1).setDepth(6);

    this._tabContents = [];
    this._buildCreate();
    this._buildJoin();
    this._buildBrowse();
    this._switchTab(0);
  }

  _switchTab(idx) {
    this.tab = idx;
    this._tabContents.forEach((c,i)=>c.forEach(o=>o.setVisible(i===idx)));
    ['_tab0','_tab1','_tab2'].forEach((k,i)=>{
      // highlight active tab by alpha
      if(this[k]) this[k].list.find(c=>c.type==='Rectangle')?.setFillStyle(i===idx?C.GOLD_DARK:C.PANEL_MID);
    });
  }

  _buildCreate() {
    const objs=[];
    const s=this, px=this._px, pw=this._pw, cy=this._contentY;

    objs.push(s.add.text(px+20, cy+6, 'Game Mode', {
      fontFamily:'system-ui',fontSize:'13px',color:C.GOLD_TEXT_S
    }).setDepth(6).setVisible(false));
    ['Turn-Based','Real-Time'].forEach((lbl,i)=>{
      const btn=makeButton(s, px+20+i*148, cy+22, 140, 32, lbl,
        i===s.selMode?C.GOLD_DARK:C.PANEL_MID,
        ()=>{ s.selMode=i; s._refreshCreateBtns(); }, true, 6);
      btn.setVisible(false);
      objs.push(btn);
      s[`_modeBtn${i}`]=btn;
    });

    objs.push(s.add.text(px+20, cy+62, 'Your Island', {
      fontFamily:'system-ui',fontSize:'13px',color:C.GOLD_TEXT_S
    }).setDepth(6).setVisible(false));
    const iw=(pw-40)/4;
    ISLAND_TYPES.forEach((isl,i)=>{
      const btn=makeButton(s, px+20+i*iw, cy+78, iw-4, 40, isl.label,
        i===s.selIsland?C.GOLD_DARK:C.PANEL_MID,
        ()=>{ s.selIsland=i; s._refreshIslandBtns(); }, true, 6);
      btn.setVisible(false);
      const hint=s.add.text(px+20+i*iw+iw/2-2, cy+124, isl.hint, {
        fontFamily:'system-ui',fontSize:'10px',color:C.STONE_MID_S,
      }).setOrigin(0.5,0).setDepth(6).setVisible(false);
      objs.push(btn,hint);
      s[`_islBtn${i}`]=btn;
    });

    objs.push(s.add.text(px+20, cy+142, 'Max Players', {
      fontFamily:'system-ui',fontSize:'13px',color:C.GOLD_TEXT_S
    }).setDepth(6).setVisible(false));
    [2,3,4].forEach((n,i)=>{
      const btn=makeButton(s, px+20+i*80, cy+158, 72, 32, String(n),
        n===s.maxPlayers?C.GOLD_DARK:C.PANEL_MID,
        ()=>{ s.maxPlayers=n; s._refreshMaxBtns(); }, true, 6);
      btn.setVisible(false);
      objs.push(btn);
      s[`_maxBtn${i}`]=btn;
    });

    const createBtn = makeButton(s, px+20, cy+202, pw-40, 50, 'CREATE GAME', C.GREEN_BTN, async ()=>{
      createBtn.setVisible(false);
      s._msgTxt.setText('Creating game…');
      try {
        const mode = s.selMode===0?'turn_based':'real_time';
        const isl  = ISLAND_TYPES[s.selIsland].key;
        const data = await api.createGame(mode, isl, s.maxPlayers);
        s._msgTxt.setText(`Game created! Code: ${data.game.game_code}`);
        auth._currentGameId = data.game.id;
        s.scene.start('GameScene', { gameId: data.game.id });
      } catch(e) { s._msgTxt.setText(e.message); createBtn.setVisible(true); }
    }, true, 6);
    createBtn.setVisible(false);
    objs.push(createBtn);
    this._tabContents.push(objs);
  }

  _buildJoin() {
    const objs=[];
    const s=this, px=this._px, pw=this._pw, cy=this._contentY;

    objs.push(s.add.text(px+20, cy+8, 'Enter Game Code (6 characters)', {
      fontFamily:'system-ui',fontSize:'13px',color:C.GOLD_TEXT_S
    }).setDepth(6).setVisible(false));
    const codeInput = makeTextInput(s, px+pw/2, cy+52, pw-40, 'e.g. ABCD12');
    codeInput.setDepth(6).setVisible(false);
    objs.push(codeInput);

    objs.push(s.add.text(px+20, cy+96, 'Your Island', {
      fontFamily:'system-ui',fontSize:'13px',color:C.GOLD_TEXT_S
    }).setDepth(6).setVisible(false));
    const iw=(pw-40)/4;
    ISLAND_TYPES.forEach((isl,i)=>{
      const btn=makeButton(s, px+20+i*iw, cy+112, iw-4, 38, isl.label,
        i===s.selIsland?C.GOLD_DARK:C.PANEL_MID,
        ()=>{ s.selIsland=i; }, true, 6);
      btn.setVisible(false);
      objs.push(btn);
    });

    const joinBtn=makeButton(s, px+20, cy+162, pw-40, 50, 'JOIN GAME', C.GREEN_BTN, async ()=>{
      const code = codeInput.getValue().toUpperCase();
      if (code.length!==6){ s._msgTxt.setText('Code must be 6 characters'); return; }
      s._msgTxt.setText('Looking up game…');
      try {
        // Find game by code from list
        const listData = await api.listGames();
        const game = listData.games.find(g=>g.game_code===code);
        if(!game){ s._msgTxt.setText('Game not found'); return; }
        await api.joinGame(game.id, ISLAND_TYPES[s.selIsland].key);
        s.scene.start('GameScene',{ gameId:game.id });
      } catch(e){ s._msgTxt.setText(e.message); }
    }, true, 6);
    joinBtn.setVisible(false);
    objs.push(joinBtn);
    this._tabContents.push(objs);
  }

  _buildBrowse() {
    const objs=[];
    const s=this, px=this._px, pw=this._pw, cy=this._contentY, ph=this._ph;
    const refreshBtn=makeButton(s, px+pw-120, cy+4, 110, 28, '🔄 Refresh', C.BLUE_BTN,
      ()=>s._loadGames(), true, 6);
    refreshBtn.setVisible(false);
    objs.push(refreshBtn);
    this._browseObjs=objs;
    this._browseStartY=cy+40;
    this._tabContents.push(objs);
  }

  async _loadGames() {
    try {
      const data = await api.listGames();
      this.games = data.games || [];
      this._refreshBrowse();
    } catch(e){ this._msgTxt.setText(e.message); }
  }

  _refreshBrowse() {
    // Remove old game row objects
    (this._gameRows||[]).forEach(o=>o.destroy());
    this._gameRows=[];
    const s=this, px=this._px, pw=this._pw;
    let gy = this._browseStartY;
    if (this.games.length===0){
      const t=s.add.text(px+pw/2, gy+30, 'No open games — create one!', {
        fontFamily:'system-ui',fontSize:'16px',color:C.STONE_MID_S,
      }).setOrigin(0.5,0).setDepth(7).setVisible(this.tab===2);
      this._gameRows.push(t);
      return;
    }
    this.games.slice(0,7).forEach(g=>{
      const bg=s.add.rectangle(px+pw/2-2, gy+24, pw-20, 48, C.PANEL_MID)
        .setDepth(6).setVisible(this.tab===2);
      bg.setStrokeStyle(1,C.PANEL_BORDER);
      const info=s.add.text(px+18, gy+10,
        `[${g.game_code}]  ${g.game_mode.replace('_',' ')}  Round ${g.current_round}/6  ${g.status}`,{
        fontFamily:'system-ui',fontSize:'13px',color:C.WHITE,
      }).setDepth(7).setVisible(this.tab===2);
      const joinBtn=makeButton(s, px+pw-110, gy+8, 90, 32, 'JOIN', C.GREEN_BTN, async()=>{
        try {
          await api.joinGame(g.id, ISLAND_TYPES[s.selIsland].key);
          s.scene.start('GameScene',{gameId:g.id});
        } catch(e){ s._msgTxt.setText(e.message); }
      }, true, 7);
      joinBtn.setVisible(this.tab===2);
      this._gameRows.push(bg,info,joinBtn);
      gy+=54;
    });
  }

  _refreshCreateBtns() {
    [0,1].forEach(i=>{
      const b=this[`_modeBtn${i}`];
      if(b) b.list.find(c=>c.type==='Rectangle')?.setFillStyle(i===this.selMode?C.GOLD_DARK:C.PANEL_MID);
    });
  }
  _refreshIslandBtns() {
    ISLAND_TYPES.forEach((_,i)=>{
      const b=this[`_islBtn${i}`];
      if(b) b.list.find(c=>c.type==='Rectangle')?.setFillStyle(i===this.selIsland?C.GOLD_DARK:C.PANEL_MID);
    });
  }
  _refreshMaxBtns() {
    [2,3,4].forEach((n,i)=>{
      const b=this[`_maxBtn${i}`];
      if(b) b.list.find(c=>c.type==='Rectangle')?.setFillStyle(n===this.maxPlayers?C.GOLD_DARK:C.PANEL_MID);
    });
  }

  _hexDeco(sw,sh) {
    const colors=[0x89c24a,0x1c5e21,0x269ee0,0x8a2bb0,0xd98c2e,0x7055ab,0xc75910,0x706658];
    colors.forEach((col,i)=>{
      const gfx=this.add.graphics().setDepth(1);
      const cx=sw*0.06+i*(sw*0.13), cy=sh*0.06;
      const pts=[];
      for(let j=0;j<6;j++){const a=(30+60*j)*Math.PI/180;pts.push({x:cx+24*Math.cos(a),y:cy+24*Math.sin(a)*0.6});}
      gfx.fillStyle(col,0.6);
      const px2=pts.reduce((s,p)=>s+p.x,0)/6,py2=pts.reduce((s,p)=>s+p.y,0)/6;
      for(let j=0;j<6;j++){const k=(j+1)%6;gfx.fillTriangle(px2,py2,pts[j].x,pts[j].y,pts[k].x,pts[k].y);}
    });
  }
}
