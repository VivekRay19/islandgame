import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private moveSpeed: number = 180;
  public hasWaterBucket: boolean = false;
  private bucketIndicator!: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_sheet', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(18, 14);
    this.setOffset(7, 16);

    // Keyboard inputs
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Overhead bucket icon indicator when carrying water
    this.bucketIndicator = scene.add.image(x, y - 22, 'water_bucket')
      .setScale(0.7)
      .setVisible(false)
      .setDepth(100);
  }

  public setWaterCarried(carried: boolean): void {
    this.hasWaterBucket = carried;
    this.bucketIndicator.setVisible(carried);
    this.moveSpeed = carried ? 150 : 190; // Slightly weighted when carrying water
  }

  update(): void {
    if (!this.body) return;

    let vx = 0;
    let vy = 0;

    const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown;

    if (left) {
      vx = -this.moveSpeed;
      this.anims.play('player_walk_left', true);
    } else if (right) {
      vx = this.moveSpeed;
      this.anims.play('player_walk_right', true);
    }

    if (up) {
      vy = -this.moveSpeed;
      if (!left && !right) this.anims.play('player_walk_up', true);
    } else if (down) {
      vy = this.moveSpeed;
      if (!left && !right) this.anims.play('player_walk_down', true);
    }

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.setVelocity(vx, vy);

    // Keep bucket indicator synced
    this.bucketIndicator.setPosition(this.x, this.y - 24);
  }

  destroy(fromScene?: boolean): void {
    if (this.bucketIndicator) {
      this.bucketIndicator.destroy();
    }
    super.destroy(fromScene);
  }
}
