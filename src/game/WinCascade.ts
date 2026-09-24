import { Rank, Suit } from '../cards/Card.js';
import { soundFX } from '../audio/SoundFX.js';
import { rankToLabel } from './Labels.js';
import { generateCardSvgDataUrl, isCourtCard } from '../cards/CardPips.js';

export interface CardCascadeDef {
  suit: Suit;
  rank: Rank;
  id: string;
  foundationIndex: number;
  dataUrl?: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

interface ActiveCard {
  suit: Suit;
  rank: Rank;
  img: HTMLImageElement | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export class WinCascade {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isRunning = false;
  private queue: CardCascadeDef[] = [];
  private activeCard: ActiveCard | null = null;
  private dpr = 1;
  private imageCache = new Map<string, HTMLImageElement>();
  private svgUrlCache = new Map<string, string>();

  /**
   * Scans document and shadow root stylesheets to extract and cache all 52 card SVGs.
   */
  extractStyles(shadowRoot?: ShadowRoot | null): void {
    const scanSheet = (sheet: CSSStyleSheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) return;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j] as CSSStyleRule;
          if (rule.selectorText && rule.selectorText.includes('.card-front') && rule.selectorText.includes('.graphic')) {
            const bg = rule.style.backgroundImage;
            if (bg && bg.startsWith('url(')) {
              const dataUrl = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
              const suitMatch = rule.selectorText.match(/data-suit="([^"]+)"/);
              const rankMatch = rule.selectorText.match(/data-rank="([^"]+)"/);
              if (suitMatch && rankMatch) {
                const key = `${suitMatch[1]}_${rankMatch[1]}`;
                this.svgUrlCache.set(key, dataUrl);
                this.getImage(dataUrl);
              }
            }
          }
        }
      } catch {
        // Ignore cross-origin stylesheets
      }
    };

    for (let i = 0; i < document.styleSheets.length; i++) {
      scanSheet(document.styleSheets[i]);
    }

    if (shadowRoot) {
      if (shadowRoot.adoptedStyleSheets) {
        shadowRoot.adoptedStyleSheets.forEach(sheet => scanSheet(sheet));
      }
      for (let i = 0; i < shadowRoot.styleSheets.length; i++) {
        scanSheet(shadowRoot.styleSheets[i]);
      }
    }

    // Pre-populate procedural pip cards (Ace, 2-10) for all 4 suits
    const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
    const pipRanks = [
      Rank.Ace, Rank.Two, Rank.Three, Rank.Four, Rank.Five,
      Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten
    ];
    for (const suit of suits) {
      for (const rank of pipRanks) {
        const key = `${suit}_${rank}`;
        if (!this.svgUrlCache.has(key)) {
          const dataUrl = generateCardSvgDataUrl(suit, rank);
          this.svgUrlCache.set(key, dataUrl);
          this.getImage(dataUrl);
        }
      }
    }
  }

  /**
   * Preloads image from data URL.
   */
  private getImage(dataUrl: string): HTMLImageElement {
    const cached = this.imageCache.get(dataUrl);
    if (cached) return cached;
    const img = new Image();
    img.src = dataUrl;
    this.imageCache.set(dataUrl, img);
    return img;
  }

  /**
   * Starts the classic cascading cards animation.
   */
  start(canvas: HTMLCanvasElement, cards: CardCascadeDef[], shadowRoot?: ShadowRoot | null): void {
    this.stop();
    this.extractStyles(shadowRoot);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.clearRect(0, 0, width, height);

    this.queue = [...cards];
    // Pre-decode all images
    this.queue.forEach(c => {
      let dataUrl = c.dataUrl || this.svgUrlCache.get(`${c.suit}_${c.rank}`);
      if (dataUrl) {
        this.getImage(dataUrl);
      }
    });

    this.isRunning = true;
    this.launchNextCard();

    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Stops and resets the animation.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.activeCard = null;
    this.queue = [];
  }

  private launchNextCard(): void {
    if (this.queue.length === 0) {
      this.activeCard = null;
      return;
    }

    const cardDef = this.queue.shift()!;
    let dataUrl = cardDef.dataUrl || this.svgUrlCache.get(`${cardDef.suit}_${cardDef.rank}`);
    let img: HTMLImageElement | null = null;
    if (dataUrl) {
      img = this.getImage(dataUrl);
    }

    // Classic random physics velocities
    const speedX = 4 + Math.random() * 4.5;
    const direction = cardDef.foundationIndex <= 1 ? (Math.random() < 0.65 ? -1 : 1) : (Math.random() < 0.65 ? 1 : -1);
    const vx = speedX * direction;
    const vy = -(1.5 + Math.random() * 3.5);

    this.activeCard = {
      suit: cardDef.suit,
      rank: cardDef.rank,
      img,
      x: cardDef.startX,
      y: cardDef.startY,
      vx,
      vy,
      width: cardDef.width,
      height: cardDef.height,
    };
  }

  private drawCard(card: ActiveCard): void {
    if (!this.ctx) return;
    const { x, y, width, height, img, suit, rank } = card;

    this.ctx.save();
    
    // 1. Draw white card body with rounded corners
    const radius = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    this.ctx.strokeStyle = '#222222';
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    this.ctx.clip();

    // 2. Draw Center Artwork
    if (img && img.complete && img.naturalWidth > 0) {
      if (isCourtCard(rank)) {
        const frameW = width * 0.68;
        const frameH = height * 0.88;
        const frameX = x + (width - frameW) / 2;
        const frameY = y + (height - frameH) / 2;
        this.ctx.drawImage(img, frameX, frameY, frameW, frameH);
      } else {
        this.ctx.drawImage(img, x, y, width, height);
      }
    } else {
      // Vector center fallback
      const isRedSuit = suit === Suit.Hearts || suit === Suit.Diamonds;
      const suitGlyph = suit === Suit.Hearts ? '♥' : suit === Suit.Diamonds ? '♦' : suit === Suit.Clubs ? '♣' : '♠';
      this.ctx.fillStyle = isRedSuit ? '#e52525' : '#18181b';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const centerFontSize = Math.max(22, Math.round(height * 0.36));
      this.ctx.font = `${centerFontSize}px sans-serif`;
      this.ctx.fillText(suitGlyph, x + width * 0.5, y + height * 0.52);
    }

    // 3. Render Corner Rank and Suit for Court Cards and Fallbacks
    const hasImg = img && img.complete && img.naturalWidth > 0;
    if (isCourtCard(rank) || !hasImg) {
      const isRed = suit === Suit.Hearts || suit === Suit.Diamonds;
      const suitColor = isRed ? '#e52525' : '#18181b';
      const rankLabel = rankToLabel(rank);

      this.ctx.fillStyle = suitColor;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'alphabetic';

      const rankFontSize = Math.max(12, Math.round(height * 0.15));
      const suitFontSize = Math.max(11, Math.round(height * 0.13));
      const suitChar = suit === Suit.Hearts ? '♥' : suit === Suit.Diamonds ? '♦' : suit === Suit.Clubs ? '♣' : '♠';

      // Top-left Corner
      this.ctx.font = `800 ${rankFontSize}px Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      this.ctx.fillText(rankLabel, x + Math.max(6, width * 0.1), y + rankFontSize * 1.05 + 2);
      this.ctx.font = `bold ${suitFontSize}px sans-serif`;
      this.ctx.fillText(suitChar, x + Math.max(6, width * 0.1), y + rankFontSize * 1.05 + suitFontSize * 1.05 + 1);

      // Bottom-right Corner (rotated 180°)
      this.ctx.save();
      this.ctx.translate(x + width, y + height);
      this.ctx.rotate(Math.PI);
      this.ctx.font = `800 ${rankFontSize}px Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      this.ctx.fillText(rankLabel, Math.max(6, width * 0.1), rankFontSize * 1.05 + 2);
      this.ctx.font = `bold ${suitFontSize}px sans-serif`;
      this.ctx.fillText(suitChar, Math.max(6, width * 0.1), rankFontSize * 1.05 + suitFontSize * 1.05 + 1);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private loop(): void {
    if (!this.isRunning || !this.ctx || !this.canvas) {
      return;
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const gravity = 0.65;
    const bounce = -0.84;

    if (this.activeCard) {
      const card = this.activeCard;
      card.x += card.vx;
      card.y += card.vy;
      card.vy += gravity;

      // Bounce on floor
      if (card.y + card.height >= screenHeight) {
        card.y = screenHeight - card.height;
        card.vy = card.vy * bounce;
        // Soft bounce sound
        if (Math.abs(card.vy) > 2) {
          soundFX.drop();
        }
      }

      // Draw card without clearing canvas (paints the cascading stream trail!)
      this.drawCard(card);

      // Check if card has exited the screen sides
      if (card.x + card.width < -20 || card.x > screenWidth + 20) {
        this.launchNextCard();
      }
    } else if (this.queue.length > 0) {
      this.launchNextCard();
    }

    if (this.isRunning && (this.activeCard !== null || this.queue.length > 0)) {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  }
}

export const winCascade = new WinCascade();
