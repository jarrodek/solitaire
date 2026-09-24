# Solitaire 🎴

A modern, responsive, high-performance **Klondike Solitaire** web application built with **TypeScript**, **Lit web components**, **HTML5 Canvas**, and procedural **Web Audio API** synthesis.

---

## ✨ Features

### 🎮 Gameplay & Rules
* **Classic Klondike Rules:** Play standard 7-column Tableau with 4 suit Foundations and Stock/Waste piles.
* **Draw Modes:**
  * **Draw 1:** Casual, fluid single-card stock draws.
  * **Draw 3:** Classic tournament-style 3-card fanned stock deals.
* **3-Tier Difficulty Modes:**
  * **🟢 Easy:** Mathematical heuristic filter ensures accessible Aces/Twos near the surface, high opening mobility ($\ge 3$ initial moves), and minimal deadlock risk (~90%+ winnable).
  * **🟡 Medium:** Balanced challenge with realistic card depth distributions (~60% winnable).
  * **🔴 Hard (Classic / Pure Random):** 100% unadulterated Fisher-Yates shuffle with zero filtering — true authentic card game experience.

### 💰 Scoring Modes
* **Standard Scoring:** Points awarded for stock deals, uncovering hidden cards (+5), moving to foundation (+10), and penalized for foundation rollbacks (-15).
* **Vegas Scoring Mode (Casino Rules):**
  * **-$52 Buy-in:** Start every game with a $52 wager ($1 per card in deck).
  * **+$5 Payout:** Earn $5 for every card placed in the Foundation (up to $260, yielding a **+$208** net profit on a win).
  * **-$5 Rollback:** Deducts $5 if a card is moved from Foundation back to Tableau.
  * **Stock Pass Limits:** Enforces standard casino rules (3 passes in Draw 3, 1 pass in Draw 1). Once passes are exhausted, further recycling is disabled.
  * **Cumulative Bankroll:** Toggle whether bankroll carries over between consecutive games (saved in `localStorage`) or resets each game. Includes a one-click Reset button.
  * **Color-Coded Currency Display:** Formatted as `-$52` (soft red), `+$45` (emerald green glow), and `$0` (neutral).

### 💡 Smart Suggestion & Lookahead Engine
* **Zero-Progress Filtering:** Discards useless lateral card-shuffling moves that don't uncover hidden cards or unlock new plays.
* **1-Move Lookahead Simulation:** Evaluates whether exposing a card immediately enables a Foundation placement, unblocks a trapped Waste card, or triggers a cascading reveal from another pile.
* **King-Aware Column Clearance:** Only suggests clearing a column if an available King with hidden cards (or sitting in Waste) is waiting to claim the empty slot.
* **Stock Deal Prioritization:** When no productive board moves exist, immediately suggests dealing cards from the Stock instead of asking you to shuffle cards back and forth.
* **Anti-Loop Guard:** Never suggests reversing your previous turn's move.

### 🎯 Controls & Interactions
* **High-FPS Drag & Drop:** Fluid 60fps/120fps hardware-accelerated pointer dragging with multi-card column cascade support.
* **Drop Target Highlighting:** Optional high-contrast glowing outlines on valid destination piles when dragging cards.
* **Double-Click / Double-Tap Auto-Move:** Fast-move cards directly to Foundations or valid Tableau stacks.
* **Right-Click Drag Cancellation & Menu Suppression:** Suppresses the browser's context menu during gameplay and gracefully cancels active card drags if right-clicked.
* **Auto-Complete Solver:** Detects when all remaining cards are face-up and automatically cascades them into Foundations at high speed (press `A` or click the banner).

### ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>D</kbd> | Deal cards from Stock / Recycle Waste |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>U</kbd> | Undo last move |
| <kbd>Ctrl</kbd>+<kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> | Redo undone move |
| <kbd>H</kbd> | Show Smart Hint |
| <kbd>N</kbd> | Start New Game |
| <kbd>S</kbd> | Open / Close Settings |
| <kbd>M</kbd> | Mute / Unmute Sound Effects |
| <kbd>A</kbd> | Run Auto-Complete (when available) |
| <kbd>Esc</kbd> | Close Modal dialogs |

### 🔊 Procedural Audio (Web Audio API)
* **Zero Audio Files:** All sound effects are procedurally generated in real time using the browser's Web Audio API oscillators, gain nodes, and filters:
  * Crisp card deal swooshes and placement thuds.
  * Ascending chromatic chimes for Foundation placements (higher pitch as card rank increases).
  * Shimmering, multi-tone victory fanfare on game completion.
  * Subtle tactile audio cues for invalid moves and card flips.

### 🏆 Victory Animation
* **Classic Bouncing Card Cascade:** HTML5 canvas physics simulation mimicking the iconic Windows Solitaire victory celebration, bouncing completed card stacks across the screen with authentic gravity and elasticity.

---

## 🛠️ Project Structure

```
solitaire/
├── public/
│   ├── index.html            # Main HTML shell
│   └── styles.css            # Base host page styles
├── src/
│   ├── audio/
│   │   └── SoundFX.ts        # Procedural Web Audio API sound synthesizer
│   ├── cards/
│   │   ├── Card.ts           # Card definition, ranks, suits, comparison helpers
│   │   └── Deck.ts           # 52-card deck model with Fisher-Yates shuffle
│   ├── elements/
│   │   ├── Icons.ts          # Inline SVG icons (Settings, Undo, Redo, Hint, etc.)
│   │   └── board/
│   │       ├── Board.ts      # Core Lit web component managing UI & interaction
│   │       ├── Styles.ts     # Complete scoped Lit CSS (responsive board, SVG cards)
│   │       └── ui-board.ts   # Custom element definition (<ui-board>)
│   ├── game/
│   │   ├── Difficulty.ts     # Mathematical deal rating & difficulty generation
│   │   ├── Labels.ts         # Rank-to-label mappings
│   │   ├── Ranking.ts        # Rank ordering and stacking validation
│   │   ├── Score.ts          # Scorekeeper, timer, Vegas bankroll persistence
│   │   ├── Solitaire.ts      # Game state engine, moves history, undo/redo
│   │   ├── Suggestions.ts    # Smart lookahead hint engine
│   │   └── WinCascade.ts     # Canvas bouncing card victory physics
│   └── index.ts              # App entrypoint
├── package.json              # Project scripts and dependencies
├── tsconfig.json             # TypeScript compiler configuration
└── web-dev-server.config.mjs # Local development server config
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher)

### Installation
Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd solitaire
npm install
```

### Development
Start the Vite local development server with instant HMR:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:8000`.

### Type Checking
Verify TypeScript compilation across the entire codebase:

```bash
npm run typecheck
```

### Production Build
Build optimized and minified production bundles into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Deployment
Build and deploy to Firebase Hosting:

```bash
npm run deploy
```

---

## 🧰 Tech Stack
* **Framework:** [Lit 3](https://lit.dev/) (Lightweight, fast Web Components)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Graphics:** Responsive CSS Grid + Vector SVG Cards + HTML5 Canvas
* **Audio:** Web Audio API (procedural synthesis)
* **Tooling:** [Vite](https://vite.dev/) (Dev server & Rollup production bundler)
* **Hosting:** Firebase Hosting
