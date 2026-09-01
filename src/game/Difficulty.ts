import { Card, Rank } from "../cards/Card.js";
import { Deck } from "../cards/Deck.js";
import { getRankAbove } from "./Ranking.js";

export type GameDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Maps the 28 cards dealt to the 7 tableau columns:
 * Array of { col: number, faceUp: boolean, depth: number }
 */
interface IDealSlot {
  col: number;
  faceUp: boolean;
  depth: number;
}

const TABLEAU_SLOTS: IDealSlot[] = [];
for (let c = 0; c < 7; c++) {
  for (let r = 0; r <= c; r++) {
    TABLEAU_SLOTS.push({
      col: c,
      faceUp: r === c,
      depth: c - r, // 0 = faceUp top card, 1..6 = faceDown depth
    });
  }
}

/**
 * Rates the difficulty of a dealt deck (52 cards in order they are popped from deck.stock).
 * Lower score = easier, higher score = harder.
 */
export function rateDeal(cards: Card[]): number {
  let penalty = 0;

  // 1. Evaluate Tableau cards (first 28 cards popped from stock)
  const faceUpCards: Card[] = [];
  for (let i = 0; i < 28; i++) {
    const slot = TABLEAU_SLOTS[i];
    const card = cards[51 - i]; // deck.deal() pops from the end of stock
    if (slot.faceUp) {
      faceUpCards.push(card);
      if (card.rank === Rank.Ace) {
        penalty -= 8;
      } else if (card.rank === Rank.Two) {
        penalty -= 4;
      }
    } else {
      // Face-down cards
      if (card.rank === Rank.Ace) {
        penalty += slot.depth * 5; // Deep Aces are very punishing
      } else if (card.rank === Rank.Two) {
        penalty += slot.depth * 3;
      } else if (card.rank === Rank.King) {
        if (slot.depth === slot.col) {
          // King at very bottom of column
          penalty -= 3;
        } else {
          penalty += slot.depth * 2;
        }
      }
    }
  }

  // 2. Evaluate Stock cards (cards[0..23])
  for (let i = 0; i < 24; i++) {
    const card = cards[23 - i];
    if (card.rank === Rank.Ace) {
      penalty += Math.floor(i / 3);
    }
  }

  // 3. Initial Mobility among face-up cards
  let initialMoves = 0;
  for (let i = 0; i < faceUpCards.length; i++) {
    const c1 = faceUpCards[i];
    if (c1.rank === Rank.Ace) {
      initialMoves += 2;
    }
    for (let j = 0; j < faceUpCards.length; j++) {
      if (i === j) continue;
      const c2 = faceUpCards[j];
      if (c1.isAlternateSuit(c2) && c2.rank === getRankAbove(c1.rank)) {
        initialMoves++;
      }
    }
  }

  penalty -= (initialMoves * 4);

  return penalty;
}

/**
 * Generates a Deck tailored to the requested difficulty level.
 */
export function generateDifficultyDeck(difficulty: GameDifficulty): Deck {
  const deck = new Deck();
  deck.shuffle();

  if (difficulty === 'hard') {
    // 100% Pure random Fisher-Yates shuffle
    return deck;
  }

  // For Easy and Medium, score candidate shuffles and select one matching difficulty targets
  const maxAttempts = 150;
  let bestDeck = deck;
  let bestScoreDiff = Infinity;

  // Target scores: Easy <= 12, Medium ~ 20..50
  const targetScore = difficulty === 'easy' ? 0 : 35;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = new Deck();
    candidate.shuffle();
    const score = rateDeal(candidate.stock);

    if (difficulty === 'easy' && score <= 12) {
      return candidate;
    }
    if (difficulty === 'medium' && score >= 20 && score <= 50) {
      return candidate;
    }

    const diff = Math.abs(score - targetScore);
    if (diff < bestScoreDiff) {
      bestScoreDiff = diff;
      bestDeck = candidate;
    }
  }

  return bestDeck;
}
