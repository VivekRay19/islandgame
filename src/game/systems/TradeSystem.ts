import { ResourceId, RESOURCES } from '../data/resources';
import { ResourceSystem } from './ResourceSystem';

export interface IslandTrader {
  id: string;
  name: string;
  islandName: string;
  specialty: ResourceId;
  avatarIcon: string;
  personality: string;
  offeredResource: ResourceId;
  offeredQuantity: number;
  requestedResource: ResourceId;
  requestedQuantity: number;
  completedTradesCount: number;
}

export class TradeSystem {
  private traders: IslandTrader[] = [];
  private playerTradesCompletedThisRound: number = 0;
  public readonly MAX_TRADES_PER_ROUND: number = 2;

  constructor(playerSpecialty: ResourceId) {
    this.initializeTraders(playerSpecialty);
  }

  public initializeTraders(playerSpecialty: ResourceId): void {
    const allTraders: IslandTrader[] = [
      {
        id: 'trader_maya',
        name: 'Maya',
        islandName: 'Wood Isle',
        specialty: 'wood',
        avatarIcon: '🪵',
        personality: 'Experienced timber artisan seeking rare minerals and ores.',
        offeredResource: 'wood',
        offeredQuantity: 2,
        requestedResource: 'ore',
        requestedQuantity: 1,
        completedTradesCount: 0
      },
      {
        id: 'trader_kabir',
        name: 'Kabir',
        islandName: 'Water Haven',
        specialty: 'water',
        avatarIcon: '💧',
        personality: 'River navigator looking for wholesome grain to feed his crew.',
        offeredResource: 'water',
        offeredQuantity: 2,
        requestedResource: 'grain',
        requestedQuantity: 1,
        completedTradesCount: 0
      },
      {
        id: 'trader_leela',
        name: 'Leela',
        islandName: 'Fibre Atoll',
        specialty: 'fibre',
        avatarIcon: '🧵',
        personality: 'Master weaver desiring pure water to wash silk and dye threads.',
        offeredResource: 'fibre',
        offeredQuantity: 2,
        requestedResource: 'water',
        requestedQuantity: 1,
        completedTradesCount: 0
      },
      {
        id: 'trader_dev',
        name: 'Dev',
        islandName: 'Ore Summit',
        specialty: 'ore',
        avatarIcon: '⛏️',
        personality: 'Quarry master needing sturdy timber beams for deep mine shafts.',
        offeredResource: 'ore',
        offeredQuantity: 1,
        requestedResource: 'wood',
        requestedQuantity: 2,
        completedTradesCount: 0
      },
      {
        id: 'trader_anita',
        name: 'Anita',
        islandName: 'Grain Terraces',
        specialty: 'grain',
        avatarIcon: '🌾',
        personality: 'Farmer seeking woven bags and pottery to store bountiful harvest.',
        offeredResource: 'grain',
        offeredQuantity: 2,
        requestedResource: 'fibre',
        requestedQuantity: 1,
        completedTradesCount: 0
      }
    ];

    // Filter out trader matching player's specialty if duplicate, or keep balanced pool
    this.traders = allTraders.filter(t => t.specialty !== playerSpecialty);
  }

  public resetRoundTrades(): void {
    this.playerTradesCompletedThisRound = 0;
    this.refreshTraderDemands();
  }

  public refreshTraderDemands(): void {
    const resources: ResourceId[] = ['grain', 'fibre', 'wood', 'stone', 'clay', 'water', 'music', 'ore'];
    for (const trader of this.traders) {
      trader.offeredResource = trader.specialty;
      trader.offeredQuantity = Math.random() > 0.4 ? 2 : 1;
      
      // Pick a random requested resource distinct from specialty
      const candidates = resources.filter(r => r !== trader.specialty);
      trader.requestedResource = candidates[Math.floor(Math.random() * candidates.length)];
      trader.requestedQuantity = Math.random() > 0.5 ? 1 : 2;
    }
  }

  public getTraders(): IslandTrader[] {
    return this.traders;
  }

  public getRemainingTrades(): number {
    return Math.max(0, this.MAX_TRADES_PER_ROUND - this.playerTradesCompletedThisRound);
  }

  public canTrade(): boolean {
    return this.playerTradesCompletedThisRound < this.MAX_TRADES_PER_ROUND;
  }

  public executeTrade(
    traderId: string,
    resourceSystem: ResourceSystem
  ): { success: boolean; message: string } {
    if (!this.canTrade()) {
      return { success: false, message: 'You have reached the maximum 2 trades for this round!' };
    }

    const trader = this.traders.find(t => t.id === traderId);
    if (!trader) {
      return { success: false, message: 'Trader not found.' };
    }

    if (resourceSystem.getCount(trader.requestedResource) < trader.requestedQuantity) {
      const resName = RESOURCES[trader.requestedResource]?.name || trader.requestedResource;
      return {
        success: false,
        message: `You need ${trader.requestedQuantity}x ${resName} to complete this trade with ${trader.name}.`
      };
    }

    // Execute exchange
    resourceSystem.removeResource(trader.requestedResource, trader.requestedQuantity);
    resourceSystem.addResource(trader.offeredResource, trader.offeredQuantity);
    this.playerTradesCompletedThisRound++;
    trader.completedTradesCount++;

    const offeredName = RESOURCES[trader.offeredResource]?.name || trader.offeredResource;
    const requestedName = RESOURCES[trader.requestedResource]?.name || trader.requestedResource;

    return {
      success: true,
      message: `Trade successful! Exchanged ${trader.requestedQuantity} ${requestedName} for ${trader.offeredQuantity} ${offeredName} with ${trader.name}.`
    };
  }
}
