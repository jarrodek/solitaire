import { Card, Rank } from "../cards/Card.js";
import { Deck } from "../cards/Deck.js";
import { getRankAbove, getRankBelow, CardStack } from "./Ranking.js";
import { ScoringMode } from "./Score.js";
import { GameDifficulty, generateDifficultyDeck } from "./Difficulty.js";

export type IndexedCardSources = 'tableau' | 'foundation';
export type NonIndexedCardSources = 'waste';
export type CardSources = IndexedCardSources | NonIndexedCardSources;
export type AllCardSources = CardSources | 'stock';

export interface ICardLocation {
  pile: AllCardSources;
  pileIndex: number;
  cardIndex: number;
}

export interface IMove {
  from: ICardLocation;
  to: ICardLocation;
  /**
   * The number of cards moved.
   */
  numCards: number;
  /**
   * Whether a card was flipped with this move.
   */
  flipped: boolean;
}

export interface IMoveResult {
  /**
   * Whether the card(s) was moved.
   * The card won't be moved if the move is illegal.
   */
  moved: boolean;
  /**
   * Whether the move caused a new card to be flipped 
   * revealing the face.
   */
  newFlipped: boolean;
}

/**
 * The main logic class for the Solitaire game.
 */
export class Solitaire {
  /**
   * The current deck of cards.
   */
  deck = new Deck();

  /**
   * The tableau stacks of cards.
   * An array of CardStack objects representing the seven tableau piles.
   */
  tableau: CardStack[] = [];

  /**
   * The waste pile.
   * An array of Card objects representing the waste pile.
   */
  waste: Card[] = [];

  /**
   * Number of cards to draw at a time from stock (1 or 3).
   */
  drawCount: 1 | 3 = 1;

  /**
   * Scoring mode: 'standard' or 'vegas'.
   */
  scoringMode: ScoringMode = (localStorage.getItem('solitaire_scoring_mode') as ScoringMode) || 'standard';

  /**
   * Difficulty level: 'easy', 'medium', or 'hard' (pure random).
   */
  difficulty: GameDifficulty = (localStorage.getItem('solitaire_difficulty') as GameDifficulty) || 'easy';

  /**
   * Current pass number through the stock deck.
   */
  deckPasses = 1;

  /**
   * The foundation piles.
   * An array of CardStack objects representing the four foundation piles.
   */
  foundation: CardStack[] = [];

  graph = new Map<string, ICardLocation>();

  moves: IMove[] = [];

  redoMoves: IMove[] = [];

  constructor() {
    this.start();
  }

  getMaxPasses(): number {
    if (this.scoringMode === 'vegas') {
      return this.drawCount === 3 ? 3 : 1;
    }
    return Infinity;
  }

  canRecycleWaste(): boolean {
    return this.scoringMode !== 'vegas' || this.deckPasses < this.getMaxPasses();
  }

  start(): void {
    this.graph.clear();
    this.tableau = [];
    this.waste = [];
    this.foundation = [];
    this.moves = [];
    this.redoMoves = [];
    this.deckPasses = 1;
    this.deck = this.createDeck();
    this.initializeGame();
  }

  /**
   * Creates a deck of cards based on the selected difficulty level.
   */
  createDeck(): Deck {
    return generateDifficultyDeck(this.difficulty);
  }

  /**
   * Initializes the game by dealing cards to the tableau and foundation.
   */
  initializeGame(): void {
    // Initialize tableau stacks
    for (let i = 0; i < 7; i++) {
      this.tableau.push({ cards: [], faceUp: false });
      for (let j = 0; j <= i; j++) {
        const card = this.deck.deal()!;
        this.tableau[i].cards.push(card);
        this.graph.set(card.id, {
          pile: 'tableau',
          pileIndex: i,
          cardIndex: j,
        });
        if (j === i) {
          this.tableau[i].cards[j].faceUp = true;
        }
      }
    }

    // Initialize foundation piles
    for (let i = 0; i < 4; i++) {
      this.foundation.push({ cards: [], faceUp: true });
    }
    this.deck.stock.forEach((card, index) => {
      this.graph.set(card.id, {
        pile: 'stock',
        pileIndex: 0,
        cardIndex: index,
      });
    });
  }

  /**
   * Deals cards (1 or 3 based on drawCount) from the stock to the waste pile.
   */
  deal(): void {
    this.redoMoves = [];
    if (!this.deck.empty()) {
      const count = Math.min(this.drawCount, this.deck.stock.length);
      for (let i = 0; i < count; i++) {
        const card = this.deck.deal();
        if (card) {
          card.faceUp = true;
          this.waste.push(card);
          this.graph.set(card.id, {
            pile: 'waste',
            pileIndex: -1,
            cardIndex: this.waste.length - 1,
          });
        }
      }
      this.moves.push({
        from: { pile: 'stock', pileIndex: 0, cardIndex: this.deck.stock.length },
        to: { pile: 'waste', pileIndex: -1, cardIndex: this.waste.length - 1 },
        numCards: count,
        flipped: false,
      });
    } else if (this.waste.length > 0 && this.canRecycleWaste()) {
      // If the stock is empty, move the waste pile back to the stock
      this.deckPasses++;
      const count = this.waste.length;
      const cards = this.waste.reverse();
      cards.forEach((card, index) => {
        card.faceUp = false;
        this.graph.set(card.id, {
          pile: 'stock',
          pileIndex: 0,
          cardIndex: index,
        });
      });
      this.deck.stock = cards;
      this.waste = [];
      this.moves.push({
        from: { pile: 'waste', pileIndex: -1, cardIndex: 0 },
        to: { pile: 'stock', pileIndex: 0, cardIndex: 0 },
        numCards: count,
        flipped: false,
      });
    }
  }

  getPileCards(source: CardSources | 'stock', index: number): Card[] | undefined {
    switch (source) {
      case 'stock': return this.deck.stock;
      case 'foundation': return this.foundation[index]?.cards;
      case 'tableau': return this.tableau[index]?.cards;
      case 'waste': return this.waste;
      default: return undefined;
    }
  }

  isValidMove(cardInfo: ICardLocation, destination: IndexedCardSources, destinationIndex: number): boolean {
    if (cardInfo.pile === 'stock') {
      // stock cards cannot be moved.
      return false;
    }

    if (cardInfo.pile === 'waste') {
      if (cardInfo.cardIndex !== this.waste.length - 1) {
        return false;
      }
      const card = this.waste[cardInfo.cardIndex];
      if (!card) {
        return false;
      }
      if (destination === 'tableau') {
        return this.isValidMoveToTableau(card, destinationIndex);
      }
      return this.isValidMoveToFoundation(card, destinationIndex);
    }
    const sourcePile = this.getPileCards(cardInfo.pile, cardInfo.pileIndex);
    if (!sourcePile) {
      return false;
    }
    const card = sourcePile[cardInfo.cardIndex];
    if (!card) {
      return false;
    }
    if (destination === 'tableau') {
      return this.isValidMoveToTableau(card, destinationIndex);
    }
    return this.isValidMoveToFoundation(card, destinationIndex);
  }

  getCard(cardInfo: ICardLocation): Card | undefined {
    const pile = this.getPileCards(cardInfo.pile, cardInfo.pileIndex);
    if (!pile) {
      return undefined;
    }
    return pile[cardInfo.cardIndex];
  }

  isLast(cardInfo: ICardLocation): boolean {
    const pile = this.getPileCards(cardInfo.pile, cardInfo.pileIndex);
    if (!pile) {
      return false;
    }
    return cardInfo.cardIndex === pile.length - 1;
  }

  /**
   * Checks if a move from the waste pile to a tableau stack is valid.
   *
   * @param card - The card to move.
   * @param index - The destination stack's index.
   * @returns True if the move is valid, false otherwise.
   */
  isValidMoveToTableau(card: Card, index: number): boolean {
    const stack = this.tableau[index];
    if (!stack) {
      return false;
    }
    if (stack.cards.length === 0) {
      // Empty tableau stack, only Kings are allowed.
      return card.rank === Rank.King;
    }
    // Non-empty tableau stack
    const topCard = stack.cards[stack.cards.length - 1];
    if (!card.isAlternateSuit(topCard)) {
      return false;
    }
    // if the top card is one rank above the `card` then it is allowed.
    return card.rank === getRankBelow(topCard.rank);
  }

  /**
   * Checks if a move from the waste pile to a foundation stack is valid.
   *
   * @param card - The card to move.
   * @param index - The foundation stack's index.
   * @returns True if the move is valid, false otherwise.
   */
  isValidMoveToFoundation(card: Card, index: number): boolean {
    const stack = this.foundation[index];
    if (!stack) {
      return false;
    }
    if (stack.cards.length === 0) {
      // Empty foundation stack, only Aces are allowed.
      return card.rank === Rank.Ace;
    }
    // Non-empty foundation stack
    const topCard = stack.cards[stack.cards.length - 1];
    // must be the same suit
    if (!card.equalSuit(topCard)) {
      return false;
    }
    // if the top card is one rank below the `card` then it is allowed.
    return card.rank === getRankAbove(topCard.rank);
  }

  moveCard(cardInfo: ICardLocation, destination: IndexedCardSources, destinationIndex: number): IMoveResult {
    this.redoMoves = [];
    const result: IMoveResult = {
      moved: false,
      newFlipped: false,
    };
    const sourcePile = this.getPileCards(cardInfo.pile, cardInfo.pileIndex);
    const destinationPile = this.getPileCards(destination, destinationIndex);
    if (!sourcePile || !destinationPile) {
      return result;
    }
    const card = sourcePile.splice(cardInfo.cardIndex, 1)[0];
    if (!card) {
      return result;
    }
    result.moved = true;
    destinationPile.push(card);
    this.graph.set(card.id, {
      pile: destination,
      pileIndex: destinationIndex,
      cardIndex: destinationPile.length - 1,
    });
    const len = sourcePile.length;
    // If the source stack is a tableau stack, flip the next card face up
    if (len > 0 && !sourcePile[len - 1].faceUp) {
      sourcePile[len - 1].faceUp = true;
      result.newFlipped = true;
    }

    this.moves.push({
      from: { ...cardInfo },
      to: { pile: destination, pileIndex: destinationIndex, cardIndex: destinationPile.length - 1 },
      numCards: 1,
      flipped: result.newFlipped,
    });
    return result;
  }

  moveCards(sourceTableau: number, destinationTableau: number, cardIndex: number): IMoveResult {
    this.redoMoves = [];
    const result: IMoveResult = {
      moved: false,
      newFlipped: false,
    };
    const src = this.tableau[sourceTableau];
    const dest = this.tableau[destinationTableau];
    if (!src || !dest) {
      return result;
    }
    if (cardIndex < 0 || cardIndex >= src.cards.length) {
      return result;
    }
    result.moved = true;
    const cardsToMove = src.cards.splice(cardIndex);
    const lastIndex = dest.cards.length;
    dest.cards.push(...cardsToMove);
    // Flip the next card face up in the source stack
    const len = src.cards.length;
    if (len > 0 && !src.cards[len - 1].faceUp) {
      src.cards[len - 1].faceUp = true;
      result.newFlipped = true;
    }
    cardsToMove.forEach((card, index) => {
      this.graph.set(card.id, {
        pile: 'tableau',
        pileIndex: destinationTableau,
        cardIndex: lastIndex + index,
      });
    });
    this.moves.push({
      from: { pile: 'tableau', pileIndex: sourceTableau, cardIndex },
      to: { pile: 'tableau', pileIndex: destinationTableau, cardIndex: lastIndex },
      numCards: cardsToMove.length,
      flipped: result.newFlipped,
    });
    return result;
  }

  /**
   * Checks if the user has won the game.
   *
   * @returns True if the user has won, false otherwise.
   */
  hasWon(): boolean {
    // Check if all foundation piles are complete (Ace to King)
    for (const foundationPile of this.foundation) {
      if (
        foundationPile.cards.length !== 13 ||
        foundationPile.cards[0].rank !== Rank.Ace ||
        foundationPile.cards[foundationPile.cards.length - 1].rank !== Rank.King
      ) {
        return false;
      }
    }

    // If all foundation piles are complete, the user has won
    return true;
  }

  /**
   * Undoes the last move.
   */
  undo(): IMove | undefined {
    if (this.moves.length === 0) {
      return undefined;
    }

    const move = this.moves.pop()!;
    this.redoMoves.push(move);
    const { from, to, numCards, flipped } = move;

    // Case 1: Undoing a waste recycle back to stock
    if (from.pile === 'waste' && to.pile === 'stock') {
      this.deckPasses = Math.max(1, this.deckPasses - 1);
      const cards = this.deck.stock.splice(0, this.deck.stock.length).reverse();
      cards.forEach((card, index) => {
        card.faceUp = true;
        this.graph.set(card.id, {
          pile: 'waste',
          pileIndex: -1,
          cardIndex: index,
        });
      });
      this.waste = cards;
      return move;
    }

    // Case 2: Undoing a deal from stock to waste (1 or 3 cards)
    if (from.pile === 'stock' && to.pile === 'waste') {
      const count = numCards || 1;
      for (let i = 0; i < count; i++) {
        const card = this.waste.pop();
        if (card) {
          card.faceUp = false;
          this.deck.stock.push(card);
          this.graph.set(card.id, {
            pile: 'stock',
            pileIndex: 0,
            cardIndex: this.deck.stock.length - 1,
          });
        }
      }
      return move;
    }

    // Case 3: Regular card(s) move (Tableau, Foundation, Waste)
    const sourcePile = this.getPileCards(to.pile, to.pileIndex);
    const destPile = this.getPileCards(from.pile, from.pileIndex);
    if (!sourcePile || !destPile) {
      return move;
    }

    const startIndex = sourcePile.length - numCards;
    if (startIndex < 0) {
      return move;
    }
    const cardsToMove = sourcePile.splice(startIndex, numCards);

    // If the move previously revealed/flipped a card in the source pile, flip it back down
    if (flipped && destPile.length > 0) {
      destPile[destPile.length - 1].faceUp = false;
    }

    const destStartIndex = destPile.length;
    destPile.push(...cardsToMove);

    cardsToMove.forEach((card, index) => {
      this.graph.set(card.id, {
        pile: from.pile,
        pileIndex: from.pileIndex,
        cardIndex: destStartIndex + index,
      });
    });

    return move;
  }

  /**
   * Redoes the last undone move.
   */
  redo(): IMove | undefined {
    if (this.redoMoves.length === 0) {
      return undefined;
    }

    const move = this.redoMoves.pop()!;
    const { from, to, numCards, flipped } = move;

    // Case 1: Redoing a waste recycle back to stock
    if (from.pile === 'waste' && to.pile === 'stock') {
      this.deckPasses++;
      const count = this.waste.length;
      const cards = this.waste.reverse();
      cards.forEach((card, index) => {
        card.faceUp = false;
        this.graph.set(card.id, {
          pile: 'stock',
          pileIndex: 0,
          cardIndex: index,
        });
      });
      this.deck.stock = cards;
      this.waste = [];
      this.moves.push(move);
      return move;
    }

    // Case 2: Redoing a deal from stock to waste (1 or 3 cards)
    if (from.pile === 'stock' && to.pile === 'waste') {
      const count = numCards || 1;
      for (let i = 0; i < count; i++) {
        const card = this.deck.deal();
        if (card) {
          card.faceUp = true;
          this.waste.push(card);
          this.graph.set(card.id, {
            pile: 'waste',
            pileIndex: -1,
            cardIndex: this.waste.length - 1,
          });
        }
      }
      this.moves.push(move);
      return move;
    }

    // Case 3: Regular card(s) move from source to destination
    const sourcePile = this.getPileCards(from.pile, from.pileIndex);
    const destPile = this.getPileCards(to.pile, to.pileIndex);
    if (!sourcePile || !destPile) {
      return move;
    }

    const startIndex = from.cardIndex >= 0 && from.cardIndex < sourcePile.length
      ? from.cardIndex
      : sourcePile.length - numCards;
    if (startIndex < 0) {
      return move;
    }

    const cardsToMove = sourcePile.splice(startIndex, numCards);
    const destStartIndex = destPile.length;
    destPile.push(...cardsToMove);

    // If this move revealed a face-down card in the source pile, re-flip it face up
    const len = sourcePile.length;
    if (flipped && len > 0) {
      sourcePile[len - 1].faceUp = true;
    }

    cardsToMove.forEach((card, index) => {
      this.graph.set(card.id, {
        pile: to.pile,
        pileIndex: to.pileIndex,
        cardIndex: destStartIndex + index,
      });
    });

    this.moves.push(move);
    return move;
  }
}
