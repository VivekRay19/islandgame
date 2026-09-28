import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { StateManager } from '../systems/StateManager';

export class FestivalEventScene extends Phaser.Scene {
  private player!: Player;
  private state!: StateManager;
  private altarObject!: Phaser.GameObjects.Image;
  private offerings: { item: Phaser.GameObjects.Image; key: string; name: string; collected: boolean }[] = [];
  private carriedOffering: string | null = null;
  private offeringsDelivered: number = 0;
  private totalOfferings: number = 4;

  private timeLeft: number = 28;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private isEventEnded: boolean = false;
  private confettiEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'FestivalEventScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    this.isEventEnded = false;
    this.timeLeft = 28;
    this.offeringsDelivered = 0;
    this.carriedOffering = null;
    this.offerings = [];

    const { width, height } = this.cameras.main;

    // Festive courtyard garden ground
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x14532d, 0x14532d, 0x052e16, 0x052e16, 1);
    ground.fillRect(0, 0, width, height);

    // Decorative festival canopies
    const canopy1 = this.add.rectangle(width / 2, 40, 280, 24, 0xd97706).setStrokeStyle(2, 0xfde047);
    this.add.text(width / 2, 40, '✨ Seasonal Cultural Haat Festival Grounds ✨', {
      fontFamily: 'Cinzel',
      fontSize: '13px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Central Festival Altar
    this.altarObject = this.add.image(width / 2, height / 2, 'festival_altar').setScale(1.5).setDepth(15);
    const altarLabel = this.add.text(width / 2, height / 2 + 45, '🪔 Sacred Festival Altar\n(Deliver offerings here)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fde047',
      align: 'center'
    }).setOrigin(0.5).setDepth(15);

    // Create Player
    this.player = new Player(this, 100, height - 100);
    this.player.setDepth(20);

    // Spawn 4 Festive Offerings around courtyard
    const spawnPoints = [
      { x: 120, y: 130, key: 'offering_garland', name: 'Floral Garland' },
      { x: width - 120, y: 130, key: 'offering_grain_pot', name: 'Golden Grain Pot' },
      { x: 140, y: height - 140, key: 'offering_flute', name: 'Bamboo Flute' },
      { x: width - 140, y: height - 140, key: 'offering_garland', name: 'Marigold Wreath' }
    ];

    for (const sp of spawnPoints) {
      const item = this.add.image(sp.x, sp.y, sp.key).setScale(1.2).setDepth(10);
      this.tweens.add({
        targets: item,
        y: sp.y - 6,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      this.offerings.push({ item, key: sp.key, name: sp.name, collected: false });
    }

    // Confetti particles
    this.confettiEmitter = this.add.particles(0, 0, 'particle_confetti', {
      speed: { min: 100, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 150,
      emitting: false
    }).setDepth(100);

    // Top Header
    this.createEventHUD(width);

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true
    });
  }

  private createEventHUD(width: number): void {
    const topBar = this.add.rectangle(width / 2, 85, width - 40, 44, 0x0f172a, 0.9)
      .setStrokeStyle(1.5, 0x7c3aed)
      .setDepth(100);

    this.timerText = this.add.text(40, 78, `⏱️ Time: ${this.timeLeft}s`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#c084fc'
    }).setDepth(101);

    this.statusText = this.add.text(width / 2, 78, `Offerings Arranged: 0 / ${this.totalOfferings}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5, 0).setDepth(101);
  }

  private tickTimer(): void {
    if (this.isEventEnded) return;

    this.timeLeft--;
    this.timerText.setText(`⏱️ Time: ${this.timeLeft}s`);

    if (this.timeLeft <= 0) {
      this.handleEventComplete(this.offeringsDelivered >= 2);
    }
  }

  update(): void {
    if (this.isEventEnded) return;

    this.player.update();

    // Check collecting offerings
    if (!this.carriedOffering) {
      for (const off of this.offerings) {
        if (!off.collected) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, off.item.x, off.item.y);
          if (dist < 45) {
            off.collected = true;
            off.item.setVisible(false);
            this.carriedOffering = off.name;
            this.state.soundSystem.playTileRotate();
            this.statusText.setText(`Carrying: ${off.name}! Bring to Altar!`);
            break;
          }
        }
      }
    } else {
      // Carrying item: check delivery to Altar
      const distToAltar = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.altarObject.x, this.altarObject.y);
      if (distToAltar < 65) {
        this.offeringsDelivered++;
        this.carriedOffering = null;
        this.confettiEmitter.emitParticleAt(this.altarObject.x, this.altarObject.y, 25);
        this.state.soundSystem.playCulturalConnect();
        this.statusText.setText(`Offerings Arranged: ${this.offeringsDelivered} / ${this.totalOfferings}`);

        if (this.offeringsDelivered >= this.totalOfferings) {
          this.handleEventComplete(true);
        }
      }
    }
  }

  private handleEventComplete(success: boolean): void {
    this.isEventEnded = true;
    this.timerEvent.remove();

    if (success) {
      this.state.soundSystem.playSuccessFanfare();
    }

    this.time.delayedCall(700, () => {
      this.scene.start('ResultScene', {
        success,
        eventTitle: 'Seasonal Haat Festival',
        isFire: false
      });
    });
  }
}
