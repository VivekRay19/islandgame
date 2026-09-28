import { ResourceId, RESOURCES } from '../data/resources';

export class ResourceSystem {
  private inventory: Record<ResourceId, number> = {
    grain: 0,
    fibre: 0,
    wood: 0,
    stone: 0,
    clay: 0,
    water: 0,
    music: 0,
    ore: 0
  };

  constructor(initialSpecialty: ResourceId = 'grain') {
    // Initial starting resource
    this.addResource(initialSpecialty, 3);
  }

  public getInventory(): Record<ResourceId, number> {
    return { ...this.inventory };
  }

  public getCount(resource: ResourceId): number {
    return this.inventory[resource] || 0;
  }

  public addResource(resource: ResourceId, amount: number): void {
    if (amount <= 0) return;
    this.inventory[resource] = (this.inventory[resource] || 0) + amount;
  }

  public removeResource(resource: ResourceId, amount: number): boolean {
    if (amount <= 0) return true;
    if ((this.inventory[resource] || 0) < amount) {
      return false;
    }
    this.inventory[resource] -= amount;
    return true;
  }

  public canAfford(cost: Partial<Record<ResourceId, number>>): boolean {
    for (const [resKey, amount] of Object.entries(cost)) {
      const resId = resKey as ResourceId;
      if ((this.inventory[resId] || 0) < (amount || 0)) {
        return false;
      }
    }
    return true;
  }

  public spendCost(cost: Partial<Record<ResourceId, number>>): boolean {
    if (!this.canAfford(cost)) return false;
    for (const [resKey, amount] of Object.entries(cost)) {
      const resId = resKey as ResourceId;
      this.inventory[resId] -= (amount || 0);
    }
    return true;
  }

  public produceRoundResources(specialty: ResourceId): number {
    const amount = 3;
    this.addResource(specialty, amount);
    return amount;
  }

  public setInventory(saved: Record<string, number>): void {
    for (const key of Object.keys(this.inventory)) {
      const resId = key as ResourceId;
      this.inventory[resId] = saved[resId] || 0;
    }
  }

  public getFormattedInventoryString(): string {
    return Object.entries(this.inventory)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => `${RESOURCES[id as ResourceId]?.symbol || ''} ${RESOURCES[id as ResourceId]?.name || id}: ${count}`)
      .join('  |  ');
  }
}
