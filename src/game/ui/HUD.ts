import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';

export class HUD {
  private scene: Phaser.Scene;
  private state: StateManager;
  private container: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreIcon!: Phaser.GameObjects.Image;
  private harmonyText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.state = StateManager.getInstance();
    this.container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);

    this.createMinimalHUD();
  }

  private createMinimalHUD(): void {
    const { width } = this.scene.cameras.main;

    // 1. TOP-LEFT: Clean, minimal branding (Dorfromantik-inspired)
    this.titleText = this.scene.add.text(32, 28, 'ISLAND HAAT', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 3,
      shadow: { blur: 6, color: 'rgba(120, 60, 80, 0.4)', fill: true }
    });
    this.container.add(this.titleText);

    this.subtitleText = this.scene.add.text(33, 54, '', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: 'rgba(255, 255, 255, 0.85)',
      letterSpacing: 1.5
    });
    this.container.add(this.subtitleText);

    // 2. TOP-RIGHT: Clean floating Score & Cultural Icon
    this.scoreText = this.scene.add.text(width - 64, 28, '0', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { blur: 6, color: 'rgba(120, 60, 80, 0.4)', fill: true }
    }).setOrigin(1, 0);
    this.container.add(this.scoreText);

    this.scoreIcon = this.scene.add.image(width - 44, 40, 'icon_culture_badge')
      .setScale(0.9);
    this.container.add(this.scoreIcon);

    this.harmonyText = this.scene.add.text(width - 44, 60, '', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: 'rgba(255, 255, 255, 0.85)'
    }).setOrigin(1, 0);
    this.container.add(this.harmonyText);

    this.refresh();
  }

  public refresh(): void {
    const round = this.state.scoringSystem.getRound();
    const level = this.state.scoringSystem.getLevel();
    const harmony = this.state.culturalSystem.getCulturalHarmonyScore();
    const totalScore = this.state.scoringSystem.getTotalScore(harmony);
    const emergentTitle = this.state.culturalSystem.getEmergentIslandTitle(this.state.tileSystem);

    this.subtitleText.setText(`ROUND ${round} • LEVEL ${level} • ${emergentTitle.toUpperCase()}`);
    this.scoreText.setText(`${totalScore}`);
    this.harmonyText.setText(`+${harmony} Harmony`);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
