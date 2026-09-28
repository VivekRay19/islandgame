import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.add.text(width / 2, height / 2, 'Weaving Cultural Islands...', {
      fontFamily: 'Cinzel, serif',
      fontSize: '24px',
      color: '#fbbf24'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: loadingText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });
  }

  create(): void {
    this.generateProceduralTextures();
    this.createAnimations();

    // Proceed to MainMenuScene
    this.time.delayedCall(400, () => {
      this.scene.start('MainMenuScene');
    });
  }

  private generateProceduralTextures(): void {
    const textures = this.textures;

    // 1. Base Tile Texture (Isometric-style rounded diamond / tile slab 120x80)
    const tileW = 120;
    const tileH = 80;
    
    this.createTileTexture('tile_farm', '#15803d', '#eab308', '🌾', 'Farm');
    this.createTileTexture('tile_craft', '#1e3a5f', '#ec4899', '🧵', 'Craft');
    this.createTileTexture('tile_market', '#7c2d12', '#f59e0b', '🏪', 'Haat');
    this.createTileTexture('tile_civic', '#451a03', '#93c5fd', '🏛️', 'Civic');
    this.createTileTexture('tile_music', '#581c87', '#c084fc', '🎵', 'Music');
    this.createTileTexture('tile_shrine', '#831843', '#fde047', '🪔', 'Shrine');
    this.createTileTexture('tile_clay', '#9a3412', '#fdba74', '🏺', 'Clay');
    this.createTileTexture('tile_water', '#0369a1', '#38bdf8', '💧', 'Water');
    this.createTileTexture('tile_forest', '#14532d', '#4ade80', '🪵', 'Forest');
    this.createTileTexture('tile_mountain', '#3f3f46', '#a1a1aa', '🪨', 'Stone');

    // 2. 2D Top-down Character Spritesheet (128x32 - 4 frames: Down, Up, Left, Right)
    const charCanvas = document.createElement('canvas');
    charCanvas.width = 128;
    charCanvas.height = 32;
    const ctxC = charCanvas.getContext('2d')!;

    for (let f = 0; f < 4; f++) {
      const ox = f * 32;
      // Shadow
      ctxC.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctxC.beginPath();
      ctxC.ellipse(ox + 16, 28, 9, 4, 0, 0, Math.PI * 2);
      ctxC.fill();

      // Body (Traditional tunic / Kurta with cultural drape)
      ctxC.fillStyle = '#d97706'; // Saffron amber
      ctxC.fillRect(ox + 10, 14, 12, 11);
      // Sash/Angavastram
      ctxC.fillStyle = '#dc2626';
      ctxC.fillRect(ox + 9, 14, 4, 11);

      // Head
      ctxC.fillStyle = '#fcd34d'; // Warm skin tone
      ctxC.beginPath();
      ctxC.arc(ox + 16, 10, 6, 0, Math.PI * 2);
      ctxC.fill();

      // Hair / Turban
      ctxC.fillStyle = '#b45309';
      ctxC.beginPath();
      ctxC.arc(ox + 16, 8, 6.5, Math.PI, Math.PI * 2);
      ctxC.fill();

      // Face direction features
      ctxC.fillStyle = '#1e293b';
      if (f === 0) { // Down
        ctxC.fillRect(ox + 13, 10, 2, 2);
        ctxC.fillRect(ox + 17, 10, 2, 2);
      } else if (f === 1) { // Up
        // Back of turban
        ctxC.fillStyle = '#92400e';
        ctxC.arc(ox + 16, 9, 4, 0, Math.PI * 2);
        ctxC.fill();
      } else if (f === 2) { // Left
        ctxC.fillRect(ox + 12, 10, 2, 2);
      } else if (f === 3) { // Right
        ctxC.fillRect(ox + 18, 10, 2, 2);
      }
    }
    textures.addCanvas('player_sheet', charCanvas);

    // 3. Fire Animation Frames (128x32 - 4 frames)
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 128;
    fireCanvas.height = 32;
    const ctxF = fireCanvas.getContext('2d')!;

    for (let f = 0; f < 4; f++) {
      const ox = f * 32;
      const hOffset = Math.sin(f * Math.PI / 2) * 3;

      // Outer orange flame
      ctxF.fillStyle = '#ea580c';
      ctxF.beginPath();
      ctxF.moveTo(ox + 6, 28);
      ctxF.quadraticCurveTo(ox + 2, 14, ox + 16, 4 + hOffset);
      ctxF.quadraticCurveTo(ox + 30, 14, ox + 26, 28);
      ctxF.closePath();
      ctxF.fill();

      // Inner yellow flame
      ctxF.fillStyle = '#fde047';
      ctxF.beginPath();
      ctxF.moveTo(ox + 10, 28);
      ctxF.quadraticCurveTo(ox + 8, 18, ox + 16, 10 + hOffset);
      ctxF.quadraticCurveTo(ox + 24, 18, ox + 22, 28);
      ctxF.closePath();
      ctxF.fill();

      // Core white heat
      ctxF.fillStyle = '#ffffff';
      ctxF.beginPath();
      ctxF.arc(ox + 16, 22, 3, 0, Math.PI * 2);
      ctxF.fill();
    }
    textures.addCanvas('fire_sheet', fireCanvas);

    // 4. Water Well Texture (48x48)
    const wellCanvas = document.createElement('canvas');
    wellCanvas.width = 48;
    wellCanvas.height = 48;
    const ctxW = wellCanvas.getContext('2d')!;
    // Well stone rim
    ctxW.fillStyle = '#52525b';
    ctxW.beginPath();
    ctxW.ellipse(24, 30, 18, 12, 0, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.lineWidth = 4;
    ctxW.strokeStyle = '#71717a';
    ctxW.stroke();
    // Well water inside
    ctxW.fillStyle = '#0284c7';
    ctxW.beginPath();
    ctxW.ellipse(24, 30, 12, 7, 0, 0, Math.PI * 2);
    ctxW.fill();
    // Wooden canopy frame
    ctxW.fillStyle = '#78350f';
    ctxW.fillRect(8, 8, 4, 24);
    ctxW.fillRect(36, 8, 4, 24);
    ctxW.fillRect(6, 6, 36, 6);
    // Rope & bucket
    ctxW.fillStyle = '#fbbf24';
    ctxW.fillRect(23, 12, 2, 10);
    ctxW.fillStyle = '#0369a1';
    ctxW.fillRect(20, 20, 8, 6);
    textures.addCanvas('water_well', wellCanvas);

    // 5. Water Bucket Icon (32x32)
    const bucketCanvas = document.createElement('canvas');
    bucketCanvas.width = 32;
    bucketCanvas.height = 32;
    const ctxB = bucketCanvas.getContext('2d')!;
    ctxB.fillStyle = '#0284c7';
    ctxB.beginPath();
    ctxB.moveTo(8, 12);
    ctxB.lineTo(24, 12);
    ctxB.lineTo(21, 28);
    ctxB.lineTo(11, 28);
    ctxB.closePath();
    ctxB.fill();
    ctxB.strokeStyle = '#38bdf8';
    ctxB.lineWidth = 2;
    ctxB.stroke();
    // Bucket handle
    ctxB.beginPath();
    ctxB.arc(16, 12, 8, Math.PI, 0);
    ctxB.strokeStyle = '#e2e8f0';
    ctxB.stroke();
    textures.addCanvas('water_bucket', bucketCanvas);

    // 6. Particles
    this.createCircleParticle('particle_water', '#38bdf8', 4);
    this.createCircleParticle('particle_smoke', '#64748b', 6);
    this.createCircleParticle('particle_spark', '#fbbf24', 3);
    this.createCircleParticle('particle_confetti', '#f43f5e', 4);

    // 7. Event Indicators
    this.createEventBadge('icon_fire_alert', '🔥', '#dc2626');
    this.createEventBadge('icon_festival_alert', '🎉', '#7c3aed');

    // 8. 2D Mini-game Workshop Wall/Floor tiles
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 32;
    floorCanvas.height = 32;
    const ctxFl = floorCanvas.getContext('2d')!;
    ctxFl.fillStyle = '#78350f';
    ctxFl.fillRect(0, 0, 32, 32);
    ctxFl.strokeStyle = '#92400e';
    ctxFl.lineWidth = 1;
    ctxFl.strokeRect(0, 0, 32, 32);
    textures.addCanvas('floor_wood', floorCanvas);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 32;
    wallCanvas.height = 32;
    const ctxWl = wallCanvas.getContext('2d')!;
    ctxWl.fillStyle = '#475569';
    ctxWl.fillRect(0, 0, 32, 32);
    ctxWl.strokeStyle = '#64748b';
    ctxWl.lineWidth = 2;
    ctxWl.strokeRect(1, 1, 30, 30);
    textures.addCanvas('wall_stone', wallCanvas);

    // 9. Festival Altar (64x48)
    const altarCanvas = document.createElement('canvas');
    altarCanvas.width = 64;
    altarCanvas.height = 48;
    const ctxA = altarCanvas.getContext('2d')!;
    ctxA.fillStyle = '#b45309';
    ctxA.fillRect(4, 12, 56, 32);
    ctxA.fillStyle = '#dc2626'; // Red ceremonial cloth
    ctxA.fillRect(6, 12, 52, 10);
    // Floral Garland
    ctxA.fillStyle = '#fbbf24';
    for (let i = 8; i <= 56; i += 8) {
      ctxA.beginPath();
      ctxA.arc(i, 22, 3, 0, Math.PI * 2);
      ctxA.fill();
    }
    // Lit brass lamp
    ctxA.fillStyle = '#f59e0b';
    ctxA.beginPath();
    ctxA.ellipse(32, 10, 6, 3, 0, 0, Math.PI * 2);
    ctxA.fill();
    ctxA.fillStyle = '#ef4444';
    ctxA.beginPath();
    ctxA.arc(32, 5, 2, 0, Math.PI * 2);
    ctxA.fill();
    textures.addCanvas('festival_altar', altarCanvas);

    // 10. Gatherable Offerings (32x32)
    this.createItemIcon('offering_garland', '🌺', '#ec4899');
    this.createItemIcon('offering_grain_pot', '🌾', '#eab308');
    this.createItemIcon('offering_flute', '🪈', '#38bdf8');
  }

  private createTileTexture(key: string, baseColor: string, accentColor: string, emoji: string, label: string): void {
    const w = 120;
    const h = 80;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Draw 2.5D Isometric Diamond Slab
    const cx = w / 2;
    const cy = h / 2;
    const rx = 52;
    const ry = 28;
    const depth = 12;

    // Bottom 3D slab extrusion
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx, cy + ry + depth);
    ctx.lineTo(cx - rx, cy + depth);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry);
    ctx.lineTo(cx + rx, cy);
    ctx.lineTo(cx + rx, cy + depth);
    ctx.lineTo(cx, cy + ry + depth);
    ctx.closePath();
    ctx.fill();

    // Top surface
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx + rx, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx - rx, cy);
    ctx.closePath();
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center cultural motif / symbol
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy - 4);

    // Label
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, cy + 16);

    this.textures.addCanvas(key, canvas);
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

  private createEventBadge(key: string, emoji: string, bgColor: string): void {
    const size = 36;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 1);
    this.textures.addCanvas(key, canvas);
  }

  private createItemIcon(key: string, emoji: string, bgColor: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(16, 26, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(16, 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 16, 14);
    this.textures.addCanvas(key, canvas);
  }

  private createAnimations(): void {
    // Fire animation
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

    // Character animations
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
