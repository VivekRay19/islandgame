import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FireEntity } from '../entities/FireEntity';
import { StateManager } from '../systems/StateManager';

export class FireEventScene extends Phaser.Scene {
  private player!: Player;
  private fires: FireEntity[] = [];
  private wellObject!: Phaser.GameObjects.Image;
  private state!: StateManager;

  private timeLeft: number = 32;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private fireCountText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private isEventEnded: boolean = false;

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

    // Pastel pink framing border
    this.cameras.main.setBackgroundColor('#E8A8C2');

    // Workshop flooring
    this.createEnvironment(width, height);

    // Water Well
    this.wellObject = this.add.image(100, 140, 'water_well').setScale(1.2).setDepth(15);
    this.add.text(100, 180, '💧 Water Well\n(Step here to fill)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      align: 'center',
      shadow: { blur: 4, color: 'rgba(0,0,0,0.4)', fill: true }
    }).setOrigin(0.5).setDepth(15);

    // Player
    this.player = new Player(this, 120, height - 120);
    this.player.setDepth(20);

    // Fires
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

    // Particles
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

    // Minimal Floating Header
    this.createEventHUD(width);

    // Interactions
    this.setupInteractions();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true
    });
  }

  private createEnvironment(width: number, height: number): void {
    for (let x = 40; x < width - 40; x += 32) {
      for (let y = 60; y < height - 60; y += 32) {
        this.add.image(x + 16, y + 16, 'floor_wood').setDepth(1);
      }
    }
  }

  private createEventHUD(width: number): void {
    // Clean, minimalist floating tags
    this.add.text(40, 24, '🔥 FIRE AT CRAFT CENTRE', {
      fontFamily: 'Cinzel, Georgia',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 2
    }).setDepth(101);

    this.timerText = this.add.text(width / 2, 24, `TIME: ${this.timeLeft}s`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5, 0).setDepth(101);

    this.fireCountText = this.add.text(width - 40, 24, `FIRES: ${this.fires.length}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(1, 0).setDepth(101);

    this.hintText = this.add.text(width / 2, 50, '1. Fill Water at Well ➜ 2. Splash Fire (Space / Click)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: 'rgba(255, 255, 255, 0.85)'
    }).setOrigin(0.5, 0).setDepth(101);
  }

  private setupInteractions(): void {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.attemptDouseFire());
      this.input.keyboard.on('keydown-E', () => this.attemptDouseFire());
    }
    this.input.on('pointerdown', () => this.attemptDouseFire());
  }

  private attemptDouseFire(): void {
    if (this.isEventEnded) return;

    if (!this.player.hasWaterBucket) {
      const distToWell = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.wellObject.x, this.wellObject.y);
      if (distToWell < 80) {
        this.player.setWaterCarried(true);
        this.state.soundSystem.playWaterSplash();
        this.hintText.setText('Bucket Full! Approach flames and press SPACE / Click!');
      } else {
        this.hintText.setText('⚠️ Visit the Water Well on the left to draw water!');
      }
      return;
    }

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
      this.waterParticles.emitParticleAt(nearestFire.x, nearestFire.y, 16);
      this.smokeParticles.emitParticleAt(nearestFire.x, nearestFire.y, 10);
      this.state.soundSystem.playFireSizzle();
      
      const isOut = nearestFire.douse(50);
      this.player.setWaterCarried(false);

      if (isOut) {
        this.fires = this.fires.filter(f => f !== nearestFire);
        this.fireCountText.setText(`FIRES: ${this.fires.length}`);
      }

      this.hintText.setText('Doused fire! Refill at the well!');
      if (this.fires.length === 0) {
        this.handleEventComplete(true);
      }
    } else {
      this.waterParticles.emitParticleAt(this.player.x, this.player.y, 10);
      this.state.soundSystem.playWaterSplash();
      this.player.setWaterCarried(false);
      this.hintText.setText('Splashed water! Refill at well and move closer to fire.');
    }
  }

  private tickTimer(): void {
    if (this.isEventEnded) return;
    this.timeLeft--;
    this.timerText.setText(`TIME: ${this.timeLeft}s`);
    if (this.timeLeft <= 0) {
      this.handleEventComplete(false);
    }
  }

  update(): void {
    if (this.isEventEnded) return;
    this.player.update();

    const distToWell = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.wellObject.x, this.wellObject.y);
    if (distToWell < 60 && !this.player.hasWaterBucket) {
      this.player.setWaterCarried(true);
      this.state.soundSystem.playWaterSplash();
      this.hintText.setText('Bucket Full! Approach flames and press SPACE / Click!');
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

    this.time.delayedCall(600, () => {
      this.scene.start('ResultScene', {
        success,
        eventTitle: 'Craft Centre Fire Hazard',
        isFire: true
      });
    });
  }
}
