import { svg, SVGTemplateResult } from 'lit';
import { Rank, Suit } from './Card.js';
import { rankToLabel } from '../game/Labels.js';

export interface PipPosition {
  x: number;
  y: number;
  flip?: boolean;
  large?: boolean;
}

export function isCourtCard(rank: Rank): boolean {
  return rank === Rank.Jack || rank === Rank.Queen || rank === Rank.King;
}

export const SUIT_PATHS: Record<Suit, { d: string; viewBox: string }> = {
  [Suit.Diamonds]: {
    d: "M8.1757 20.3028C6.0243 16.7457 3.7611 13.2882 0.9328 10.3348C3.7611 7.3815 6.0243 3.9241 8.1757 0.3668C10.3269 3.9241 12.5902 7.3815 15.4185 10.3348C12.5902 13.2882 10.3269 16.7457 8.1757 20.3028Z",
    viewBox: "0 0 16 21",
  },
  [Suit.Hearts]: {
    d: "M9.5201 20.6855C9.5201 20.6855 7.3053 17.5059 4.3177 13.7676C2.319 11.2659 0.7211 8.5571 0.5725 6.2238C0.4022 3.5585 2.015 0.8845 4.9351 0.7549C7.8534 0.6254 9.0379 2.81 9.5201 4.6112C10.0023 2.81 11.1869 0.6254 14.1052 0.7549C17.0252 0.8845 18.6381 3.5585 18.4677 6.2238C18.3192 8.5571 16.7212 11.2659 14.7226 13.7676C11.7349 17.5059 9.5201 20.6855 9.5201 20.6855Z",
    viewBox: "0 0 19 21",
  },
  [Suit.Spades]: {
    d: "M9.746 0.4033C5.4546 5.8679 0.863 9.0126 0.7868 13.2759C0.7609 14.6564 1.597 17.0029 4.2153 17.452C5.914 17.742 8.2527 16.5144 8.3016 14.0203C8.2916 13.5237 8.8903 13.5366 8.8848 14.217C8.8051 16.1844 8.1074 18.4749 6.9352 20.3394L12.5568 20.3394C11.3847 18.4749 10.6872 16.1844 10.6072 14.217C10.5973 13.5366 11.1979 13.5237 11.1904 14.0203C11.2392 16.5144 13.578 17.742 15.2767 17.452C17.895 17.0029 18.7308 14.6564 18.7053 13.2759C18.6286 9.0126 14.0373 5.8679 9.746 0.4033Z",
    viewBox: "0 0 20 21",
  },
  [Suit.Clubs]: {
    d: "M9.6724 0.444C5.7626 0.532 4.0094 5.1178 6.905 8.6787C7.325 9.1981 7.3683 9.4961 6.5992 8.9972C4.6496 7.6392 0.9115 8.532 0.72 12.6836C0.4836 17.799 7.3452 19.2729 8.6335 13.8335C8.7012 13.2596 9.1493 13.2727 9.0413 14.0873C8.9238 16.2983 8.261 18.3648 7.3499 20.38L11.9978 20.38C11.0866 18.3648 10.4238 16.2983 10.3063 14.0873C10.1983 13.2727 10.6461 13.2596 10.7141 13.8335C12.0024 19.2729 18.8641 17.799 18.6276 12.6836C18.4362 8.532 14.698 7.6392 12.7485 8.9972C11.9793 9.4961 12.0226 9.1981 12.4427 8.6787C15.3383 5.1178 13.585 0.5324 9.6754 0.444Z",
    viewBox: "0 0 20 21",
  },
};

export function renderSuitSvg(suit: Suit, className = 'suit-icon'): SVGTemplateResult {
  const pathData = SUIT_PATHS[suit];
  return svg`
    <svg class="${className}" viewBox="${pathData.viewBox}" fill="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="${pathData.d}"></path>
    </svg>
  `;
}

export function getPipPositions(rank: Rank): PipPosition[] {
  switch (rank) {
    case Rank.Ace:
      return [{ x: 50, y: 50, large: true }];
    case Rank.Two:
      return [
        { x: 50, y: 22 },
        { x: 50, y: 78, flip: true },
      ];
    case Rank.Three:
      return [
        { x: 50, y: 22 },
        { x: 50, y: 50 },
        { x: 50, y: 78, flip: true },
      ];
    case Rank.Four:
      return [
        { x: 30, y: 22 }, { x: 70, y: 22 },
        { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true },
      ];
    case Rank.Five:
      return [
        { x: 30, y: 22 }, { x: 70, y: 22 },
        { x: 50, y: 50 },
        { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true },
      ];
    case Rank.Six:
      return [
        { x: 30, y: 22 }, { x: 70, y: 22 },
        { x: 30, y: 50 }, { x: 70, y: 50 },
        { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true },
      ];
    case Rank.Seven:
      return [
        { x: 30, y: 22 }, { x: 70, y: 22 },
        { x: 50, y: 36 },
        { x: 30, y: 50 }, { x: 70, y: 50 },
        { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true },
      ];
    case Rank.Eight:
      return [
        { x: 30, y: 22 }, { x: 70, y: 22 },
        { x: 50, y: 36 },
        { x: 30, y: 50 }, { x: 70, y: 50 },
        { x: 50, y: 64, flip: true },
        { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true },
      ];
    case Rank.Nine:
      return [
        { x: 30, y: 22.5 }, { x: 70, y: 22.5 },
        { x: 30, y: 41 }, { x: 70, y: 41 },
        { x: 50, y: 50 },
        { x: 30, y: 59, flip: true }, { x: 70, y: 59, flip: true },
        { x: 30, y: 77.5, flip: true }, { x: 70, y: 77.5, flip: true },
      ];
    case Rank.Ten:
      return [
        { x: 30, y: 22.5 }, { x: 70, y: 22.5 },
        { x: 50, y: 32 },
        { x: 30, y: 41.5 }, { x: 70, y: 41.5 },
        { x: 30, y: 58.5, flip: true }, { x: 70, y: 58.5, flip: true },
        { x: 50, y: 68, flip: true },
        { x: 30, y: 77.5, flip: true }, { x: 70, y: 77.5, flip: true },
      ];
    default:
      return [];
  }
}

export function generateCardSvgDataUrl(suit: Suit, rank: Rank): string {
  const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
  const color = isRed ? '#e52525' : '#18181b';
  const { d, viewBox } = SUIT_PATHS[suit];
  const label = rankToLabel(rank);
  const pips = getPipPositions(rank);

  const cornerSuitSvg = `<svg x="10" y="32" width="18" height="20" viewBox="${viewBox}" fill="${color}"><path d="${d}"/></svg>`;
  const cornerSuitSvgBottom = `<svg x="199" y="263" width="18" height="20" viewBox="${viewBox}" fill="${color}" transform="rotate(180 208 273)"><path d="${d}"/></svg>`;

  const pipsSvg = pips.map(p => {
    const w = p.large ? 86 : 38;
    const h = p.large ? 95 : 42;
    const x = (p.x / 100) * 227 - w / 2;
    const y = (p.y / 100) * 315 - h / 2;
    const transform = p.flip ? ` transform="rotate(180 ${x + w/2} ${y + h/2})"` : '';
    return `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" viewBox="${viewBox}" fill="${color}"${transform}><path d="${d}"/></svg>`;
  }).join('');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="227" height="315" viewBox="0 0 227 315">` +
    `<text x="19" y="30" font-family="Roboto, sans-serif" font-size="28" font-weight="800" fill="${color}" text-anchor="middle">${label}</text>` +
    cornerSuitSvg +
    pipsSvg +
    `<text x="208" y="295" font-family="Roboto, sans-serif" font-size="28" font-weight="800" fill="${color}" text-anchor="middle" transform="rotate(180 208 285)">${label}</text>` +
    cornerSuitSvgBottom +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
}
