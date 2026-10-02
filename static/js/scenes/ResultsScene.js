import { C }          from '../ui/Colors.js';
import { makePanel }  from '../ui/Panel.js';
import { makeButton } from '../ui/Button.js';
import { auth }       from '../api.js';

export class ResultsScene extends Phaser.Scene {
  constructor() { super({ key:'ResultsScene' }); }
  init(data) { this.state = data.state; }

  create() {
    const sw=this.scale.width, sh=this.scale.height, s=this;
    s.add.rectangle(sw/2,sh/2,sw,sh,C.BG_DARK);

    const myId    = auth.getPlayer().id;
    const isWinner= this.state.winner_id===myId;

    // Glow
    const glowColor = isWinner ? 0xffc800 : 0x2a2a55;
    s.add.circle(sw/2,sh/2,sh*0.6, glowColor, 0.07);

    // Title
    const titleTxt = isWinner ? '🏆  VICTORY!' : 'Game Over';
    const titleCol = isWinner ? C.GOLD_S : C.STONE_S;
    s.add.text(sw/2, sh*0.10, titleTxt, {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'52px',
      color:titleCol, fontStyle:'bold',
      shadow:{x:2,y:3,color:'#000',blur:0,fill:true},
    }).setOrigin(0.5,0);
    s.add.text(sw/2, sh*0.20, 'Final Scores — Cultural Islands', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'17px', color:C.STONE_S,
    }).setOrigin(0.5,0);

    // Sorted scores
    const sorted = [...this.state.islands]
      .sort((a,b)=>(b.task_score+b.event_score+Math.floor(b.cultural_harmony/10))
                  -(a.task_score+a.event_score+Math.floor(a.cultural_harmony/10)));

    const pw=Math.min(sw*0.74,640), ph=54+sorted.length*70;
    const px=sw/2-pw/2, py=sh*0.27;
    makePanel(s, px, py, pw, ph);
    const medals=['🥇','🥈','🥉','  '];

    sorted.forEach((isl,i)=>{
      const score=isl.task_score+isl.event_score+Math.floor(isl.cultural_harmony/10);
      const isMe = isl.player_id===myId;
      const isWin= isl.player_id===this.state.winner_id;
      const rowY = py+14+i*70;

      s.add.rectangle(px+pw/2-2,rowY+32,pw-18,62,isMe?0x3a2008:0x000000,isMe?0.70:0.30);
      s.add.text(px+18, rowY+18, medals[Math.min(i,3)], {fontSize:'20px'});
      s.add.circle(px+58, rowY+34, 12, this._islColor(isl.island_type));
      s.add.text(px+78, rowY+20, isMe?`YOU (${isl.island_type})`:`Island: ${isl.island_type}`, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px',
        color:isMe?C.GOLD_TEXT_S:C.WHITE, fontStyle:'bold',
      });
      s.add.text(px+78, rowY+44, `Tasks: ${isl.task_score}  Events: ${isl.event_score}  Harmony: ${Math.floor(isl.cultural_harmony/10)}  →  TOTAL: ${score}`, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'12px', color:C.STONE_S,
      });
      if(isWin) s.add.text(px+pw-14, rowY+32, 'WINNER', {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px',
        color:C.GOLD_S, fontStyle:'bold',
      }).setOrigin(1,0.5);
    });

    // Log panel
    const logY=py+ph+16;
    makePanel(s, px, logY, pw, 100, '  Action Log (last 5)');
    const log=(this.state.action_log||[]).slice(-5).reverse();
    log.forEach((entry,i)=>{
      s.add.text(px+14, logY+38+i*14, entry, {
        fontFamily:'system-ui,Arial,sans-serif', fontSize:'11px', color:C.STONE_S,
        wordWrap:{width:pw-28},
      });
    });

    // Buttons
    const btnY=logY+116;
    makeButton(s, px,         btnY, pw/2-6, 48, '🏠  Main Menu',  C.PANEL_MID, ()=>s.scene.start('MenuScene'));
    makeButton(s, px+pw/2+6,  btnY, pw/2-6, 48, '▶  Play Again',  C.GREEN_BTN, ()=>s.scene.start('LobbyScene'));
  }

  _islColor(t) {
    return {farming:0x89c24a,forest:0x1c5e21,coastal:0x269ee0,mountain:0x706658}[t]||0x807866;
  }
}
