export interface PlacedTileData {
  q: number;
  r: number;
  tileDefId: string;
  rotation: number; // 0, 90, 180, 270
  isDamaged?: boolean;
}

export interface SavedGameState {
  round: number;
  score: number;
  culturalHarmony: number;
  playerIslandName: string;
  specialtyResource: string;
  inventory: Record<string, number>;
  placedTiles: PlacedTileData[];
  completedTasks: string[];
  activeSynergies: string[];
  completedEvents: string[];
  tradesCompletedThisRound: number;
}

const SAVE_KEY = 'cultural_islands_save_v1';

export class SaveSystem {
  public static saveGame(state: SavedGameState): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
      return false;
    }
  }

  public static loadGame(): SavedGameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedGameState;
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return null;
    }
  }

  public static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  public static clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
