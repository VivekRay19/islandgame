import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';
import { ResourceId, RESOURCES } from '../data/resources';

export class MainMenuScene extends Phaser.Scene {
  private selectedSpecialty: ResourceId = 'grain';
  private islandNameInput: string = 'Isle of Shanti';

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Pastel pink atmosphere (#E8A8C2)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xF2B5CE, 0xF2B5CE, 0xE5A0BC, 0xE5A0BC, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle floating dust/sparkle particles
    for (let i = 0; i < 20; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 4),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.2, 0.6)
      );
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        yoyo: true
      });
    }

    // Title
    this.add.text(width / 2, 75, 'ISLAND HAAT', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 4,
      shadow: { blur: 10, color: 'rgba(120, 60, 80, 0.4)', fill: true }
    }).setOrigin(0.5);

    this.add.text(width / 2, 115, 'A Peaceful Cultural World • Trade • Connect • Flourish', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: 'rgba(255, 255, 255, 0.85)',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 160, 'SELECT YOUR STARTING RESOURCE SPECIALTY', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 2
    }).setOrigin(0.5);

    const islandChoices: { id: ResourceId; name: string; desc: string }[] = [
      { id: 'grain', name: 'Grain Island', desc: 'Produces 3 Grain • Agricultural Terraces' },
      { id: 'fibre', name: 'Fibre Island', desc: 'Produces 3 Fibre • Handloom Weaving' },
      { id: 'wood', name: 'Wood Island', desc: 'Produces 3 Wood • Timber Carpentry' },
      { id: 'stone', name: 'Ore Island', desc: 'Produces 3 Ore • Stone Masonry & Minerals' },
      { id: 'water', name: 'Water Island', desc: 'Produces 3 Water • Pure River Springs' }
    ];

    const btnWidth = 440;
    const startY = 200;
    const btnHeight = 44;
    const spacing = 52;

    islandChoices.forEach((choice, idx) => {
      const y = startY + idx * spacing;
      const resDef = RESOURCES[choice.id];
      const isSelected = choice.id === this.selectedSpecialty;

      const btnBg = this.add.rectangle(width / 2, y, btnWidth, btnHeight, 0xFFFFFF, isSelected ? 0.95 : 0.6)
        .setStrokeStyle(1.5, isSelected ? 0xB86D4F : 0xFFFFFF)
        .setInteractive({ useHandCursor: true });

      this.add.text(width / 2 - 190, y, `${resDef.symbol}  ${choice.name}`, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#332924'
      }).setOrigin(0, 0.5);

      this.add.text(width / 2 + 190, y, choice.desc, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '11px',
        color: '#64748B'
      }).setOrigin(1, 0.5);

      btnBg.on('pointerdown', () => {
        this.selectedSpecialty = choice.id;
        this.islandNameInput = `${choice.name.split(' ')[0]} Isle`;
        StateManager.getInstance().soundSystem.playTileClick();
        this.scene.restart();
      });
    });

    // Start Button
    const startBtn = this.add.rectangle(width / 2, height - 70, 240, 46, 0xB86D4F)
      .setStrokeStyle(1.5, 0xFFFFFF)
      .setInteractive({ useHandCursor: true });

    const startText = this.add.text(width / 2, height - 70, 'BEGIN JOURNEY →', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 2
    }).setOrigin(0.5);

    startBtn.on('pointerover', () => {
      startBtn.setFillStyle(0xC87D5F);
      startBtn.setScale(1.02);
      startText.setScale(1.02);
    });

    startBtn.on('pointerout', () => {
      startBtn.setFillStyle(0xB86D4F);
      startBtn.setScale(1.0);
      startText.setScale(1.0);
    });

    startBtn.on('pointerdown', () => {
      StateManager.getInstance().soundSystem.playSuccessFanfare();
      StateManager.getInstance().initGame(this.selectedSpecialty, this.islandNameInput);
      this.time.delayedCall(250, () => {
        this.scene.start('IslandScene');
      });
    });
  }
}
