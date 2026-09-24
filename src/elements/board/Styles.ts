import { css } from 'lit';

export default css`
:host {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;

  background: radial-gradient(ellipse at 50% 30%, #1a6f4e 0%, #104e36 55%, #082d1f 100%);
  background-color: #104e36;
  color: #fff;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --board-padding: clamp(8px, 2vw, 24px);
  --gap: clamp(4px, 1.2vw, 16px);
  --_card-max-width: 140px;
  --_card-width: min(calc((100vw - (var(--board-padding) * 2) - (var(--gap) * 6)) / 7), var(--_card-max-width));
  --_card-radius: clamp(4px, 0.9vw, 8px);
}

* {
  box-sizing: border-box;
}

header {
  height: 52px;
  padding: 0 var(--board-padding);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

h1 {
  font-size: clamp(1.1rem, 2.5vw, 1.35rem);
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mobile-only {
  display: none !important;
}

.btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 6px 12px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.15);
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 2.5vh, 28px);
  flex: 1;
  padding: clamp(10px, 2vh, 20px) var(--board-padding);
  max-width: 1050px;
  width: 100%;
  margin: 0 auto;
  min-height: 0;
}

.foundation,
.tableau {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--gap);
  width: 100%;
  position: relative;
}

.foundation:has(.dragged),
.tableau:has(.dragged),
.foundation:has(.returning),
.tableau:has(.returning) {
  z-index: 1000 !important;
}

.pile {
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: var(--_card-radius);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.pile:has(.dragged),
.pile:has(.returning),
.pile.drag-source {
  z-index: 1000 !important;
}

.pile.valid-target {
  box-shadow: 0 0 0 2.5px rgba(52, 211, 153, 0.85), 0 0 14px rgba(52, 211, 153, 0.45);
  animation: validTargetPulse 1.6s ease-in-out infinite alternate;
}

@keyframes validTargetPulse {
  0% {
    box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.65), 0 0 8px rgba(52, 211, 153, 0.3);
  }
  100% {
    box-shadow: 0 0 0 3.5px rgba(52, 211, 153, 0.95), 0 0 20px rgba(52, 211, 153, 0.65);
  }
}

.pile.hovered {
  box-shadow: 0 0 0 3px #38bdf8, 0 0 16px rgba(56, 189, 248, 0.65) !important;
  transform: translateY(-2px);
  z-index: 10;
  animation: none !important;
}

.pile.single {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.pile.single > * {
  grid-area: 1 / 1;
}

.pile.multi {
  display: flex;
  flex-direction: column;
}

.pile.multi > *:not(:last-child).card-back {
  margin-bottom: calc(-140% + clamp(6px, 1.8vh, 14px));
}

.pile.multi > *:not(:last-child).card-front {
  margin-bottom: calc(-140% + clamp(16px, 3.6vh, 32px));
}

.card-back,
.card-front,
.empty-slot {
  width: 100%;
  aspect-ratio: 10 / 14;
  border-radius: var(--_card-radius);
  box-sizing: border-box;
  position: relative;
}

.empty-slot {
  border: 2px dashed rgba(255, 255, 255, 0.22);
  border-radius: var(--_card-radius);
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

/* Watermark hint icons for empty foundation slots */
.foundation-pile[data-index="0"] .empty-slot::before { content: '♠'; font-size: clamp(16px, 3vw, 28px); opacity: 0.22; color: #fff; }
.foundation-pile[data-index="1"] .empty-slot::before { content: '♥'; font-size: clamp(16px, 3vw, 28px); opacity: 0.25; color: #ff5252; }
.foundation-pile[data-index="2"] .empty-slot::before { content: '♣'; font-size: clamp(16px, 3vw, 28px); opacity: 0.22; color: #fff; }
.foundation-pile[data-index="3"] .empty-slot::before { content: '♦'; font-size: clamp(16px, 3vw, 28px); opacity: 0.25; color: #ff5252; }

.stock .empty-slot {
  cursor: pointer;
}

.stock .empty-slot::before {
  content: '↺';
  font-size: clamp(16px, 3vw, 26px);
  opacity: 0.35;
  color: #fff;
}

.waste.draw-3 {
  position: relative;
  display: block;
}

.waste.draw-3 .empty-slot {
  position: absolute;
  top: 0;
  left: 0;
}

.waste.draw-3 .card-front {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.waste.draw-3 .card-front[data-fan-offset="0"] {
  transform: translateX(0);
  pointer-events: none;
  z-index: 1;
}

.waste.draw-3 .card-front[data-fan-offset="1"] {
  transform: translateX(clamp(14px, 2.8vw, 24px));
  pointer-events: none;
  z-index: 2;
}

.waste.draw-3 .card-front[data-fan-offset="2"] {
  transform: translateX(clamp(28px, 5.6vw, 48px));
  pointer-events: auto;
  z-index: 3;
}

.card-back,
.card-front {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.18);
  touch-action: none;
}

.card-back {
  display: flex;
  align-items: stretch;
  background-color: #fff;
  padding: 3px;
}

.stock .card-back {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stock .card-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.card-back .graphic {
  border-radius: calc(var(--_card-radius) - 2px);
  flex: 1;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Cpath fill='%23bc0b06' fill-opacity='0.97' d='M0 17.83V0h17.83a3 3 0 0 1-5.66 2H5.9A5 5 0 0 1 2 5.9v6.27a3 3 0 0 1-2 5.66zm0 18.34a3 3 0 0 1 2 5.66v6.27A5 5 0 0 1 5.9 52h6.27a3 3 0 0 1 5.66 0H0V36.17zM36.17 52a3 3 0 0 1 5.66 0h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 0 1 0-5.66V52H36.17zM0 31.93v-9.78a5 5 0 0 1 3.8.72l4.43-4.43a3 3 0 1 1 1.42 1.41L5.2 24.28a5 5 0 0 1 0 5.52l4.44 4.43a3 3 0 1 1-1.42 1.42L3.8 31.2a5 5 0 0 1-3.8.72zm52-14.1a3 3 0 0 1 0-5.66V5.9A5 5 0 0 1 48.1 2h-6.27a3 3 0 0 1-5.66-2H52v17.83zm0 14.1a4.97 4.97 0 0 1-1.72-.72l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1 0-5.52l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43c.53-.35 1.12-.6 1.72-.72v9.78zM22.15 0h9.78a5 5 0 0 1-.72 3.8l4.44 4.43a3 3 0 1 1-1.42 1.42L29.8 5.2a5 5 0 0 1-5.52 0l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1-.72-3.8zm0 52c.13-.6.37-1.19.72-1.72l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43a5 5 0 0 1 5.52 0l4.43-4.43a3 3 0 1 1 1.42 1.41l-4.44 4.43c.36.53.6 1.12.72 1.72h-9.78zm9.75-24a5 5 0 0 1-3.9 3.9v6.27a3 3 0 1 1-2 0V31.9a5 5 0 0 1-3.9-3.9h-6.27a3 3 0 1 1 0-2h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 1 1 2 0v6.27a5 5 0 0 1 3.9 3.9h6.27a3 3 0 1 1 0 2H31.9z'%3E%3C/path%3E%3C/svg%3E");
  background-color: #fdb9b8;
}

.card-front {
  display: flex;
  align-items: stretch;
  background-color: #fff;
  padding: 3px;
  cursor: grab;
  container-type: inline-size;
  isolation: isolate;
  overflow: hidden;
  transition: box-shadow 0.15s ease, filter 0.15s ease;
}

.card-front:hover {
  filter: brightness(1.02);
}

.card-front.dragged {
  position: relative;
  z-index: 1000 !important;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.38), 0 8px 16px rgba(0, 0, 0, 0.25) !important;
  cursor: grabbing;
  pointer-events: none;
  filter: brightness(1.03);
  transition: none !important;
  will-change: transform;
}

.card-front.returning {
  position: relative;
  z-index: 999 !important;
  pointer-events: none;
}

.card-front[data-suit="Hearts"] {
  color: #e11d48;
}

.card-front[data-suit="Diamonds"] {
  color: #e11d48;
}

.card-front[data-suit="Clubs"],
.card-front[data-suit="Spades"] {
  color: #0f172a;
}

.card-front .graphic {
  position: absolute;
  inset: 6% 16%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: none;
}

/* Modern Procedural Pip Cards (Ace, 2-10) */
.card-pips {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: calc(var(--_card-radius) - 2px);
  overflow: hidden;
}

.pip {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18%;
  height: auto;
  max-height: 20%;
  aspect-ratio: 1;
  fill: currentColor;
  pointer-events: none;
}

.pip.flipped {
  transform: translate(-50%, -50%) rotate(180deg);
}

.pip.large {
  width: 36%;
  max-height: 40%;
}

.pip-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.95;
  pointer-events: none;
  width: clamp(14px, 20cqw, 24px);
  text-align: center;
}

.corner.top-left {
  top: clamp(2px, 4cqw, 6px);
  left: 0;
}

.corner.bottom-right {
  bottom: clamp(2px, 4cqw, 6px);
  right: 0;
  transform: rotate(180deg);
}

.corner-rank {
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 800;
  font-size: clamp(10px, 16cqw, 20px);
  letter-spacing: -0.04em;
  color: inherit;
}

.corner-suit {
  width: clamp(7px, 11cqw, 13px);
  height: clamp(7px, 11cqw, 13px);
  margin-top: 1px;
  fill: currentColor;
  display: block;
}

footer {
  height: 52px;
  padding: 0 var(--board-padding);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.score {
  display: flex;
  gap: clamp(16px, 4vw, 40px);
  font-size: clamp(0.85rem, 2vw, 0.95rem);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.score-label {
  opacity: 0.65;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-val {
  font-weight: 700;
  transition: color 0.2s ease;
}

.score-val.positive {
  color: #34d399;
  text-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

.score-val.negative {
  color: #f87171;
  text-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
}

.score-val.neutral {
  color: #fff;
}

.stock.exhausted .empty-slot {
  cursor: not-allowed;
  opacity: 0.35;
  border-color: rgba(255, 255, 255, 0.1);
}

.stock.exhausted .empty-slot::before {
  content: '✕';
  opacity: 0.25;
}

.btn-reset-bankroll {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-reset-bankroll:hover {
  background: rgba(239, 68, 68, 0.35);
  border-color: rgba(239, 68, 68, 0.6);
  color: #fff;
}

.vegas-subgroup {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 12px;
  border-left: 2px solid rgba(52, 211, 153, 0.4);
  margin-top: 4px;
}

.win-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1200;
}

.win-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  animation: winFadeIn 0.3s ease-out;
}

@keyframes winFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.win-card {
  background: linear-gradient(145deg, #184e38, #0d2f22);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
  color: #fff;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  width: 92%;
  box-sizing: border-box;
}

.win-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #fff;
}

.win-stats {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}

.win-stat-val {
  font-size: 1.2rem;
  font-weight: 700;
}

.win-stat-lbl {
  font-size: 0.75rem;
  opacity: 0.7;
  text-transform: uppercase;
}

.win-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  outline: none;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.win-btn:active {
  background: rgba(255, 255, 255, 0.18);
}

.auto-complete-banner {
  position: fixed;
  bottom: clamp(65px, 11vh, 95px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px 14px;
  border-radius: 8px;
  z-index: 1500;
  animation: slideUpToast 0.3s ease-out;
}

@keyframes slideUpToast {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.auto-complete-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #fff;
  white-space: nowrap;
}

.auto-complete-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease;
  outline: none;
}

.auto-complete-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.auto-complete-btn:active {
  background: rgba(255, 255, 255, 0.18);
}

/* Hint Highlighting Animations */
@keyframes hintSourcePulse {
  0% {
    box-shadow: 0 0 0 2.5px #f59e0b, 0 0 10px rgba(245, 158, 11, 0.7);
    transform: translateY(-2px);
  }
  50% {
    box-shadow: 0 0 0 4.5px #fbbf24, 0 0 22px rgba(251, 191, 36, 0.95);
    transform: translateY(-4px);
  }
  100% {
    box-shadow: 0 0 0 2.5px #f59e0b, 0 0 10px rgba(245, 158, 11, 0.7);
    transform: translateY(-2px);
  }
}

@keyframes hintTargetPulse {
  0% {
    box-shadow: 0 0 0 2.5px #38bdf8, 0 0 10px rgba(56, 189, 248, 0.6);
  }
  50% {
    box-shadow: 0 0 0 4.5px #0ea5e9, 0 0 22px rgba(14, 165, 233, 0.9);
  }
  100% {
    box-shadow: 0 0 0 2.5px #38bdf8, 0 0 10px rgba(56, 189, 248, 0.6);
  }
}

.hint-source {
  animation: hintSourcePulse 1.3s ease-in-out infinite !important;
  z-index: 100 !important;
}

.hint-target,
.pile.hint-target,
.empty-slot.hint-target {
  animation: hintTargetPulse 1.3s ease-in-out infinite !important;
  z-index: 90 !important;
}

.stock.hint-pulse .card-back,
.stock.hint-pulse .empty-slot {
  animation: hintSourcePulse 1.3s ease-in-out infinite !important;
}

.hint-toast {
  position: fixed;
  bottom: clamp(65px, 11vh, 95px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 9px 18px;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 16px rgba(245, 158, 11, 0.25);
  z-index: 1500;
  animation: slideUpToast 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  pointer-events: none;
}

.hint-toast svg {
  width: 20px;
  height: 20px;
  fill: #fbbf24;
  flex-shrink: 0;
}

/* Card Flip & Landing Polish Animations */
@keyframes cardFlipIn {
  0% {
    transform: rotateY(90deg) scale(0.96);
    filter: brightness(0.92);
    opacity: 0.8;
  }
  100% {
    transform: rotateY(0deg) scale(1);
    filter: brightness(1);
    opacity: 1;
  }
}

@keyframes foundationLand {
  0% {
    transform: scale(1.08);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  60% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15);
  }
}

.card-front.just-flipped {
  animation: cardFlipIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  backface-visibility: hidden;
}

.card-front.foundation-land {
  animation: foundationLand 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.tableau-pile .card-front:hover:not(.dragged),
.waste .card-front:hover:not(.dragged) {
  filter: brightness(1.03);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28), 0 2px 5px rgba(0, 0, 0, 0.18);
}

.settings-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: modalFadeIn 0.25s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.settings-card {
  background: linear-gradient(145deg, rgba(24, 78, 56, 0.96), rgba(13, 47, 34, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  border-radius: 18px;
  padding: 24px 28px;
  color: #fff;
  max-width: 420px;
  width: 90%;
  box-sizing: border-box;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.settings-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-title svg {
  width: 24px;
  height: 24px;
  fill: #fff;
  flex-shrink: 0;
}

.settings-close-btn {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.settings-close-btn svg {
  width: 20px;
  height: 20px;
  fill: #fff;
  flex-shrink: 0;
}

.settings-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.08);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.setting-item.shortcuts-section {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.8rem;
}

.shortcut-desc {
  opacity: 0.82;
  font-weight: 500;
}

.shortcut-keys kbd {
  display: inline-block;
  padding: 2px 5px;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.setting-desc {
  font-size: 0.8rem;
  opacity: 0.72;
  line-height: 1.3;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.22);
  transition: 0.25s ease;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

input:checked + .slider {
  background-color: #22c55e;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.mode-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.mode-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.mode-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.mode-btn.active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* High Scores & Leaderboard */

.highscores-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: modalFadeIn 0.25s ease-out;
}

.highscores-card {
  background: linear-gradient(145deg, rgba(24, 78, 56, 0.96), rgba(13, 47, 34, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  border-radius: 18px;
  padding: 24px 28px;
  color: #fff;
  max-width: 500px;
  width: 92%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.highscores-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.highscores-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.highscores-title svg {
  width: 24px;
  height: 24px;
  fill: #fff;
  flex-shrink: 0;
}

.highscores-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.highscores-content {
  overflow-y: auto;
  flex: 1;
  padding-right: 2px;
}

.leaderboard-section {
  margin: 16px 0 18px 0;
  text-align: left;
}

.leaderboard-title {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fbbf24;
}

.leaderboard-title svg {
  width: 18px;
  height: 18px;
  fill: #fbbf24;
  flex-shrink: 0;
}

.leaderboard-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;
  font-size: 0.85rem;
}

.leaderboard-table th {
  padding: 6px 8px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  text-align: left;
}

.leaderboard-table th.num,
.leaderboard-table td.num {
  text-align: right;
}

.leaderboard-table td {
  padding: 6px 8px;
  white-space: nowrap;
}

.leaderboard-row {
  background: rgba(0, 0, 0, 0.22);
  border-radius: 6px;
  transition: background 0.15s ease;
}

.leaderboard-row td:first-child {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.leaderboard-row td:last-child {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.leaderboard-row.current {
  background: rgba(245, 158, 11, 0.2);
  outline: 1px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
  font-weight: 600;
}

.leaderboard-row.current td {
  color: #fef3c7;
}

.leaderboard-divider-row td {
  padding: 3px 0;
  text-align: center;
}

.leaderboard-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
}

.leaderboard-divider::before,
.leaderboard-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 700;
}

.rank-badge.top-1 {
  background: linear-gradient(135deg, #ffd700, #ffae00);
  color: #4a3500;
  box-shadow: 0 1px 4px rgba(255, 215, 0, 0.5);
}

.rank-badge.top-2 {
  background: linear-gradient(135deg, #e0e0e0, #a0a0a0);
  color: #242424;
  box-shadow: 0 1px 4px rgba(200, 200, 200, 0.4);
}

.rank-badge.top-3 {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
  box-shadow: 0 1px 4px rgba(205, 127, 50, 0.4);
}

.current-tag {
  display: inline-block;
  padding: 1px 5px;
  font-size: 0.65rem;
  background: #f59e0b;
  color: #1a1a1a;
  border-radius: 4px;
  font-weight: 700;
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  vertical-align: middle;
}

.leaderboard-empty {
  text-align: center;
  padding: 28px 16px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.9rem;
}

/* All credits: https://deck.of.cards/old/ */

/* Court Cards (Jack, Queen, King) */

.card-front[data-suit="Diamonds"][data-rank="Jack"] .graphic {
  background-image: url("./faces/diamonds-j.svg");
}

.card-front[data-suit="Diamonds"][data-rank="Queen"] .graphic {
  background-image: url("./faces/diamonds-q.svg");
}

.card-front[data-suit="Diamonds"][data-rank="King"] .graphic {
  background-image: url("./faces/diamonds-k.svg");
}

.card-front[data-suit="Hearts"][data-rank="Jack"] .graphic {
  background-image: url("./faces/hearts-j.svg");
}

.card-front[data-suit="Hearts"][data-rank="Queen"] .graphic {
  background-image: url("./faces/hearts-q.svg");
}

.card-front[data-suit="Hearts"][data-rank="King"] .graphic {
  background-image: url("./faces/hearts-k.svg");
}

.card-front[data-suit="Clubs"][data-rank="Jack"] .graphic {
  background-image: url("./faces/clubs-j.svg");
}

.card-front[data-suit="Clubs"][data-rank="Queen"] .graphic {
  background-image: url("./faces/clubs-q.svg");
}

.card-front[data-suit="Clubs"][data-rank="King"] .graphic {
  background-image: url("./faces/clubs-k.svg");
}

.card-front[data-suit="Spades"][data-rank="Jack"] .graphic {
  background-image: url("./faces/spades-j.svg");
}

.card-front[data-suit="Spades"][data-rank="Queen"] .graphic {
  background-image: url("./faces/spades-q.svg");
}

.card-front[data-suit="Spades"][data-rank="King"] .graphic {
  background-image: url("./faces/spades-k.svg");
}

/* ============================================================
   Mobile Drawer / Bottom Sheet
   ============================================================ */
.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2500;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  animation: drawerFadeIn 0.22s ease-out;
}

@keyframes drawerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mobile-drawer {
  background: linear-gradient(180deg, rgba(22, 70, 50, 0.98) 0%, rgba(10, 38, 27, 0.99) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.6);
  padding: 12px 20px calc(20px + env(safe-area-inset-bottom, 0px)) 20px;
  color: #fff;
  max-height: 85vh;
  overflow-y: auto;
  animation: drawerSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes drawerSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.drawer-handle {
  width: 38px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 0 auto 12px auto;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.drawer-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.3px;
}

.drawer-close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.drawer-close-btn:active {
  background: rgba(255, 255, 255, 0.25);
}

.drawer-close-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.drawer-menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  color: #fff;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s ease, transform 0.1s ease;
}

.drawer-menu-item:active {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(0.985);
}

.drawer-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.drawer-item-icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.drawer-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.drawer-item-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.drawer-item-desc {
  font-size: 0.78rem;
  opacity: 0.65;
}

.drawer-status-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.drawer-status-pill.active {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.4);
}

.drawer-status-pill.muted {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.drawer-menu-item.auto-complete {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3));
  border-color: rgba(245, 158, 11, 0.4);
}

/* ============================================================
   Mobile Responsive Adjustments
   ============================================================ */
@media (max-width: 600px) {
  :host {
    --board-padding: 4px;
    --gap: clamp(2px, 0.8vw, 4px);
  }

  header {
    height: 48px;
    padding: 0 8px;
    padding-top: env(safe-area-inset-top, 0px);
  }

  .header-title {
    display: none !important;
  }

  .actions {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }

  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: inline-flex !important;
  }

  .btn {
    padding: 6px 10px;
    font-size: 0.82rem;
  }

  .btn .btn-label {
    display: none;
  }

  .btn-menu .btn-label {
    display: inline;
  }

  main {
    padding: 6px var(--board-padding);
    gap: clamp(8px, 1.8vh, 16px);
  }

  footer {
    height: 46px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .score {
    gap: clamp(10px, 3.2vw, 24px);
    font-size: 0.82rem;
  }

  .score-label {
    font-size: 0.72rem;
  }

  .pile.multi > *:not(:last-child).card-front {
    margin-bottom: calc(-140% + clamp(18px, 3.8vh, 32px));
  }
}
`;
