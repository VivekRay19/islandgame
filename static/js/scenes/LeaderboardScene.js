import { C }          from '../ui/Colors.js';
import { makePanel }  from '../ui/Panel.js';
import { makeButton } from '../ui/Button.js';
import { api }        from '../api.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super({ key:'LeaderboardScene' }); }

  async create() {
    const sw=this.scale.width, sh=this.scale.height;
    this.add.rectangle(sw/2,sh/2,sw,sh,C.BG_DARK);

    const pw=Math.min(sw*0.72,640), ph=sh-100;
    const px=sw/2-pw/2, py=44;
    makePanel(this, px, py, pw, ph, '  🏆  Leaderboard — Current Season');
    makeButton(this, px, py+ph+12, 110, 34, '← Back', C.PANEL_MID, ()=>this.scene.start('MenuScene'));

    const loadTxt=this.add.text(px+pw/2, py+ph/2, 'Loading…', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px', color:C.STONE_S,
    }).setOrigin(0.5,0.5);

    try {
      const data = await api.leaderboard();
      loadTxt.destroy();
      const board = data.leaderboard||[];
      if (!board.length) {
        this.add.text(px+pw/2, py+ph/2, 'No rankings yet. Play some games!', {
          fontFamily:'system-ui,Arial,sans-serif', fontSize:'16px', color:C.STONE_MID_S,
        }).setOrigin(0.5,0.5);
        return;
      }
      const medals=['🥇','🥈','🥉'];
      board.slice(0,14).forEach((entry,i)=>{
        const ey=py+46+i*44;
        if(ey+42>py+ph-16) return;
        this.add.rectangle(px+pw/2-2,ey+22,pw-18,40,C.PANEL_MID,0.7)
          .setStrokeStyle(1,C.PANEL_BORDER);
        const medal=medals[i]||`${i+1}.`;
        this.add.text(px+14, ey+12, `${medal}  ${entry.username||'?'}`, {
          fontFamily:'system-ui,Arial,sans-serif', fontSize:'15px',
          color:i<3?C.GOLD_TEXT_S:C.WHITE, fontStyle:'bold',
        });
        this.add.text(px+pw-14, ey+12,
          `Score: ${entry.score||0}   Wins: ${entry.wins||0}   Games: ${entry.games_played||0}`, {
          fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.STONE_S,
        }).setOrigin(1,0);
      });
    } catch(e) {
      loadTxt.setText('⚠ Could not load leaderboard:\n'+e.message);
    }
  }
}
