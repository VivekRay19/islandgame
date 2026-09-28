import Phaser from 'phaser';

export class FireEntity extends Phaser.Physics.Arcade.Sprite {
  public health: number = 100;
  public maxHealth: number = 100;
  public isExtinguished: boolean = false;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fire_sheet', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static physics body

    this.play('fire_flicker');
    this.setSize(24, 24);
    this.setOffset(4, 6);

    // Health bar above fire
    this.healthBarBg = scene.add.rectangle(x, y - 18, 28, 4, 0x1e293b).setDepth(20);
    this.healthBarFill = scene.add.rectangle(x - 13, y - 18, 26, 2, 0xef4444).setOrigin(0, 0.5).setDepth(21);
  }

  public douse(amount: number = 50): boolean {
    if (this.isExtinguished) return true;

    this.health = Math.max(0, this.health - amount);
    const healthPercent = this.health / this.maxHealth;
    this.healthBarFill.width = 26 * healthPercent;

    // Shrink fire visual
    this.setScale(0.5 + 0.5 * healthPercent);

    if (this.health <= 0) {
      this.extinguish();
      return true;
    }
    return false;
  }

  private extinguish(): void {
    this.isExtinguished = true;
    this.healthBarBg.setVisible(false);
    this.healthBarFill.setVisible(false);

    // Fade out and emit steam
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.2,
      duration: 300,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.healthBarFill) this.healthBarFill.destroy();
    super.destroy(fromScene);
  }
}
