// Reusable canvas vector drawing routines for handcrafted low-poly miniature diorama objects

export interface Point2D {
  x: number;
  y: number;
}

export class MiniatureObjects {
  // Light Source: Top-Left -> Shadows cast to Bottom-Right (+X, +Y)

  // 1. Soft Ambient / Directional Shadow
  public static drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, alpha: number = 0.22): void {
    ctx.save();
    ctx.fillStyle = `rgba(35, 25, 30, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, radiusX, radiusY, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Handcrafted Miniature 3D Tree (Pine / Banyan with layered low-poly foliage)
  public static drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0, darkVariant: boolean = false): void {
    ctx.save();
    const r = 8 * scale;
    // Shadow
    this.drawShadow(ctx, x, y + 2, r * 1.1, r * 0.55, 0.25);

    // Trunk
    ctx.fillStyle = '#5A3E2B';
    ctx.fillRect(x - 1.5 * scale, y - 4 * scale, 3 * scale, 5 * scale);

    // Bottom Tier (Dark foliage)
    ctx.fillStyle = darkVariant ? '#3D5434' : '#4E6844';
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * scale);
    ctx.lineTo(x + 7 * scale, y - 4 * scale);
    ctx.lineTo(x - 7 * scale, y - 4 * scale);
    ctx.closePath();
    ctx.fill();

    // Middle Tier
    ctx.fillStyle = darkVariant ? '#4D6842' : '#5D7C52';
    ctx.beginPath();
    ctx.moveTo(x, y - 19 * scale);
    ctx.lineTo(x + 5.5 * scale, y - 8 * scale);
    ctx.lineTo(x - 5.5 * scale, y - 8 * scale);
    ctx.closePath();
    ctx.fill();

    // Top Highlight Tier (Sunlit from top-left)
    ctx.fillStyle = darkVariant ? '#628354' : '#739564';
    ctx.beginPath();
    ctx.moveTo(x - 1 * scale, y - 22 * scale);
    ctx.lineTo(x + 3.5 * scale, y - 13 * scale);
    ctx.lineTo(x - 4.5 * scale, y - 13 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 3. Rounded Leafy Banyan / Deciduous Tree
  public static drawDeciduousTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    const r = 9 * scale;
    this.drawShadow(ctx, x, y + 2, r * 1.2, r * 0.6, 0.24);

    // Trunk
    ctx.fillStyle = '#6E4E37';
    ctx.fillRect(x - 2 * scale, y - 6 * scale, 4 * scale, 7 * scale);

    // Dark base canopy
    ctx.fillStyle = '#425838';
    ctx.beginPath();
    ctx.arc(x, y - 10 * scale, r, 0, Math.PI * 2);
    ctx.fill();

    // Mid-tone foliage clumps
    ctx.fillStyle = '#5A784C';
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 11 * scale, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x + 3 * scale, y - 10 * scale, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Sunlit top-left highlight
    ctx.fillStyle = '#789C66';
    ctx.beginPath();
    ctx.arc(x - 2 * scale, y - 13 * scale, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. Miniature Terracotta Village House
  public static drawVillageHouse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number = 14,
    h: number = 10,
    roofColor: string = '#B96D4E',
    wallColor: string = '#E9D9BB'
  ): void {
    ctx.save();
    // Shadow
    this.drawShadow(ctx, x, y + h / 2, w * 0.75, h * 0.5, 0.28);

    // Wall box (Isometric face)
    ctx.fillStyle = wallColor;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);

    // Shaded right wall edge
    ctx.fillStyle = 'rgba(60, 40, 30, 0.15)';
    ctx.fillRect(x + w / 2 - 3, y - h / 2, 3, h);

    // Wooden door
    ctx.fillStyle = '#73553D';
    ctx.fillRect(x - 2, y + h / 2 - 5, 4, 5);

    // Tiny window
    ctx.fillStyle = '#4A6274';
    ctx.fillRect(x + 2, y - h / 2 + 2, 3, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(x + 2, y - h / 2 + 2, 1, 3);

    // Terracotta Pitched Roof
    const roofH = h * 0.75;
    // Left roof face (Sunlit)
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 1.5, y - h / 2 + 1);
    ctx.lineTo(x, y - h / 2 - roofH);
    ctx.lineTo(x + w / 2 + 1.5, y - h / 2 + 1);
    ctx.closePath();
    ctx.fill();

    // Right roof slope shade
    ctx.fillStyle = 'rgba(40, 20, 15, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2 - roofH);
    ctx.lineTo(x + w / 2 + 1.5, y - h / 2 + 1);
    ctx.lineTo(x, y - h / 2 + 1);
    ctx.closePath();
    ctx.fill();

    // Tiny terracotta chimney
    ctx.fillStyle = '#8C4830';
    ctx.fillRect(x - w / 3, y - h / 2 - roofH + 1, 2.5, 5);

    ctx.restore();
  }

  // 5. Traditional Handloom Weaving Workshop with Hanging Dyed Textiles
  public static drawWeavingHut(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    this.drawShadow(ctx, x, y + 6, 18, 10, 0.28);

    // Main timber frame workshop
    ctx.fillStyle = '#E9D9BB';
    ctx.fillRect(x - 11, y - 6, 22, 12);

    // Wooden timber beams
    ctx.fillStyle = '#73553D';
    ctx.fillRect(x - 11, y - 6, 2, 12);
    ctx.fillRect(x + 9, y - 6, 2, 12);
    ctx.fillRect(x - 1, y - 6, 2, 12);

    // Thatch / Terracotta Roof
    ctx.fillStyle = '#C98257';
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 6);
    ctx.lineTo(x, y - 16);
    ctx.lineTo(x + 14, y - 6);
    ctx.closePath();
    ctx.fill();

    // Cloth drying rack outside with vibrant dyed fabrics (Indigo, Crimson, Saffron)
    ctx.fillStyle = '#5A3E2B';
    ctx.fillRect(x + 10, y - 3, 1.5, 10);
    ctx.fillRect(x + 20, y - 3, 1.5, 10);
    ctx.fillRect(x + 9, y - 3, 13, 1.5);

    // Hanging fabrics
    ctx.fillStyle = '#3B82F6'; // Indigo textile
    ctx.fillRect(x + 11, y - 2, 3.5, 7);
    ctx.fillStyle = '#DC2626'; // Crimson silk
    ctx.fillRect(x + 15, y - 2, 3.5, 8);
    ctx.fillStyle = '#F59E0B'; // Saffron cotton
    ctx.fillRect(x + 19, y - 2, 2.5, 6);

    ctx.restore();
  }

  // 6. Pottery Workshop with Terracotta Kiln and Clay Pots
  public static drawPotteryWorkshop(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    this.drawShadow(ctx, x, y + 6, 18, 10, 0.28);

    // Workshop hut
    ctx.fillStyle = '#E9D9BB';
    ctx.fillRect(x - 12, y - 5, 16, 11);
    ctx.fillStyle = '#B96D4E';
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 5);
    ctx.lineTo(x - 4, y - 14);
    ctx.lineTo(x + 6, y - 5);
    ctx.closePath();
    ctx.fill();

    // Domed Earthen Kiln on the right
    ctx.fillStyle = '#8C4830';
    ctx.beginPath();
    ctx.arc(x + 12, y + 1, 6, Math.PI, 0);
    ctx.lineTo(x + 18, y + 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.closePath();
    ctx.fill();

    // Kiln glowing opening
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 4, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Terracotta pots & urns drying in the sun
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(x - 2, y + 7, 2, 0, Math.PI * 2);
    ctx.arc(x + 2, y + 7, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 7. Traditional Haat Marketplace Pavilion with Stalls & Canopies
  public static drawHaatMarket(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    this.drawShadow(ctx, x, y + 6, 22, 12, 0.3);

    // Central Timber Pavilion
    ctx.fillStyle = '#E9D9BB';
    ctx.fillRect(x - 10, y - 6, 20, 12);
    // Terracotta roof
    ctx.fillStyle = '#B96D4E';
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 6);
    ctx.lineTo(x, y - 16);
    ctx.lineTo(x + 13, y - 6);
    ctx.closePath();
    ctx.fill();

    // Market Stall Canopies (Striped Saffron & Cream)
    const drawStall = (sx: number, sy: number, colorA: string, colorB: string) => {
      // Wooden poles
      ctx.fillStyle = '#73553D';
      ctx.fillRect(sx - 7, sy - 4, 1.5, 9);
      ctx.fillRect(sx + 5.5, sy - 4, 1.5, 9);
      // Table
      ctx.fillStyle = '#9A714C';
      ctx.fillRect(sx - 7, sy + 1, 14, 4);

      // Striped Awning
      ctx.fillStyle = colorA;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 4);
      ctx.lineTo(sx - 3, sy - 8);
      ctx.lineTo(sx + 7, sy - 4);
      ctx.lineTo(sx + 6, sy - 2);
      ctx.lineTo(sx - 7, sy - 2);
      ctx.closePath();
      ctx.fill();

      // Produce / Grain Sacks / Spices
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(sx - 5, sy, 3, 3);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(sx - 1, sy, 3, 3);
      ctx.fillStyle = '#34D399';
      ctx.fillRect(sx + 3, sy, 3, 3);
    };

    drawStall(x - 12, y + 4, '#EA580C', '#FEF08A');
    drawStall(x + 12, y + 4, '#3B82F6', '#FFFFFF');

    // Tiny marketplace patrons (Silhouettes)
    this.drawVillager(ctx, x - 2, y + 7, '#D97706');
    this.drawVillager(ctx, x + 3, y + 7, '#3B82F6');

    ctx.restore();
  }

  // 8. Melodic Pavilion / Sitar Gazebo
  public static drawMusicPavilion(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    this.drawShadow(ctx, x, y + 6, 18, 10, 0.28);

    // Circular stone plinth
    ctx.fillStyle = '#E9D9BB';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pillars
    ctx.fillStyle = '#73553D';
    ctx.fillRect(x - 10, y - 7, 2, 10);
    ctx.fillRect(x + 8, y - 7, 2, 10);
    ctx.fillRect(x - 4, y - 8, 2, 10);
    ctx.fillRect(x + 2, y - 8, 2, 10);

    // Domed Octagonal Roof
    ctx.fillStyle = '#B96D4E';
    ctx.beginPath();
    ctx.arc(x, y - 9, 12, Math.PI, 0);
    ctx.fill();

    // Brass pinnacle finial
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(x, y - 18, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Sitar / Folk musician on stage
    this.drawVillager(ctx, x, y + 3, '#8B5CF6');

    ctx.restore();
  }

  // 9. Sacred Cultural Shrine with Diya Lamps
  public static drawSacredShrine(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    this.drawShadow(ctx, x, y + 6, 20, 11, 0.3);

    // Stepwell stone tiers
    ctx.fillStyle = '#C8B89E';
    ctx.fillRect(x - 12, y - 2, 24, 8);
    ctx.fillStyle = '#E9D9BB';
    ctx.fillRect(x - 9, y - 6, 18, 6);

    // Carved Mandapa Shrine Sanctuary
    ctx.fillStyle = '#8C4830';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 6);
    ctx.lineTo(x, y - 20);
    ctx.lineTo(x + 10, y - 6);
    ctx.closePath();
    ctx.fill();

    // Glowing brass diya lamp
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(x, y - 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Floral garlands
    ctx.fillStyle = '#EC4899';
    for (let i = -8; i <= 8; i += 4) {
      ctx.beginPath();
      ctx.arc(x + i, y + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 10. Terraced Farmland with Golden Crops, Furrows, & Haystacks
  public static drawFarmlandFields(ctx: CanvasRenderingContext2D, x: number, y: number, r: number = 34): void {
    ctx.save();

    // Furrowed soil base
    ctx.fillStyle = '#9A714C';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.9, r * 0.55, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Terraced golden crop strips (Grain / Rice / Mustard)
    ctx.strokeStyle = '#C5A65D';
    ctx.lineWidth = 2.5;
    for (let offset = -r * 0.35; offset <= r * 0.35; offset += 5.5) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.65, y + offset);
      ctx.lineTo(x + r * 0.6, y + offset - 4);
      ctx.stroke();
    }

    // Tiny haystack
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.arc(x + 12, y - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Farmhouse barn
    this.drawVillageHouse(ctx, x - 10, y - 8, 10, 7, '#B96D4E', '#E9D9BB');

    // Tiny farmer working the field
    this.drawVillager(ctx, x + 2, y + 4, '#D97706');

    ctx.restore();
  }

  // 11. Living Water Body with Shoreline Sand & Shimmer
  public static drawWaterBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number = 36): void {
    ctx.save();

    // Sand / riverbank perimeter
    ctx.fillStyle = '#B39A75';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.96, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep water core
    ctx.fillStyle = '#6698AC';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.86, r * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crystalline reflective water surface
    ctx.fillStyle = '#82AFC0';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, r * 0.76, r * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water ripple highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 3);
    ctx.quadraticCurveTo(x - 8, y - 5, x - 2, y - 3);
    ctx.moveTo(x + 4, y + 2);
    ctx.quadraticCurveTo(x + 10, y, x + 16, y + 2);
    ctx.stroke();

    ctx.restore();
  }

  // 12. Tiny Miniature Villager (Low-poly silhouette)
  public static drawVillager(ctx: CanvasRenderingContext2D, x: number, y: number, tunicColor: string = '#D97706'): void {
    ctx.save();
    // Shadow
    this.drawShadow(ctx, x, y + 2, 2.5, 1.2, 0.3);

    // Body / Kurta
    ctx.fillStyle = tunicColor;
    ctx.fillRect(x - 1.2, y - 3.5, 2.4, 4.5);

    // Head / Turban
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(x, y - 5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.arc(x, y - 5.5, 1.6, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }
}
