import { ResourceId } from '../data/resources';
import { TileSystem } from './TileSystem';
import { ResourceSystem } from './ResourceSystem';
import { CulturalSystem } from './CulturalSystem';
import { TradeSystem } from './TradeSystem';
import { EventSystem } from './EventSystem';
import { ScoringSystem } from './ScoringSystem';
import { SoundSystem } from './SoundSystem';
import { SaveSystem } from './SaveSystem';

export class StateManager {
  private static instance: StateManager;

  public playerName: string = 'Maya';
  public islandName: string = 'Isle of Serenity';
  public specialtyResource: ResourceId = 'grain';

  public tileSystem: TileSystem;
  public resourceSystem: ResourceSystem;
  public culturalSystem: CulturalSystem;
  public tradeSystem: TradeSystem;
  public eventSystem: EventSystem;
  public scoringSystem: ScoringSystem;
  public soundSystem: SoundSystem;

  private constructor() {
    this.soundSystem = SoundSystem.getInstance();
    this.tileSystem = new TileSystem();
    this.resourceSystem = new ResourceSystem(this.specialtyResource);
    this.culturalSystem = new CulturalSystem();
    this.tradeSystem = new TradeSystem(this.specialtyResource);
    this.eventSystem = new EventSystem();
    this.scoringSystem = new ScoringSystem();

    this.initGame();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  public initGame(specialty: ResourceId = 'grain', islandName: string = 'Isle of Serenity'): void {
    this.specialtyResource = specialty;
    this.islandName = islandName;
    this.tileSystem = new TileSystem();
    this.tileSystem.initializeDefaultIsland();
    this.resourceSystem = new ResourceSystem(specialty);
    this.culturalSystem = new CulturalSystem();
    this.culturalSystem.recalculateSynergies(this.tileSystem);
    this.tradeSystem = new TradeSystem(specialty);
    this.eventSystem = new EventSystem();
    this.scoringSystem = new ScoringSystem();
  }

  public advanceToNextRound(): { newRound: number; isGameOver: boolean } {
    const result = this.scoringSystem.advanceRound();
    if (!result.isGameOver) {
      // 1. Produce resources
      this.resourceSystem.produceRoundResources(this.specialtyResource);
      // 2. Refresh Haat trades
      this.tradeSystem.resetRoundTrades();
      // 3. Trigger events for this round
      this.eventSystem.checkRandomEventTrigger(this.tileSystem, result.newRound);
    }
    return result;
  }
}
