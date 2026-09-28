# 🏝️ Cultural Islands (Island Haat)
*A peaceful tile-building game with 2D community encounters, inspired by the traditional Indian haat.*

---

## 📖 The Story & Design Vision

In the traditional Indian *haat*, a marketplace is far more than a place to buy and sell goods. It is a living social crossroads—a space where neighboring communities gather, share stories, celebrate seasons, and sustain one another.

**Cultural Islands** brings this philosophy to life:
> *"No island can thrive alone."*

Each player begins with a small island specializing in a single productive strength—whether it is golden grain fields, timber forests, flowing river springs, weaving handlooms, or highland stone quarries. Because no single island produces everything needed for cultural growth, players must journey to the **Central Haat**, negotiate trades, build cultural landmarks, and personally step into their villages when unexpected emergencies or festivals arise.

The cultural identity of your island is not predetermined. It is an **emergent tapestry** woven from the resources you discover, the trades you make, the connections you cultivate, and how you care for your people.

---

## 🧭 Core Gameplay Loop

```
   🎲 LUCK (Starting Resource & Deck Draw)
      │
      ▼
   🤔 CHOICE (Rotate, Position, & Place Tiles)
      │
      ▼
   ✨ CULTURAL CONNECT (Neighbor Synergies & Harmony Points)
      │
      ▼
   🚨 2D COMMUNITY EVENT (Step into the World: Fire or Festival)
      │
      ▼
   🏪 CENTRAL HAAT (Negotiate Trades & Construct Level 1–3 Tasks)
      │
      ▼
   🌱 VISIBLE PROGRESS (Island Grows & Cultural Identity Evolves)
```

---

## 🕹️ Two-Layer Gameplay

### Layer 1: Mindful Island Building (Dorfromantik-Inspired)
- **2.5D Isometric World**: Survey your expanding island from a peaceful panoramic perspective.
- **Tile Placement & Rotation**: Rotate tiles (`R` key or on-screen button) and match natural edges (meadows, streams, farmland, forests, workshops) for bonus harmony points.
- **Cultural Connect Engine**: Placing complementary cultural hubs next to each other creates glowing resonance arcs and unlocks powerful community synergies:
  - **🌾 Terraced Farm + 🎵 Music Pavilion** $\rightarrow$ *Festival Connection*
  - **🧵 Textile Loom + 🏺 Terracotta Clay Pit** $\rightarrow$ *Craft Guild Connection*
  - **🏪 Haat Trading Square + 🌾 Terraced Farm** $\rightarrow$ *Haat Fresh Produce Network*
  - **🏛️ Community Hall + 💧 River Water Mill** $\rightarrow$ *Sustainable Civic Settlement*
- **Emergent Island Identity**: Your island's title dynamically updates based on your architectural and cultural focus (e.g., *"Master Artisan & Handloom Isle"*, *"Sanctuary of Bountiful Melody"*, *"Grand Sovereign Cultural Archipelago"*).

### Layer 2: 2D Top-Down Event Gameplay (Stardew Valley-Inspired)
Whenever a crisis or celebration happens on the island, an indicator appears over the affected building. Click the building or the alert banner to **zoom in and physically enter the 2D scene**:

1. **🔥 Fire at the Craft Centre (Crisis Mini-Game)**
   - Sparks from the kiln have ignited the dry handloom workshop.
   - Run using **WASD / Arrow Keys** to the fresh water well.
   - Fill your water bucket and carry it toward the burning loom tables.
   - Press **SPACE / Left Click** to splash water and douse the flames before the timer runs out.
   - **Consequences**: Saving the workshop keeps it active and earns bonus craft materials. Letting it burn damages the building and reduces production until repaired.
2. **🎉 Seasonal Haat Festival (Celebration Mini-Game)**
   - Gather festive offerings (marigold garlands, grain urns, bamboo flutes) scattered around the courtyard garden.
   - Carry and arrange them at the central sacred altar under celebratory music and confetti bursts to boost cultural harmony.

---

## 🏪 The Central Haat & 6-Round Structure

Following the original *Island Haat* rulebook, the game takes place across **6 rounds** divided into 3 developmental levels:

| Level | Rounds | Task Reward | Focus |
| :---: | :---: | :---: | :--- |
| **Level 1** | Rounds 1–2 | **+5 pts** | Basic production, local trades, initial workshops (Farm, Workshop, Handloom) |
| **Level 2** | Rounds 3–4 | **+8 pts** | Inter-island commerce hubs (Trading Centre, Textile Market, Processing Granary) |
| **Level 3** | Rounds 5–6 | **+12 pts** | Grand cultural architecture (Grand Haat, Master Craft Hub, Integrated Port) |

### Trading Rules at the Haat:
- Each round, your island automatically produces **3 units** of its specialty resource.
- Visit the Central Haat to trade with neighboring islanders (*Maya from Wood Isle, Kabir from Water Haven, Leela from Fibre Atoll, Dev from Ore Summit, Anita from Grain Terraces*).
- **Max 2 completed trades per round**.
- Spend acquired resource combinations to complete **1 Development Task per round**.

---

## 🪔 The 20 Cultural Symbols System

The prototype includes a centralized data-driven symbol library representing resources, crafts, traditions, and natural environments:

| Symbol | Name | Category | Cultural Meaning |
| :---: | :--- | :--- | :--- |
| 🌾 | **Grain** | Resource | Agriculture, sustenance, and seasonal abundance |
| 🧵 | **Textile** | Craft | Handloom weaving, spun cotton, and cultural attire |
| 🪵 | **Wood** | Resource | Carpentry, sustainable timber, and shelter |
| 🪨 | **Stone** | Resource | Masonry, durable foundations, and endurance |
| 🎵 | **Music** | Tradition | Folk melodies, sitar, flutes, and percussion rhythm |
| 🏺 | **Clay** | Craft | Terracotta pottery, earthen urns, and roof tiles |
| 💧 | **Water** | Environment | Pure river streams, life flow, and purification |
| 🏪 | **Market** | Tradition | The Central Haat, fair exchange, and community hub |
| 👥 | **Community** | Tradition | Kinship, collective unity, and mutual support |
| 🔨 | **Craft** | Craft | Artisan ingenuity and handcrafted heritage |
| 🎉 | **Festival** | Tradition | Joyous gatherings, seasonal rites, and harmony |
| 🌿 | **Nature** | Environment | Verdant ecology and living in balance with the land |
| 🍲 | **Food** | Tradition | Shared meals, hospitality, and culinary heritage |
| 🌱 | **Agriculture** | Environment | Terraced cultivation and river irrigation |
| ⚖️ | **Trade** | Tradition | Equitable barter and reciprocal negotiation |
| 🏛️ | **Architecture** | Craft | Timber halls, carved stone pillars, and civic spaces |
| 📜 | **Storytelling** | Tradition | Oral folklore, epics, and ancestral memory |
| 🎭 | **Performance** | Tradition | Classical dance, street theatre, and puppetry |
| ⛵ | **Travel** | Environment | Inter-island boat voyages to the Central Haat |
| 🪔 | **Heritage** | Tradition | Sacred brass diya lamps, warmth, and lineage |

---

## 🎮 Controls

```
[ Island Strategic View (Layer 1) ]
  • Left Click          - Place tile on highlighted grid cell
  • R Key or Rotate Btn - Rotate tile by 90 degrees
  • Hover Grid          - Preview placement validity & connection score
  • Click Alert Marker  - Enter 2D Event Scene

[ 2D Event Interior (Layer 2) ]
  • W, A, S, D / Arrows - Move character
  • SPACE, E, or Click  - Fill bucket at well / Splash water on fire
  • Walk near objects   - Pick up festival offerings
```

---

## 🛠️ Technology Stack & Architecture

- **Phaser 3.88**: Powers the game loops, 2.5D isometric tile rendering, Arcade Physics, 4-direction character animations, particle systems, and multi-scene management.
- **TypeScript 5.7**: Strongly-typed data models for resources, cultural elements, adjacency recipes, and tasks.
- **Vite 6.2**: Fast development server and production bundler.
- **Web Audio API**: 100% self-contained sound synthesizer—generating wooden tile thuds, splash effects, fire hissing, sitar-like harmonic arpeggios, and victory fanfares without external audio file latency.
- **Procedural Canvas Renderer**: Generates all tile textures, character spritesheets, flame frames, and UI glyphs directly in memory at boot.

```
src/
├── game/
│   ├── GameConfig.ts           # Phaser engine configuration
│   ├── data/                   # Data-driven rules & cultural registry
│   │   ├── resources.ts        # 8 Resources & 20 Cultural Symbols
│   │   ├── culturalElements.ts # Connection recipes & synergies
│   │   ├── tiles.ts            # Tile blueprints, edges, and categories
│   │   ├── tasks.ts            # 6-Round Level 1–3 Haat tasks
│   │   └── events.ts           # Fire & Festival event definitions
│   ├── entities/               # 2D physics actors (Player, FireEntity)
│   ├── systems/                # Core simulation logic
│   │   ├── TileSystem.ts       # Grid math, edge matching, rotation
│   │   ├── CulturalSystem.ts   # Synergies & emergent island identity
│   │   ├── ResourceSystem.ts   # Inventory, production, deduction
│   │   ├── TradeSystem.ts      # AI traders & 2-trade round limits
│   │   ├── EventSystem.ts      # Event triggers & consequences
│   │   ├── ScoringSystem.ts    # 6-Round progression & victory calc
│   │   └── SoundSystem.ts      # Web Audio procedural sound engine
│   ├── scenes/                 # Game state scenes
│   │   ├── BootScene.ts        # Procedural canvas sprite generation
│   │   ├── MainMenuScene.ts    # Island selection & introduction
│   │   ├── IslandScene.ts      # Layer 1 tile world builder
│   │   ├── HaatScene.ts        # Central Haat marketplace
│   │   ├── FireEventScene.ts   # Layer 2 top-down fire mini-game
│   │   ├── FestivalEventScene.ts # Layer 2 festival mini-game
│   │   ├── ResultScene.ts      # World consequence resolution
│   │   └── EndGameScene.ts     # Round 6 scoring & cultural legacy
│   └── ui/                     # Glassmorphic HUD & guide modals
```

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/VivekRay19/islandgame.git
cd islandgame
npm install
```

### 2. Run the Game
```bash
npm run dev
```
Open **`http://localhost:3000/`** in your browser to begin creating your cultural community!

---

## 🌿 Design Principles
- **Keep the core game focused and meaningful**: Mechanics exist to enrich production, trading, cultural connection, and community stewardship.
- **Luck creates the situation; choice determines the outcome**: Every resource drawn or trade offered presents an opportunity to adapt.
- **Non-violent conflict resolution**: Challenges are resolved through community action, mutual trade, and problem-solving.

*Created with ❤️ for Cultural Islands / Island Haat.*
