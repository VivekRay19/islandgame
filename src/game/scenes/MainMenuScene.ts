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

    // Ambient background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a192f, 0x0a192f, 0x020c1b, 0x020c1b, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative floating particles
    for (let i = 0; i < 25; i++) {
      const p = this.add.image(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        'particle_spark'
      ).setAlpha(Phaser.Math.FloatBetween(0.2, 0.7));
      
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(40, 100),
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        repeat: -1,
        yoyo: true
      });
    }

    // Title
    this.add.text(width / 2, 70, 'CULTURAL ISLANDS', {
      fontFamily: 'Cinzel, serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#f59e0b',
      shadow: { blur: 15, color: '#d97706', fill: true }
    }).setOrigin(0.5);

    this.add.text(width / 2, 115, 'ISLAND HAAT • Trade • Connect • Rise', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '15px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Core Concept Banner
    const banner = this.add.rectangle(width / 2, 175, 680, 65, 0x0f172a, 0.8)
      .setStrokeStyle(1, 0x334155);
    this.add.text(width / 2, 175, 'Peaceful Tile Building • 2D Top-Down Event Encounters • Central Haat Trading\nLuck + Choice + Cultural Connection + Community Identity', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    // Specialty Selection Header
    this.add.text(width / 2, 240, 'SELECT YOUR ISLAND PRODUCING SPECIALTY', {
      fontFamily: 'Cinzel, serif',
      fontSize: '16px',
      color: '#fbbf24'
    }).setOrigin(0.5);

    const islandChoices: { id: ResourceId; name: string; desc: string }[] = [
      { id: 'grain', name: 'Grain Island', desc: 'Produces 3 Grain/rnd • Staple sustenance & brewing' },
      { id: 'fibre', name: 'Fibre Island', desc: 'Produces 3 Fibre/rnd • Fine handlooms & textiles' },
      { id: 'wood', name: 'Wood Island', desc: 'Produces 3 Wood/rnd • Sturdy timber & carpentry' },
      { id: 'stone', name: 'Ore Island', desc: 'Produces 3 Ore/rnd • Minerals, stone & metalwork' },
      { id: 'water', name: 'Water Island', desc: 'Produces 3 Water/rnd • Pure river springs & irrigation' }
    ];

    const btnWidth = 520;
    const startY = 280;
    const btnHeight = 44;
    const spacing = 52;

    islandChoices.forEach((choice, idx) => {
      const y = startY + idx * spacing;
      const resDef = RESOURCES[choice.id];

      const btnBg = this.add.rectangle(width / 2, y, btnWidth, btnHeight, 0x1e293b, 0.9)
        .setStrokeStyle(1.5, choice.id === this.selectedSpecialty ? 0xf59e0b : 0x334155)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(width / 2 - 230, y, `${resDef.symbol}  ${choice.name}`, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: resDef.color
      }).setOrigin(0, 0.5);

      const sub = this.add.text(width / 2 + 230, y, choice.desc, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '11px',
        color: '#94a3b8'
      }).setOrigin(1, 0.5);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x334155);
      });

      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x1e293b);
      });

      btnBg.on('pointerdown', () => {
        this.selectedSpecialty = choice.id;
        this.islandNameInput = `${choice.name.split(' ')[0]} Sanctuary`;
        StateManager.getInstance().soundSystem.playTileClick();
        this.scene.restart();
      });
    });

    // Start Button
    const startBtn = this.add.rectangle(width / 2, height - 70, 260, 50, 0xd97706)
      .setStrokeStyle(2, 0xfde047)
      .setInteractive({ useHandCursor: true });

    const startText = this.add.text(width / 2, height - 70, 'BEGIN JOURNEY →', {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    startBtn.on('pointerover', () => {
      startBtn.setFillStyle(0xf59e0b);
      startBtn.setScale(1.03);
      startText.setScale(1.03);
    });

    startBtn.on('pointerout', () => {
      startBtn.setFillStyle(0xd97706);
      startBtn.setScale(1.0);
      startText.setScale(1.0);
    });

    startBtn.on('pointerdown', () => {
      StateManager.getInstance().soundSystem.playSuccessFanfare();
      StateManager.getInstance().initGame(this.selectedSpecialty, this.islandNameInput);
      
      // Auto-trigger fire event in vertical slice to ensure immediate playability!
      this.time.delayedCall(300, () => {
        this.scene.start('IslandScene');
      });
    });
  }
}
