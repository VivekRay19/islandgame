import { ResourceId } from './resources';

export interface CulturalElementDefinition {
  id: string;
  name: string;
  symbol: string;
  category: 'Craft' | 'Civic' | 'Spiritual' | 'Agrarian' | 'Trade';
  requiredResources: Partial<Record<ResourceId, number>>;
  description: string;
  passiveBonus: string;
  spriteKey: string;
}

export const CULTURAL_ELEMENTS: Record<string, CulturalElementDefinition> = {
  traditional_market: {
    id: 'traditional_market',
    name: 'Traditional Haat Pavilion',
    symbol: '🏪',
    category: 'Trade',
    requiredResources: { grain: 1, fibre: 1, clay: 1 },
    description: 'A vibrant open-air market stall where islanders negotiate and trade crafts.',
    passiveBonus: '+1 Trade opportunity per round',
    spriteKey: 'bldg_market'
  },
  community_festival: {
    id: 'community_festival',
    name: 'Community Festival Grounds',
    symbol: '🎉',
    category: 'Spiritual',
    requiredResources: { grain: 1, music: 1 },
    description: 'An adorned courtyard celebrating seasonal joy, folk dance, and harmony.',
    passiveBonus: '+15% Event success duration',
    spriteKey: 'bldg_festival'
  },
  craft_centre: {
    id: 'craft_centre',
    name: 'Artisan Craft Centre',
    symbol: '🧵',
    category: 'Craft',
    requiredResources: { fibre: 1, clay: 1 },
    description: 'A shared guild house for weavers, potters, and woodcarvers.',
    passiveBonus: 'Generates 1 random craft resource each round',
    spriteKey: 'bldg_craft'
  },
  community_house: {
    id: 'community_house',
    name: 'Heritage Community House',
    symbol: '🏛️',
    category: 'Civic',
    requiredResources: { wood: 1, stone: 1 },
    description: 'Grand timber-and-stone hall for assembly and cultural storytelling.',
    passiveBonus: '+2 Island Capacity & Score',
    spriteKey: 'bldg_house'
  },
  water_mill: {
    id: 'water_mill',
    name: 'River Water Mill',
    symbol: '💧',
    category: 'Agrarian',
    requiredResources: { wood: 1, water: 1 },
    description: 'Harnesses freshwater currents to grind grains and irrigate terraced farms.',
    passiveBonus: '+1 Water & Grain generation',
    spriteKey: 'bldg_mill'
  },
  pottery_kiln: {
    id: 'pottery_kiln',
    name: 'Terracotta Pottery Kiln',
    symbol: '🏺',
    category: 'Craft',
    requiredResources: { clay: 2, wood: 1 },
    description: 'Fires earthen pottery and decorative tilework for island homes.',
    passiveBonus: '+1 Clay generation',
    spriteKey: 'bldg_pottery'
  },
  sacred_shrine: {
    id: 'sacred_shrine',
    name: 'Ancestral Cultural Shrine',
    symbol: '🪔',
    category: 'Spiritual',
    requiredResources: { stone: 1, music: 1 },
    description: 'Peaceful sanctuary resonating with acoustic chimes and lit brass lamps.',
    passiveBonus: '+5 Cultural Harmony score',
    spriteKey: 'bldg_shrine'
  }
};

// Cultural Connect Adjacency Synergies
export interface CulturalConnectionRecipe {
  id: string;
  name: string;
  elementA: string; // Element or Tile Type
  elementB: string;
  synergyName: string;
  description: string;
  points: number;
  unlockedBonus: string;
}

export const CULTURAL_CONNECTIONS: CulturalConnectionRecipe[] = [
  {
    id: 'conn_festival',
    name: 'Festival Connection',
    elementA: 'farm',
    elementB: 'music_pavilion',
    synergyName: 'Bountiful Celebration',
    description: 'Harvest meets music, blessing the island with vibrant cultural festivities.',
    points: 10,
    unlockedBonus: 'Unlocks Positive Festival Events'
  },
  {
    id: 'conn_craft',
    name: 'Craft & Weaving Connection',
    elementA: 'craft_centre',
    elementB: 'clay_pit',
    synergyName: 'Terracotta & Handloom Guild',
    description: 'Weavers and clay potters work together in collaborative artistry.',
    points: 8,
    unlockedBonus: 'Craft items sell for +2 Trade Value'
  },
  {
    id: 'conn_market',
    name: 'Market Connection',
    elementA: 'traditional_market',
    elementB: 'farm',
    synergyName: 'Haat Fresh Produce Market',
    description: 'Direct farm-to-haat trade network flourishing with community buyers.',
    points: 12,
    unlockedBonus: '+1 Free Resource on Trade'
  },
  {
    id: 'conn_architecture',
    name: 'Community Architecture Connection',
    elementA: 'community_house',
    elementB: 'water_mill',
    synergyName: 'Sustainable Civic Settlement',
    description: 'Timber architecture aligned harmoniously with natural watercourses.',
    points: 15,
    unlockedBonus: 'Increases Island Resilience against disasters'
  },
  {
    id: 'conn_spiritual',
    name: 'Heritage Resonance',
    elementA: 'sacred_shrine',
    elementB: 'traditional_market',
    synergyName: 'Haat Pilgrimage Fair',
    description: 'Traditional commerce and sacred celebration unite in harmony.',
    points: 14,
    unlockedBonus: '+2 Score on every completed task'
  }
];
