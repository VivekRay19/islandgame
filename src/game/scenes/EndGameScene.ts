import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';

export class EndGameScene extends Phaser.Scene {
  private state!: StateManager;

  constructor() {
    super({ key: 'EndGameScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    const { width, height } = this.cameras.main;

    const harmony = this.state.culturalSystem.getCulturalHarmonyScore();
    const summary = this.state.scoringSystem.getSummary(harmony);
    const islandTitle = this.state.culturalSystem.getEmergentIslandTitle(this.state.tileSystem);

    this.state.soundSystem.playSuccessFanfare();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a192f, 0x0a192f, 0x020c1b, 0x020c1b, 1);
    bg.fillRect(0, 0, width, height);

    // Floating celebration particles
    for (let i = 0; i < 30; i++) {
      const p = this.add.image(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        'particle_confetti'
      ).setAlpha(Phaser.Math.FloatBetween(0.3, 0.9));

      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(50, 120),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        yoyo: true
      });
    }

    // Modal Box
    const box = this.add.rectangle(width / 2, height / 2, 650, 480, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0xf59e0b);

    // Header
    this.add.text(width / 2, height / 2 - 190, '✨ 6-ROUND ODYSSEY CONCLUDED ✨', {
      fontFamily: 'Cinzel, serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fde047'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 150, `${this.state.islandName}`, {
      fontFamily: 'Cinzel, serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f59e0b'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 110, `Emergent Cultural Identity: ${islandTitle}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // Score Summary Card
    const scoreCard = this.add.rectangle(width / 2, height / 2 + 10, 520, 160, 0x1e293b, 0.8)
      .setStrokeStyle(1, 0x334155);

    this.add.text(width / 2, height / 2 - 40, `🏆 FINAL TOTAL SCORE: ${summary.totalScore} POINTS`, {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0.5);

    const breakdownText = [
      `• Development Tasks Points: +${summary.taskScore} pts (${summary.completedTasksCount} tasks completed)`,
      `• Cultural Harmony Synergy: +${summary.culturalHarmonyScore} pts`,
      `• Island Events & Placement Matching: +${summary.eventScore} pts`,
      `• Total Island Tiles Placed: ${this.state.tileSystem.getAllPlacedTiles().length} tiles`
    ].join('\n');

    this.add.text(width / 2, height / 2 + 25, breakdownText, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      color: '#cbd5e1',
      lineSpacing: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Play Again Button
    const playAgainBtn = this.add.rectangle(width / 2, height / 2 + 175, 240, 48, 0xd97706)
      .setStrokeStyle(2, 0xfde047)
      .setInteractive({ useHandCursor: true });

    const playAgainTxt = this.add.text(width / 2, height / 2 + 175, 'BUILD NEW ISLAND →', {
      fontFamily: 'Cinzel, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    playAgainBtn.on('pointerdown', () => {
      this.state.soundSystem.playSuccessFanfare();
      this.scene.start('MainMenuScene');
    });
  }
}
