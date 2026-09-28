import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Soft pastel pink loading screen
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
    this.generateProceduralTextures();
    this.createAnimations();

    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }

  private generateProceduralTextures(): void {
    // 1. Hexagonal 3D Miniature Diorama Tiles (Width: 104, Height: 96)
    this.createHexTileTexture('tile_farm', 'FARMLAND');
    this.createHexTileTexture('tile_craft', 'CRAFT');
    this.createHexTileTexture('tile_market', 'HAAT_SETTLEMENT');
    this.createHexTileTexture('tile_civic', 'CIVIC');
    this.createHexTileTexture('tile_music', 'MUSIC');
    this.createHexTileTexture('tile_shrine', 'SHRINE');
    this.createHexTileTexture('tile_clay', 'CLAY');
    this.createHexTileTexture('tile_water', 'WATER');
    this.createHexTileTexture('tile_forest', 'FOREST');
    this.createHexTileTexture('tile_mountain', 'STONE');

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

  private createHexTileTexture(key: string, theme: string): void {
    const w = 110;
    const h = 100;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = 40; // Top face center
    const radius = 46;
    const depth = 16; // 3D side extrusion

    // Helper: Generate Flat-Topped Hexagon Vertices
    const getHexCorners = (centerX: number, centerY: number, r: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i + 30);
        pts.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle) * 0.72 // Isometric foreshortening
        });
      }
      return pts;
    };

    const topCorners = getHexCorners(cx, cy, radius);
    const bottomCorners = getHexCorners(cx, cy + depth, radius);

    // 1. Soft Ambient Shadow under the tile
    ctx.fillStyle = 'rgba(120, 60, 80, 0.16)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth + 10, radius * 0.95, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 3D Side Walls (Extrusion)
    // Left side facet
    ctx.fillStyle = '#4a3b32'; // Deep earth / timber
    ctx.beginPath();
    ctx.moveTo(topCorners[1].x, topCorners[1].y);
    ctx.lineTo(topCorners[2].x, topCorners[2].y);
    ctx.lineTo(bottomCorners[2].x, bottomCorners[2].y);
    ctx.lineTo(bottomCorners[1].x, bottomCorners[1].y);
    ctx.closePath();
    ctx.fill();

    // Front-Left facet
    ctx.fillStyle = '#5c483c';
    ctx.beginPath();
    ctx.moveTo(topCorners[2].x, topCorners[2].y);
    ctx.lineTo(topCorners[3].x, topCorners[3].y);
    ctx.lineTo(bottomCorners[3].x, bottomCorners[3].y);
    ctx.lineTo(bottomCorners[2].x, bottomCorners[2].y);
    ctx.closePath();
    ctx.fill();

    // Front-Right facet
    ctx.fillStyle = '#6e5849';
    ctx.beginPath();
    ctx.moveTo(topCorners[3].x, topCorners[3].y);
    ctx.lineTo(topCorners[4].x, topCorners[4].y);
    ctx.lineTo(bottomCorners[4].x, bottomCorners[4].y);
    ctx.lineTo(bottomCorners[3].x, bottomCorners[3].y);
    ctx.closePath();
    ctx.fill();

    // 3. Top Hexagon Surface (Color Palette based on Dorfromantik pastel/natural palette)
    let baseColor = '#8A9A63'; // Grass
    if (theme === 'WATER') baseColor = '#8DAFC5';
    if (theme === 'FOREST') baseColor = '#546B43';
    if (theme === 'FARMLAND') baseColor = '#7E9156';
    if (theme === 'HAAT_SETTLEMENT' || theme === 'CRAFT' || theme === 'CIVIC') baseColor = '#8F9B6B';
    if (theme === 'STONE') baseColor = '#78716C';
    if (theme === 'CLAY') baseColor = '#9A6B4E';
    if (theme === 'SHRINE' || theme === 'MUSIC') baseColor = '#7D8E5C';

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(topCorners[0].x, topCorners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(topCorners[i].x, topCorners[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Soft inner edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Miniature Diorama Environmental Details
    if (theme === 'WATER') {
      // Shimmering river stream
      ctx.fillStyle = '#A3C6DC';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(cx - 12, cy - 3, 10, 2);
      ctx.fillRect(cx + 4, cy + 2, 8, 2);
    } else if (theme === 'FOREST') {
      // Clusters of dense 3D miniature trees (Pines & Banyans)
      const treePositions = [
        { x: cx - 14, y: cy - 6, r: 6 },
        { x: cx + 12, y: cy - 8, r: 7 },
        { x: cx, y: cy + 4, r: 8 },
        { x: cx - 18, y: cy + 6, r: 5 },
        { x: cx + 16, y: cy + 7, r: 6 }
      ];
      for (const t of treePositions) {
        // Tree shadow
        ctx.fillStyle = 'rgba(30, 45, 20, 0.3)';
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + 4, t.r * 0.9, t.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tree canopy
        ctx.fillStyle = '#3A4D2E';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 2, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#556E42';
        ctx.beginPath();
        ctx.arc(t.x - 1, t.y - 4, t.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === 'FARMLAND') {
      // Terraced crop rows & golden harvest field
      ctx.fillStyle = '#947E53';
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 2, 24, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Crop strips
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      for (let i = -10; i <= 10; i += 5) {
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy + i);
        ctx.lineTo(cx + 12, cy + i - 4);
        ctx.stroke();
      }
      // Tiny barn
      ctx.fillStyle = '#E9D8B8';
      ctx.fillRect(cx + 10, cy - 10, 8, 6);
      ctx.fillStyle = '#B86D4F';
      ctx.beginPath();
      ctx.moveTo(cx + 9, cy - 10);
      ctx.lineTo(cx + 14, cy - 14);
      ctx.lineTo(cx + 19, cy - 10);
      ctx.closePath();
      ctx.fill();
    } else if (theme === 'HAAT_SETTLEMENT' || theme === 'CRAFT' || theme === 'CIVIC') {
      // Clustered miniature terracotta village houses & craft huts
      const houses = [
        { x: cx - 12, y: cy - 6, w: 9, h: 7, roof: '#B86D4F' },
        { x: cx + 4, y: cy - 8, w: 10, h: 8, roof: '#C87D5F' },
        { x: cx - 4, y: cy + 4, w: 11, h: 9, roof: '#A55D3F' },
        { x: cx + 12, y: cy + 2, w: 8, h: 7, roof: '#D97706' }
      ];
      for (const hObj of houses) {
        // House shadow
        ctx.fillStyle = 'rgba(40, 30, 20, 0.25)';
        ctx.fillRect(hObj.x - 1, hObj.y + hObj.h - 1, hObj.w + 2, 3);
        // Wall (Cream plaster)
        ctx.fillStyle = '#E9D8B8';
        ctx.fillRect(hObj.x, hObj.y, hObj.w, hObj.h);
        // Terracotta pitched roof
        ctx.fillStyle = hObj.roof;
        ctx.beginPath();
        ctx.moveTo(hObj.x - 1, hObj.y);
        ctx.lineTo(hObj.x + hObj.w / 2, hObj.y - 5);
        ctx.lineTo(hObj.x + hObj.w + 1, hObj.y);
        ctx.closePath();
        ctx.fill();
      }
      // Pathway
      ctx.strokeStyle = '#B8A585';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 10);
      ctx.lineTo(cx + 20, cy - 10);
      ctx.stroke();
    } else if (theme === 'SHRINE' || theme === 'MUSIC') {
      // Sacred dome / Melodic pavilion gazebo
      ctx.fillStyle = '#E9D8B8';
      ctx.fillRect(cx - 8, cy - 4, 16, 10);
      // Terracotta dome
      ctx.fillStyle = '#B86D4F';
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 8, Math.PI, 0);
      ctx.fill();
      // Brass pinnacle lamp
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(cx, cy - 12, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Little garden trees
      ctx.fillStyle = '#3A4D2E';
      ctx.beginPath();
      ctx.arc(cx - 14, cy + 4, 4, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'STONE') {
      // Highland rock boulders
      ctx.fillStyle = '#6B7280';
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy - 2, 10, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 8, cy + 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9CA3AF';
      ctx.beginPath();
      ctx.arc(cx - 9, cy - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'CLAY') {
      // River clay pit with terracotta pottery urns
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(cx - 5, cy + 1, 3, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    this.textures.addCanvas(key, canvas);
  }

  private createHexSlotTexture(): void {
    // Open placement slot: Soft white translucent hex with subtle glow (exact Dorfromantik reference)
    const w = 110;
    const h = 100;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = 40;
    const radius = 45;

    const getHexCorners = (centerX: number, centerY: number, r: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i + 30);
        pts.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle) * 0.72
        });
      }
      return pts;
    };

    const topCorners = getHexCorners(cx, cy, radius);

    // Translucent soft white-pink fill
    ctx.fillStyle = 'rgba(255, 245, 250, 0.45)';
    ctx.beginPath();
    ctx.moveTo(topCorners[0].x, topCorners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(topCorners[i].x, topCorners[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Soft border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    this.textures.addCanvas('hex_slot_empty', canvas);
  }

  private createHexStackTexture(): void {
    // Physical 3D Tile Stack for bottom right
    const w = 90;
    const h = 130;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const radius = 38;

    // Helper to draw a single hex slice
    const drawSlice = (y: number, baseColor: string, sideColor: string) => {
      const getHex = (cy: number) => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i + 30);
          pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) * 0.65 });
        }
        return pts;
      };
      const top = getHex(y);
      const btm = getHex(y + 6);

      // Side
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(top[1].x, top[1].y);
      ctx.lineTo(top[4].x, top[4].y);
      ctx.lineTo(btm[4].x, btm[4].y);
      ctx.lineTo(btm[1].x, btm[1].y);
      ctx.closePath();
      ctx.fill();

      // Top
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(top[0].x, top[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(top[i].x, top[i].y);
      ctx.closePath();
      ctx.fill();
    };

    // Draw stack of 12 slices
    const colors = ['#546B43', '#765B3C', '#8A9A63', '#92704D', '#546B43', '#765B3C', '#8A9A63', '#B86D4F', '#546B43', '#765B3C', '#8A9A63', '#687E51'];
    for (let i = 0; i < 12; i++) {
      const y = 100 - i * 6;
      drawSlice(y, colors[i % colors.length], '#382D24');
    }

    // Top slice with foliage miniature
    drawSlice(28, '#765B3C', '#2F241C');
    // Mini trees peeking out
    ctx.fillStyle = '#3A4D2E';
    ctx.beginPath();
    ctx.arc(cx - 8, 22, 5, 0, Math.PI * 2);
    ctx.arc(cx + 7, 20, 6, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas('tile_stack_pile', canvas);
  }

  private createHexBadgeTexture(): void {
    // Small white hexagonal badge for the tile counter "65"
    const size = 38;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const r = 16;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();

    // White hexagon
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
    // Handcrafted cultural icon for top-right score
    const size = 28;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Lit Diya / Sacred Flame
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
    // Character Spritesheet (128x32 - Down, Up, Left, Right)
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

      // Kurta & Sash
      ctxC.fillStyle = '#B86D4F';
      ctxC.fillRect(ox + 11, 14, 10, 11);
      ctxC.fillStyle = '#D97706';
      ctxC.fillRect(ox + 10, 14, 3, 11);

      // Head & Turban
      ctxC.fillStyle = '#FCD34D';
      ctxC.beginPath();
      ctxC.arc(ox + 16, 10, 5.5, 0, Math.PI * 2);
      ctxC.fill();

      ctxC.fillStyle = '#92400E';
      ctxC.beginPath();
      ctxC.arc(ox + 16, 8, 6, Math.PI, Math.PI * 2);
      ctxC.fill();

      if (f === 0) { // Down
        ctxC.fillStyle = '#1E293B';
        ctxC.fillRect(ox + 13, 10, 2, 2);
        ctxC.fillRect(ox + 17, 10, 2, 2);
      }
    }
    this.textures.addCanvas('player_sheet', charCanvas);

    // Fire animation sheet
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

    // Water Well
    const wellCanvas = document.createElement('canvas');
    wellCanvas.width = 44;
    wellCanvas.height = 44;
    const ctxW = wellCanvas.getContext('2d')!;
    ctxW.fillStyle = '#52525B';
    ctxW.beginPath();
    ctxW.ellipse(22, 28, 16, 10, 0, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.fillStyle = '#8DAFC5';
    ctxW.beginPath();
    ctxW.ellipse(22, 28, 10, 6, 0, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.fillStyle = '#765B3C';
    ctxW.fillRect(8, 6, 4, 24);
    ctxW.fillRect(32, 6, 4, 24);
    ctxW.fillRect(6, 4, 32, 6);
    this.textures.addCanvas('water_well', wellCanvas);

    // Water bucket
    const bucketCanvas = document.createElement('canvas');
    bucketCanvas.width = 28;
    bucketCanvas.height = 28;
    const ctxB = bucketCanvas.getContext('2d')!;
    ctxB.fillStyle = '#8DAFC5';
    ctxB.fillRect(6, 10, 16, 14);
    ctxB.strokeStyle = '#FFFFFF';
    ctxB.lineWidth = 1.5;
    ctxB.strokeRect(6, 10, 16, 14);
    this.textures.addCanvas('water_bucket', bucketCanvas);

    // Particles
    this.createCircleParticle('particle_water', '#8DAFC5', 3);
    this.createCircleParticle('particle_smoke', '#94A3B8', 5);
    this.createCircleParticle('particle_spark', '#FDE047', 3);
    this.createCircleParticle('particle_confetti', '#F43F5E', 3);

    // Floor & Wall
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

    // Altar
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
