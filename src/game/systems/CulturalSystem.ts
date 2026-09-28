import { CULTURAL_CONNECTIONS, CulturalConnectionRecipe } from '../data/culturalElements';
import { TileSystem, PlacedTileInstance } from './TileSystem';

export interface ActiveSynergyInstance {
  recipe: CulturalConnectionRecipe;
  tileA: PlacedTileInstance;
  tileB: PlacedTileInstance;
}

export class CulturalSystem {
  private activeSynergies: ActiveSynergyInstance[] = [];
  private culturalHarmonyScore: number = 0;

  public recalculateSynergies(tileSystem: TileSystem): ActiveSynergyInstance[] {
    const tiles = tileSystem.getAllPlacedTiles();
    const newSynergies: ActiveSynergyInstance[] = [];
    const pairedKeys = new Set<string>();

    for (const tile of tiles) {
      if (!tile.tileDef.buildingType) continue;

      const neighbors = tileSystem.getNeighbors(tile.gx, tile.gy);
      for (const neighbor of neighbors) {
        if (!neighbor || !neighbor.tileDef.buildingType) continue;

        // Prevent duplicate pairing (A-B vs B-A)
        const pairKey = [tile.id, neighbor.id].sort().join(':::');
        if (pairedKeys.has(pairKey)) continue;

        // Check if this pair matches any cultural connection recipe
        const typeA = tile.tileDef.buildingType;
        const typeB = neighbor.tileDef.buildingType;

        for (const recipe of CULTURAL_CONNECTIONS) {
          const matchDirect = (recipe.elementA === typeA && recipe.elementB === typeB);
          const matchReverse = (recipe.elementA === typeB && recipe.elementB === typeA);

          if (matchDirect || matchReverse) {
            pairedKeys.add(pairKey);
            newSynergies.push({
              recipe,
              tileA: tile,
              tileB: neighbor
            });
            break;
          }
        }
      }
    }

    this.activeSynergies = newSynergies;
    this.culturalHarmonyScore = newSynergies.reduce((acc, s) => acc + s.recipe.points, 0);
    return this.activeSynergies;
  }

  public getActiveSynergies(): ActiveSynergyInstance[] {
    return this.activeSynergies;
  }

  public getCulturalHarmonyScore(): number {
    return this.culturalHarmonyScore;
  }

  public getEmergentIslandTitle(tileSystem: TileSystem): string {
    const tiles = tileSystem.getAllPlacedTiles();
    if (tiles.length === 0) return 'Nascent Island';

    const countByCategory: Record<string, number> = {};
    for (const t of tiles) {
      countByCategory[t.tileDef.category] = (countByCategory[t.tileDef.category] || 0) + 1;
    }

    let dominantCategory = 'Nature';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(countByCategory)) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = cat;
      }
    }

    const synergyCount = this.activeSynergies.length;

    if (synergyCount >= 4) {
      return '✨ Grand Sovereign Cultural Archipelago';
    } else if (dominantCategory === 'Craft') {
      return '🧵 Master Artisan & Handloom Isle';
    } else if (dominantCategory === 'Agriculture') {
      return '🌾 Bountiful Agrarian Haven';
    } else if (dominantCategory === 'Trade') {
      return '🏪 Vibrant Central Haat Crossroads';
    } else if (dominantCategory === 'Spiritual') {
      return '🪔 Sacred Harmony & Melodic Realm';
    } else if (dominantCategory === 'Civic') {
      return '🏛️ United Heritage Community';
    } else {
      return '🌿 Flourishing Serene Island';
    }
  }
}
