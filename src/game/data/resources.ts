export type ResourceId = 'grain' | 'fibre' | 'wood' | 'stone' | 'clay' | 'water' | 'music' | 'ore';

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  symbol: string;
  color: string;
  description: string;
  primaryProducerIsland: string;
}

export const RESOURCES: Record<ResourceId, ResourceDefinition> = {
  grain: {
    id: 'grain',
    name: 'Grain',
    symbol: '🌾',
    color: '#eab308',
    description: 'Golden staple crop symbolizing agriculture, sustenance, and abundance.',
    primaryProducerIsland: 'Grain Island'
  },
  fibre: {
    id: 'fibre',
    name: 'Fibre / Textile',
    symbol: '🧵',
    color: '#ec4899',
    description: 'Spun threads used for traditional garments, crafts, and festive canopies.',
    primaryProducerIsland: 'Fibre Island'
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    symbol: '🪵',
    color: '#a16207',
    description: 'Sturdy timber harvested sustainably for community houses, boats, and workshops.',
    primaryProducerIsland: 'Wood Island'
  },
  stone: {
    id: 'stone',
    name: 'Stone / Ore',
    symbol: '🪨',
    color: '#71717a',
    description: 'Carved masonry for timeless foundations, pillars, and enduring monuments.',
    primaryProducerIsland: 'Ore Island'
  },
  clay: {
    id: 'clay',
    name: 'Clay / Terracotta',
    symbol: '🏺',
    color: '#ea580c',
    description: 'Rich riverbed earth molded into earthenware, storage jars, and sculptures.',
    primaryProducerIsland: 'Clay Isle'
  },
  water: {
    id: 'water',
    name: 'Pure Water',
    symbol: '💧',
    color: '#0284c7',
    description: 'Sacred river and spring waters nurturing crops and extinguishing hazards.',
    primaryProducerIsland: 'Water Island'
  },
  music: {
    id: 'music',
    name: 'Music / Rhythm',
    symbol: '🎵',
    color: '#8b5cf6',
    description: 'Folk melodies, flutes, and percussion bringing celebrations to life.',
    primaryProducerIsland: 'Festival Haven'
  },
  ore: {
    id: 'ore',
    name: 'Ore / Metal',
    symbol: '⛏️',
    color: '#64748b',
    description: 'Smelted metal for tools, bells, and decorative artisan metalwork.',
    primaryProducerIsland: 'Ore Island'
  }
};

// 20 Cultural Symbols System as specified in design documents
export interface CulturalSymbol {
  id: string;
  name: string;
  glyph: string;
  category: 'Resource' | 'Craft' | 'Tradition' | 'Environment';
  meaning: string;
}

export const CULTURAL_SYMBOLS: CulturalSymbol[] = [
  { id: 'sym_grain', name: 'Grain', glyph: '🌾', category: 'Resource', meaning: 'Agriculture & Nourishment' },
  { id: 'sym_textile', name: 'Textile', glyph: '🧵', category: 'Craft', meaning: 'Weaving & Handloom Craft' },
  { id: 'sym_wood', name: 'Wood', glyph: '🪵', category: 'Resource', meaning: 'Carpentry & Shelter' },
  { id: 'sym_stone', name: 'Stone', glyph: '🪨', category: 'Resource', meaning: 'Architecture & Permanence' },
  { id: 'sym_music', name: 'Music', glyph: '🎵', category: 'Tradition', meaning: 'Folk Songs & Rhythm' },
  { id: 'sym_clay', name: 'Clay', glyph: '🏺', category: 'Craft', meaning: 'Pottery & Heritage Vessels' },
  { id: 'sym_water', name: 'Water', glyph: '💧', category: 'Environment', meaning: 'Life, Flow & Purity' },
  { id: 'sym_market', name: 'Market', glyph: '🏪', category: 'Tradition', meaning: 'The Haat & Commerce' },
  { id: 'sym_community', name: 'Community', glyph: '👥', category: 'Tradition', meaning: 'Kinship & Mutual Support' },
  { id: 'sym_craft', name: 'Craft', glyph: '🔨', category: 'Craft', meaning: 'Artisan Ingenuity' },
  { id: 'sym_festival', name: 'Festival', glyph: '🎉', category: 'Tradition', meaning: 'Celebration & Joy' },
  { id: 'sym_nature', name: 'Nature', glyph: '🌿', category: 'Environment', meaning: 'Harmony with the Land' },
  { id: 'sym_food', name: 'Food', glyph: '🍲', category: 'Tradition', meaning: 'Culinary Hospitality' },
  { id: 'sym_agriculture', name: 'Agriculture', glyph: '🌱', category: 'Environment', meaning: 'Seasonal Cultivation' },
  { id: 'sym_trade', name: 'Trade', glyph: '⚖️', category: 'Tradition', meaning: 'Equitable Exchange' },
  { id: 'sym_architecture', name: 'Architecture', glyph: '🏛️', category: 'Craft', meaning: 'Cultural Monuments' },
  { id: 'sym_story', name: 'Storytelling', glyph: '📜', category: 'Tradition', meaning: 'Oral Lore & Epics' },
  { id: 'sym_performance', name: 'Performance', glyph: '🎭', category: 'Tradition', meaning: 'Dance & Theatre' },
  { id: 'sym_travel', name: 'Travel', glyph: '⛵', category: 'Environment', meaning: 'Island Voyages & Haat Journeys' },
  { id: 'sym_heritage', name: 'Heritage', glyph: '🪔', category: 'Tradition', meaning: 'Sacred Flame & Lineage' }
];
