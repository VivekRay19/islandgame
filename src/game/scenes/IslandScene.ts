import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';
import { HUD } from '../ui/HUD';
import { PlacedHexTileInstance, HEX_DIRECTIONS } from '../systems/TileSystem';
import { TileDefinition } from '../data/tiles';

export class IslandScene extends Phaser.Scene {
  private state!: StateManager;
  private hud!: HUD;

  // Coordinate System metrics (Hexagonal Isometric Lattice)
  private readonly HEX_SPACING_X = 74;
  private readonly HEX_SPACING_Y = 44;
  private originX: number = 0;
  private originY: number = 0;

  // Containers
  private islandWorldContainer!: Phaser.GameObjects.Container;
  private slotsContainer!: Phaser.GameObjects.Container;
  private connectionsContainer!: Phaser.GameObjects.Graphics;
  private hudContainer!: Phaser.GameObjects.Container;

  // Tile Visuals
  private tileObjects: Map<string, { image: Phaser.GameObjects.Image; alertBadge?: Phaser.GameObjects.Image }> = new Map();
  private slotObjects: Map<string, Phaser.GameObjects.Image> = new Map();

  // Floating Next Tile Preview (Right side)
  private previewTileShadow!: Phaser.GameObjects.Ellipse;
  private previewTileSprite!: Phaser.GameObjects.Image;
  private previewTileContainer!: Phaser.GameObjects.Container;

  // Ghost Tile on Grid
  private ghostTileSprite!: Phaser.GameObjects.Image;
  private ghostTileText!: Phaser.GameObjects.Text;
  private hoveredSlot: { q: number; r: number } | null = null;

  // Physical 3D Tile Stack (Bottom-Right)
  private stackSprite!: Phaser.GameObjects.Image;
  private stackBadgeBg!: Phaser.GameObjects.Image;
  private stackCountText!: Phaser.GameObjects.Text;

  // Floating Context Landmark Card
  private activeLandmarkCard: Phaser.GameObjects.Container | null = null;

  // Event Alert Pill
  private eventPillContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    const { width, height } = this.cameras.main;

    // Centered island position
    this.originX = width * 0.46;
    this.originY = height * 0.44;

    // 1. Soft Pastel Pink Background (#E8A8C2) with very subtle radial light
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0xF2B5CE, 0xF2B5CE, 0xE5A0BC, 0xE5A0BC, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle radial light around the island center
    const radialGlow = this.add.ellipse(this.originX, this.originY, width * 0.7, height * 0.75, 0xFFFFFF, 0.08)
      .setDepth(1);

    // World Containers
    this.connectionsContainer = this.add.graphics().setDepth(5);
    this.slotsContainer = this.add.container(0, 0).setDepth(6);
    this.islandWorldContainer = this.add.container(0, 0).setDepth(10);
    this.hudContainer = this.add.container(0, 0).setDepth(500);

    // 2. Ghost Placement Preview Tile
    this.ghostTileSprite = this.add.image(0, 0, 'tile_farm')
      .setAlpha(0.75)
      .setVisible(false)
      .setDepth(20);
    this.ghostTileText = this.add.text(0, 0, '', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(90, 40, 60, 0.65)',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setVisible(false).setDepth(21);

    // 3. Initialize Minimalist Top HUD
    this.hud = new HUD(this);

    // 4. Render Board, Slots & Connections
    this.renderIslandTiles();
    this.renderPlacementSlots();
    this.renderCulturalConnectionArcs();

    // 5. Create Right-side Floating Next Tile & Bottom-Right Stack
    this.createFloatingNextTilePreview(width, height);
    this.createPhysicalTileStack(width, height);

    // 6. Create Bottom Minimal Controls Hint & Central Haat Button
    this.createMinimalControls(width, height);

    // 7. Organic Event Alert Pill
    this.createEventAlertPill(width);
    this.refreshEventState();

    // 8. Input Listeners
    this.setupInteractions();

    // Ensure initial event for immediate vertical slice demo
    if (this.state.scoringSystem.getRound() === 1 && !this.state.eventSystem.getActiveEvent()) {
      this.state.eventSystem.triggerSpecificEvent('fire_event', this.state.tileSystem);
      this.refreshEventState();
    }
  }

  private hexToScreen(q: number, r: number): { x: number; y: number } {
    const x = this.originX + q * this.HEX_SPACING_X + r * (this.HEX_SPACING_X / 2);
    const y = this.originY + r * this.HEX_SPACING_Y;
    return { x, y };
  }

  private screenToHex(screenX: number, screenY: number): { q: number; r: number } {
    const dx = screenX - this.originX;
    const dy = screenY - this.originY;

    const r = Math.round(dy / this.HEX_SPACING_Y);
    const q = Math.round((dx - r * (this.HEX_SPACING_X / 2)) / this.HEX_SPACING_X);
    return { q, r };
  }

  private renderIslandTiles(): void {
    for (const obj of this.tileObjects.values()) {
      obj.image.destroy();
      if (obj.alertBadge) obj.alertBadge.destroy();
    }
    this.tileObjects.clear();

    const placedTiles = this.state.tileSystem.getAllPlacedTiles();

    // Sort isometric depth by row r, then q
    placedTiles.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.q - b.q));

    const activeEvent = this.state.eventSystem.getActiveEvent();

    for (const tile of placedTiles) {
      const { x, y } = this.hexToScreen(tile.q, tile.r);
      const spriteKey = tile.tileDef.spriteKey;

      const img = this.add.image(x, y, spriteKey)
        .setAngle(tile.rotation)
        .setInteractive({ useHandCursor: true });

      if (tile.isDamaged) {
        img.setTint(0x8a7e7a); // Subtle smoke char
      }

      // Gentle tactile hover lift
      img.on('pointerover', () => {
        this.tweens.add({
          targets: img,
          y: y - 4,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      img.on('pointerout', () => {
        this.tweens.add({
          targets: img,
          y: y,
          duration: 150,
          ease: 'Sine.easeIn'
        });
      });

      let alertBadge: Phaser.GameObjects.Image | undefined;

      // Event target marker
      const isTarget = activeEvent && activeEvent.targetTile.q === tile.q && activeEvent.targetTile.r === tile.r;
      if (isTarget) {
        const iconKey = activeEvent.eventDef.type === 'CHALLENGE' ? 'icon_fire_alert' : 'icon_festival_alert';
        alertBadge = this.add.image(x, y - 28, iconKey)
          .setScale(1.0)
          .setDepth(35);

        this.tweens.add({
          targets: alertBadge,
          y: y - 35,
          scale: 1.15,
          duration: 600,
          yoyo: true,
          repeat: -1
        });
      }

      // Click handler
      img.on('pointerdown', () => {
        if (isTarget && activeEvent) {
          this.enterEventScene(activeEvent.eventDef.gameplaySceneKey);
        } else {
          this.showLandmarkInfoCard(tile, x, y);
        }
      });

      this.tileObjects.set(`${tile.q},${tile.r}`, { image: img, alertBadge });
      this.islandWorldContainer.add(img);
    }
  }

  private renderPlacementSlots(): void {
    for (const slot of this.slotObjects.values()) {
      slot.destroy();
    }
    this.slotObjects.clear();

    const availableSlots = this.state.tileSystem.getAvailablePlacementSlots();

    for (const slot of availableSlots) {
      const { x, y } = this.hexToScreen(slot.q, slot.r);
      const slotImg = this.add.image(x, y, 'hex_slot_empty')
        .setAlpha(0.65)
        .setInteractive({ useHandCursor: true });

      slotImg.on('pointerover', () => {
        slotImg.setAlpha(0.95);
      });

      slotImg.on('pointerout', () => {
        slotImg.setAlpha(0.65);
      });

      slotImg.on('pointerdown', () => {
        this.handleSlotClick(slot.q, slot.r);
      });

      this.slotObjects.set(`${slot.q},${slot.r}`, slotImg);
      this.slotsContainer.add(slotImg);
    }
  }

  private renderCulturalConnectionArcs(): void {
    this.connectionsContainer.clear();
    const synergies = this.state.culturalSystem.recalculateSynergies(this.state.tileSystem);

    for (const syn of synergies) {
      const posA = this.hexToScreen(syn.tileA.q, syn.tileA.r);
      const posB = this.hexToScreen(syn.tileB.q, syn.tileB.r);

      // Soft magical connection arch
      this.connectionsContainer.lineStyle(2.5, 0xFDE047, 0.85);
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2 - 20;

      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(posA.x, posA.y),
        new Phaser.Math.Vector2(midX, midY),
        new Phaser.Math.Vector2(posB.x, posB.y)
      );
      curve.draw(this.connectionsContainer, 20);

      this.connectionsContainer.fillStyle(0xFFFFFF, 0.95);
      this.connectionsContainer.fillCircle(midX, midY, 3);
    }
  }

  private createFloatingNextTilePreview(width: number, height: number): void {
    const previewX = width * 0.86;
    const previewY = height * 0.54;

    this.previewTileContainer = this.add.container(previewX, previewY).setDepth(200);

    // Soft diffuse shadow
    this.previewTileShadow = this.add.ellipse(0, 36, 68, 28, 0x783C50, 0.22);
    this.previewTileContainer.add(this.previewTileShadow);

    const currentTile = this.state.tileSystem.getCurrentTile();
    this.previewTileSprite = this.add.image(0, 0, currentTile?.spriteKey || 'tile_farm')
      .setInteractive({ useHandCursor: true });
    this.previewTileContainer.add(this.previewTileSprite);

    // Gentle floating bob animation
    this.tweens.add({
      targets: this.previewTileSprite,
      y: -6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Clicking the preview tile rotates it!
    this.previewTileSprite.on('pointerdown', () => {
      this.handleRotate();
    });

    this.previewTileSprite.on('pointerover', () => {
      this.previewTileSprite.setScale(1.08);
      this.previewTileShadow.setScale(1.08);
    });

    this.previewTileSprite.on('pointerout', () => {
      this.previewTileSprite.setScale(1.0);
      this.previewTileShadow.setScale(1.0);
    });
  }

  private createPhysicalTileStack(width: number, height: number): void {
    const stackX = width * 0.91;
    const stackY = height * 0.83;

    // 3D Hex Stack Tile Pile
    this.stackSprite = this.add.image(stackX, stackY, 'tile_stack_pile')
      .setDepth(150);

    // White hexagonal count badge "65"
    this.stackBadgeBg = this.add.image(stackX - 38, stackY + 28, 'hex_badge_white')
      .setDepth(160);

    this.stackCountText = this.add.text(stackX - 38, stackY + 28, `${this.state.tileSystem.getDeckCount()}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#332924'
    }).setOrigin(0.5).setDepth(161);
  }

  private createMinimalControls(width: number, height: number): void {
    // 1. Tiny unobtrusive controls hint at bottom center
    const hintText = this.add.text(width / 2, height - 24, 'R ROTATE  •  CLICK TO PLACE  •  CLICK BUILDINGS TO VISIT HAAT', {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: 'rgba(255, 255, 255, 0.75)',
      letterSpacing: 1.2
    }).setOrigin(0.5).setDepth(100);

    // 2. Minimal Floating Haat & Next Round Action Buttons (Bottom Left)
    const haatBtn = this.add.circle(44, height - 44, 22, 0xFFFFFF, 0.9)
      .setStrokeStyle(1.5, 0xE5A0BC)
      .setInteractive({ useHandCursor: true })
      .setDepth(200);

    const haatIcon = this.add.text(44, height - 44, '🏪', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(201);

    haatBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      this.scene.start('HaatScene');
    });

    const roundBtn = this.add.circle(94, height - 44, 22, 0xFFFFFF, 0.9)
      .setStrokeStyle(1.5, 0xE5A0BC)
      .setInteractive({ useHandCursor: true })
      .setDepth(200);

    const roundIcon = this.add.text(94, height - 44, '⏳', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(201);

    roundBtn.on('pointerdown', () => {
      this.state.soundSystem.playTradeCompleted();
      const res = this.state.advanceToNextRound();
      if (res.isGameOver) {
        this.scene.start('EndGameScene');
      } else {
        this.hud.refresh();
        this.renderIslandTiles();
        this.renderPlacementSlots();
        this.renderCulturalConnectionArcs();
        this.refreshEventState();
        this.stackCountText.setText(`${this.state.tileSystem.getDeckCount()}`);
      }
    });
  }

  private createEventAlertPill(width: number): void {
    this.eventPillContainer = this.add.container(width / 2, 85).setDepth(600).setVisible(false);

    const pillBg = this.add.rectangle(0, 0, 360, 36, 0xFFFFFF, 0.95)
      .setStrokeStyle(1.5, 0xDC2626)
      .setInteractive({ useHandCursor: true });
    this.eventPillContainer.add(pillBg);

    const pillText = this.add.text(0, 0, '', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#B91C1C'
    }).setOrigin(0.5);
    this.eventPillContainer.add(pillText);

    pillBg.on('pointerdown', () => {
      const activeEvent = this.state.eventSystem.getActiveEvent();
      if (activeEvent) {
        this.enterEventScene(activeEvent.eventDef.gameplaySceneKey);
      }
    });
  }

  private refreshEventState(): void {
    const activeEvent = this.state.eventSystem.getActiveEvent();
    if (activeEvent) {
      this.eventPillContainer.setVisible(true);
      const txt = this.eventPillContainer.getAt(1) as Phaser.GameObjects.Text;
      if (activeEvent.eventDef.type === 'CHALLENGE') {
        txt.setText(`🔥 Fire Outbreak at Craft Workshop • CLICK TO ENTER`);
      } else {
        txt.setText(`🎉 Seasonal Festival Gathering • CLICK TO ENTER`);
      }
    } else {
      this.eventPillContainer.setVisible(false);
    }
    this.renderIslandTiles();
    this.renderPlacementSlots();
    this.renderCulturalConnectionArcs();
  }

  private handleRotate(): void {
    const rot = this.state.tileSystem.rotateCurrentTile();
    this.state.soundSystem.playTileRotate();

    // Smooth tactile rotation animation
    this.tweens.add({
      targets: this.previewTileSprite,
      angle: rot,
      duration: 220,
      ease: 'Cubic.easeOut'
    });
    this.ghostTileSprite.setAngle(rot);
  }

  private setupInteractions(): void {
    // Keyboard 'R' to rotate
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-R', () => {
        this.handleRotate();
      });
    }

    // Pointer move to preview placement over open slots
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const hex = this.screenToHex(pointer.x, pointer.y);
      const key = `${hex.q},${hex.r}`;

      if (this.slotObjects.has(key)) {
        this.hoveredSlot = hex;
        const { x, y } = this.hexToScreen(hex.q, hex.r);
        const currentTile = this.state.tileSystem.getCurrentTile();
        if (currentTile) {
          this.ghostTileSprite.setPosition(x, y);
          this.ghostTileSprite.setTexture(currentTile.spriteKey);
          this.ghostTileSprite.setAngle(this.state.tileSystem.getCurrentRotation());
          this.ghostTileSprite.setVisible(true);

          const match = this.state.tileSystem.evaluateEdgeMatching(
            hex.q,
            hex.r,
            currentTile,
            this.state.tileSystem.getCurrentRotation()
          );

          this.ghostTileText.setPosition(x, y - 28);
          this.ghostTileText.setText(match.scoreBonus > 0 ? `+${match.scoreBonus} pts` : 'Place Tile');
          this.ghostTileText.setVisible(true);
        }
      } else {
        this.hoveredSlot = null;
        this.ghostTileSprite.setVisible(false);
        this.ghostTileText.setVisible(false);
      }
    });

    // Close open landmark card on empty canvas click
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeLandmarkCard) {
        // Dismiss card if click is far away
        const cardX = this.activeLandmarkCard.x;
        const cardY = this.activeLandmarkCard.y;
        if (Phaser.Math.Distance.Between(pointer.x, pointer.y, cardX, cardY) > 130) {
          this.activeLandmarkCard.destroy();
          this.activeLandmarkCard = null;
        }
      }
    });
  }

  private handleSlotClick(q: number, r: number): void {
    const currentTile = this.state.tileSystem.getCurrentTile();
    if (!currentTile) return;

    const rotation = this.state.tileSystem.getCurrentRotation();
    const placed = this.state.tileSystem.placeTile(
      q,
      r,
      currentTile,
      rotation,
      this.state.scoringSystem.getRound()
    );

    if (placed) {
      this.state.soundSystem.playTilePlace();

      const match = this.state.tileSystem.evaluateEdgeMatching(q, r, placed.tileDef, rotation);
      this.state.scoringSystem.addEventScore(match.scoreBonus);

      const prevHarmony = this.state.culturalSystem.getCulturalHarmonyScore();
      this.state.culturalSystem.recalculateSynergies(this.state.tileSystem);
      const newHarmony = this.state.culturalSystem.getCulturalHarmonyScore();

      if (newHarmony > prevHarmony) {
        this.state.soundSystem.playCulturalConnect();
      }

      // Re-render
      this.renderIslandTiles();
      this.renderPlacementSlots();
      this.renderCulturalConnectionArcs();
      this.hud.refresh();

      // Update Preview Tile & Stack
      const next = this.state.tileSystem.getCurrentTile();
      if (next) {
        this.previewTileSprite.setTexture(next.spriteKey);
        this.previewTileSprite.setAngle(0);
      }
      this.stackCountText.setText(`${this.state.tileSystem.getDeckCount()}`);

      this.ghostTileSprite.setVisible(false);
      this.ghostTileText.setVisible(false);
    }
  }

  private showLandmarkInfoCard(tile: PlacedHexTileInstance, x: number, y: number): void {
    if (this.activeLandmarkCard) {
      this.activeLandmarkCard.destroy();
      this.activeLandmarkCard = null;
    }

    this.state.soundSystem.playTileClick();

    // Tactile physical paper card floating near building
    const card = this.add.container(x, y - 55).setDepth(1500);

    const cardBg = this.add.rectangle(0, 0, 180, 110, 0xFFFFFF, 0.96)
      .setStrokeStyle(1.5, 0xE5A0BC);
    card.add(cardBg);

    const nameText = this.add.text(0, -38, `${tile.tileDef.symbol} ${tile.tileDef.name}`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#332924',
      align: 'center'
    }).setOrigin(0.5);
    card.add(nameText);

    const descText = this.add.text(0, -12, tile.tileDef.description, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '9.5px',
      color: '#64748B',
      align: 'center',
      wordWrap: { width: 160 }
    }).setOrigin(0.5);
    card.add(descText);

    // "Visit Central Haat" button inside card
    const haatBtn = this.add.rectangle(0, 28, 140, 24, 0xB86D4F)
      .setInteractive({ useHandCursor: true });
    card.add(haatBtn);

    const haatBtnText = this.add.text(0, 28, 'Visit Central Haat ➜', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    card.add(haatBtnText);

    haatBtn.on('pointerdown', () => {
      this.scene.start('HaatScene');
    });

    this.activeLandmarkCard = card;
  }

  private enterEventScene(sceneKey: string): void {
    this.state.soundSystem.playAlarm();

    // Smooth camera zoom into the affected building
    this.cameras.main.zoomTo(1.8, 700, 'Cubic.easeInOut');
    this.cameras.main.fade(700, 232, 168, 194); // Fade to pastel pink

    this.time.delayedCall(750, () => {
      this.scene.start(sceneKey);
    });
  }
}
