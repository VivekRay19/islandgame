import { TileDefinition, TILE_DEFINITIONS, EdgeType } from '../data/tiles';
import { PlacedTileData } from './SaveSystem';

export interface PlacedHexTileInstance {
  id: string;
  q: number; // Axial column
  r: number; // Axial row
  tileDef: TileDefinition;
  rotation: number; // 0, 60, 120, 180, 240, 300 degrees
  isDamaged: boolean;
  placedAtRound: number;
}

// 6 Axial neighbor offsets (East, NE, NW, West, SW, SE)
export const HEX_DIRECTIONS = [
  { dq: +1, dr: 0 },  // 0: East
  { dq: +1, dr: -1 }, // 1: North-East
  { dq: 0, dr: -1 },  // 2: North-West
  { dq: -1, dr: 0 },  // 3: West
  { dq: -1, dr: +1 }, // 4: South-West
  { dq: 0, dr: +1 }   // 5: South-East
];

export interface AdjacencyMatchResult {
  matchingEdges: number;
  totalNeighbors: number;
  scoreBonus: number;
}

export class TileSystem {
  private grid: Map<string, PlacedHexTileInstance> = new Map();
  private tileDeck: TileDefinition[] = [];
  private currentTileToPlace: TileDefinition | null = null;
  private currentRotation: number = 0; // 0 to 300 in steps of 60

  constructor() {
    this.resetDeck();
  }

  private getKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  public resetDeck(): void {
    const allDefs = Object.values(TILE_DEFINITIONS);
    this.tileDeck = [];
    for (let i = 0; i < 7; i++) {
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
    this.currentRotation = (this.currentRotation + 60) % 360;
    return this.currentRotation;
  }

  public getDeckCount(): number {
    return this.tileDeck.length + (this.currentTileToPlace ? 1 : 0);
  }

  public getTileAt(q: number, r: number): PlacedHexTileInstance | undefined {
    return this.grid.get(this.getKey(q, r));
  }

  public getAllPlacedTiles(): PlacedHexTileInstance[] {
    return Array.from(this.grid.values());
  }

  public getBuildingTiles(): PlacedHexTileInstance[] {
    return this.getAllPlacedTiles().filter(t => !!t.tileDef.buildingType);
  }

  // Get all empty coordinates adjacent to placed tiles (the white placement slots)
  public getAvailablePlacementSlots(): { q: number; r: number }[] {
    const slots = new Map<string, { q: number; r: number }>();
    if (this.grid.size === 0) {
      return [{ q: 0, r: 0 }];
    }

    for (const tile of this.grid.values()) {
      for (const dir of HEX_DIRECTIONS) {
        const nq = tile.q + dir.dq;
        const nr = tile.r + dir.dr;
        const key = this.getKey(nq, nr);
        if (!this.grid.has(key)) {
          slots.set(key, { q: nq, r: nr });
        }
      }
    }

    return Array.from(slots.values());
  }

  public isValidPlacement(q: number, r: number): boolean {
    if (this.grid.has(this.getKey(q, r))) {
      return false;
    }
    if (this.grid.size === 0) {
      return q === 0 && r === 0;
    }
    const neighbors = this.getNeighbors(q, r);
    return neighbors.some(n => n !== undefined);
  }

  public getNeighbors(q: number, r: number): (PlacedHexTileInstance | undefined)[] {
    return HEX_DIRECTIONS.map(dir => this.getTileAt(q + dir.dq, r + dir.dr));
  }

  public getRotatedEdges(tileDef: TileDefinition, rotation: number): EdgeType[] {
    const shift = Math.floor(rotation / 60) % 6;
    const base4 = tileDef.baseEdges;
    // Map 4-edge definition to 6 hex edges [E, NE, NW, W, SW, SE]
    const base6: EdgeType[] = [
      base4[1], // East
      base4[0], // North-East
      base4[0], // North-West
      base4[3], // West
      base4[2], // South-West
      base4[2]  // South-East
    ];

    const rotated: EdgeType[] = [];
    for (let i = 0; i < 6; i++) {
      const origIdx = (i - shift + 6) % 6;
      rotated.push(base6[origIdx]);
    }
    return rotated;
  }

  public evaluateEdgeMatching(q: number, r: number, tileDef: TileDefinition, rotation: number): AdjacencyMatchResult {
    const rotatedEdges = this.getRotatedEdges(tileDef, rotation);
    const neighbors = this.getNeighbors(q, r);
    let matchingEdges = 0;
    let totalNeighbors = 0;

    // Opposite edge in hex directions: 0<->3, 1<->4, 2<->5
    const oppositeMap = [3, 4, 5, 0, 1, 2];

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

    const scoreBonus = matchingEdges * 15 + (matchingEdges === totalNeighbors && totalNeighbors >= 2 ? 25 : 0);
    return { matchingEdges, totalNeighbors, scoreBonus };
  }

  public placeTile(q: number, r: number, tileDef: TileDefinition, rotation: number, round: number = 1): PlacedHexTileInstance | null {
    if (!this.isValidPlacement(q, r)) {
      return null;
    }

    const instance: PlacedHexTileInstance = {
      id: `hex_${q}_${r}_${Date.now()}`,
      q,
      r,
      tileDef,
      rotation,
      isDamaged: false,
      placedAtRound: round
    };

    this.grid.set(this.getKey(q, r), instance);
    this.drawNextTile();
    return instance;
  }

  public setTileDamaged(q: number, r: number, isDamaged: boolean): boolean {
    const tile = this.getTileAt(q, r);
    if (tile) {
      tile.isDamaged = isDamaged;
      return true;
    }
    return false;
  }

  public initializeDefaultIsland(): void {
    this.grid.clear();
    // Recreate picturesque starting cluster resembling reference composition
    const centerMarket = TILE_DEFINITIONS['tile_haat_market'];
    const farm = TILE_DEFINITIONS['tile_farm'];
    const craft = TILE_DEFINITIONS['tile_textile_workshop'];
    const forest = TILE_DEFINITIONS['tile_sacred_forest'];
    const water = TILE_DEFINITIONS['tile_river_bend'];
    const shrine = TILE_DEFINITIONS['tile_sacred_shrine'];
    const civic = TILE_DEFINITIONS['tile_community_house'];

    this.placeTileDirect(0, 0, centerMarket, 0);
    this.placeTileDirect(1, 0, craft, 0);
    this.placeTileDirect(0, -1, farm, 60);
    this.placeTileDirect(-1, 0, water, 120);
    this.placeTileDirect(-1, 1, forest, 0);
    this.placeTileDirect(0, 1, civic, 180);
    this.placeTileDirect(1, -1, shrine, 0);
  }

  private placeTileDirect(q: number, r: number, tileDef: TileDefinition, rotation: number): void {
    const instance: PlacedHexTileInstance = {
      id: `hex_${q}_${r}_start`,
      q,
      r,
      tileDef,
      rotation,
      isDamaged: false,
      placedAtRound: 1
    };
    this.grid.set(this.getKey(q, r), instance);
  }

  public exportSaveData(): PlacedTileData[] {
    return Array.from(this.grid.values()).map(t => ({
      q: t.q,
      r: t.r,
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
        id: `hex_${item.q}_${item.r}_loaded`,
        q: item.q,
        r: item.r,
        tileDef: def,
        rotation: item.rotation,
        isDamaged: !!item.isDamaged,
        placedAtRound: 1
      });
    }
  }
}
