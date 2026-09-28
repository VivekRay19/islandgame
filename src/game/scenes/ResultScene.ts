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

    // Resolve event in state system
    const outcome = this.state.eventSystem.resolveEventOutcome(
      data.success,
      this.state.tileSystem,
      this.state.resourceSystem
    );
    this.state.scoringSystem.addEventScore(outcome.points);

    // Background overlay
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a192f, 0x0a192f, 0x020c1b, 0x020c1b, 1);
    bg.fillRect(0, 0, width, height);

    // Modal Box
    const box = this.add.rectangle(width / 2, height / 2, 600, 420, 0x0f172a, 0.95)
      .setStrokeStyle(2, data.success ? 0x22c55e : 0xef4444);

    // Title
    const titleEmoji = data.success ? '🏆' : '⚠️';
    const titleText = data.success ? 'EVENT RESOLVED: SUCCESS!' : 'EVENT RESULT: COMPLETED';
    this.add.text(width / 2, height / 2 - 160, `${titleEmoji} ${titleText}`, {
      fontFamily: 'Cinzel, serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: data.success ? '#4ade80' : '#f87171'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 120, data.eventTitle, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '16px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Message narrative
    const descBox = this.add.rectangle(width / 2, height / 2 - 40, 520, 90, 0x1e293b, 0.8)
      .setStrokeStyle(1, 0x334155);
    this.add.text(width / 2, height / 2 - 40, outcome.message, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5);

    // Rewards / Consequences breakdown
    const rewardsY = height / 2 + 50;
    if (data.success) {
      this.add.text(width / 2, rewardsY, `✨ Rewards Earned:\n• +${outcome.points} Development Points\n• +${outcome.harmony} Cultural Harmony Score\n• Building status: UNDAMAGED & ACTIVE`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '14px',
        color: '#fbbf24',
        lineSpacing: 6,
        align: 'center'
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, rewardsY, `Consequences:\n• Building sustained smoke damage\n• Reduced efficiency until repaired\n• +0 Development Points`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '14px',
        color: '#f87171',
        lineSpacing: 6,
        align: 'center'
      }).setOrigin(0.5);
    }

    // Return to Island Button
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 150, 260, 48, 0x0284c7)
      .setStrokeStyle(2, 0x38bdf8)
      .setInteractive({ useHandCursor: true });

    const returnText = this.add.text(width / 2, height / 2 + 150, 'RETURN TO ISLAND →', {
      fontFamily: 'Cinzel, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    returnBtn.on('pointerover', () => {
      returnBtn.setFillStyle(0x0369a1);
      returnBtn.setScale(1.03);
      returnText.setScale(1.03);
    });

    returnBtn.on('pointerout', () => {
      returnBtn.setFillStyle(0x0284c7);
      returnBtn.setScale(1.0);
      returnText.setScale(1.0);
    });

    returnBtn.on('pointerdown', () => {
      this.state.soundSystem.playTilePlace();
      this.scene.start('IslandScene');
    });
  }
}
