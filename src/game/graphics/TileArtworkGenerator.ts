import { MiniatureObjects } from './MiniatureObjects';

export interface HexDimensions {
  width: number;
  height: number;
  radius: number;
  depth: number;
}

export class TileArtworkGenerator {
  public static readonly DIMENSIONS: HexDimensions = {
    width: 116,
    height: 104,
    radius: 48,
    depth: 16
  };

  private static getHexCorners(cx: number, cy: number, r: number) {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      pts.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle) * 0.72
      });
    }
    return pts;
  }

  // Base 3D Hexagonal Slab (Shadow + Side Walls + Top Terrain Base)
  private static drawBaseSlab(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseGrassColor: string = '#7F9560'): void {
    const { radius, depth } = this.DIMENSIONS;
    const top = this.getHexCorners(cx, cy, radius);
    const btm = this.getHexCorners(cx, cy + depth, radius);

    // 1. Soft Ambient Drop Shadow (Lower-Right)
    ctx.fillStyle = 'rgba(70, 45, 55, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + depth + 8, radius * 1.05, radius * 0.55, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 2. 3D Side Walls (Exposed Earthy Soil / Stone Layers)
    // Left Facet (Deep Shade)
    ctx.fillStyle = '#4A3B32';
    ctx.beginPath();
    ctx.moveTo(top[1].x, top[1].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.lineTo(btm[2].x, btm[2].y);
    ctx.lineTo(btm[1].x, btm[1].y);
    ctx.closePath();
    ctx.fill();

    // Front-Left Facet (Mid shade)
    ctx.fillStyle = '#5C483C';
    ctx.beginPath();
    ctx.moveTo(top[2].x, top[2].y);
    ctx.lineTo(top[3].x, top[3].y);
    ctx.lineTo(btm[3].x, btm[3].y);
    ctx.lineTo(btm[2].x, btm[2].y);
    ctx.closePath();
    ctx.fill();

    // Front-Right Facet (Light shade)
    ctx.fillStyle = '#6E5849';
    ctx.beginPath();
    ctx.moveTo(top[3].x, top[3].y);
    ctx.lineTo(top[4].x, top[4].y);
    ctx.lineTo(btm[4].x, btm[4].y);
    ctx.lineTo(btm[3].x, btm[3].y);
    ctx.closePath();
    ctx.fill();

    // Side Strata Details (Tiny exposed pebbles / soil bands)
    ctx.strokeStyle = 'rgba(30, 20, 15, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(btm[2].x, btm[2].y - 6);
    ctx.lineTo(btm[3].x, btm[3].y - 6);
    ctx.lineTo(btm[4].x, btm[4].y - 6);
    ctx.stroke();

    // 3. Top Hexagon Surface Base
    ctx.fillStyle = baseGrassColor;
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(top[i].x, top[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle edge rim bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Natural wildflower flecks on grass
    ctx.fillStyle = '#D991A4'; // Soft pink floral flecks
    ctx.fillRect(cx - 24, cy - 8, 1.5, 1.5);
    ctx.fillRect(cx + 28, cy + 6, 1.5, 1.5);
    ctx.fillRect(cx + 10, cy - 14, 1.5, 1.5);
    ctx.fillStyle = '#FEF08A'; // Yellow buttercups
    ctx.fillRect(cx - 16, cy + 12, 1.5, 1.5);
    ctx.fillRect(cx + 18, cy - 8, 1.5, 1.5);
  }

  // GENERATOR: Terraced Farmland Tile
  public static generateFarmTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#7A9158');

    // Terraced fields
    MiniatureObjects.drawFarmlandFields(ctx, cx, cy, 38);

    // Decorative Pine & Shrub on edge
    MiniatureObjects.drawPineTree(ctx, cx + 26, cy - 6, 0.85);
    MiniatureObjects.drawDeciduousTree(ctx, cx - 28, cy + 4, 0.75);

    return canvas;
  }

  // GENERATOR: Handloom Textile & Craft Centre Tile
  public static generateCraftTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#849662');

    // Cobblestone path
    ctx.strokeStyle = '#B39A75';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 12);
    ctx.quadraticCurveTo(cx, cy, cx + 30, cy - 8);
    ctx.stroke();

    // Weaving Loom Workshop & Hanging textiles
    MiniatureObjects.drawWeavingHut(ctx, cx - 6, cy - 4);

    // Subsidiary artisan hut
    MiniatureObjects.drawVillageHouse(ctx, cx + 22, cy + 6, 10, 7, '#B96D4E');

    // Craftsperson with spindle
    MiniatureObjects.drawVillager(ctx, cx + 12, cy + 8, '#EC4899');
    MiniatureObjects.drawDeciduousTree(ctx, cx - 24, cy - 10, 0.8);

    return canvas;
  }

  // GENERATOR: Central Haat Bazaar Marketplace Tile
  public static generateMarketTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#8A9A65');

    // Paved marketplace courtyard
    ctx.fillStyle = '#C8B89E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Full Haat Market Pavilion with Stalls, Canopies, & Silhouettes
    MiniatureObjects.drawHaatMarket(ctx, cx, cy - 4);

    // Decorative village house bordering the haat
    MiniatureObjects.drawVillageHouse(ctx, cx - 22, cy - 8, 11, 8, '#C98257');
    MiniatureObjects.drawVillageHouse(ctx, cx + 24, cy - 6, 10, 7, '#B96D4E');

    return canvas;
  }

  // GENERATOR: Heritage Community House / Civic Hall
  public static generateCivicTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#81935E');

    // Cluster of traditional village dwellings with courtyards
    MiniatureObjects.drawVillageHouse(ctx, cx - 14, cy - 6, 14, 10, '#B96D4E', '#E9D9BB');
    MiniatureObjects.drawVillageHouse(ctx, cx + 8, cy - 8, 12, 9, '#C98257', '#E9D9BB');
    MiniatureObjects.drawVillageHouse(ctx, cx, cy + 6, 13, 9, '#A55D3F', '#E9D9BB');
    MiniatureObjects.drawVillageHouse(ctx, cx + 22, cy + 4, 10, 7, '#D97706', '#E9D9BB');

    // Little village pathway with walking villager
    ctx.strokeStyle = '#B39A75';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 10);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.lineTo(cx + 28, cy - 6);
    ctx.stroke();

    MiniatureObjects.drawVillager(ctx, cx - 12, cy + 10, '#3B82F6');
    MiniatureObjects.drawDeciduousTree(ctx, cx - 26, cy - 8, 0.85);

    return canvas;
  }

  // GENERATOR: Melodic Music Pavilion Tile
  public static generateMusicTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#7C905A');

    // Sitar / Music Pavilion Gazebo
    MiniatureObjects.drawMusicPavilion(ctx, cx, cy - 4);

    // Surrounding serene garden trees & floral bushes
    MiniatureObjects.drawDeciduousTree(ctx, cx - 24, cy - 4, 0.9);
    MiniatureObjects.drawDeciduousTree(ctx, cx + 24, cy - 4, 0.9);
    MiniatureObjects.drawPineTree(ctx, cx - 18, cy + 8, 0.7);
    MiniatureObjects.drawPineTree(ctx, cx + 18, cy + 8, 0.7);

    return canvas;
  }

  // GENERATOR: Ancestral Cultural Shrine Tile
  public static generateShrineTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#788D56');

    // Stone Sanctuary with Glowing Diya Lamps
    MiniatureObjects.drawSacredShrine(ctx, cx, cy - 4);

    // Ancient Banyan grove
    MiniatureObjects.drawDeciduousTree(ctx, cx - 26, cy - 6, 1.0);
    MiniatureObjects.drawPineTree(ctx, cx + 24, cy - 8, 0.85);
    MiniatureObjects.drawVillager(ctx, cx - 4, cy + 8, '#F59E0B');

    return canvas;
  }

  // GENERATOR: Terracotta Clay Pit & Pottery Kiln Tile
  public static generateClayTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#889862');

    // Clay excavation pit
    ctx.fillStyle = '#9A714C';
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 4, 18, 10, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pottery workshop with kiln
    MiniatureObjects.drawPotteryWorkshop(ctx, cx - 8, cy - 4);

    MiniatureObjects.drawDeciduousTree(ctx, cx - 26, cy - 8, 0.75);

    return canvas;
  }

  // GENERATOR: Flowing River Water Body Tile
  public static generateWaterTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#799059');

    // Shimmering river lake
    MiniatureObjects.drawWaterBody(ctx, cx, cy, 38);

    // Riverbank foliage and reeds
    MiniatureObjects.drawDeciduousTree(ctx, cx - 24, cy - 10, 0.8);
    MiniatureObjects.drawPineTree(ctx, cx + 22, cy + 8, 0.75);

    return canvas;
  }

  // GENERATOR: Dense Pine & Banyan Forest Tile
  public static generateForestTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#6E854E');

    // Clustered canopy of layered 3D trees
    const forestTrees = [
      { x: cx - 18, y: cy - 10, scale: 0.95, pine: true, dark: true },
      { x: cx + 12, y: cy - 12, scale: 1.05, pine: true, dark: false },
      { x: cx - 2, y: cy - 6, scale: 1.15, pine: false, dark: false },
      { x: cx - 22, y: cy + 4, scale: 0.85, pine: false, dark: true },
      { x: cx + 20, y: cy + 2, scale: 0.95, pine: true, dark: false },
      { x: cx - 4, y: cy + 8, scale: 1.1, pine: true, dark: false },
      { x: cx + 10, y: cy + 10, scale: 0.85, pine: false, dark: true }
    ];

    for (const t of forestTrees) {
      if (t.pine) {
        MiniatureObjects.drawPineTree(ctx, t.x, t.y, t.scale, t.dark);
      } else {
        MiniatureObjects.drawDeciduousTree(ctx, t.x, t.y, t.scale);
      }
    }

    return canvas;
  }

  // GENERATOR: Stone Quarry & Highland Ridge Tile
  public static generateMountainTile(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.DIMENSIONS.width;
    canvas.height = this.DIMENSIONS.height;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = 42;

    this.drawBaseSlab(ctx, cx, cy, '#788B58');

    // Highland rock boulders & quarry masonry
    const rocks = [
      { x: cx - 12, y: cy - 6, rx: 14, ry: 9, h: 12 },
      { x: cx + 10, y: cy - 8, rx: 12, ry: 8, h: 10 },
      { x: cx, y: cy + 6, rx: 15, ry: 10, h: 14 }
    ];

    for (const r of rocks) {
      MiniatureObjects.drawShadow(ctx, r.x, r.y + 4, r.rx * 1.2, r.ry * 0.7, 0.3);
      // Rock base
      ctx.fillStyle = '#5A6370';
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sunlit rock facet (Top-Left)
      ctx.fillStyle = '#838D9A';
      ctx.beginPath();
      ctx.ellipse(r.x - 3, r.y - 3, r.rx * 0.7, r.ry * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    MiniatureObjects.drawPineTree(ctx, cx - 22, cy + 6, 0.8, true);
    MiniatureObjects.drawPineTree(ctx, cx + 24, cy - 4, 0.8, false);

    return canvas;
  }
}
