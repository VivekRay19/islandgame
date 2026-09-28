import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { IslandScene } from './scenes/IslandScene';
import { HaatScene } from './scenes/HaatScene';
import { FireEventScene } from './scenes/FireEventScene';
import { FestivalEventScene } from './scenes/FestivalEventScene';
import { ResultScene } from './scenes/ResultScene';
import { EndGameScene } from './scenes/EndGameScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 640,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  backgroundColor: '#071524',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    MainMenuScene,
    IslandScene,
    HaatScene,
    FireEventScene,
    FestivalEventScene,
    ResultScene,
    EndGameScene
  ]
};
