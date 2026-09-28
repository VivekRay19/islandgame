import { ResourceId } from './resources';

export interface DevelopmentTask {
  id: string;
  level: 1 | 2 | 3;
  name: string;
  symbol: string;
  cost: Partial<Record<ResourceId, number>>;
  points: number;
  description: string;
  culturalRewardTitle: string;
}

export const DEVELOPMENT_TASKS: DevelopmentTask[] = [
  // LEVEL 1 (Rounds 1–2, +5 points each)
  {
    id: 'task_l1_farm',
    level: 1,
    name: 'Build a Farm',
    symbol: '🌾',
    cost: { grain: 2, water: 1 },
    points: 5,
    description: 'Establish irrigated agricultural terraces and storage barns.',
    culturalRewardTitle: 'Agrarian Foundation'
  },
  {
    id: 'task_l1_workshop',
    level: 1,
    name: 'Build a Workshop',
    symbol: '🪵',
    cost: { wood: 2, ore: 1 },
    points: 5,
    description: 'Construct a carpentry & forge guild with durable timber framing.',
    culturalRewardTitle: 'Timber Craftsmanship'
  },
  {
    id: 'task_l1_textiles',
    level: 1,
    name: 'Create Textiles',
    symbol: '🧵',
    cost: { fibre: 2, water: 1 },
    points: 5,
    description: 'Wash, spin, and dye fine woven fabric on traditional handlooms.',
    culturalRewardTitle: 'Handloom Heritage'
  },

  // LEVEL 2 (Rounds 3–4, +8 points each)
  {
    id: 'task_l2_trading_centre',
    level: 2,
    name: 'Trading Centre',
    symbol: '⚖️',
    cost: { wood: 2, ore: 1, grain: 1 },
    points: 8,
    description: 'Establish permanent market stalls and weighing balances for regional haat traders.',
    culturalRewardTitle: 'Commerce Haven'
  },
  {
    id: 'task_l2_textile_market',
    level: 2,
    name: 'Textile Market',
    symbol: '🏪',
    cost: { fibre: 2, water: 1, grain: 1 },
    points: 8,
    description: 'Open a dedicated handloom bazaar attracting tailors and craft traders.',
    culturalRewardTitle: 'Silken Crossroads'
  },
  {
    id: 'task_l2_processing_centre',
    level: 2,
    name: 'Processing Centre',
    symbol: '⚙️',
    cost: { grain: 2, water: 1, ore: 1 },
    points: 8,
    description: 'Build stone milling wheels and granaries for refined harvest processing.',
    culturalRewardTitle: 'Artisan Industry'
  },

  // LEVEL 3 (Rounds 5–6, +12 points each)
  {
    id: 'task_l3_grand_haat',
    level: 3,
    name: 'Grand Haat',
    symbol: '✨',
    cost: { wood: 1, water: 1, grain: 1, ore: 1, fibre: 1 },
    points: 12,
    description: 'The crowning achievement of Island Haat: a glorious inter-island cultural bazaar uniting all five resources in harmony.',
    culturalRewardTitle: 'Great Sovereign Haat'
  },
  {
    id: 'task_l3_craft_hub',
    level: 3,
    name: 'Craft Hub',
    symbol: '🏺',
    cost: { fibre: 2, wood: 1, water: 1, ore: 1 },
    points: 12,
    description: 'A master artisan pavilion blending metalwork, timber, and woven textiles.',
    culturalRewardTitle: 'Master Guild Realm'
  },
  {
    id: 'task_l3_integrated_market',
    level: 3,
    name: 'Integrated Market',
    symbol: '🏛️',
    cost: { grain: 2, water: 1, wood: 1, fibre: 1 },
    points: 12,
    description: 'A thriving waterfront marketplace with docks, granaries, and craft stalls.',
    culturalRewardTitle: 'Vibrant Haat Metropolis'
  }
];
