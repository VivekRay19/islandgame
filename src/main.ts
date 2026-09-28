import Phaser from 'phaser';
import { GameConfig } from './game/GameConfig';

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(GameConfig);
});
