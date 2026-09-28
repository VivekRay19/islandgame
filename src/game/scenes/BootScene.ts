import Phaser from 'phaser';
import { TileArtworkGenerator } from '../graphics/TileArtworkGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Soft pastel pink loading screen (#E8A8C2)
    this.cameras.main.setBackgroundColor('#E8A8C2');
    
    const loadingText = this.add.text(width / 2, height / 2, 'ISLAND HAAT', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '22px',
      color: '#ffffff',
      letterSpacing: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: loadingText,
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  create(): void {
    this.generateDioramaTextures();
    this.createAnimations();

    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }

  private generateDioramaTextures(): void {
    const textures = this.textures;

    // 1. High-Fidelity 3D Miniature Diorama Hexagonal Tiles
    textures.addCanvas('tile_farm', TileArtworkGenerator.generateFarmTile());
    textures.addCanvas('tile_craft', TileArtworkGenerator.generateCraftTile());
    textures.addCanvas('tile_market', TileArtworkGenerator.generateMarketTile());
    textures.addCanvas('tile_civic', TileArtworkGenerator.generateCivicTile());
    textures.addCanvas('tile_music', TileArtworkGenerator.generateMusicTile());
    textures.addCanvas('tile_shrine', TileArtworkGenerator.generateShrineTile());
    textures.addCanvas('tile_clay', TileArtworkGenerator.generateClayTile());
    textures.addCanvas('tile_water', TileArtworkGenerator.generateWaterTile());
    textures.addCanvas('tile_forest', TileArtworkGenerator.generateForestTile());
    textures.addCanvas('tile_mountain', TileArtworkGenerator.generateMountainTile());

    // 2. Open Hex Placement Slot (translucent white glowing hex like Dorfromantik reference)
    this.createHexSlotTexture();

    // 3. Physical 3D Tile Stack (Bottom-Right Pile)
    this.createHexStackTexture();

    // 4. White Hex Count Badge
    this.createHexBadgeTexture();

    // 5. Minimalist Cultural Symbols & UI Icons
    this.createCultureIcon();
    this.createEventBadge('icon_fire_alert', '🔥', '#dc2626');
    this.createEventBadge('icon_festival_alert', '🎉', '#7c3aed');

    // 6. 2D Mini-game Assets
    this.createMiniGameAssets();
  }

  private createHexSlotTexture(): void {
    const w = 116;
    const h = 104;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = 42;
    const r = 47;

    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      pts.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle) * 0.72
      });
    }

    // Translucent soft white-pink fill
    ctx.fillStyle = 'rgba(255, 245, 250, 0.4)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Soft border glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    this.textures.addCanvas('hex_slot_empty', canvas);
  }

  private createHexStackTexture(): void {
    const w = 92;
    const h = 136;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const radius = 38;

    const drawSlice = (y: number, baseColor: string, sideColor: string) => {
      const top = getHexPts(y);
      const btm = getHexPts(y + 6);

      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(top[1].x, top[1].y);
      ctx.lineTo(top[4].x, top[4].y);
      ctx.lineTo(btm[4].x, btm[4].y);
      ctx.lineTo(btm[1].x, btm[1].y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(top[0].x, top[0].y);
      for (let j = 1; j < 6; j++) ctx.lineTo(top[j].x, top[j].y);
      ctx.closePath();
      ctx.fill();
    };

    const getHexPts = (cy: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i + 30);
        pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) * 0.68 });
      }
      return pts;
    };

    // Draw stacked 12 hex diorama slices
    const colors = ['#4E6844', '#73553D', '#7F9560', '#9A714C', '#4E6844', '#73553D', '#7F9560', '#B96D4E', '#4E6844', '#73553D', '#7F9560', '#5D7C52'];
    for (let i = 0; i < 12; i++) {
      const y = 104 - i * 6;
      const top = getHexPts(y);
      const btm = getHexPts(y + 6);

      ctx.fillStyle = '#382D24';
      ctx.beginPath();
      ctx.moveTo(top[1].x, top[1].y);
      ctx.lineTo(top[4].x, top[4].y);
      ctx.lineTo(btm[4].x, btm[4].y);
      ctx.lineTo(btm[1].x, btm[1].y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(top[0].x, top[0].y);
      for (let j = 1; j < 6; j++) ctx.lineTo(top[j].x, top[j].y);
      ctx.closePath();
      ctx.fill();
    }

    // Top slice foliage
    const topPts = getHexPts(32);
    ctx.fillStyle = '#4E6844';
    ctx.beginPath();
    ctx.moveTo(topPts[0].x, topPts[0].y);
    for (let j = 1; j < 6; j++) ctx.lineTo(topPts[j].x, topPts[j].y);
    ctx.closePath();
    ctx.fill();

    // Mini pines on top stack
    ctx.fillStyle = '#3A4D2E';
    ctx.beginPath();
    ctx.arc(cx - 8, 24, 6, 0, Math.PI * 2);
    ctx.arc(cx + 7, 22, 7, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas('tile_stack_pile', canvas);
  }

  private createHexBadgeTexture(): void {
    const size = 38;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const r = 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    this.textures.addCanvas('hex_badge_white', canvas);
  }

  private createCultureIcon(): void {
    const size = 28;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(14, 18, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.quadraticCurveTo(8, 14, 14, 16);
    ctx.quadraticCurveTo(20, 14, 14, 4);
    ctx.fill();

    this.textures.addCanvas('icon_culture_badge', canvas);
  }

  private createEventBadge(key: string, emoji: string, bgColor: string): void {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 1);
    this.textures.addCanvas(key, canvas);
  }

  private createMiniGameAssets(): void {
    const charCanvas = document.createElement('canvas');
    charCanvas.width = 128;
    charCanvas.height = 32;
    const ctxC = charCanvas.getContext('2d')!;

    for (let f = 0; f < 4; f++) {
      const ox = f * 32;
      ctxC.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctxC.beginPath();
      ctxC.ellipse(ox + 16, 28, 8, 4, 0, 0, Math.PI * 2);
      ctxC.fill();

      ctxC.fillStyle = '#B96D4E';
      ctxC.fillRect(ox + 11, 14, 10, 11);
      ctxC.fillStyle = '#D97706';
      ctxC.fillRect(ox + 10, 14, 3, 11);

      ctxC.fillStyle = '#FCD34D';
      ctxC.beginPath();
      ctxC.arc(ox + 16, 10, 5.5, 0, Math.PI * 2);
      ctxC.fill();

      ctxC.fillStyle = '#92400E';
      ctxC.beginPath();
      ctxC.arc(ox + 16, 8, 6, Math.PI, Math.PI * 2);
      ctxC.fill();

      if (f === 0) {
        ctxC.fillStyle = '#1E293B';
        ctxC.fillRect(ox + 13, 10, 2, 2);
        ctxC.fillRect(ox + 17, 10, 2, 2);
      }
    }
    this.textures.addCanvas('player_sheet', charCanvas);

    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 128;
    fireCanvas.height = 32;
    const ctxF = fireCanvas.getContext('2d')!;
    for (let f = 0; f < 4; f++) {
      const ox = f * 32;
      const hOffset = Math.sin(f * Math.PI / 2) * 3;
      ctxF.fillStyle = '#EA580C';
      ctxF.beginPath();
      ctxF.moveTo(ox + 8, 28);
      ctxF.quadraticCurveTo(ox + 4, 14, ox + 16, 6 + hOffset);
      ctxF.quadraticCurveTo(ox + 28, 14, ox + 24, 28);
      ctxF.closePath();
      ctxF.fill();

      ctxF.fillStyle = '#FDE047';
      ctxF.beginPath();
      ctxF.arc(ox + 16, 22, 4, 0, Math.PI * 2);
      ctxF.fill();
    }
    this.textures.addCanvas('fire_sheet', fireCanvas);

    const wellCanvas = document.createElement('canvas');
    wellCanvas.width = 44;
    wellCanvas.height = 44;
    const ctxW = wellCanvas.getContext('2d')!;
    ctxW.fillStyle = '#52525B';
    ctxW.beginPath();
    ctxW.ellipse(22, 28, 16, 10, 0, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.fillStyle = '#82AFC0';
    ctxW.beginPath();
    ctxW.ellipse(22, 28, 10, 6, 0, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.fillStyle = '#73553D';
    ctxW.fillRect(8, 6, 4, 24);
    ctxW.fillRect(32, 6, 4, 24);
    ctxW.fillRect(6, 4, 32, 6);
    this.textures.addCanvas('water_well', wellCanvas);

    const bucketCanvas = document.createElement('canvas');
    bucketCanvas.width = 28;
    bucketCanvas.height = 28;
    const ctxB = bucketCanvas.getContext('2d')!;
    ctxB.fillStyle = '#82AFC0';
    ctxB.fillRect(6, 10, 16, 14);
    ctxB.strokeStyle = '#FFFFFF';
    ctxB.lineWidth = 1.5;
    ctxB.strokeRect(6, 10, 16, 14);
    this.textures.addCanvas('water_bucket', bucketCanvas);

    this.createCircleParticle('particle_water', '#82AFC0', 3);
    this.createCircleParticle('particle_smoke', '#94A3B8', 5);
    this.createCircleParticle('particle_spark', '#FDE047', 3);
    this.createCircleParticle('particle_confetti', '#F43F5E', 3);

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 32;
    floorCanvas.height = 32;
    const ctxFl = floorCanvas.getContext('2d')!;
    ctxFl.fillStyle = '#78350F';
    ctxFl.fillRect(0, 0, 32, 32);
    ctxFl.strokeStyle = '#92400E';
    ctxFl.lineWidth = 1;
    ctxFl.strokeRect(0, 0, 32, 32);
    this.textures.addCanvas('floor_wood', floorCanvas);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 32;
    wallCanvas.height = 32;
    const ctxWl = wallCanvas.getContext('2d')!;
    ctxWl.fillStyle = '#475569';
    ctxWl.fillRect(0, 0, 32, 32);
    ctxWl.strokeStyle = '#64748B';
    ctxWl.lineWidth = 2;
    ctxWl.strokeRect(1, 1, 30, 30);
    this.textures.addCanvas('wall_stone', wallCanvas);

    const altarCanvas = document.createElement('canvas');
    altarCanvas.width = 56;
    altarCanvas.height = 42;
    const ctxA = altarCanvas.getContext('2d')!;
    ctxA.fillStyle = '#B45309';
    ctxA.fillRect(4, 10, 48, 28);
    ctxA.fillStyle = '#DC2626';
    ctxA.fillRect(6, 10, 44, 8);
    this.textures.addCanvas('festival_altar', altarCanvas);

    this.createItemIcon('offering_garland', '🌺', '#EC4899');
    this.createItemIcon('offering_grain_pot', '🌾', '#EAB308');
    this.createItemIcon('offering_flute', '🪈', '#38BDF8');
  }

  private createCircleParticle(key: string, color: string, radius: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = radius * 2 + 4;
    canvas.height = radius * 2 + 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(radius + 2, radius + 2, radius, 0, Math.PI * 2);
    ctx.fill();
    this.textures.addCanvas(key, canvas);
  }

  private createItemIcon(key: string, emoji: string, bgColor: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(14, 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 14, 14);
    this.textures.addCanvas(key, canvas);
  }

  private createAnimations(): void {
    this.anims.create({
      key: 'fire_flicker',
      frames: [
        { key: 'fire_sheet', frame: 0 },
        { key: 'fire_sheet', frame: 1 },
        { key: 'fire_sheet', frame: 2 },
        { key: 'fire_sheet', frame: 3 }
      ],
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'player_walk_down',
      frames: [{ key: 'player_sheet', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_walk_up',
      frames: [{ key: 'player_sheet', frame: 1 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_walk_left',
      frames: [{ key: 'player_sheet', frame: 2 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_walk_right',
      frames: [{ key: 'player_sheet', frame: 3 }],
      frameRate: 1
    });
  }
}
