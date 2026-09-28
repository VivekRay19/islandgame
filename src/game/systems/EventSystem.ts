import { GameEventDefinition, GAME_EVENTS } from '../data/events';
import { TileSystem, PlacedHexTileInstance } from './TileSystem';
import { ResourceSystem } from './ResourceSystem';

export interface ActiveEventInstance {
  eventDef: GameEventDefinition;
  targetTile: PlacedHexTileInstance;
  triggeredAtTime: number;
}

export class EventSystem {
  private activeEvent: ActiveEventInstance | null = null;
  private completedEventsList: string[] = [];

  public getActiveEvent(): ActiveEventInstance | null {
    return this.activeEvent;
  }

  public clearActiveEvent(): void {
    this.activeEvent = null;
  }

  public triggerSpecificEvent(eventId: string, tileSystem: TileSystem): ActiveEventInstance | null {
    const eventDef = GAME_EVENTS[eventId];
    if (!eventDef) return null;

    const buildings = tileSystem.getBuildingTiles();
    let eligible = buildings.filter(b => b.tileDef.buildingType === eventDef.targetBuildingType && !b.isDamaged);

    // Fallback to any building if target not found
    if (eligible.length === 0) {
      eligible = buildings.filter(b => !b.isDamaged);
    }

    if (eligible.length === 0) {
      return null;
    }

    const targetTile = eligible[Math.floor(Math.random() * eligible.length)];
    this.activeEvent = {
      eventDef,
      targetTile,
      triggeredAtTime: Date.now()
    };
    return this.activeEvent;
  }

  public checkRandomEventTrigger(tileSystem: TileSystem, round: number): ActiveEventInstance | null {
    if (this.activeEvent) return this.activeEvent;

    // Fire event on round 1/2 for demonstration, then random positive/challenge
    if (round === 1 || round === 2) {
      return this.triggerSpecificEvent('fire_event', tileSystem);
    } else {
      const candidates = ['fire_event', 'festival_event', 'harvest_bounty'];
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      return this.triggerSpecificEvent(picked, tileSystem);
    }
  }

  public resolveEventOutcome(
    success: boolean,
    tileSystem: TileSystem,
    resourceSystem: ResourceSystem
  ): { points: number; harmony: number; message: string } {
    if (!this.activeEvent) {
      return { points: 0, harmony: 0, message: 'No event active.' };
    }

    const { eventDef, targetTile } = this.activeEvent;
    this.completedEventsList.push(eventDef.id);

    if (success) {
      const reward = eventDef.successReward;
      for (const [resKey, amt] of Object.entries(reward.resources)) {
        if (amt && amt > 0) {
          resourceSystem.addResource(resKey as any, amt);
        }
      }
      this.clearActiveEvent();
      return {
        points: reward.points,
        harmony: reward.culturalHarmonyBoost,
        message: reward.message
      };
    } else {
      const penalty = eventDef.failurePenalty;
      if (penalty.damagedBuilding) {
        tileSystem.setTileDamaged(targetTile.q, targetTile.r, true);
      }
      for (const [resKey, amt] of Object.entries(penalty.lostResources)) {
        if (amt && amt > 0) {
          resourceSystem.removeResource(resKey as any, amt);
        }
      }
      this.clearActiveEvent();
      return {
        points: 0,
        harmony: -5,
        message: penalty.message
      };
    }
  }
}
