import { ResourceId } from './resources';

export type EventType = 'CHALLENGE' | 'POSITIVE' | 'NEUTRAL';

export interface GameEventDefinition {
  id: string;
  title: string;
  type: EventType;
  targetBuildingType: 'craft_centre' | 'farm' | 'traditional_market' | 'community_house' | 'music_pavilion' | 'sacred_shrine' | 'any';
  description: string;
  narrativePrompt: string;
  gameplaySceneKey: string;
  timeLimitSeconds: number;
  successReward: {
    points: number;
    resources: Partial<Record<ResourceId, number>>;
    culturalHarmonyBoost: number;
    message: string;
  };
  failurePenalty: {
    damagedBuilding: boolean;
    lostResources: Partial<Record<ResourceId, number>>;
    message: string;
  };
}

export const GAME_EVENTS: Record<string, GameEventDefinition> = {
  fire_event: {
    id: 'fire_event',
    title: '🔥 Fire at the Craft Centre!',
    type: 'CHALLENGE',
    targetBuildingType: 'craft_centre',
    description: 'A stray spark from the kiln ignited the dry textile looms! Enter immediately and douse the flames with water buckets before the building is destroyed!',
    narrativePrompt: 'Sparks have caught fire! Enter to extinguish the blaze with water buckets!',
    gameplaySceneKey: 'FireEventScene',
    timeLimitSeconds: 35,
    successReward: {
      points: 15,
      resources: { fibre: 2, clay: 1 },
      culturalHarmonyBoost: 10,
      message: 'Heroic Effort! You saved the Craft Centre and salvaged precious handloom textiles!'
    },
    failurePenalty: {
      damagedBuilding: true,
      lostResources: { fibre: 1 },
      message: 'The Craft Centre sustained fire damage. It requires repairs and cannot produce next round.'
    }
  },
  festival_event: {
    id: 'festival_event',
    title: '🎉 Seasonal Community Festival!',
    type: 'POSITIVE',
    targetBuildingType: 'music_pavilion',
    description: 'Villagers and visiting artisans have gathered! Help arrange decorative flower garlands, sweets, and ceremonial clay lamps at the festival altar.',
    narrativePrompt: 'The festival is in full swing! Gather festive offerings and complete the altar!',
    gameplaySceneKey: 'FestivalEventScene',
    timeLimitSeconds: 30,
    successReward: {
      points: 20,
      resources: { music: 2, grain: 1 },
      culturalHarmonyBoost: 15,
      message: 'Spectacular Celebration! The community is inspired, unlocking high cultural harmony!'
    },
    failurePenalty: {
      damagedBuilding: false,
      lostResources: {},
      message: 'The festival concluded quietly. You gained modest goodwill.'
    }
  },
  harvest_bounty: {
    id: 'harvest_bounty',
    title: '🌾 Golden Harvest Day!',
    type: 'POSITIVE',
    targetBuildingType: 'farm',
    description: 'A favorable monsoon season yields an overflowing harvest across terraced fields.',
    narrativePrompt: 'Harvest yields are abundant! Gather the golden grain bundles!',
    gameplaySceneKey: 'FestivalEventScene',
    timeLimitSeconds: 25,
    successReward: {
      points: 12,
      resources: { grain: 3, water: 1 },
      culturalHarmonyBoost: 8,
      message: 'Bountiful harvest stored! Extra grain added to your inventory.'
    },
    failurePenalty: {
      damagedBuilding: false,
      lostResources: {},
      message: 'Standard harvest collected.'
    }
  }
};
