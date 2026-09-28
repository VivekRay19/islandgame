# 🏝️ Cultural Islands: Island Haat

> **Trade • Connect • Rise**  
> A browser-based game prototype combining peaceful tile world-building with top-down 2D character event interactions, built on the Indian *haat* marketplace tradition and data-driven cultural synthesis.

---

## 🌟 Core Gameplay Pillars

1. **Layer 1 — Dorfromantik-Style Tile World Building**
   - Place, rotate (`R` key or UI), and connect compatible island tiles.
   - Build agriculture, handloom textile workshops, pottery kilns, melodic pavilions, and civic community halls.
   - **Cultural Connect System**: Synergies between adjacent cultural elements (e.g. *Grain + Music* $\rightarrow$ *Festival Connection*, *Textile + Clay* $\rightarrow$ *Craft Connection*).
   - **Emergent Island Identity**: Your community's cultural title dynamically evolves as you develop.

2. **Layer 2 — Stardew Valley-Inspired 2D Top-Down Event Gameplay**
   - Click affected buildings on the main island to physically enter the 2D location.
   - **Playable Fire Event**: Control character with **WASD / Arrow Keys**, fetch water buckets from the well, douse spreading fires with **SPACE / Click**, and save the workshop before time runs out.
   - **Playable Festival Event**: Gather ceremonial offerings and arrange them at the sacred altar under festive music.
   - Outcomes directly impact the main world (rewards, active buffs, or damage requiring repair).

3. **Central Cultural Haat Trading & 6-Round Structure**
   - Visit the shared Central Haat to negotiate trades with AI islanders (*Wood Isle, Water Haven, Grain Terraces, Ore Summit, Fibre Atoll*).
   - Up to **2 trades per round**.
   - Complete Level 1, 2, and 3 development tasks from the *Island Haat* rulebook (+5, +8, +12 points).

4. **100% Self-Contained Graphics & Audio**
   - Procedural canvas/pixel art textures generated at boot time.
   - Built-in Web Audio API sound synthesizer (wooden placement thuds, water splashes, fire sizzling, cultural chimes, fanfares).

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Move (2D Event Scene)** | `W, A, S, D` or `Arrow Keys` |
| **Splash Water / Interact** | `SPACE`, `E`, or `Left Click` |
| **Rotate Tile (Main Island)** | `R` key or `🔄 Rotate` button |
| **Place Tile** | `Left Click` on valid grid cell |
| **Enter Event Building** | `Left Click` on flaming/alert building or top banner |

---

## 🛠️ Tech Stack

- **Phaser 3.88** (2D Game Engine, Arcade Physics, Cameras, Scenes)
- **TypeScript 5.7**
- **Vite 6.2**
- **Web Audio API**

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/VivekRay19/islandgame.git
cd islandgame

# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```

Then open `http://localhost:3000/` in your browser.
