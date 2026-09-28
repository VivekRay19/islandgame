import { ResourceId } from './resources';

export type EdgeType = 'water' | 'grass' | 'forest' | 'village' | 'mountain' | 'field';

export interface TileDefinition {
  id: string;
  name: string;
  category: 'Nature' | 'Agriculture' | 'Craft' | 'Civic' | 'Trade' | 'Spiritual' | 'Water';
  culturalElementId?: string;
  description: string;
  symbol: string;
  baseEdges: [EdgeType, EdgeType, EdgeType, EdgeType]; // [Top, Right, Bottom, Left]
  associatedResource?: ResourceId;
  canHostEvent: boolean;
  spriteKey: string;
  buildingType?: 'farm' | 'craft_centre' | 'traditional_market' | 'community_house' | 'water_mill' | 'music_pavilion' | 'sacred_shrine' | 'clay_pit';
}

export const TILE_DEFINITIONS: Record<string, TileDefinition> = {
  tile_farm: {
    id: 'tile_farm',
    name: 'Terraced Grain Farm',
    category: 'Agriculture',
    culturalElementId: 'water_mill',
    description: 'Lush golden terraces producing grain for the island community.',
    symbol: '🌾',
    baseEdges: ['field', 'grass', 'field', 'water'],
    associatedResource: 'grain',
    canHostEvent: true,
    buildingType: 'farm',
    spriteKey: 'tile_farm'
  },
  tile_textile_workshop: {
    id: 'tile_textile_workshop',
    name: 'Textile Workshop & Loom',
    category: 'Craft',
    culturalElementId: 'craft_centre',
    description: 'Weaving handlooms producing fine cotton & jute textiles.',
    symbol: '🧵',
    baseEdges: ['village', 'grass', 'village', 'grass'],
    associatedResource: 'fibre',
    canHostEvent: true,
    buildingType: 'craft_centre',
    spriteKey: 'tile_craft'
  },
  tile_haat_market: {
    id: 'tile_haat_market',
    name: 'Haat Trading Square',
    category: 'Trade',
    culturalElementId: 'traditional_market',
    description: 'Bustling bazaar where goods, spices, and artisan wares are exchanged.',
    symbol: '🏪',
    baseEdges: ['village', 'village', 'grass', 'water'],
    associatedResource: 'clay',
    canHostEvent: true,
    buildingType: 'traditional_market',
    spriteKey: 'tile_market'
  },
  tile_community_house: {
    id: 'tile_community_house',
    name: 'Community Gathering Hall',
    category: 'Civic',
    culturalElementId: 'community_house',
    description: 'Carved wooden sanctuary where elders and artisans convene.',
    symbol: '🏛️',
    baseEdges: ['village', 'forest', 'village', 'grass'],
    associatedResource: 'wood',
    canHostEvent: true,
    buildingType: 'community_house',
    spriteKey: 'tile_civic'
  },
  tile_music_pavilion: {
    id: 'tile_music_pavilion',
    name: 'Melodic Music Pavilion',
    category: 'Spiritual',
    culturalElementId: 'community_festival',
    description: 'Open gazebo echoing with folk sitars, flutes, and percussion.',
    symbol: '🎵',
    baseEdges: ['grass', 'forest', 'grass', 'water'],
    associatedResource: 'music',
    canHostEvent: true,
    buildingType: 'music_pavilion',
    spriteKey: 'tile_music'
  },
  tile_sacred_shrine: {
    id: 'tile_sacred_shrine',
    name: 'Ancestral Heritage Shrine',
    category: 'Spiritual',
    culturalElementId: 'sacred_shrine',
    description: 'A quiet sanctum surrounded by glowing terracotta lamps and banyan roots.',
    symbol: '🪔',
    baseEdges: ['mountain', 'grass', 'mountain', 'forest'],
    associatedResource: 'stone',
    canHostEvent: true,
    buildingType: 'sacred_shrine',
    spriteKey: 'tile_shrine'
  },
  tile_clay_pit: {
    id: 'tile_clay_pit',
    name: 'Riverbed Terracotta Clay Pit',
    category: 'Craft',
    culturalElementId: 'pottery_kiln',
    description: 'Rich clay banks extracted for ceramic pottery and roof tiles.',
    symbol: '🏺',
    baseEdges: ['water', 'grass', 'water', 'field'],
    associatedResource: 'clay',
    canHostEvent: false,
    buildingType: 'clay_pit',
    spriteKey: 'tile_clay'
  },
  tile_river_bend: {
    id: 'tile_river_bend',
    name: 'Scenic River Waterway',
    category: 'Water',
    description: 'Fresh sparkling stream nourishing surrounding crops and wildlife.',
    symbol: '💧',
    baseEdges: ['water', 'water', 'grass', 'grass'],
    associatedResource: 'water',
    canHostEvent: false,
    spriteKey: 'tile_water'
  },
  tile_sacred_forest: {
    id: 'tile_sacred_forest',
    name: 'Ancient Banyan Forest',
    category: 'Nature',
    description: 'Dense canopy providing timber and cooling shade for the village.',
    symbol: '🪵',
    baseEdges: ['forest', 'forest', 'grass', 'forest'],
    associatedResource: 'wood',
    canHostEvent: false,
    spriteKey: 'tile_forest'
  },
  tile_quarry: {
    id: 'tile_quarry',
    name: 'Stone Quarry & Mine',
    category: 'Nature',
    description: 'Rugged highlands producing stone slabs and mineral ores.',
    symbol: '🪨',
    baseEdges: ['mountain', 'mountain', 'grass', 'mountain'],
    associatedResource: 'stone',
    canHostEvent: false,
    spriteKey: 'tile_mountain'
  }
};
