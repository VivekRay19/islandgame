import { TileDefinition, TILE_DEFINITIONS, EdgeType } from '../data/tiles';
import { PlacedTileData } from './SaveSystem';

export interface PlacedTileInstance {
  id: string;
  gx: number;
  gy: number;
  tileDef: TileDefinition;
  rotation: number; // 0, 90, 180, 270 degrees
  isDamaged: boolean;
  placedAtRound: number;
}

export interface AdjacencyMatchResult {
  matchingEdges: number;
  totalNeighbors: number;
  scoreBonus: number;
}

export class TileSystem {
  private grid: Map<string, PlacedTileInstance> = new Map();
  private tileDeck: TileDefinition[] = [];
  private currentTileToPlace: TileDefinition | null = null;
  private currentRotation: number = 0; // 0, 90, 180, 270

  constructor() {
    this.resetDeck();
  }

  private getKey(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  public resetDeck(): void {
    const allDefs = Object.values(TILE_DEFINITIONS);
    // Shuffle pool with varied cultural tiles
    this.tileDeck = [];
    for (let i = 0; i < 4; i++) {
      for (const def of allDefs) {
        this.tileDeck.push(def);
      }
    }
    this.shuffleDeck();
    this.drawNextTile();
  }

  private shuffleDeck(): void {
    for (let i = this.tileDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tileDeck[i], this.tileDeck[j]] = [this.tileDeck[j], this.tileDeck[i]];
    }
  }

  public drawNextTile(): TileDefinition | null {
    if (this.tileDeck.length === 0) {
      this.resetDeck();
    }
    this.currentTileToPlace = this.tileDeck.pop() || null;
    this.currentRotation = 0;
    return this.currentTileToPlace;
  }

  public getCurrentTile(): TileDefinition | null {
    return this.currentTileToPlace;
  }

  public getCurrentRotation(): number {
    return this.currentRotation;
  }

  public rotateCurrentTile(): number {
    this.currentRotation = (this.currentRotation + 90) % 360;
    return this.currentRotation;
  }

  public getDeckCount(): number {
    return this.tileDeck.length;
  }

  public getTileAt(gx: number, gy: number): PlacedTileInstance | undefined {
    return this.grid.get(this.getKey(gx, gy));
  }

  public getAllPlacedTiles(): PlacedTileInstance[] {
    return Array.from(this.grid.values());
  }

  public getBuildingTiles(): PlacedTileInstance[] {
    return this.getAllPlacedTiles().filter(t => !!t.tileDef.buildingType);
  }

  public getRotatedEdges(tileDef: TileDefinition, rotation: number): [EdgeType, EdgeType, EdgeType, EdgeType] {
    const shift = Math.floor(rotation / 90) % 4;
    const base = tileDef.baseEdges;
    // Rotation shifts clockwise: [Top, Right, Bottom, Left]
    // 90 deg -> old Left becomes new Top, old Top becomes new Right...
    const rotated: EdgeType[] = [];
    for (let i = 0; i < 4; i++) {
      const originalIndex = (i - shift + 4) % 4;
      rotated.push(base[originalIndex]);
    }
    return [rotated[0], rotated[1], rotated[2], rotated[3]];
  }

  public isValidPlacement(gx: number, gy: number): boolean {
    // Check if cell is already occupied
    if (this.grid.has(this.getKey(gx, gy))) {
      return false;
    }

    // If grid is empty, allow placement at center (0,0)
    if (this.grid.size === 0) {
      return gx === 0 && gy === 0;
    }

    // Must be adjacent to at least one placed tile
    const neighbors = this.getNeighbors(gx, gy);
    return neighbors.some(n => n !== undefined);
  }

  public getNeighbors(gx: number, gy: number): (PlacedTileInstance | undefined)[] {
    return [
      this.getTileAt(gx, gy - 1), // North (0)
      this.getTileAt(gx + 1, gy), // East (1)
      this.getTileAt(gx, gy + 1), // South (2)
      this.getTileAt(gx - 1, gy)  // West (3)
    ];
  }

  public evaluateEdgeMatching(gx: number, gy: number, tileDef: TileDefinition, rotation: number): AdjacencyMatchResult {
    const rotatedEdges = this.getRotatedEdges(tileDef, rotation);
    const neighbors = this.getNeighbors(gx, gy);
    let matchingEdges = 0;
    let totalNeighbors = 0;

    // Opposite edge index mapping: North(0) <-> South(2), East(1) <-> West(3)
    const oppositeMap = [2, 3, 0, 1];

    neighbors.forEach((neighbor, dir) => {
      if (neighbor) {
        totalNeighbors++;
        const neighborEdges = this.getRotatedEdges(neighbor.tileDef, neighbor.rotation);
        const myEdge = rotatedEdges[dir];
        const neighborEdge = neighborEdges[oppositeMap[dir]];
        if (myEdge === neighborEdge) {
          matchingEdges++;
        }
      }
    });

    const scoreBonus = matchingEdges * 3 + (matchingEdges === totalNeighbors && totalNeighbors > 1 ? 5 : 0);
    return { matchingEdges, totalNeighbors, scoreBonus };
  }

  public placeTile(gx: number, gy: number, tileDef: TileDefinition, rotation: number, round: number = 1): PlacedTileInstance | null {
    if (!this.isValidPlacement(gx, gy)) {
      return null;
    }

    const instance: PlacedTileInstance = {
      id: `tile_${gx}_${gy}_${Date.now()}`,
      gx,
      gy,
      tileDef,
      rotation,
      isDamaged: false,
      placedAtRound: round
    };

    this.grid.set(this.getKey(gx, gy), instance);
    this.drawNextTile();
    return instance;
  }

  public setTileDamaged(gx: number, gy: number, isDamaged: boolean): boolean {
    const tile = this.getTileAt(gx, gy);
    if (tile) {
      tile.isDamaged = isDamaged;
      return true;
    }
    return false;
  }

  public initializeDefaultIsland(): void {
    this.grid.clear();
    // Create picturesque starting island layout
    const initialCenter = TILE_DEFINITIONS['tile_haat_market'];
    const farm = TILE_DEFINITIONS['tile_farm'];
    const craft = TILE_DEFINITIONS['tile_textile_workshop'];
    const water = TILE_DEFINITIONS['tile_river_bend'];
    const forest = TILE_DEFINITIONS['tile_sacred_forest'];

    this.placeTileDirect(0, 0, initialCenter, 0);
    this.placeTileDirect(0, -1, farm, 0);
    this.placeTileDirect(1, 0, craft, 0);
    this.placeTileDirect(-1, 0, water, 90);
    this.placeTileDirect(0, 1, forest, 0);
  }

  private placeTileDirect(gx: number, gy: number, tileDef: TileDefinition, rotation: number): void {
    const instance: PlacedTileInstance = {
      id: `tile_${gx}_${gy}_start`,
      gx,
      gy,
      tileDef,
      rotation,
      isDamaged: false,
      placedAtRound: 1
    };
    this.grid.set(this.getKey(gx, gy), instance);
  }

  public exportSaveData(): PlacedTileData[] {
    return Array.from(this.grid.values()).map(t => ({
      q: t.gx,
      r: t.gy,
      tileDefId: t.tileDef.id,
      rotation: t.rotation,
      isDamaged: t.isDamaged
    }));
  }

  public importSaveData(data: PlacedTileData[]): void {
    this.grid.clear();
    for (const item of data) {
      const def = TILE_DEFINITIONS[item.tileDefId] || TILE_DEFINITIONS['tile_farm'];
      this.grid.set(this.getKey(item.q, item.r), {
        id: `tile_${item.q}_${item.r}_loaded`,
        gx: item.q,
        gy: item.r,
        tileDef: def,
        rotation: item.rotation,
        isDamaged: !!item.isDamaged,
        placedAtRound: 1
      });
    }
  }
}
