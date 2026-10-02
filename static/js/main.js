// ─── Phaser 3 boot — registers all scenes and starts the game ─────────────────
import { BootScene }        from './scenes/BootScene.js';
import { MenuScene }        from './scenes/MenuScene.js';
import { LoginScene }       from './scenes/LoginScene.js';
import { LobbyScene }       from './scenes/LobbyScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { ResultsScene }     from './scenes/ResultsScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

const config = {
  type:   Phaser.AUTO,           // WebGL if available, Canvas 2D fallback
  width:  1280,
  height: 720,
  backgroundColor: '#0e1f09',
  scale: {
    mode:           Phaser.Scale.FIT,
    autoCenter:     Phaser.Scale.CENTER_BOTH,
    width:          1280,
    height:         720,
  },
  dom: {
    createContainer: true,       // enables this.add.dom() for text inputs
  },
  scene: [
    BootScene,
    MenuScene,
    LoginScene,
    LobbyScene,
    GameScene,
    ResultsScene,
    LeaderboardScene,
  ],
};

// Boot once the page is ready
window.addEventListener('load', () => {
  new Phaser.Game(config);
});
