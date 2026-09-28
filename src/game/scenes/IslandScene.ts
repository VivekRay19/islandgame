import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';
import { HUD } from '../ui/HUD';
import { PlacedTileInstance } from '../systems/TileSystem';
import { TileDefinition } from '../data/tiles';
import { CULTURAL_SYMBOLS } from '../data/resources';

export class IslandScene extends Phaser.Scene {
  private state!: StateManager;
  private hud!: HUD;
  private tileContainer!: Phaser.GameObjects.Container;
  private connectionLinesContainer!: Phaser.GameObjects.Graphics;
  private previewTileSprite!: Phaser.GameObjects.Image;
  private previewTileText!: Phaser.GameObjects.Text;
  private hoveredGrid: { gx: number; gy: number } | null = null;
  private tileObjects: Map<string, { image: Phaser.GameObjects.Image; alertIcon?: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }> = new Map();

  // Isometric Grid Metrics
  private readonly TILE_W = 120;
  private readonly TILE_H = 64;
  private originX: number = 0;
  private originY: number = 0;

  // Deck UI Elements
  private deckContainer!: Phaser.GameObjects.Container;
  private currentTileCard!: Phaser.GameObjects.Rectangle;
  private currentTileNameText!: Phaser.GameObjects.Text;
  private currentTileCategoryText!: Phaser.GameObjects.Text;
  private currentTilePreviewImg!: Phaser.GameObjects.Image;
  private rotateBtnText!: Phaser.GameObjects.Text;

  // Event Banner
  private eventBannerContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    const { width, height } = this.cameras.main;

    this.originX = width / 2;
    this.originY = height / 2 - 30;

    // Peaceful ocean backdrop with subtle ripples
    const oceanBg = this.add.graphics();
    oceanBg.fillGradientStyle(0x0c243c, 0x0c243c, 0x071524, 0x071524, 1);
    oceanBg.fillRect(0, 0, width, height);

    // Ripple particles
    for (let i = 0; i < 18; i++) {
      const rx = Phaser.Math.Between(40, width - 40);
      const ry = Phaser.Math.Between(80, height - 120);
      const rip = this.add.ellipse(rx, ry, 60, 20, 0x38bdf8, 0.08);
      this.tweens.add({
        targets: rip,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        yoyo: true
      });
    }

    this.connectionLinesContainer = this.add.graphics().setDepth(5);
    this.tileContainer = this.add.container(0, 0).setDepth(10);

    // Tile Placement Preview
    this.previewTileSprite = this.add.image(0, 0, 'tile_farm')
      .setAlpha(0.65)
      .setVisible(false)
      .setDepth(20);
    this.previewTileText = this.add.text(0, 0, '', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)'
    }).setOrigin(0.5).setVisible(false).setDepth(21);

    // Initialize HUD
    this.hud = new HUD(this);

    // Render placed island tiles
    this.renderIslandTiles();
    this.renderCulturalConnectionArcs();

    // Create Tile Deck & Control UI
    this.createDeckAndControlUI();

    // Create Active Event Banner (if event is ongoing)
    this.createEventBanner();

    // Setup User Inputs
    this.setupInputHandlers();

    // Check if initial event should be triggered for demonstration
    if (this.state.scoringSystem.getRound() === 1 && !this.state.eventSystem.getActiveEvent()) {
      this.state.eventSystem.triggerSpecificEvent('fire_event', this.state.tileSystem);
      this.refreshEventState();
    }
  }

  private gridToScreen(gx: number, gy: number): { x: number; y: number } {
    const x = this.originX + (gx - gy) * (this.TILE_W / 2);
    const y = this.originY + (gx + gy) * (this.TILE_H / 2);
    return { x, y };
  }

  private screenToGrid(screenX: number, screenY: number): { gx: number; gy: number } {
    const dx = screenX - this.originX;
    const dy = screenY - this.originY;
    const halfW = this.TILE_W / 2;
    const halfH = this.TILE_H / 2;

    const gx = Math.round((dx / halfW + dy / halfH) / 2);
    const gy = Math.round((dy / halfH - dx / halfW) / 2);
    return { gx, gy };
  }

  private renderIslandTiles(): void {
    // Clear previous tile sprites
    for (const obj of this.tileObjects.values()) {
      obj.image.destroy();
      obj.label.destroy();
      if (obj.alertIcon) obj.alertIcon.destroy();
    }
    this.tileObjects.clear();

    const placedTiles = this.state.tileSystem.getAllPlacedTiles();

    // Sort by depth (gy + gx) so front tiles render above back tiles
    placedTiles.sort((a, b) => (a.gy + a.gx) - (b.gy + b.gx));

    const activeEvent = this.state.eventSystem.getActiveEvent();

    for (const tile of placedTiles) {
      const { x, y } = this.gridToScreen(tile.gx, tile.gy);
      const spriteKey = tile.tileDef.spriteKey;

      const img = this.add.image(x, y, spriteKey)
        .setAngle(tile.rotation)
        .setInteractive({ useHandCursor: true });

      if (tile.isDamaged) {
        img.setTint(0x78716c); // Gray charred tint
      }

      // Title/building label
      const label = this.add.text(x, y + 26, tile.tileDef.name.split(' ')[0], {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '10px',
        color: '#e2e8f0',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(15);

      let alertIcon: Phaser.GameObjects.Image | undefined;

      // If this tile is the target of an active emergency/event!
      const isTarget = activeEvent && activeEvent.targetTile.gx === tile.gx && activeEvent.targetTile.gy === tile.gy;
      if (isTarget) {
        const iconKey = activeEvent.eventDef.type === 'CHALLENGE' ? 'icon_fire_alert' : 'icon_festival_alert';
        alertIcon = this.add.image(x, y - 28, iconKey)
          .setScale(1.1)
          .setDepth(30);

        // Pulsing bounce animation to draw attention
        this.tweens.add({
          targets: alertIcon,
          y: y - 36,
          scale: 1.25,
          duration: 600,
          yoyo: true,
          repeat: -1
        });
      }

      // Tile click handler
      img.on('pointerdown', () => {
        if (isTarget && activeEvent) {
          this.enterEventScene(activeEvent.eventDef.gameplaySceneKey);
        } else {
          this.state.soundSystem.playTileClick();
        }
      });

      this.tileObjects.set(`${tile.gx},${tile.gy}`, { image: img, alertIcon, label });
      this.tileContainer.add(img);
    }
  }

  private renderCulturalConnectionArcs(): void {
    this.connectionLinesContainer.clear();
    const synergies = this.state.culturalSystem.recalculateSynergies(this.state.tileSystem);

    for (const syn of synergies) {
      const posA = this.gridToScreen(syn.tileA.gx, syn.tileA.gy);
      const posB = this.gridToScreen(syn.tileB.gx, syn.tileB.gy);

      // Draw glowing cultural resonance arc
      this.connectionLinesContainer.lineStyle(3, 0xf59e0b, 0.8);
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 - 25; // Curved arch
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(posA.x, posA.y),
        new Phaser.Math.Vector2(midX, midY),
        new Phaser.Math.Vector2(posB.x, posB.y)
      );
      curve.draw(this.connectionLinesContainer, 24);

      // Golden connection bead
      this.connectionLinesContainer.fillStyle(0xfde047, 0.9);
      this.connectionLinesContainer.fillCircle(midX, midY, 4);
    }
  }

  private enterEventScene(sceneKey: string): void {
    this.state.soundSystem.playAlarm();

    // Dramatic camera zoom into the building
    this.cameras.main.zoomTo(1.6, 600, 'Cubic.easeInOut');
    this.cameras.main.fade(600, 0, 0, 0);

    this.time.delayedCall(650, () => {
      this.scene.start(sceneKey);
    });
  }

  private createDeckAndControlUI(): void {
    const { width, height } = this.cameras.main;

    this.deckContainer = this.add.container(0, 0).setDepth(500);

    // Bottom Action Bar Background
    const bottomBar = this.add.rectangle(width / 2, height - 42, width - 24, 72, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x334155);
    this.deckContainer.add(bottomBar);

    // 1. Current Tile Card
    const currentTile = this.state.tileSystem.getCurrentTile();
    this.currentTileCard = this.add.rectangle(130, height - 42, 220, 58, 0x1e293b, 0.95)
      .setStrokeStyle(1, 0x38bdf8);
    this.deckContainer.add(this.currentTileCard);

    this.currentTilePreviewImg = this.add.image(50, height - 42, currentTile?.spriteKey || 'tile_farm')
      .setScale(0.55);
    this.deckContainer.add(this.currentTilePreviewImg);

    this.currentTileNameText = this.add.text(90, height - 56, currentTile?.name || 'New Tile', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f8fafc'
    });
    this.deckContainer.add(this.currentTileNameText);

    this.currentTileCategoryText = this.add.text(90, height - 38, `${currentTile?.category || ''} • R to Rotate`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      color: '#38bdf8'
    });
    this.deckContainer.add(this.currentTileCategoryText);

    // 2. Rotate Button
    const rotateBtn = this.add.rectangle(290, height - 42, 85, 44, 0x0284c7)
      .setStrokeStyle(1, 0x38bdf8)
      .setInteractive({ useHandCursor: true });
    this.deckContainer.add(rotateBtn);

    this.rotateBtnText = this.add.text(290, height - 42, '🔄 Rotate\n(0°)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.deckContainer.add(this.rotateBtnText);

    rotateBtn.on('pointerdown', () => {
      this.handleRotate();
    });

    // 3. Travel to Central Haat Button
    const haatBtn = this.add.rectangle(width / 2 + 30, height - 42, 160, 44, 0xd97706)
      .setStrokeStyle(1, 0xfde047)
      .setInteractive({ useHandCursor: true });
    this.deckContainer.add(haatBtn);

    const haatText = this.add.text(width / 2 + 30, height - 42, '🏪 Central Haat\n(Trade & Tasks)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.deckContainer.add(haatText);

    haatBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      this.scene.start('HaatScene');
    });

    // 4. Cultural Symbols & Connections Guide Button
    const guideBtn = this.add.rectangle(width / 2 + 160, height - 42, 85, 44, 0x6366f1)
      .setStrokeStyle(1, 0xa5b4fc)
      .setInteractive({ useHandCursor: true });
    this.deckContainer.add(guideBtn);

    const guideText = this.add.text(width / 2 + 160, height - 42, '📜 Cultural\nGuide', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.deckContainer.add(guideText);

    guideBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      this.showCulturalGuideModal();
    });

    // 5. Test Fire Event Button (Proactively trigger fire mini-game)
    const testFireBtn = this.add.rectangle(width - 195, height - 42, 110, 44, 0xb91c1c)
      .setStrokeStyle(1, 0xf87171)
      .setInteractive({ useHandCursor: true });
    this.deckContainer.add(testFireBtn);

    const testFireText = this.add.text(width - 195, height - 42, '🔥 Trigger\nFire Event', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.deckContainer.add(testFireText);

    testFireBtn.on('pointerdown', () => {
      this.state.eventSystem.triggerSpecificEvent('fire_event', this.state.tileSystem);
      this.refreshEventState();
      this.state.soundSystem.playAlarm();
    });

    // 6. Next Round Button
    const nextRoundBtn = this.add.rectangle(width - 70, height - 42, 110, 44, 0x059669)
      .setStrokeStyle(1, 0x34d399)
      .setInteractive({ useHandCursor: true });
    this.deckContainer.add(nextRoundBtn);

    const nextRoundText = this.add.text(width - 70, height - 42, 'Next Round →\n(+3 Produce)', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.deckContainer.add(nextRoundText);

    nextRoundBtn.on('pointerdown', () => {
      this.state.soundSystem.playTradeCompleted();
      const result = this.state.advanceToNextRound();
      if (result.isGameOver) {
        this.scene.start('EndGameScene');
      } else {
        this.hud.refresh();
        this.renderIslandTiles();
        this.renderCulturalConnectionArcs();
        this.refreshEventState();
      }
    });
  }

  private handleRotate(): void {
    const rot = this.state.tileSystem.rotateCurrentTile();
    this.state.soundSystem.playTileRotate();
    this.rotateBtnText.setText(`🔄 Rotate\n(${rot}°)`);
    this.previewTileSprite.setAngle(rot);
  }

  private createEventBanner(): void {
    const { width } = this.cameras.main;
    this.eventBannerContainer = this.add.container(0, 0).setDepth(600).setVisible(false);

    const bannerBg = this.add.rectangle(width / 2, 115, width - 48, 38, 0xdc2626, 0.9)
      .setStrokeStyle(1.5, 0xfef08a)
      .setInteractive({ useHandCursor: true });
    this.eventBannerContainer.add(bannerBg);

    const bannerText = this.add.text(width / 2, 115, '', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.eventBannerContainer.add(bannerText);

    bannerBg.on('pointerdown', () => {
      const activeEvent = this.state.eventSystem.getActiveEvent();
      if (activeEvent) {
        this.enterEventScene(activeEvent.eventDef.gameplaySceneKey);
      }
    });
  }

  private refreshEventState(): void {
    const activeEvent = this.state.eventSystem.getActiveEvent();
    if (activeEvent) {
      this.eventBannerContainer.setVisible(true);
      const bgRect = this.eventBannerContainer.getAt(0) as Phaser.GameObjects.Rectangle;
      const txt = this.eventBannerContainer.getAt(1) as Phaser.GameObjects.Text;

      if (activeEvent.eventDef.type === 'CHALLENGE') {
        bgRect.setFillStyle(0xdc2626, 0.95);
        txt.setText(`🚨 ${activeEvent.eventDef.title} • CLICK TO ENTER 2D TOP-DOWN SCENE & EXTINGUISH! 🚨`);
      } else {
        bgRect.setFillStyle(0x7c3aed, 0.95);
        txt.setText(`🎉 ${activeEvent.eventDef.title} • CLICK TO ENTER 2D FESTIVAL PREPARATION! 🎉`);
      }
    } else {
      this.eventBannerContainer.setVisible(false);
    }
    this.renderIslandTiles();
    this.renderCulturalConnectionArcs();
  }

  private setupInputHandlers(): void {
    // Press R to Rotate Tile
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-R', () => {
        this.handleRotate();
      });
    }

    // Pointer move for tile preview
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Ignore if clicking UI
      if (pointer.y > this.cameras.main.height - 85 || pointer.y < 80) {
        this.previewTileSprite.setVisible(false);
        this.previewTileText.setVisible(false);
        this.hoveredGrid = null;
        return;
      }

      const grid = this.screenToGrid(pointer.x, pointer.y);
      this.hoveredGrid = grid;

      const currentTile = this.state.tileSystem.getCurrentTile();
      if (!currentTile) return;

      const { x, y } = this.gridToScreen(grid.gx, grid.gy);
      this.previewTileSprite.setPosition(x, y);
      this.previewTileSprite.setTexture(currentTile.spriteKey);
      this.previewTileSprite.setAngle(this.state.tileSystem.getCurrentRotation());
      this.previewTileSprite.setVisible(true);

      const isValid = this.state.tileSystem.isValidPlacement(grid.gx, grid.gy);
      if (isValid) {
        const matchResult = this.state.tileSystem.evaluateEdgeMatching(
          grid.gx,
          grid.gy,
          currentTile,
          this.state.tileSystem.getCurrentRotation()
        );
        this.previewTileSprite.setTint(0x4ade80); // Green valid
        this.previewTileText.setPosition(x, y - 24);
        this.previewTileText.setText(`Valid (+${matchResult.scoreBonus} pts)`);
        this.previewTileText.setColor('#4ade80');
        this.previewTileText.setVisible(true);
      } else {
        this.previewTileSprite.setTint(0xf87171); // Red invalid
        this.previewTileText.setPosition(x, y - 24);
        this.previewTileText.setText(this.state.tileSystem.getTileAt(grid.gx, grid.gy) ? 'Occupied' : 'Must connect to Island');
        this.previewTileText.setColor('#f87171');
        this.previewTileText.setVisible(true);
      }
    });

    // Pointer click for tile placement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > this.cameras.main.height - 85 || pointer.y < 80) return;
      if (!this.hoveredGrid) return;

      const currentTile = this.state.tileSystem.getCurrentTile();
      if (!currentTile) return;

      const rotation = this.state.tileSystem.getCurrentRotation();
      const placed = this.state.tileSystem.placeTile(
        this.hoveredGrid.gx,
        this.hoveredGrid.gy,
        currentTile,
        rotation,
        this.state.scoringSystem.getRound()
      );

      if (placed) {
        this.state.soundSystem.playTilePlace();
        
        // Edge connection evaluation
        const matchResult = this.state.tileSystem.evaluateEdgeMatching(
          placed.gx,
          placed.gy,
          placed.tileDef,
          rotation
        );
        this.state.scoringSystem.addEventScore(matchResult.scoreBonus);

        // Check cultural synergy updates
        const prevHarmony = this.state.culturalSystem.getCulturalHarmonyScore();
        this.state.culturalSystem.recalculateSynergies(this.state.tileSystem);
        const newHarmony = this.state.culturalSystem.getCulturalHarmonyScore();

        if (newHarmony > prevHarmony) {
          this.state.soundSystem.playCulturalConnect();
        }

        // Re-render
        this.renderIslandTiles();
        this.renderCulturalConnectionArcs();
        this.hud.refresh();

        // Update deck UI
        const nextTile = this.state.tileSystem.getCurrentTile();
        if (nextTile) {
          this.currentTileNameText.setText(nextTile.name);
          this.currentTileCategoryText.setText(`${nextTile.category} • R to Rotate`);
          this.currentTilePreviewImg.setTexture(nextTile.spriteKey);
          this.rotateBtnText.setText('🔄 Rotate\n(0°)');
        }
      }
    });
  }

  private showCulturalGuideModal(): void {
    const { width, height } = this.cameras.main;
    const modal = this.add.container(0, 0).setDepth(2000);

    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive();
    modal.add(blocker);

    const box = this.add.rectangle(width / 2, height / 2, 700, 480, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x6366f1);
    modal.add(box);

    const title = this.add.text(width / 2, height / 2 - 215, '📜 CULTURAL CONNECT & 20 CULTURAL SYMBOLS', {
      fontFamily: 'Cinzel, serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f59e0b'
    }).setOrigin(0.5);
    modal.add(title);

    // 20 Cultural Symbols Grid
    let col = 0;
    let row = 0;
    const startX = width / 2 - 300;
    const startY = height / 2 - 170;

    CULTURAL_SYMBOLS.forEach((sym) => {
      const sx = startX + col * 150;
      const sy = startY + row * 44;

      const symText = this.add.text(sx, sy, `${sym.glyph} ${sym.name}\n${sym.meaning}`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '10px',
        color: '#e2e8f0',
        lineSpacing: 2
      });
      modal.add(symText);

      col++;
      if (col >= 4) {
        col = 0;
        row++;
      }
    });

    // Close button
    const closeBtn = this.add.rectangle(width / 2, height / 2 + 205, 140, 36, 0x4f46e5)
      .setStrokeStyle(1, 0x818cf8)
      .setInteractive({ useHandCursor: true });
    modal.add(closeBtn);

    const closeText = this.add.text(width / 2, height / 2 + 205, 'Close Guide', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    modal.add(closeText);

    closeBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      modal.destroy();
    });
  }
}
