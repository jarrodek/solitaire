import { html, LitElement, TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { CardSources, Solitaire } from '../../game/Solitaire.js';
import { Card, Rank, Suit } from '../../cards/Card.js';
import { CardStack } from '../../game/Ranking.js';
import { rankToLabel } from '../../game/Labels.js';
import { MoveSuggestion, suggestMoves, IHint, findBestHint } from '../../game/Suggestions.js';
import { Score, ScoringMode } from '../../game/Score.js';
import { GameDifficulty } from '../../game/Difficulty.js';
import { bolt, close, lightbulb, menu, redo, refresh, settings, trophy, undo, volumeOff, volumeUp } from '../Icons.js';
import { soundFX } from '../../audio/SoundFX.js';
import { CardCascadeDef, winCascade } from '../../game/WinCascade.js';
import { scoreHistory, ILeaderboardData, IRankedScoreRecord, IScoreRecord } from '../../game/ScoreHistory.js';
import { isCourtCard, getPipPositions, renderSuitSvg } from '../../cards/CardPips.js';

interface IDraggedCard {
  /**
   * Indicates that this card was a trigger. 
   * This always will be the first card on the pile.
   */
  trigger: boolean;
  /**
   * The generated card id.
   */
  id: string;
}

interface IDraggedInfo {
  /**
   * The initial clientX.
   */
  startX: number;
  /**
   * The initial clientY.
   */
  startY: number;
  /**
   * The source of dragged cards.
   */
  source: CardSources;
  /**
   * When `source` is `tableau` then it's the pile number.
   */
  index: number;
  /**
   * The list of cards that are moved.
   */
  cards: IDraggedCard[];
  /**
   * True if pointer moved beyond click threshold.
   */
  hasMoved: boolean;
}

interface IHoveredPileInfo {
  /**
   * The name of the hovered pile.
   */
  source: CardSources;
  /**
   * The index of the hovered pile.
   */
  index: number;
}

interface IValidTarget {
  source: CardSources;
  index: number;
}

export default class Board extends LitElement {
  game = new Solitaire();

  score = new Score();

  /**
   * The currently dragged card, if any.
   */
  dragged: IDraggedInfo | undefined;

  /**
   * The currently hovered pile, if any.
   */
  @state() 
  accessor hovered: IHoveredPileInfo | undefined;

  /**
   * The list of valid target piles for the currently dragged card.
   */
  @state()
  accessor validTargets: IValidTarget[] = [];

  /**
   * Whether the settings modal overlay is visible.
   */
  @state()
  accessor showSettings = false;

  /**
   * Whether the mobile menu drawer is open.
   */
  @state()
  accessor showMobileMenu = false;

  /**
   * Whether sound effects are muted.
   */
  @state()
  accessor soundMuted = soundFX.muted;

  /**
   * Whether to highlight valid drop destination piles during drag.
   */
  @state()
  accessor showDropHighlights = localStorage.getItem('solitaire_highlight_targets') !== 'false';

  /**
   * Draw count mode: Draw 1 or Draw 3.
   */
  @state()
  accessor drawCount: 1 | 3 = (localStorage.getItem('solitaire_draw_count') === '3' ? 3 : 1);

  /**
   * Scoring mode: 'standard' or 'vegas'.
   */
  @state()
  accessor scoringMode: ScoringMode = this.score.scoringMode;

  /**
   * Difficulty level: 'easy', 'medium', or 'hard' (pure random).
   */
  @state()
  accessor difficulty: GameDifficulty = this.game.difficulty;

  /**
   * In Vegas mode, whether the bankroll carries over across games.
   */
  @state()
  accessor vegasCumulative: boolean = this.score.vegasCumulative;

  /**
   * Whether the auto-complete sequence is currently executing.
   */
  @state()
  accessor isAutoCompleting = false;

  /**
   * Currently active suggested hint.
   */
  @state()
  accessor activeHint: IHint | undefined;

  /**
   * Hint toast notification message.
   */
  @state()
  accessor hintToastMessage: string | null = null;

  /**
   * Whether the high scores modal is open.
   */
  @state()
  accessor showHighScores = false;

  /**
   * Currently active tab in the high scores modal.
   */
  @state()
  accessor highScoresTab: ScoringMode = this.score.scoringMode;

  /**
   * High scores data loaded for the modal.
   */
  @state()
  accessor highScoresData: ILeaderboardData | null = null;

  /**
   * Leaderboard data shown in the win modal.
   */
  @state()
  accessor winLeaderboardData: ILeaderboardData | null = null;

  /**
   * The record ID of the game won in the current session.
   */
  @state()
  accessor latestWinRecordId: number | undefined;

  /**
   * Flag to avoid recording the win multiple times.
   */
  private hasRecordedCurrentWin = false;

  /**
   * Timeout handle for the active hint display.
   */
  hintTimeout: number | undefined;

  /**
   * Timeout handle for the auto-complete cascade loop.
   */
  autoCompleteTimeout: number | undefined;

  /**
   * Active deal animations so they can be canceled or fast-forwarded on user interaction.
   */
  activeDealAnimations: Animation[] = [];

  /**
   * The interval that updates the UI (for the time counter).
   */
  gameInterval: number | undefined;

  cancelDealAnimations(): void {
    if (this.activeDealAnimations.length > 0) {
      for (const anim of this.activeDealAnimations) {
        try {
          anim.finish();
        } catch {
          // ignore
        }
      }
      this.activeDealAnimations = [];
    }
  }

  animateOpeningDeal(): void {
    this.cancelDealAnimations();
    const stockEl = this.shadowRoot?.querySelector('.deck-pile.stock');
    if (!stockEl) return;
    const stockRect = stockEl.getBoundingClientRect();

    const dealSequence: Array<{ cardId: string; isTopCard: boolean }> = [];
    for (let row = 0; row < 7; row++) {
      for (let col = row; col < 7; col++) {
        const card = this.game.tableau[col]?.cards[row];
        if (card) {
          dealSequence.push({
            cardId: card.id,
            isTopCard: row === col,
          });
        }
      }
    }

    dealSequence.forEach((item, index) => {
      const cardEl = this.shadowRoot?.getElementById(item.cardId);
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();
      const dx = stockRect.left - cardRect.left;
      const dy = stockRect.top - cardRect.top;

      const delay = index * 22;
      const anim = cardEl.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.96)`, opacity: 0.8 },
          { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }
        ],
        {
          duration: 220,
          delay,
          easing: 'cubic-bezier(0.18, 0.9, 0.32, 1)',
          fill: 'backwards'
        }
      );

      this.activeDealAnimations.push(anim);

      anim.addEventListener('finish', () => {
        if (item.isTopCard) {
          this.animateCardFlip(item.cardId);
        }
      });
    });
  }

  animateCardFlip(cardId: string): void {
    const el = this.shadowRoot?.getElementById(cardId);
    if (!el) return;
    el.classList.add('just-flipped');
    setTimeout(() => {
      el.classList.remove('just-flipped');
    }, 250);
  }

  animateFoundationLand(cardId: string): void {
    const el = this.shadowRoot?.getElementById(cardId);
    if (!el) return;
    el.classList.add('foundation-land');
    setTimeout(() => {
      el.classList.remove('foundation-land');
    }, 320);
  }

  constructor() {
    super();
    this.handleDocumentPointerMove = this.handleDocumentPointerMove.bind(this);
    this.handleDocumentPointerUp = this.handleDocumentPointerUp.bind(this);
    this.handleDocumentPointerCancel = this.handleDocumentPointerCancel.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleWindowStateChange = this.handleWindowStateChange.bind(this);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('pointermove', this.handleDocumentPointerMove, { passive: false });
    window.addEventListener('pointerup', this.handleDocumentPointerUp);
    window.addEventListener('pointercancel', this.handleDocumentPointerCancel);
    window.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('focus', this.handleWindowStateChange);
    window.addEventListener('blur', this.handleWindowStateChange);
    document.addEventListener('visibilitychange', this.handleWindowStateChange);
    this.startGame();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('pointermove', this.handleDocumentPointerMove);
    window.removeEventListener('pointerup', this.handleDocumentPointerUp);
    window.removeEventListener('pointercancel', this.handleDocumentPointerCancel);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('focus', this.handleWindowStateChange);
    window.removeEventListener('blur', this.handleWindowStateChange);
    document.removeEventListener('visibilitychange', this.handleWindowStateChange);
    this.stopAutoComplete();
    this.cancelDealAnimations();
    this.clearHint();
    winCascade.stop();
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
  }

  handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    if (this.dragged) {
      const dx = e.clientX - this.dragged.startX;
      const dy = e.clientY - this.dragged.startY;
      for (const card of this.dragged.cards) {
        this.returnCard(dx, dy, card.id);
      }
      this.clearMoveSideEffects();
    }
  }

  handleWindowStateChange(e?: Event): void {
    const isBlurred = e?.type === 'blur';
    const isFocused = e?.type === 'focus' || document.hasFocus();
    const isActive = !isBlurred && !document.hidden && isFocused;
    if (!isActive) {
      this.score.pauseTimer();
    } else if (!this.showSettings && !this.showHighScores && !this.isGameWon()) {
      this.score.resumeTimer();
    }
  }

  handleKeyDown(e: KeyboardEvent): void {
    // Do not trigger shortcuts if user is interacting with an input or editable element
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      if (e.key === 'Escape') {
        target.blur();
      }
      return;
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      if (this.showSettings || this.showHighScores || this.showMobileMenu) {
        this.showSettings = false;
        this.showHighScores = false;
        this.showMobileMenu = false;
        if (!document.hidden && document.hasFocus() && !this.isGameWon()) {
          this.score.resumeTimer();
        }
      }
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y, Ctrl+Shift+Z / Cmd+Shift+Z
    const isRedo = ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
                   ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'));
    if (isRedo) {
      e.preventDefault();
      this.handleRedo();
      return;
    }

    // Undo: Ctrl+Z / Cmd+Z, or U
    const isUndo = ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) || 
                   (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'u' || e.key === 'U'));
    if (isUndo) {
      e.preventDefault();
      this.handleUndo();
      return;
    }

    // Single-key shortcuts (ignore when Ctrl, Alt, or Meta are held)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    const key = e.key.toLowerCase();

    // Redo: Y
    if (key === 'y') {
      e.preventDefault();
      this.handleRedo();
      return;
    }

    // Deal: Space or D
    if (key === ' ' || key === 'd') {
      e.preventDefault();
      this.drawNext();
      return;
    }

    // Hint: H
    if (key === 'h') {
      e.preventDefault();
      this.showHint();
      return;
    }

    // New Game: N
    if (key === 'n') {
      e.preventDefault();
      this.startGame();
      return;
    }

    // Sound toggle: M
    if (key === 'm') {
      e.preventDefault();
      this.toggleSound();
      return;
    }

    // Settings toggle: S
    if (key === 's') {
      e.preventDefault();
      this.toggleSettings();
      return;
    }

    // High Scores / Leaderboard toggle: L
    if (key === 'l') {
      e.preventDefault();
      this.toggleHighScores();
      return;
    }

    // Auto-complete: A
    if (key === 'a' && this.canAutoComplete()) {
      e.preventDefault();
      this.startAutoComplete();
      return;
    }
  }

  clearHint(): void {
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = undefined;
    }
    this.activeHint = undefined;
    this.hintToastMessage = null;
    this.requestUpdate();
  }

  showHint(): void {
    this.clearHint();
    if (this.isGameWon() || this.isAutoCompleting) {
      return;
    }
    const hint = findBestHint(this.game);
    if (!hint) {
      soundFX.noMove();
      this.hintToastMessage = 'No moves available!';
      this.hintTimeout = window.setTimeout(() => {
        this.hintToastMessage = null;
        this.requestUpdate();
      }, 2400);
      this.requestUpdate();
      return;
    }

    soundFX.hint();
    this.activeHint = hint;
    this.hintToastMessage = hint.message;
    this.hintTimeout = window.setTimeout(() => {
      this.clearHint();
    }, 4500);
    this.requestUpdate();
  }

  toggleSound(): void {
    this.soundMuted = soundFX.toggleMuted();
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
    if (this.showSettings) {
      this.showMobileMenu = false;
      this.showHighScores = false;
      this.score.pauseTimer();
    } else if (!document.hidden && document.hasFocus() && !this.isGameWon() && !this.showMobileMenu && !this.showHighScores) {
      this.score.resumeTimer();
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showSettings = false;
      this.showHighScores = false;
      this.score.pauseTimer();
    } else if (!document.hidden && document.hasFocus() && !this.isGameWon() && !this.showSettings && !this.showHighScores) {
      this.score.resumeTimer();
    }
  }

  handleHighlightToggle(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.showDropHighlights = input.checked;
    localStorage.setItem('solitaire_highlight_targets', String(this.showDropHighlights));
  }

  setDifficulty(diff: GameDifficulty): void {
    if (this.difficulty === diff) return;
    this.difficulty = diff;
    this.game.difficulty = diff;
    localStorage.setItem('solitaire_difficulty', diff);
    this.startGame();
  }

  setDrawCount(count: 1 | 3): void {
    if (this.drawCount === count) return;
    this.drawCount = count;
    this.game.drawCount = count;
    localStorage.setItem('solitaire_draw_count', String(count));
    this.startGame();
  }

  setScoringMode(mode: ScoringMode): void {
    if (this.scoringMode === mode) return;
    this.scoringMode = mode;
    this.score.setScoringMode(mode);
    this.game.scoringMode = mode;
    this.startGame();
  }

  setVegasCumulative(enabled: boolean): void {
    this.vegasCumulative = enabled;
    this.score.setVegasCumulative(enabled);
    this.requestUpdate();
  }

  resetBankroll(): void {
    this.score.resetBankroll();
    this.requestUpdate();
  }

  protected override render(): TemplateResult {
    return html`
    ${this.renderHeader()}
    ${this.renderBoard()}
    ${this.renderFooter()}
    <canvas id="win-cascade-canvas" class="win-canvas"></canvas>
    ${this.canAutoComplete() ? this.renderAutoCompleteBanner() : ''}
    ${this.isGameWon() ? this.renderWinModal() : ''}
    ${this.showSettings ? this.renderSettingsModal() : ''}
    ${this.showHighScores ? this.renderHighScoresModal() : ''}
    ${this.showMobileMenu ? this.renderMobileMenuDrawer() : ''}
    ${this.hintToastMessage ? this.renderHintToast() : ''}
    `;
  }

  startGame(): void {
    this.hasRecordedCurrentWin = false;
    this.latestWinRecordId = undefined;
    this.winLeaderboardData = null;
    this.cancelDealAnimations();
    winCascade.stop();
    soundFX.deal();
    this.stopAutoComplete();
    this.game.difficulty = this.difficulty;
    this.game.drawCount = this.drawCount;
    this.game.scoringMode = this.scoringMode;
    this.game.start();
    this.score.reset();
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    this.gameInterval = window.setInterval(() => { this.requestUpdate() }, 1000);
    this.clearMoveSideEffects();
    this.requestUpdate();

    this.updateComplete.then(() => {
      this.animateOpeningDeal();
    });
  }

  handleDeckClick(): void {
    this.drawNext();
  }

  drawNext(): void {
    this.cancelDealAnimations();
    this.clearHint();
    const stockEl = this.shadowRoot?.querySelector('.deck-pile.stock');
    const stockRect = stockEl?.getBoundingClientRect();
    const isStockEmpty = this.game.deck.empty();
    const isRecycle = isStockEmpty && this.game.waste.length > 0;

    if (isStockEmpty) {
      if (this.game.waste.length === 0) {
        return;
      }
      if (!this.game.canRecycleWaste()) {
        soundFX.noMove();
        return;
      }
    }

    soundFX.deal();
    this.score.startTimer();
    this.game.deal();
    this.requestUpdate();

    if (isRecycle) {
      this.updateComplete.then(() => {
        const newStockEl = this.shadowRoot?.querySelector('.deck-pile.stock');
        if (!newStockEl) return;
        newStockEl.animate(
          [
            { transform: 'scale(0.88) rotate(-8deg)', opacity: 0.7 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1 }
          ],
          { duration: 220, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
        );
      });
    } else {
      const numDrawn = Math.min(this.drawCount, this.game.waste.length);
      const topWasteCards = this.game.waste.slice(-numDrawn);

      this.updateComplete.then(() => {
        if (!stockRect) return;
        topWasteCards.forEach((card, idx) => {
          const cardEl = this.shadowRoot?.getElementById(card.id);
          if (!cardEl) return;
          const wasteRect = cardEl.getBoundingClientRect();
          const dx = stockRect.left - wasteRect.left;
          const dy = stockRect.top - wasteRect.top;

          cardEl.animate(
            [
              { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(-6deg) scale(0.95)`, opacity: 0.8 },
              { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', opacity: 1 }
            ],
            {
              duration: 180,
              delay: idx * 30,
              easing: 'cubic-bezier(0.18, 0.9, 0.32, 1)',
              fill: 'backwards'
            }
          );
        });
      });
    }
  }

  /**
   * Traverses the parents tree to find the `.pile` element.
   */
  getCardPileElement(card: Element): HTMLElement | undefined {
    let parent: Element | null = card;
    while (parent) {
      if (parent.classList.contains('pile')) {
        return parent as HTMLElement;
      }
      parent = parent.parentElement;
    }
    return undefined;
  }

  /**
   * Reads pile's source and index.
   */
  getPileInfo(pile: HTMLElement): { source: CardSources, index: number } | undefined {
    const { source, index: pileIndex = '-1' } = pile.dataset;
    if (!source) {
      return undefined;
    }
    const index = Number.parseInt(pileIndex);
    if (Number.isNaN(index)) {
      return undefined;
    }
    return {
      index,
      source: source as CardSources,
    };
  }

  getCardInfo(card: Element): { suit: Suit, rank: Rank, id: string } | undefined {
    const typed = card as HTMLElement;
    const { dataset } = typed;
    if (!dataset || !dataset.rank || !dataset.suit) {
      return undefined;
    }
    return {
      suit: dataset.suit as Suit, 
      rank: dataset.rank as Rank,
      id: card.id,
    };
  }

  handleCardPointerDown(e: PointerEvent): void {
    if (e.button !== 0) {
      return;
    }
    this.cancelDealAnimations();
    this.clearHint();
    if (this.dragged) {
      return;
    }
    const element = e.currentTarget as HTMLElement;
    const cardInfo = this.getCardInfo(element);
    if (!cardInfo) {
      return;
    }
    const pile = this.getCardPileElement(element);
    if (!pile) {
      return;
    }
    const pileInfo = this.getPileInfo(pile);
    if (!pileInfo) {
      return;
    }
    const pileCards = this.game.getPileCards(pileInfo.source, pileInfo.index);
    if (!pileCards) {
      return;
    }
    const currentIndex = pileCards.findIndex(i => i.id === cardInfo.id);
    if (currentIndex === -1) {
      return;
    }
    // For waste cards, only the TOP card can be dragged
    if (pileInfo.source === 'waste' && currentIndex !== pileCards.length - 1) {
      return;
    }
    const included = pileCards.slice(currentIndex);
    if (!included.length) {
      return;
    }

    const cards: IDraggedCard[] = included.map((info, index) => ({
      id: info.id,
      trigger: index === 0,
    }));

    this.dragged = {
      source: pileInfo.source,
      index: pileInfo.index,
      cards,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };
  }

  getPileFromPoint(x: number, y: number): HTMLElement | undefined {
    if (!this.dragged || !this.dragged.cards.length) {
      return undefined;
    }
    const firstCard = this.shadowRoot?.getElementById(this.dragged.cards[0].id);
    if (firstCard) {
      firstCard.style.pointerEvents = 'none';
    }
    const hoveredElement = this.shadowRoot?.elementFromPoint(x, y);
    if (firstCard) {
      firstCard.style.pointerEvents = '';
    }
    if (!hoveredElement) {
      return undefined;
    }
    return this.getCardPileElement(hoveredElement);
  }

  handleDocumentPointerMove(e: PointerEvent): void {
    const { dragged } = this;
    if (!dragged) {
      return;
    }
    const dx = e.clientX - dragged.startX;
    const dy = e.clientY - dragged.startY;

    if (!dragged.hasMoved && Math.hypot(dx, dy) > 5) {
      dragged.hasMoved = true;
      if (this.showDropHighlights) {
        this.validTargets = this.computeValidTargets(dragged);
      }
    }

    if (dragged.hasMoved) {
      // Direct DOM update for high-performance 60fps/120fps dragging with 0 CSS transition lag
      for (const c of dragged.cards) {
        const el = this.shadowRoot?.getElementById(c.id);
        if (el) {
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          el.style.transition = 'none';
          el.style.willChange = 'transform';
          el.classList.add('dragged');
        }
      }

      if (dragged.cards.length > 0) {
        const firstCardEl = this.shadowRoot?.getElementById(dragged.cards[0].id);
        firstCardEl?.closest('.pile')?.classList.add('drag-source');
      }

      const pile = this.getPileFromPoint(e.clientX, e.clientY);
      let newHovered: IHoveredPileInfo | undefined;
      if (pile && pile.dataset.source) {
        newHovered = {
          source: pile.dataset.source as CardSources,
          index: Number.parseInt(pile.dataset.index || '-1'),
        };
      }

      const hoveredChanged = 
        (!this.hovered && newHovered) ||
        (this.hovered && !newHovered) ||
        (this.hovered && newHovered && (this.hovered.source !== newHovered.source || this.hovered.index !== newHovered.index));

      if (hoveredChanged) {
        this.hovered = newHovered;
      }
    }
  }

  computeValidTargets(dragged: IDraggedInfo): IValidTarget[] {
    if (!this.showDropHighlights || !dragged.cards.length) {
      return [];
    }
    const cardId = dragged.cards[0].id;
    const cardLocation = this.game.graph.get(cardId);
    if (!cardLocation) {
      return [];
    }
    const multiDrag = dragged.cards.length > 1;
    const targets: IValidTarget[] = [];

    // Check 7 Tableau piles
    for (let i = 0; i < 7; i++) {
      if (cardLocation.pile === 'tableau' && cardLocation.pileIndex === i) {
        continue;
      }
      if (this.game.isValidMove(cardLocation, 'tableau', i)) {
        targets.push({ source: 'tableau', index: i });
      }
    }

    // Check 4 Foundation piles (single card moves only)
    if (!multiDrag) {
      for (let i = 0; i < 4; i++) {
        if (cardLocation.pile === 'foundation' && cardLocation.pileIndex === i) {
          continue;
        }
        if (this.game.isValidMove(cardLocation, 'foundation', i)) {
          targets.push({ source: 'foundation', index: i });
        }
      }
    }

    return targets;
  }

  /**
   * Timestamp of the last card click to detect double clicks / taps.
   */
  lastCardClickTime = 0;

  /**
   * Card ID of the last card clicked.
   */
  lastCardClickId = '';

  handleDocumentPointerUp(e: PointerEvent): void {
    const { dragged } = this;
    if (!dragged) {
      return;
    }

    if (!dragged.hasMoved) {
      // Click or tap without dragging
      const cardId = dragged.cards[0]?.id;
      const now = performance.now();
      const isDblClick = e.detail === 2 || (cardId && this.lastCardClickId === cardId && (now - this.lastCardClickTime < 350));

      if (isDblClick && cardId) {
        this.lastCardClickTime = 0;
        this.lastCardClickId = '';
        this.handleCardDoubleClick(cardId);
      } else if (cardId) {
        this.lastCardClickTime = now;
        this.lastCardClickId = cardId;
      }
      this.clearMoveSideEffects();
      return;
    }

    const pile = this.getPileFromPoint(e.clientX, e.clientY);
    if (!pile) {
      this.finishFailedMove(e, dragged);
      return;
    }
    const destination = this.getPileInfo(pile);
    if (!destination || destination.source === 'waste') {
      this.finishFailedMove(e, dragged);
      return;
    }
    const multiDrag = dragged.cards.length > 1;
    if (destination.source === 'foundation' && multiDrag) {
      this.finishFailedMove(e, dragged);
      return;
    }
    const gameCardLocation = this.game.graph.get(dragged.cards[0].id);
    if (!gameCardLocation) {
      this.finishFailedMove(e, dragged);
      return;
    }
    const valid = this.game.isValidMove(gameCardLocation, destination.source, destination.index);
    if (!valid) {
      this.finishFailedMove(e, dragged);
      return;
    }

    const movedCard = this.game.getCard(gameCardLocation);
    if (multiDrag) {
      const result = this.game.moveCards(dragged.index, destination.index, gameCardLocation.cardIndex);
      this.score.update('tableau', 'tableau', result);
      if (result.newFlipped) {
        soundFX.flip();
        this.updateComplete.then(() => {
          const srcPile = this.game.tableau[dragged.index]?.cards;
          if (srcPile && srcPile.length > 0) {
            this.animateCardFlip(srcPile[srcPile.length - 1].id);
          }
        });
      } else {
        soundFX.drop();
      }
    } else {
      const result = this.game.moveCard(gameCardLocation, destination.source, destination.index);
      this.score.update(gameCardLocation.pile, destination.source, result);
      if (destination.source === 'foundation') {
        soundFX.foundation(movedCard?.rank);
        if (movedCard) {
          this.updateComplete.then(() => this.animateFoundationLand(movedCard.id));
        }
      } else if (result.newFlipped) {
        soundFX.flip();
      } else {
        soundFX.drop();
      }
      if (result.newFlipped) {
        this.updateComplete.then(() => {
          const srcPile = this.game.getPileCards(gameCardLocation.pile, gameCardLocation.pileIndex);
          if (srcPile && srcPile.length > 0) {
            this.animateCardFlip(srcPile[srcPile.length - 1].id);
          }
        });
      }
    }
    this.checkGameStatus();
    this.clearMoveSideEffects();
  }

  handleDocumentPointerCancel(): void {
    if (this.dragged) {
      this.clearMoveSideEffects();
    }
  }

  handleCardDoubleClick(cardId: string): void {
    const cardLocation = this.game.graph.get(cardId);
    if (!cardLocation) {
      return;
    }
    const card = this.game.getCard(cardLocation);
    if (!card || !card.faceUp) {
      return;
    }

    if (cardLocation.pile === 'waste' && cardLocation.cardIndex !== this.game.waste.length - 1) {
      return;
    }

    const { tableau, foundation } = this.game;
    const isTopCard = this.game.isLast(cardLocation);

    // 1. Direct to Foundation if top card
    if (isTopCard) {
      for (let f = 0; f < 4; f++) {
        if (this.game.isValidMove(cardLocation, 'foundation', f)) {
          const result = this.game.moveCard(cardLocation, 'foundation', f);
          this.score.update(cardLocation.pile, 'foundation', result);
          soundFX.foundation(card.rank);
          if (result.newFlipped) {
            setTimeout(() => soundFX.flip(), 120);
          }
          this.checkGameStatus();
          this.requestUpdate();
          this.updateComplete.then(() => {
            this.animateFoundationLand(card.id);
            if (result.newFlipped) {
              const srcPile = this.game.getPileCards(cardLocation.pile, cardLocation.pileIndex);
              if (srcPile && srcPile.length > 0) {
                this.animateCardFlip(srcPile[srcPile.length - 1].id);
              }
            }
          });
          return;
        }
      }
    }

    // 2. If not moving to Foundation, check Tableau
    const multi = !isTopCard;
    let suggestions: MoveSuggestion[] = [];
    if (multi) {
      suggestions = suggestMoves(card, tableau, []);
    } else {
      suggestions = suggestMoves(card, tableau, foundation);
    }

    const [place] = suggestions;
    if (!place) {
      return;
    }

    if (multi) {
      const result = this.game.moveCards(cardLocation.pileIndex, place.index, cardLocation.cardIndex);
      this.score.update('tableau', 'tableau', result);
      if (result.newFlipped) {
        soundFX.flip();
        this.updateComplete.then(() => {
          const srcPile = this.game.tableau[cardLocation.pileIndex]?.cards;
          if (srcPile && srcPile.length > 0) {
            this.animateCardFlip(srcPile[srcPile.length - 1].id);
          }
        });
      } else {
        soundFX.drop();
      }
    } else {
      const result = this.game.moveCard(cardLocation, place.type, place.index);
      this.score.update(cardLocation.pile, place.type, result);
      if (place.type === 'foundation') {
        soundFX.foundation(card.rank);
        this.updateComplete.then(() => this.animateFoundationLand(card.id));
      } else if (result.newFlipped) {
        soundFX.flip();
      } else {
        soundFX.drop();
      }
      if (result.newFlipped) {
        this.updateComplete.then(() => {
          const srcPile = this.game.getPileCards(cardLocation.pile, cardLocation.pileIndex);
          if (srcPile && srcPile.length > 0) {
            this.animateCardFlip(srcPile[srcPile.length - 1].id);
          }
        });
      }
    }
    this.checkGameStatus();
    this.requestUpdate();
  }

  finishFailedMove(e: PointerEvent, dragged: IDraggedInfo): void {
    const dx = e.clientX - dragged.startX;
    const dy = e.clientY - dragged.startY;
    for (const card of dragged.cards) {
      this.returnCard(dx, dy, card.id);
    }
    this.clearMoveSideEffects();
  }

  returnCard(x: number, y: number, refId: string): Animation | null {
    const card = this.shadowRoot?.querySelector(`#${refId}`) as HTMLElement | null;
    if (!card) {
      return null;
    }
    card.style.transform = '';
    card.style.transition = '';
    card.style.willChange = '';
    card.classList.remove('dragged');
    card.classList.add('returning');
    const anim = card.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0)` },
        { transform: `translate3d(0, 0, 0)` }
      ],
      {
        duration: 220,
        easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
      }
    );
    anim.addEventListener('finish', () => {
      card.classList.remove('returning');
      card.style.transform = '';
      card.style.transition = '';
      card.style.willChange = '';
    });
    return anim;
  }

  clearMoveSideEffects(): void {
    if (this.dragged) {
      for (const card of this.dragged.cards) {
        const el = this.shadowRoot?.getElementById(card.id);
        if (el) {
          el.classList.remove('dragged');
          el.style.transform = '';
          el.style.transition = '';
          el.style.willChange = '';
        }
      }
    }
    this.shadowRoot?.querySelectorAll('.drag-source').forEach(el => el.classList.remove('drag-source'));
    this.dragged = undefined;
    this.hovered = undefined;
    this.validTargets = [];
    this.requestUpdate();
  }

  handleUndo(): void {
    this.clearHint();
    this.stopAutoComplete();
    const result = this.game.undo();
    if (!result) {
      return;
    }
    this.score.reduce(result.from.pile, result.to.pile, { moved: true, newFlipped: result.flipped });
    soundFX.drop();
    this.requestUpdate();
  }

  handleRedo(): void {
    this.clearHint();
    this.stopAutoComplete();
    const result = this.game.redo();
    if (!result) {
      return;
    }
    this.score.update(result.from.pile, result.to.pile, { moved: true, newFlipped: result.flipped });
    if (result.to.pile === 'foundation') {
      const destPile = this.game.getPileCards('foundation', result.to.pileIndex);
      const topCard = destPile && destPile.length > 0 ? destPile[destPile.length - 1] : undefined;
      soundFX.foundation(topCard?.rank);
      if (topCard) {
        this.updateComplete.then(() => this.animateFoundationLand(topCard.id));
      }
    } else if (result.flipped) {
      soundFX.flip();
      this.updateComplete.then(() => {
        const srcPile = this.game.getPileCards(result.from.pile, result.from.pileIndex);
        if (srcPile && srcPile.length > 0) {
          this.animateCardFlip(srcPile[srcPile.length - 1].id);
        }
      });
    } else if (result.from.pile === 'stock' && result.to.pile === 'waste') {
      soundFX.deal();
    } else {
      soundFX.drop();
    }
    this.checkGameStatus();
    this.requestUpdate();
  }

  isGameWon(): boolean {
    return this.game.foundation.length === 4 && this.game.foundation.every(f => f.cards.length === 13);
  }

  checkGameStatus(): void {
    if (this.isGameWon()) {
      this.score.stopTimer();
      const bonus = this.score.applyWinBonus();
      soundFX.win();
      this.triggerWinCascade();
      this.recordWin(bonus);
    }
  }

  async recordWin(bonus: number = 0): Promise<void> {
    if (this.hasRecordedCurrentWin) return;
    this.hasRecordedCurrentWin = true;

    const finalScore = this.scoringMode === 'vegas' && this.vegasCumulative ? this.score.vegasBankroll : this.score.current;
    const record: Omit<IScoreRecord, 'id'> = {
      score: finalScore,
      moves: this.game.moves.length,
      timeMs: this.score.getElapsedMs(),
      elapsedTime: this.score.getElapsedTime(),
      scoringMode: this.scoringMode,
      difficulty: this.difficulty,
      drawCount: this.drawCount,
      date: Date.now(),
      timeBonus: bonus > 0 ? bonus : undefined,
    };

    try {
      const id = await scoreHistory.addRecord(record);
      this.latestWinRecordId = id;
      this.winLeaderboardData = await scoreHistory.getLeaderboard(this.scoringMode, id);
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to save score to IndexedDB:', err);
    }
  }

  triggerWinCascade(): void {
    requestAnimationFrame(() => {
      const canvas = this.shadowRoot?.querySelector('#win-cascade-canvas') as HTMLCanvasElement | null;
      if (!canvas) return;

      const cardDefs: CardCascadeDef[] = [];
      const suits = [Suit.Spades, Suit.Hearts, Suit.Diamonds, Suit.Clubs];
      const ranks = [Rank.King, Rank.Queen, Rank.Jack, Rank.Ten, Rank.Nine, Rank.Eight, Rank.Seven, Rank.Six, Rank.Five, Rank.Four, Rank.Three, Rank.Two, Rank.Ace];

      for (let f = 3; f >= 0; f--) {
        const foundationCards = this.game.foundation[f]?.cards || [];
        const pileEl = this.shadowRoot?.querySelector(`.foundation-pile[data-index="${f}"]`) as HTMLElement | null;
        const rect = pileEl ? pileEl.getBoundingClientRect() : { left: 100 + f * 100, top: 80, width: 80, height: 112 };

        if (foundationCards.length > 0) {
          for (let c = foundationCards.length - 1; c >= 0; c--) {
            const card = foundationCards[c];
            const cardEl = this.shadowRoot?.querySelector(`.card-front[data-suit="${card.suit}"][data-rank="${card.rank}"]`);
            const graphicEl = cardEl?.querySelector('.graphic');
            let dataUrl: string | undefined;
            if (graphicEl) {
              const bg = window.getComputedStyle(graphicEl).backgroundImage;
              if (bg && bg.startsWith('url(')) {
                dataUrl = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
              }
            }
            cardDefs.push({
              suit: card.suit,
              rank: card.rank,
              id: card.id,
              foundationIndex: f,
              dataUrl,
              startX: rect.left,
              startY: rect.top,
              width: rect.width || 80,
              height: rect.height || 112,
            });
          }
        } else {
          const suit = suits[f];
          ranks.forEach(rank => {
            const cardEl = this.shadowRoot?.querySelector(`.card-front[data-suit="${suit}"][data-rank="${rank}"]`);
            const graphicEl = cardEl?.querySelector('.graphic');
            let dataUrl: string | undefined;
            if (graphicEl) {
              const bg = window.getComputedStyle(graphicEl).backgroundImage;
              if (bg && bg.startsWith('url(')) {
                dataUrl = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
              }
            }
            cardDefs.push({
              suit,
              rank,
              id: `c_${suit}_${rank}`,
              foundationIndex: f,
              dataUrl,
              startX: rect.left,
              startY: rect.top,
              width: rect.width || 80,
              height: rect.height || 112,
            });
          });
        }
      }

      winCascade.start(canvas, cardDefs, this.shadowRoot);
    });
  }

  canAutoComplete(): boolean {
    if (this.isGameWon() || this.isAutoCompleting) {
      return false;
    }
    // Check if there are any face-down cards remaining in any tableau pile
    const hasFaceDownCards = this.game.tableau.some(pile => pile.cards.some(c => !c.faceUp));
    if (hasFaceDownCards) {
      return false;
    }
    // Must have at least one card remaining outside foundations
    const hasRemainingCards = 
      this.game.tableau.some(p => p.cards.length > 0) || 
      !this.game.deck.empty() || 
      this.game.waste.length > 0;

    return hasRemainingCards;
  }

  executeAutoCompleteStep(): boolean {
    if (this.isGameWon()) {
      return false;
    }

    // 1. Try moving top card of Waste to Foundation
    if (this.game.waste.length > 0) {
      const topWaste = this.game.waste[this.game.waste.length - 1];
      const loc = this.game.graph.get(topWaste.id);
      if (loc) {
        for (let f = 0; f < 4; f++) {
          if (this.game.isValidMove(loc, 'foundation', f)) {
            const result = this.game.moveCard(loc, 'foundation', f);
            this.score.update(loc.pile, 'foundation', result);
            soundFX.foundation(topWaste.rank);
            return true;
          }
        }
      }
    }

    // 2. Try moving the top (last) card of any Tableau pile to Foundation
    for (let t = 0; t < 7; t++) {
      const pile = this.game.tableau[t];
      if (pile.cards.length > 0) {
        const topCard = pile.cards[pile.cards.length - 1];
        const loc = this.game.graph.get(topCard.id);
        if (loc) {
          for (let f = 0; f < 4; f++) {
            if (this.game.isValidMove(loc, 'foundation', f)) {
              const result = this.game.moveCard(loc, 'foundation', f);
              this.score.update(loc.pile, 'foundation', result);
              soundFX.foundation(topCard.rank);
              return true;
            }
          }
        }
      }
    }

    // 3. Try moving top card of Waste to Tableau
    if (this.game.waste.length > 0) {
      const topWaste = this.game.waste[this.game.waste.length - 1];
      const loc = this.game.graph.get(topWaste.id);
      if (loc) {
        for (let t = 0; t < 7; t++) {
          if (this.game.isValidMove(loc, 'tableau', t)) {
            const result = this.game.moveCard(loc, 'tableau', t);
            this.score.update(loc.pile, 'tableau', result);
            soundFX.drop();
            return true;
          }
        }
      }
    }

    // 4. Try dealing a card from Stock to Waste (or recycling Waste to Stock)
    if (!this.game.deck.empty() || this.game.waste.length > 0) {
      soundFX.deal();
      this.game.deal();
      return true;
    }

    return false;
  }

  startAutoComplete(): void {
    if (this.isAutoCompleting) {
      return;
    }
    this.isAutoCompleting = true;
    this.score.startTimer();
    let unproductiveSteps = 0;
    const maxUnproductiveSteps = 60;

    const step = () => {
      if (this.isGameWon()) {
        this.stopAutoComplete();
        this.checkGameStatus();
        this.requestUpdate();
        return;
      }

      const prevWasteLen = this.game.waste.length;
      const prevDeckLen = this.game.deck.stock.length;
      const moved = this.executeAutoCompleteStep();
      this.requestUpdate();

      if (!moved) {
        this.stopAutoComplete();
        this.checkGameStatus();
        return;
      }

      // Check if the step was just a deck deal/recycle without placing cards
      if (this.game.waste.length === prevWasteLen + 1 || (prevDeckLen === 0 && this.game.waste.length === 0)) {
        unproductiveSteps++;
      } else {
        unproductiveSteps = 0;
      }

      if (unproductiveSteps > maxUnproductiveSteps) {
        this.stopAutoComplete();
        this.checkGameStatus();
        return;
      }

      if (this.isGameWon()) {
        this.stopAutoComplete();
        this.checkGameStatus();
        this.requestUpdate();
      } else {
        this.autoCompleteTimeout = window.setTimeout(step, 65);
      }
    };

    this.autoCompleteTimeout = window.setTimeout(step, 30);
  }

  stopAutoComplete(): void {
    this.isAutoCompleting = false;
    if (this.autoCompleteTimeout) {
      clearTimeout(this.autoCompleteTimeout);
      this.autoCompleteTimeout = undefined;
    }
  }

  renderAutoCompleteBanner(): TemplateResult {
    return html`
    <div class="auto-complete-banner">
      <span class="auto-complete-title">You won!</span>
      <button class="auto-complete-btn" @click="${this.startAutoComplete}" title="Auto complete remaining cards (A)">
        Auto complete (A)
      </button>
    </div>
    `;
  }

  renderHeader(): TemplateResult {
    return html`
    <header>
      <div class="header-title">
        <h1>Solitaire</h1>
      </div>
      <div class="actions">
        <button class="btn btn-hint" @click="${this.showHint}" title="Show Hint (H)">
          ${lightbulb} <span class="btn-label">Hint</span>
        </button>
        <button 
          class="btn btn-undo" 
          @click="${this.handleUndo}" 
          title="Undo last move (U or Ctrl+Z)"
          ?disabled="${this.game.moves.length === 0}"
        >
          ${undo} <span class="btn-label">Undo</span>
        </button>
        <button 
          class="btn btn-redo" 
          @click="${this.handleRedo}" 
          title="Redo move (Ctrl+Y, Ctrl+Shift+Z, or Y)"
          ?disabled="${this.game.redoMoves.length === 0}"
        >
          ${redo} <span class="btn-label">Redo</span>
        </button>
        <button class="btn desktop-only" @click="${this.toggleSound}" title="${this.soundMuted ? 'Unmute sound (M)' : 'Mute sound (M)'}">
          ${this.soundMuted ? volumeOff : volumeUp}
        </button>
        <button class="btn desktop-only" @click="${this.startGame}" title="Start a new game (N)">
          ${refresh} <span class="btn-label">New Game</span>
        </button>
        <button class="btn desktop-only" @click="${this.toggleHighScores}" title="Top Scores (L)">
          ${trophy} <span class="btn-label">Scores</span>
        </button>
        <button class="btn desktop-only" @click="${this.toggleSettings}" title="Game Settings (S)">
          ${settings} <span class="btn-label">Settings</span>
        </button>
        <button class="btn btn-menu mobile-only" @click="${this.toggleMobileMenu}" title="Game Menu">
          ${menu} <span class="btn-label">Menu</span>
        </button>
      </div>
    </header>
    `;
  }

  renderFooter(): TemplateResult {
    const formattedScore = this.score.getFormattedScore();
    const scoreClass = this.score.getScoreClass();
    const elapsedTime = this.score.getElapsedTime();
    const { length } = this.game.moves;
    const isVegas = this.scoringMode === 'vegas';

    return html`
    <footer>
      <div class="score">
        <div class="score-item">
          <span class="score-label">Moves:</span>
          <span class="score-val">${length}</span>
        </div>
        <div class="score-item">
          <span class="score-label">${isVegas ? (this.vegasCumulative ? 'Bankroll:' : 'Vegas:') : 'Score:'}</span>
          <span class="score-val ${scoreClass}">${formattedScore}</span>
        </div>
        ${isVegas ? html`
        <div class="score-item">
          <span class="score-label">Pass:</span>
          <span class="score-val">${this.game.deckPasses} of ${this.game.getMaxPasses()}</span>
        </div>
        ` : ''}
        <div class="score-item">
          <span class="score-label">Time:</span>
          <span class="score-val">${elapsedTime}</span>
        </div>
      </div>
    </footer>
    `;
  }

  renderBoard(): TemplateResult {
    return html`
    <main>
      <div class="foundation">
        ${this.renderStock()}
        ${this.renderWaste()}
        <div class="foundation-pile spacer"></div>
        ${this.renderFoundations()}
      </div>
      <div class="tableau">
        ${this.renderTableaus()}
      </div>
    </main>
    ${this.isGameWon() ? this.renderWinModal() : ''}
    `;
  }

  renderStock(): TemplateResult {
    const { deck } = this.game;
    const isEmpty = deck.empty();
    const isExhausted = isEmpty && !this.game.canRecycleWaste();
    const isHintStock = this.activeHint?.type === 'deal-stock';
    const classes = {
      'deck-pile': true,
      pile: true,
      stock: true,
      single: true,
      exhausted: isExhausted,
      'hint-pulse': isHintStock,
    };
    const title = isExhausted
      ? 'Pass limit reached (no more deals)'
      : (isEmpty ? 'Recycle cards back to stock (Space or D)' : 'Deal cards (Space or D)');

    return html`
    <div class="${classMap(classes)}" @click="${this.handleDeckClick}" title="${title}">
      ${isEmpty ? this.renderEmptySlot() : this.renderCardBack()}
    </div>
    `;
  }

  renderWaste(): TemplateResult {
    const { waste } = this.game;
    const isEmpty = waste.length === 0;
    const isDraw3 = this.drawCount === 3;
    const classes = {
      'deck-pile': true,
      pile: true,
      waste: true,
      single: !isDraw3,
      'draw-3': isDraw3,
    };
    return html`
    <div class="${classMap(classes)}" data-source="waste" data-index="-1">
      ${isEmpty ? this.renderEmptySlot() : this.renderWasteCards(waste)}
    </div>
    `;
  }

  renderWasteCards(cards: Card[]): TemplateResult[] {
    if (this.drawCount === 1) {
      return this.renderCards('waste', cards);
    }
    const total = cards.length;
    const visibleCount = Math.min(total, 3);
    const startIndex = total - visibleCount;

    return cards.map((card, index) => {
      if (index < startIndex) {
        return html`<div id="${card.id}" style="display: none;"></div>`;
      }
      const fanOffset = index - startIndex;
      const isTop = index === total - 1;
      return this.renderCard('waste', index, card, { fanOffset, isTop });
    });
  }

  renderFoundations(): TemplateResult[] {
    const { foundation } = this.game;
    return foundation.map((pile, index) => this.renderFoundation(pile, index));
  }

  renderFoundation(foundation: CardStack, pileIndex: number): TemplateResult {
    const isEmpty = foundation.cards.length === 0;
    const { hovered } = this;
    const isHovered = Boolean(hovered && hovered.source === 'foundation' && hovered.index === pileIndex);
    const isValidTarget = this.showDropHighlights && this.validTargets.some(t => t.source === 'foundation' && t.index === pileIndex);
    const isHintTarget = Boolean(
      this.activeHint && 
      this.activeHint.to.pile === 'foundation' && 
      this.activeHint.to.pileIndex === pileIndex && 
      isEmpty
    );
    const classes = {
      'foundation-pile': true,
      pile: true,
      single: true,
      hovered: isHovered,
      'valid-target': isValidTarget,
      'hint-target': isHintTarget,
    };
    return html`
    <div class="${classMap(classes)}" data-source="foundation" data-index="${pileIndex}">
      ${isEmpty ? this.renderEmptySlot() : this.renderCards('foundation', foundation.cards, { pileIndex })}
    </div>
    `;
  }

  renderTableaus(): TemplateResult[] {
    const { tableau } = this.game;
    return tableau.map((pile, index) => this.renderTableau(pile, index));
  }

  renderTableau(tableau: CardStack, pileIndex: number): TemplateResult {
    const isEmpty = tableau.cards.length === 0;
    const { hovered } = this;
    const isHovered = Boolean(hovered && hovered.source === 'tableau' && hovered.index === pileIndex);
    const isValidTarget = this.showDropHighlights && this.validTargets.some(t => t.source === 'tableau' && t.index === pileIndex);
    const isHintTarget = Boolean(
      this.activeHint && 
      this.activeHint.to.pile === 'tableau' && 
      this.activeHint.to.pileIndex === pileIndex && 
      isEmpty
    );
    const classes = {
      'tableau-pile': true,
      pile: true,
      multi: true,
      hovered: isHovered,
      'valid-target': isValidTarget,
      'hint-target': isHintTarget,
    };
    return html`
    <div 
      class="${classMap(classes)}" 
      data-source="tableau" 
      data-index="${pileIndex}"
    >
      ${isEmpty ? this.renderEmptySlot() : this.renderCards('tableau', tableau.cards, { pileIndex })}
    </div>
    `;
  }

  renderCards(source: CardSources, cards: Card[], opts?: { pileIndex?: number }): TemplateResult[] {
    return cards.map((card, index) => this.renderCard(source, index, card, opts));
  }

  renderCard(source: CardSources, index: number, card: Card, opts: { pileIndex?: number; fanOffset?: number; isTop?: boolean } = {}): TemplateResult {
    if (!card.faceUp) {
      return this.renderCardBack(card.id);
    }
    const { rank, suit, id } = card;
    const { pileIndex = -1, fanOffset, isTop } = opts;
    const label = rankToLabel(rank);
    const isHintSource = this.activeHint?.cardId === id;
    const isHintTarget = this.activeHint?.targetCardId === id;
    const isCourt = isCourtCard(rank);
    const classes = {
      'card-front': true,
      'is-court': isCourt,
      'hint-source': isHintSource,
      'hint-target': isHintTarget,
    };
    return html`
    <div 
      id="${id}"
      class="${classMap(classes)}"
      data-rank="${rank}" 
      data-suit="${suit}" 
      data-label="${label}"
      data-source="${source}"
      data-index="${index}"
      data-pile-index="${pileIndex}"
      data-fan-offset="${fanOffset !== undefined ? fanOffset : ''}"
      data-is-top="${isTop !== undefined ? String(isTop) : ''}"
      @pointerdown="${this.handleCardPointerDown}"
    >
      ${isCourt ? html`<div class="graphic"></div>` : this.renderCardPips(suit, rank)}
      ${this.renderCorners(suit, label)}
    </div>
    `;
  }

  renderCorners(suit: Suit, label: string): TemplateResult {
    const suitIcon = renderSuitSvg(suit, 'corner-suit');
    return html`
      <div class="corner top-left">
        <span class="corner-rank">${label}</span>
        ${suitIcon}
      </div>
      <div class="corner bottom-right">
        <span class="corner-rank">${label}</span>
        ${suitIcon}
      </div>
    `;
  }

  renderCardPips(suit: Suit, rank: Rank): TemplateResult {
    const pips = getPipPositions(rank);
    return html`
      <div class="card-pips">
        ${pips.map(p => html`
          <div 
            class="pip ${p.large ? 'large' : ''} ${p.flip ? 'flipped' : ''}" 
            style="left: ${p.x}%; top: ${p.y}%;"
          >
            ${renderSuitSvg(suit, 'pip-svg')}
          </div>
        `)}
      </div>
    `;
  }

  renderCardBack(id?: string): TemplateResult {
    return html`
    <div class="card-back" id="${id ? id : ''}">
      <div class="graphic"></div>
    </div>
    `;
  }

  renderEmptySlot(): TemplateResult {
    return html`
    <div class="empty-slot"></div>
    `;
  }

  renderHintToast(): TemplateResult {
    return html`
    <div class="hint-toast">
      ${lightbulb}
      <span>${this.hintToastMessage}</span>
    </div>
    `;
  }

  renderWinModal(): TemplateResult {
    const formattedScore = this.score.getFormattedScore();
    const scoreClass = this.score.getScoreClass();
    const elapsedTime = this.score.getElapsedTime();
    const { length } = this.game.moves;
    const isVegas = this.scoringMode === 'vegas';
    const bonus = this.score.lastAwardedBonus;

    return html`
    <div class="win-modal">
      <div class="win-card">
        <div class="win-title">You Won!</div>
        <p>Congratulations! You solved the Solitaire puzzle.</p>
        <div class="win-stats">
          <div>
            <div class="win-stat-val ${scoreClass}">${formattedScore}</div>
            <div class="win-stat-lbl">
              ${isVegas ? (this.vegasCumulative ? 'Bankroll' : 'Winnings') : 'Score'}
              ${!isVegas && bonus > 0 ? html`<div class="win-bonus-tag" style="font-size: 0.72rem; color: #34d399; font-weight: 600; margin-top: 3px;">+${bonus.toLocaleString()} time bonus</div>` : ''}
            </div>
          </div>
          <div>
            <div class="win-stat-val">${length}</div>
            <div class="win-stat-lbl">Moves</div>
          </div>
          <div>
            <div class="win-stat-val">${elapsedTime}</div>
            <div class="win-stat-lbl">Time</div>
          </div>
        </div>
        <div class="leaderboard-section">
          <div class="leaderboard-title">${trophy} Top Scores (${isVegas ? 'Vegas' : 'Standard'})</div>
          ${this.renderLeaderboardTable(this.winLeaderboardData)}
        </div>
        <button class="win-btn" @click="${this.startGame}">Play Again</button>
      </div>
    </div>
    `;
  }

  renderMobileMenuDrawer(): TemplateResult {
    return html`
    <div class="mobile-drawer-backdrop" @click="${(e: MouseEvent) => { if (e.target === e.currentTarget) this.toggleMobileMenu(); }}">
      <div class="mobile-drawer">
        <div class="drawer-handle"></div>
        <div class="drawer-header">
          <h2 class="drawer-title">Game Menu</h2>
          <button class="drawer-close-btn" @click="${this.toggleMobileMenu}" title="Close Menu">
            ${close}
          </button>
        </div>
        <div class="drawer-menu-list">
          <button class="drawer-menu-item" @click="${() => { this.startGame(); this.toggleMobileMenu(); }}">
            <span class="drawer-item-icon">${refresh}</span>
            <div class="drawer-item-content">
              <span class="drawer-item-title">New Game</span>
              <span class="drawer-item-desc">Deal a fresh deck (${this.difficulty})</span>
            </div>
          </button>
          <button class="drawer-menu-item" @click="${() => { this.toggleMobileMenu(); this.toggleSettings(); }}">
            <span class="drawer-item-icon">${settings}</span>
            <div class="drawer-item-content">
              <span class="drawer-item-title">Settings & Modes</span>
              <span class="drawer-item-desc">Difficulty, Vegas rules, bankroll</span>
            </div>
          </button>
          <button class="drawer-menu-item" @click="${() => { this.toggleMobileMenu(); this.toggleHighScores(); }}">
            <span class="drawer-item-icon">${trophy}</span>
            <div class="drawer-item-content">
              <span class="drawer-item-title">Leaderboard & Stats</span>
              <span class="drawer-item-desc">View high scores and win history</span>
            </div>
          </button>
          <button class="drawer-menu-item" @click="${() => this.toggleSound()}">
            <span class="drawer-item-icon">${this.soundMuted ? volumeOff : volumeUp}</span>
            <div class="drawer-item-content">
              <span class="drawer-item-title">Sound Effects</span>
              <span class="drawer-item-desc">${this.soundMuted ? 'Muted — Tap to enable sound' : 'Active — Tap to mute'}</span>
            </div>
            <span class="drawer-status-pill ${this.soundMuted ? 'muted' : 'active'}">
              ${this.soundMuted ? 'OFF' : 'ON'}
            </span>
          </button>
          ${this.canAutoComplete() ? html`
          <button class="drawer-menu-item auto-complete" @click="${() => { this.toggleMobileMenu(); this.startAutoComplete(); }}">
            <span class="drawer-item-icon">${bolt}</span>
            <div class="drawer-item-content">
              <span class="drawer-item-title">Auto-Complete</span>
              <span class="drawer-item-desc">Cascade all cards to foundations</span>
            </div>
          </button>
          ` : ''}
        </div>
      </div>
    </div>
    `;
  }

  renderSettingsModal(): TemplateResult {
    return html`
    <div class="settings-modal" @click="${(e: MouseEvent) => { if (e.target === e.currentTarget) this.toggleSettings(); }}">
      <div class="settings-card">
        <div class="settings-header">
          <h2 class="settings-title">${settings} Settings</h2>
          <button class="settings-close-btn" @click="${this.toggleSettings}" title="Close Settings">
            ${close}
          </button>
        </div>
        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Difficulty</span>
              <span class="setting-desc">Easy (Curated flow), Medium (Balanced), or Hard (Pure random)</span>
            </div>
            <div class="mode-selector">
              <button 
                class="mode-btn ${this.difficulty === 'easy' ? 'active' : ''}" 
                @click="${() => this.setDifficulty('easy')}"
              >
                Easy
              </button>
              <button 
                class="mode-btn ${this.difficulty === 'medium' ? 'active' : ''}" 
                @click="${() => this.setDifficulty('medium')}"
              >
                Medium
              </button>
              <button 
                class="mode-btn ${this.difficulty === 'hard' ? 'active' : ''}" 
                @click="${() => this.setDifficulty('hard')}"
              >
                Hard
              </button>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Scoring Mode</span>
              <span class="setting-desc">Standard (Points) or Vegas Rules (-$52 wager, +$5/card)</span>
            </div>
            <div class="mode-selector">
              <button 
                class="mode-btn ${this.scoringMode === 'standard' ? 'active' : ''}" 
                @click="${() => this.setScoringMode('standard')}"
              >
                Standard
              </button>
              <button 
                class="mode-btn ${this.scoringMode === 'vegas' ? 'active' : ''}" 
                @click="${() => this.setScoringMode('vegas')}"
              >
                Vegas
              </button>
            </div>
          </div>
          ${this.scoringMode === 'vegas' ? html`
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Cumulative Bankroll</span>
              <span class="setting-desc">Carry over bankroll across games (Current: ${this.score.vegasBankroll < 0 ? `-$${Math.abs(this.score.vegasBankroll)}` : `$${this.score.vegasBankroll}`})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${this.vegasCumulative && this.score.vegasBankroll !== 0 ? html`
                <button class="btn-reset-bankroll" @click="${this.resetBankroll}" title="Reset cumulative bankroll to $0">
                  Reset
                </button>
              ` : ''}
              <label class="switch">
                <input 
                  type="checkbox" 
                  .checked="${this.vegasCumulative}" 
                  @change="${(e: Event) => this.setVegasCumulative((e.target as HTMLInputElement).checked)}" 
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          ` : ''}
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Draw Mode</span>
              <span class="setting-desc">Draw 1 card (casual) or 3 cards (classic challenge)</span>
            </div>
            <div class="mode-selector">
              <button 
                class="mode-btn ${this.drawCount === 1 ? 'active' : ''}" 
                @click="${() => this.setDrawCount(1)}"
              >
                Draw 1
              </button>
              <button 
                class="mode-btn ${this.drawCount === 3 ? 'active' : ''}" 
                @click="${() => this.setDrawCount(3)}"
              >
                Draw 3
              </button>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Highlight Drop Targets</span>
              <span class="setting-desc">Glow valid destination piles when dragging cards</span>
            </div>
            <label class="switch">
              <input 
                type="checkbox" 
                .checked="${this.showDropHighlights}" 
                @change="${this.handleHighlightToggle}" 
              />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item shortcuts-section">
            <div class="setting-info">
              <span class="setting-label">Keyboard Shortcuts</span>
              <span class="setting-desc">Quick controls for keyboard users</span>
            </div>
            <div class="shortcuts-grid">
              <div class="shortcut-item">
                <span class="shortcut-desc">Show Hint</span>
                <span class="shortcut-keys"><kbd>H</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Deal Stock</span>
                <span class="shortcut-keys"><kbd>Space</kbd> / <kbd>D</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Undo Move</span>
                <span class="shortcut-keys"><kbd>Ctrl+Z</kbd> / <kbd>U</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Redo Move</span>
                <span class="shortcut-keys"><kbd>Ctrl+Y</kbd> / <kbd>Y</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">New Game</span>
                <span class="shortcut-keys"><kbd>N</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Mute / Unmute</span>
                <span class="shortcut-keys"><kbd>M</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Leaderboard</span>
                <span class="shortcut-keys"><kbd>L</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Settings</span>
                <span class="shortcut-keys"><kbd>S</kbd></span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-desc">Auto Complete</span>
                <span class="shortcut-keys"><kbd>A</kbd></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  toggleHighScores(): void {
    this.showHighScores = !this.showHighScores;
    if (this.showHighScores) {
      this.showMobileMenu = false;
      this.showSettings = false;
      this.highScoresTab = this.scoringMode;
      this.score.pauseTimer();
      this.loadHighScoresData();
    } else if (!document.hidden && document.hasFocus() && !this.isGameWon() && !this.showSettings && !this.showMobileMenu) {
      this.score.resumeTimer();
    }
  }

  async loadHighScoresData(): Promise<void> {
    try {
      this.highScoresData = await scoreHistory.getLeaderboard(this.highScoresTab, this.latestWinRecordId);
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to load high scores from IndexedDB:', err);
    }
  }

  setHighScoresTab(mode: ScoringMode): void {
    if (this.highScoresTab === mode) return;
    this.highScoresTab = mode;
    this.loadHighScoresData();
  }

  renderLeaderboardTable(data: ILeaderboardData | null): TemplateResult {
    if (!data) {
      return html`<div class="leaderboard-empty">Loading top scores...</div>`;
    }
    if (data.topRecords.length === 0) {
      return html`<div class="leaderboard-empty">No completed games recorded yet. Solve a puzzle to make the leaderboard!</div>`;
    }

    const formatScore = (rec: IRankedScoreRecord): string => {
      if (rec.scoringMode === 'vegas') {
        if (rec.score > 0) return `+$${rec.score}`;
        if (rec.score < 0) return `-$${Math.abs(rec.score)}`;
        return `$0`;
      }
      return `${rec.score.toLocaleString()} pts`;
    };

    const formatDate = (timestamp: number): string => {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const renderRow = (rec: IRankedScoreRecord) => {
      const badgeClass = rec.rank === 1 ? 'top-1' : rec.rank === 2 ? 'top-2' : rec.rank === 3 ? 'top-3' : '';
      return html`
      <tr class="leaderboard-row ${rec.isCurrent ? 'current' : ''}">
        <td>
          <span class="rank-badge ${badgeClass}">${rec.rank}</span>
          ${rec.isCurrent ? html`<span class="current-tag">Current</span>` : ''}
        </td>
        <td class="num">${formatScore(rec)}</td>
        <td class="num">${rec.elapsedTime}</td>
        <td class="num">${rec.moves}</td>
        <td class="num">${formatDate(rec.date)}</td>
      </tr>
      `;
    };

    const showSeparateCurrent = data.currentRecord && data.currentRank && data.currentRank > 10;

    return html`
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th class="num">Score</th>
          <th class="num">Time</th>
          <th class="num">Moves</th>
          <th class="num">Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.topRecords.map(rec => renderRow(rec))}
        ${showSeparateCurrent ? html`
        <tr class="leaderboard-divider-row">
          <td colspan="5">
            <div class="leaderboard-divider"><span>···</span></div>
          </td>
        </tr>
        ${renderRow(data.currentRecord!)}
        ` : ''}
      </tbody>
    </table>
    `;
  }

  renderHighScoresModal(): TemplateResult {
    return html`
    <div class="highscores-modal" @click="${(e: MouseEvent) => { if (e.target === e.currentTarget) this.toggleHighScores(); }}">
      <div class="highscores-card">
        <div class="highscores-header">
          <h2 class="highscores-title">${trophy} Top Scores</h2>
          <button class="settings-close-btn" @click="${this.toggleHighScores}" title="Close">
            ${close}
          </button>
        </div>
        <div class="highscores-toolbar">
          <div class="mode-selector">
            <button 
              class="mode-btn ${this.highScoresTab === 'standard' ? 'active' : ''}" 
              @click="${() => this.setHighScoresTab('standard')}">
              Standard
            </button>
            <button 
              class="mode-btn ${this.highScoresTab === 'vegas' ? 'active' : ''}" 
              @click="${() => this.setHighScoresTab('vegas')}">
              Vegas
            </button>
          </div>
          ${this.highScoresData && this.highScoresData.totalCount > 0 ? html`
            <span style="font-size: 0.78rem; opacity: 0.75;">${this.highScoresData.totalCount} won ${this.highScoresData.totalCount === 1 ? 'game' : 'games'}</span>
          ` : ''}
        </div>
        <div class="highscores-content">
          ${this.renderLeaderboardTable(this.highScoresData)}
        </div>
      </div>
    </div>
    `;
  }
}
