import { Card, Rank } from '../cards/Card.js';
import { CardStack, getRankAbove, getRankBelow } from './Ranking.js';
import { ICardLocation, IndexedCardSources, Solitaire } from './Solitaire.js';

export interface MoveSuggestion {
  target: CardStack;
  type: 'tableau' | 'foundation';
  index: number;
}

export function suggestMoves(pickedCard: Card, tableau: CardStack[], foundation: CardStack[]): MoveSuggestion[] {
  const suggestions: MoveSuggestion[] = [];
  
  // 1. Foundation
  foundation.forEach((pile, i) => {
    const { cards } = pile;
    if (cards.length === 0) {
      // Empty slot, only aces are allowed
      if (pickedCard.rank === Rank.Ace) {
        suggestions.push({
          target: pile,
          type: 'foundation',
          index: i,
        });
      }
      return;
    }
    const last = pile.cards[pile.cards.length - 1];
    // only accept the same suit.
    if (!pickedCard.equalSuit(last)) {
      return;
    }
    if (last.rank === getRankBelow(pickedCard.rank)) {
      // in the foundation stack, only allow cards that are one rank above the last card.
      suggestions.push({
        target: pile,
        type: 'foundation',
        index: i,
      });
    }
  });

  // 2. Tableau
  tableau.forEach((pile, i) => {
    if (pickedCard.rank === Rank.Ace) {  
      // Aces can only be moved to the foundation piles.
      return;
    }
    const { cards } = pile;
    if (cards.length === 0) {
      // Empty slot, only kings are allowed
      if (pickedCard.rank === Rank.King) {
        suggestions.push({
          target: pile,
          type: 'tableau',
          index: i,
        });
      }
      return;
    }
    const last = pile.cards[pile.cards.length - 1];
    if (!pickedCard.isAlternateSuit(last)) {
      return;
    }
    if (last.rank === getRankAbove(pickedCard.rank)) {
      // in the tableau stack, only allow cards that are one rank below the last card.
      suggestions.push({
        target: pile,
        type: 'tableau',
        index: i,
      });
    }
  });
  return suggestions;
}

export interface IHint {
  from: ICardLocation;
  to: {
    pile: IndexedCardSources | 'waste' | 'stock';
    pileIndex: number;
    cardIndex?: number;
  };
  cardId?: string;
  targetCardId?: string;
  message: string;
  type: 'tableau-to-foundation' | 'tableau-to-tableau' | 'waste-to-foundation' | 'waste-to-tableau' | 'deal-stock';
}

/**
 * Checks if a card can legally move to any Foundation pile.
 * Returns foundation index (0-3) or -1.
 */
function canCardGoToFoundation(card: Card, foundation: CardStack[]): number {
  for (let f = 0; f < 4; f++) {
    const fPile = foundation[f];
    if (fPile.cards.length === 0) {
      if (card.rank === Rank.Ace) return f;
    } else {
      const topF = fPile.cards[fPile.cards.length - 1];
      if (card.equalSuit(topF) && topF.rank === getRankBelow(card.rank)) {
        return f;
      }
    }
  }
  return -1;
}

/**
 * Checks if there is a King that would immediately benefit from an empty column:
 * - A King sitting atop the Waste pile, or
 * - A King in another Tableau column that is currently covering face-down cards.
 */
function hasAvailableKingToFillColumn(game: Solitaire, exceptTableauIndex?: number): boolean {
  if (game.waste.length > 0) {
    const topWaste = game.waste[game.waste.length - 1];
    if (topWaste.rank === Rank.King) {
      return true;
    }
  }

  for (let t = 0; t < game.tableau.length; t++) {
    if (t === exceptTableauIndex) continue;
    const pile = game.tableau[t];
    if (pile.cards.length <= 1) continue;

    for (let c = 1; c < pile.cards.length; c++) {
      const card = pile.cards[c];
      if (card.faceUp && card.rank === Rank.King && !pile.cards[c - 1].faceUp) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates whether a Tableau-to-Tableau move makes real game progress.
 * Prevents pointless lateral shuffling and loops.
 */
function evaluateTableauMove(
  game: Solitaire,
  srcT: number,
  cardIndex: number,
  destT: number
): { productive: boolean; score: number } {
  const srcPile = game.tableau[srcT];
  const destPile = game.tableau[destT];
  const movingCard = srcPile.cards[cardIndex];

  // 1. Anti-Ping-Pong: Do not suggest reversing the immediate previous move
  if (game.moves.length > 0) {
    const lastMove = game.moves[game.moves.length - 1];
    if (
      lastMove.from.pile === 'tableau' &&
      lastMove.from.pileIndex === destT &&
      lastMove.to.pile === 'tableau' &&
      lastMove.to.pileIndex === srcT
    ) {
      return { productive: false, score: 0 };
    }
  }

  // 2. Moving King from an already-cleared base to another empty slot is completely useless
  if (movingCard.rank === Rank.King && cardIndex === 0 && destPile.cards.length === 0) {
    return { productive: false, score: 0 };
  }

  // 3. Direct Revealer: The move directly uncovers a hidden face-down card
  const revealsFaceDown = cardIndex > 0 && !srcPile.cards[cardIndex - 1].faceUp;
  if (revealsFaceDown) {
    return { productive: true, score: 850 };
  }

  // 4. Strategic Column Clearance: Empties a column AND a King is waiting to use it
  const freesColumn = cardIndex === 0 && srcPile.cards.length > 0;
  if (freesColumn) {
    const kingWaiting = hasAvailableKingToFillColumn(game, srcT);
    if (kingWaiting) {
      return { productive: true, score: 750 };
    }
  }

  // 5. Lookahead check on the uncovered face-up card left at the top of srcPile
  const exposedCard = cardIndex > 0 ? srcPile.cards[cardIndex - 1] : undefined;
  if (exposedCard && exposedCard.faceUp) {
    // 5a. Can exposedCard now go to Foundation?
    const fIdx = canCardGoToFoundation(exposedCard, game.foundation);
    if (fIdx !== -1) {
      return { productive: true, score: 720 };
    }

    // 5b. Can Waste top card now be played onto exposedCard?
    if (game.waste.length > 0) {
      const topWaste = game.waste[game.waste.length - 1];
      if (
        topWaste.rank !== Rank.Ace &&
        topWaste.isAlternateSuit(exposedCard) &&
        exposedCard.rank === getRankAbove(topWaste.rank)
      ) {
        return { productive: true, score: 680 };
      }
    }

    // 5c. Can another Tableau column's sequence now move onto exposedCard and reveal a face-down card?
    for (let otherT = 0; otherT < game.tableau.length; otherT++) {
      if (otherT === srcT || otherT === destT) continue;
      const otherPile = game.tableau[otherT];
      for (let otherC = 1; otherC < otherPile.cards.length; otherC++) {
        const otherCard = otherPile.cards[otherC];
        if (
          otherCard.faceUp &&
          !otherPile.cards[otherC - 1].faceUp &&
          otherCard.isAlternateSuit(exposedCard) &&
          exposedCard.rank === getRankAbove(otherCard.rank)
        ) {
          return { productive: true, score: 700 };
        }
      }
    }
  }

  // 6. Lookahead check on the bottom of the moved sequence:
  // Does placing movingCard allow Waste to be played onto the tail card?
  const tailMovingCard = srcPile.cards[srcPile.cards.length - 1];
  if (game.waste.length > 0) {
    const topWaste = game.waste[game.waste.length - 1];
    if (
      topWaste.rank !== Rank.Ace &&
      topWaste.isAlternateSuit(tailMovingCard) &&
      tailMovingCard.rank === getRankAbove(topWaste.rank)
    ) {
      return { productive: true, score: 640 };
    }
  }

  // If no progress, unlocks, or hidden card reveals occur, discard as zero-progress
  return { productive: false, score: 0 };
}

/**
 * Scans the entire game board with strategic lookahead to find genuinely productive moves.
 * Eliminates zero-progress sideways shuffling.
 */
export function findBestHint(game: Solitaire): IHint | null {
  interface ScoredHint {
    hint: IHint;
    score: number;
  }
  const candidateHints: ScoredHint[] = [];
  const { tableau, foundation, waste, deck } = game;

  // 1. Check Tableau moves
  for (let srcT = 0; srcT < tableau.length; srcT++) {
    const srcPile = tableau[srcT];
    if (srcPile.cards.length === 0) continue;

    // A. Move top card to Foundation
    const topCard = srcPile.cards[srcPile.cards.length - 1];
    const topCardLoc = game.graph.get(topCard.id);
    if (topCardLoc) {
      for (let f = 0; f < 4; f++) {
        if (game.isValidMove(topCardLoc, 'foundation', f)) {
          const revealsFaceDown = srcPile.cards.length > 1 && !srcPile.cards[srcPile.cards.length - 2].faceUp;
          const isAceOrTwo = topCard.rank === Rank.Ace || topCard.rank === Rank.Two;
          let score = 900;
          if (revealsFaceDown) score += 200; // 1100 pts
          if (isAceOrTwo) score += 100;      // 1000 pts

          const targetPile = foundation[f];
          const targetCard = targetPile.cards.length > 0 ? targetPile.cards[targetPile.cards.length - 1] : undefined;

          candidateHints.push({
            score,
            hint: {
              from: topCardLoc,
              to: { pile: 'foundation', pileIndex: f },
              cardId: topCard.id,
              targetCardId: targetCard?.id,
              message: `Move ${topCard.toString()} to Foundation`,
              type: 'tableau-to-foundation',
            },
          });
        }
      }
    }

    // B. Move sequence to Tableau with strategic progress validation
    for (let cIdx = 0; cIdx < srcPile.cards.length; cIdx++) {
      const card = srcPile.cards[cIdx];
      if (!card.faceUp) continue;

      const cardLoc = game.graph.get(card.id);
      if (!cardLoc) continue;

      for (let destT = 0; destT < tableau.length; destT++) {
        if (destT === srcT) continue;
        const destPile = tableau[destT];

        if (game.isValidMove(cardLoc, 'tableau', destT)) {
          const evalResult = evaluateTableauMove(game, srcT, cIdx, destT);
          if (!evalResult.productive) {
            // Filter out zero-progress / dead-end move
            continue;
          }

          const targetCard = destPile.cards.length > 0 ? destPile.cards[destPile.cards.length - 1] : undefined;

          candidateHints.push({
            score: evalResult.score,
            hint: {
              from: cardLoc,
              to: { pile: 'tableau', pileIndex: destT },
              cardId: card.id,
              targetCardId: targetCard?.id,
              message: destPile.cards.length === 0
                ? `Move ${card.toString()} to empty column`
                : `Move ${card.toString()} onto ${targetCard?.toString()}`,
              type: 'tableau-to-tableau',
            },
          });
        }
      }
    }
  }

  // 2. Check Waste moves
  if (waste.length > 0) {
    const topWaste = waste[waste.length - 1];
    const wasteLoc = game.graph.get(topWaste.id);
    if (wasteLoc) {
      // A. Waste to Foundation
      for (let f = 0; f < 4; f++) {
        if (game.isValidMove(wasteLoc, 'foundation', f)) {
          const isAceOrTwo = topWaste.rank === Rank.Ace || topWaste.rank === Rank.Two;
          const score = isAceOrTwo ? 1000 : 920;
          const targetPile = foundation[f];
          const targetCard = targetPile.cards.length > 0 ? targetPile.cards[targetPile.cards.length - 1] : undefined;

          candidateHints.push({
            score,
            hint: {
              from: wasteLoc,
              to: { pile: 'foundation', pileIndex: f },
              cardId: topWaste.id,
              targetCardId: targetCard?.id,
              message: `Move ${topWaste.toString()} from Waste to Foundation`,
              type: 'waste-to-foundation',
            },
          });
        }
      }

      // B. Waste to Tableau
      for (let t = 0; t < tableau.length; t++) {
        if (game.isValidMove(wasteLoc, 'tableau', t)) {
          const destPile = tableau[t];
          const targetCard = destPile.cards.length > 0 ? destPile.cards[destPile.cards.length - 1] : undefined;

          // Waste to empty column is high value if it's a King
          let score = destPile.cards.length === 0 ? 750 : 660;

          // Check if playing this waste card unlocks a cascading reveal from another pile
          for (let otherT = 0; otherT < tableau.length; otherT++) {
            if (otherT === t) continue;
            const otherPile = tableau[otherT];
            for (let otherC = 1; otherC < otherPile.cards.length; otherC++) {
              const otherCard = otherPile.cards[otherC];
              if (
                otherCard.faceUp &&
                !otherPile.cards[otherC - 1].faceUp &&
                otherCard.isAlternateSuit(topWaste) &&
                topWaste.rank === getRankAbove(otherCard.rank)
              ) {
                score = 820; // High priority: directly unblocks a face-down card!
                break;
              }
            }
          }

          candidateHints.push({
            score,
            hint: {
              from: wasteLoc,
              to: { pile: 'tableau', pileIndex: t },
              cardId: topWaste.id,
              targetCardId: targetCard?.id,
              message: destPile.cards.length === 0 
                ? `Move ${topWaste.toString()} from Waste to empty column`
                : `Move ${topWaste.toString()} from Waste onto ${targetCard?.toString()}`,
              type: 'waste-to-tableau',
            },
          });
        }
      }
    }
  }

  // 3. Check Stock Deals:
  // If there are no productive candidate moves (or if stock has cards available), 
  // we add Stock Deal with score 500 so it beats any dead-ends.
  if (!deck.empty()) {
    candidateHints.push({
      score: 500,
      hint: {
        from: { pile: 'stock', pileIndex: 0, cardIndex: 0 },
        to: { pile: 'waste', pileIndex: -1, cardIndex: 0 },
        message: 'Deal cards from the Stock',
        type: 'deal-stock',
      },
    });
  } else if (waste.length > 0 && game.canRecycleWaste()) {
    candidateHints.push({
      score: 480,
      hint: {
        from: { pile: 'waste', pileIndex: -1, cardIndex: 0 },
        to: { pile: 'stock', pileIndex: 0, cardIndex: 0 },
        message: 'Recycle Waste back to Stock',
        type: 'deal-stock',
      },
    });
  }

  // Return highest-scored candidate move
  if (candidateHints.length > 0) {
    candidateHints.sort((a, b) => b.score - a.score);
    return candidateHints[0].hint;
  }

  return null;
}

