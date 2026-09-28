import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FireEntity } from '../entities/FireEntity';
import { StateManager } from '../systems/StateManager';

export class FireEventScene extends Phaser.Scene {
  private player!: Player;
  private fires: FireEntity[] = [];
  private wellObject!: Phaser.GameObjects.Image;
  private wellZone!: Phaser.GameObjects.Zone;
  private state!: StateManager;

  // Timers & Progress
  private timeLeft: number = 32;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private fireCountText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private isEventEnded: boolean = false;

  // Particle Emitters
  private waterParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'FireEventScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    this.isEventEnded = false;
    this.timeLeft = 32;
    this.fires = [];

    const { width, height } = this.cameras.main;

    // Interior workshop flooring & walls
    this.createEnvironment(width, height);

    // Create Water Well Station
    this.wellObject = this.add.image(90, 130, 'water_well').setScale(1.2).setDepth(15);
    this.wellZone = this.add.zone(90, 130, 70, 70);
    this.physics.add.existing(this.wellZone, true);

    const wellLabel = this.add.text(90, 175, '💧 Fresh Water Well\n(Walk here to fill bucket)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#38bdf8',
      align: 'center'
    }).setOrigin(0.5).setDepth(15);

    // Create Player
    this.player = new Player(this, 120, height - 120);
    this.player.setDepth(20);

    // Create Fire Clusters in Workshop
    const firePositions = [
      { x: width / 2 - 80, y: height / 2 - 40 },
      { x: width / 2 + 100, y: height / 2 - 60 },
      { x: width / 2 + 140, y: height / 2 + 60 },
      { x: width / 2 - 40, y: height / 2 + 80 },
      { x: width / 2 + 60, y: height / 2 }
    ];

    for (const pos of firePositions) {
      const fire = new FireEntity(this, pos.x, pos.y);
      fire.setDepth(10);
      this.fires.push(fire);
    }

    // Particle Systems
    this.waterParticles = this.add.particles(0, 0, 'particle_water', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: 300,
      emitting: false
    }).setDepth(50);

    this.smokeParticles = this.add.particles(0, 0, 'particle_smoke', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.8, end: 2 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 600,
      emitting: false
    }).setDepth(50);

    // UI Overlay Header
    this.createEventHUD(width);

    // Input handlers for Extinguishing Water Splash
    this.setupInteractions();

    // Timer countdown
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true
    });
  }

  private createEnvironment(width: number, height: number): void {
    // Wooden Floor Tiles
    for (let x = 0; x < width; x += 32) {
      for (let y = 0; y < height; y += 32) {
        this.add.image(x + 16, y + 16, 'floor_wood').setDepth(1);
      }
    }

    // Stone Border Walls
    const wallGroup = this.physics.add.staticGroup();
    for (let x = 0; x < width; x += 32) {
      wallGroup.create(x + 16, 16, 'wall_stone');
      wallGroup.create(x + 16, height - 16, 'wall_stone');
    }
    for (let y = 0; y < height; y += 32) {
      wallGroup.create(16, y + 16, 'wall_stone');
      wallGroup.create(width - 16, y + 16, 'wall_stone');
    }

    // Decorative looms and craft tables
    const loom1 = this.add.rectangle(width / 2 - 120, height / 2 - 90, 60, 36, 0x92400e).setStrokeStyle(2, 0x451a03);
    const loomText = this.add.text(width / 2 - 120, height / 2 - 90, '🧵 Loom', { fontSize: '11px', color: '#fef08a' }).setOrigin(0.5);
  }

  private createEventHUD(width: number): void {
    const topBar = this.add.rectangle(width / 2, 35, width - 40, 50, 0x0f172a, 0.9)
      .setStrokeStyle(1.5, 0xdc2626)
      .setDepth(100);

    this.timerText = this.add.text(40, 25, `⏱️ Time Left: ${this.timeLeft}s`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f87171'
    }).setDepth(101);

    this.fireCountText = this.add.text(width / 2, 25, `🔥 Active Fires: ${this.fires.length}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5, 0).setDepth(101);

    this.hintText = this.add.text(width - 40, 25, '1. Fill Water at Well ➜ 2. Splash Fire (Space / Click)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(1, 0).setDepth(101);
  }

  private setupInteractions(): void {
    // Space or Click to use water bucket
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this.attemptDouseFire();
      });
      this.input.keyboard.on('keydown-E', () => {
        this.attemptDouseFire();
      });
    }

    this.input.on('pointerdown', () => {
      this.attemptDouseFire();
    });
  }

  private attemptDouseFire(): void {
    if (this.isEventEnded) return;

    if (!this.player.hasWaterBucket) {
      // Check if near well
      const distToWell = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.wellObject.x, this.wellObject.y);
      if (distToWell < 80) {
        this.player.setWaterCarried(true);
        this.state.soundSystem.playWaterSplash();
        this.hintText.setText('Bucket Full! Walk to fires and press SPACE / Click to extinguish!');
        this.hintText.setColor('#4ade80');
      } else {
        this.hintText.setText('⚠️ You need water! Walk to the Water Well on the left!');
        this.hintText.setColor('#f87171');
      }
      return;
    }

    // Player has water bucket: find nearest active fire within range
    let nearestFire: FireEntity | null = null;
    let minDist = 90;

    for (const fire of this.fires) {
      if (fire.isExtinguished) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, fire.x, fire.y);
      if (dist < minDist) {
        minDist = dist;
        nearestFire = fire;
      }
    }

    if (nearestFire) {
      // Splash water!
      this.waterParticles.emitParticleAt(nearestFire.x, nearestFire.y, 18);
      this.smokeParticles.emitParticleAt(nearestFire.x, nearestFire.y, 10);
      this.state.soundSystem.playFireSizzle();
      
      const isOut = nearestFire.douse(50);
      this.player.setWaterCarried(false); // Used up bucket

      if (isOut) {
        this.fires = this.fires.filter(f => f !== nearestFire);
        this.fireCountText.setText(`🔥 Active Fires: ${this.fires.length}`);
      }

      this.hintText.setText('Doused fire! Return to the Water Well to refill!');
      this.hintText.setColor('#38bdf8');

      // Check victory condition
      if (this.fires.length === 0) {
        this.handleEventComplete(true);
      }
    } else {
      // Splashed on empty ground
      this.waterParticles.emitParticleAt(this.player.x, this.player.y, 10);
      this.state.soundSystem.playWaterSplash();
      this.player.setWaterCarried(false);
      this.hintText.setText('Water splashed! Refill at the well and get closer to flames.');
      this.hintText.setColor('#fde047');
    }
  }

  private tickTimer(): void {
    if (this.isEventEnded) return;

    this.timeLeft--;
    this.timerText.setText(`⏱️ Time Left: ${this.timeLeft}s`);

    if (this.timeLeft <= 0) {
      this.handleEventComplete(false);
    }
  }

  update(): void {
    if (this.isEventEnded) return;

    this.player.update();

    // Auto-fetch water when walking close to well
    const distToWell = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.wellObject.x, this.wellObject.y);
    if (distToWell < 60 && !this.player.hasWaterBucket) {
      this.player.setWaterCarried(true);
      this.state.soundSystem.playWaterSplash();
      this.hintText.setText('Bucket Filled! Walk to fires and press SPACE / Click!');
      this.hintText.setColor('#4ade80');
    }
  }

  private handleEventComplete(success: boolean): void {
    this.isEventEnded = true;
    this.timerEvent.remove();

    if (success) {
      this.state.soundSystem.playSuccessFanfare();
    } else {
      this.state.soundSystem.playAlarm();
    }

    this.time.delayedCall(700, () => {
      this.scene.start('ResultScene', {
        success,
        eventTitle: 'Craft Centre Fire Hazard',
        isFire: true
      });
    });
  }
}
