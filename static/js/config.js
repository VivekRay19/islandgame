// ─── Central configuration ────────────────────────────────────────────────────
export const API_BASE  = 'http://192.168.8.10:8067/api';
export const WS_URL    = 'ws://192.168.8.10:8068/ws';

export const GAME_W = 1280;
export const GAME_H = 720;

// Tile definitions — kept in sync with game-server/src/game_logic/tiles.rs
export const TILE_DEFS = {
  tile_farm:             { label:'FARM', name:'Terraced Grain Farm',      color:0x89c24a, sideL:0x2d4010, sideR:0x4a6a20, res:'grain', cost:{grain:1,water:1} },
  tile_sacred_forest:    { label:'TREE', name:'Ancient Banyan Forest',    color:0x1c5e21, sideL:0x0e3010, sideR:0x143818, res:'wood',  cost:{wood:1} },
  tile_river_bend:       { label:'RIVR', name:'Scenic River Waterway',    color:0x269ee0, sideL:0x0d4870, sideR:0x105880, res:'water', cost:{water:1} },
  tile_textile_workshop: { label:'LOOM', name:'Textile Workshop',         color:0xa16207, sideL:0x4a2c00, sideR:0x7a4800, res:'fibre', cost:{fibre:1,wood:1} },
  tile_haat_market:      { label:'HAAT', name:'Haat Trading Square',      color:0x8a2bb0, sideL:0x331040, sideR:0x5c2070, res:'clay',  cost:{wood:2,clay:1} },
  tile_community_house:  { label:'HALL', name:'Community Gathering Hall', color:0xd98c2e, sideL:0x4a2c08, sideR:0x9a5c14, res:'wood',  cost:{wood:2,stone:1} },
  tile_sacred_shrine:    { label:'SHRE', name:'Ancestral Heritage Shrine',color:0x7055ab, sideL:0x221538, sideR:0x503570, res:'stone', cost:{stone:2,music:1} },
  tile_clay_pit:         { label:'CLAY', name:'Riverbed Clay Pit',        color:0xc75910, sideL:0x4a1e04, sideR:0x7a3208, res:'clay',  cost:{water:1} },
  tile_music_pavilion:   { label:'MUSC', name:'Melodic Music Pavilion',   color:0x6b2b99, sideL:0x1e0838, sideR:0x3d1460, res:'music', cost:{wood:1,music:1} },
  tile_quarry:           { label:'MINE', name:'Stone Quarry & Mine',      color:0x706658, sideL:0x282420, sideR:0x403a34, res:'stone', cost:{stone:1,ore:1} },
};

export const TILE_ORDER = Object.keys(TILE_DEFS);

// Resource meta
export const RES = {
  grain: { color:0xeab208, label:'GRN', name:'Grain'  },
  fibre: { color:0xec4999, label:'FBR', name:'Fibre'  },
  wood:  { color:0xa16207, label:'WOD', name:'Wood'   },
  stone: { color:0x71717a, label:'STN', name:'Stone'  },
  clay:  { color:0xea580c, label:'CLY', name:'Clay'   },
  water: { color:0x0284c7, label:'WTR', name:'Water'  },
  music: { color:0x8b5cf6, label:'MUS', name:'Music'  },
  ore:   { color:0x64748b, label:'ORE', name:'Ore'    },
};

export const ISLAND_TYPES = [
  { key:'farming',  label:'🌾 Farming',   hint:'Starts +Grain', color:0x89c24a },
  { key:'forest',   label:'🪵 Forest',    hint:'Starts +Wood',  color:0x1c5e21 },
  { key:'coastal',  label:'💧 Coastal',   hint:'Starts +Water', color:0x269ee0 },
  { key:'mountain', label:'🪨 Mountain',  hint:'Starts +Stone', color:0x706658 },
];
