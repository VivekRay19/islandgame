import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';

interface ResultData {
  success: boolean;
  eventTitle: string;
  isFire: boolean;
}

export class ResultScene extends Phaser.Scene {
  private state!: StateManager;

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: ResultData): void {
    this.state = StateManager.getInstance();
    const { width, height } = this.cameras.main;

    const outcome = this.state.eventSystem.resolveEventOutcome(
      data.success,
      this.state.tileSystem,
      this.state.resourceSystem
    );
    this.state.scoringSystem.addEventScore(outcome.points);

    // Pastel pink background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xF2B5CE, 0xF2B5CE, 0xE5A0BC, 0xE5A0BC, 1);
    bg.fillRect(0, 0, width, height);

    // Clean white paper card
    const card = this.add.rectangle(width / 2, height / 2, 520, 340, 0xFFFFFF, 0.95)
      .setStrokeStyle(1.5, data.success ? 0x546B43 : 0xB86D4F);

    const titleEmoji = data.success ? '✨' : '⚠️';
    const titleText = data.success ? 'COMMUNITY CRISIS RESOLVED' : 'EVENT COMPLETED';

    this.add.text(width / 2, height / 2 - 120, `${titleEmoji} ${titleText}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: data.success ? '#3A4D2E' : '#991B1B',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 85, data.eventTitle, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      color: '#64748B'
    }).setOrigin(0.5);

    // Narrative
    this.add.text(width / 2, height / 2 - 25, outcome.message, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      color: '#332924',
      align: 'center',
      wordWrap: { width: 440 }
    }).setOrigin(0.5);

    // Reward / Consequence
    const rewardText = data.success
      ? `• +${outcome.points} Score  •  +${outcome.harmony} Harmony  •  Building Protected`
      : `• Building sustained minor damage  •  +0 Points`;

    this.add.text(width / 2, height / 2 + 45, rewardText, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: data.success ? '#546B43' : '#B86D4F'
    }).setOrigin(0.5);

    // Return button
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 115, 220, 40, 0xB86D4F)
      .setStrokeStyle(1.5, 0xFFFFFF)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height / 2 + 115, 'RETURN TO ISLAND →', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    returnBtn.on('pointerdown', () => {
      this.state.soundSystem.playTilePlace();
      this.scene.start('IslandScene');
    });
  }
}
