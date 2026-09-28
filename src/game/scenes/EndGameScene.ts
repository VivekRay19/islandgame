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

    // Pastel background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xF2B5CE, 0xF2B5CE, 0xE5A0BC, 0xE5A0BC, 1);
    bg.fillRect(0, 0, width, height);

    // Clean white card
    this.add.rectangle(width / 2, height / 2, 540, 420, 0xFFFFFF, 0.95)
      .setStrokeStyle(1.5, 0xE5A0BC);

    this.add.text(width / 2, height / 2 - 160, '✨ CULTURAL ODYSSEY CONCLUDED ✨', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#332924',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 120, `${this.state.islandName}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#B86D4F',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 80, `Cultural Identity: ${islandTitle}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#546B43'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 25, `🏆 FINAL CULTURAL SCORE: ${summary.totalScore} POINTS`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#332924'
    }).setOrigin(0.5);

    const breakdownText = [
      `• Development Tasks: +${summary.taskScore} pts (${summary.completedTasksCount} completed)`,
      `• Cultural Harmony Synergies: +${summary.culturalHarmonyScore} pts`,
      `• Event & Placement Matches: +${summary.eventScore} pts`,
      `• Total Island Hex Tiles: ${this.state.tileSystem.getAllPlacedTiles().length} tiles`
    ].join('\n');

    this.add.text(width / 2, height / 2 + 40, breakdownText, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      color: '#64748B',
      lineSpacing: 8,
      align: 'center'
    }).setOrigin(0.5);

    const playAgainBtn = this.add.rectangle(width / 2, height / 2 + 150, 220, 42, 0xB86D4F)
      .setStrokeStyle(1.5, 0xFFFFFF)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height / 2 + 150, 'CREATE NEW ISLAND →', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    playAgainBtn.on('pointerdown', () => {
      this.state.soundSystem.playSuccessFanfare();
      this.scene.start('MainMenuScene');
    });
  }
}
