import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';
import { RESOURCES, ResourceId } from '../data/resources';

export class HUD {
  private scene: Phaser.Scene;
  private state: StateManager;
  private container: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private islandTitleText!: Phaser.GameObjects.Text;
  private resourceIcons: Map<ResourceId, Phaser.GameObjects.Text> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.state = StateManager.getInstance();
    this.container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);

    this.createTopBar();
  }

  private createTopBar(): void {
    const width = this.scene.cameras.main.width;

    // Glassmorphic top bar background
    const barBg = this.scene.add.rectangle(width / 2, 28, width - 24, 48, 0x0f172a, 0.85)
      .setStrokeStyle(1, 0x334155, 0.8);
    this.container.add(barBg);

    // Island Name & Dynamic Emergent Title
    this.islandTitleText = this.scene.add.text(24, 18, '', {
      fontFamily: 'Cinzel, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f59e0b'
    });
    this.container.add(this.islandTitleText);

    // Round & Level Indicator
    this.roundText = this.scene.add.text(width / 2, 18, '', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5, 0);
    this.container.add(this.roundText);

    // Total Score
    this.scoreText = this.scene.add.text(width - 24, 18, '', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(1, 0);
    this.container.add(this.scoreText);

    // Resource Inventory Bar (Bottom left/center)
    const resBg = this.scene.add.rectangle(width / 2, 70, width - 24, 30, 0x0f172a, 0.75)
      .setStrokeStyle(1, 0x1e293b, 0.8);
    this.container.add(resBg);

    const resources: ResourceId[] = ['grain', 'fibre', 'wood', 'stone', 'clay', 'water', 'music', 'ore'];
    const startX = 36;
    const spacing = (width - 72) / resources.length;

    resources.forEach((resId, idx) => {
      const def = RESOURCES[resId];
      const resText = this.scene.add.text(startX + idx * spacing, 63, `${def.symbol} 0`, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '12px',
        color: def.color
      });
      this.resourceIcons.set(resId, resText);
      this.container.add(resText);
    });

    this.refresh();
  }

  public refresh(): void {
    const round = this.state.scoringSystem.getRound();
    const level = this.state.scoringSystem.getLevel();
    const harmony = this.state.culturalSystem.getCulturalHarmonyScore();
    const totalScore = this.state.scoringSystem.getTotalScore(harmony);
    const emergentTitle = this.state.culturalSystem.getEmergentIslandTitle(this.state.tileSystem);

    this.islandTitleText.setText(`${this.state.islandName} • ${emergentTitle}`);
    this.roundText.setText(`Round ${round}/6 • Level ${level} • Harmony +${harmony} pts`);
    this.scoreText.setText(`🏆 Score: ${totalScore} pts`);

    // Update resource counts
    const inv = this.state.resourceSystem.getInventory();
    for (const [resId, textObj] of this.resourceIcons.entries()) {
      const count = inv[resId] || 0;
      const def = RESOURCES[resId];
      textObj.setText(`${def.symbol} ${def.name}: ${count}`);
      textObj.setAlpha(count > 0 ? 1 : 0.45);
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
