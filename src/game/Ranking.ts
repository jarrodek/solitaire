import { Rank, Card } from "../cards/Card.js";
/**
 * Represents a stack of cards in Solitaire.
 */
export interface CardStack {
  cards: Card[];
  faceUp: boolean;
}

/**
   * Gets the rank one below the given rank.
   *
   * @param rank - The rank to get the rank below.
   * @returns The rank below the given rank, or null if there is no rank below.
   */
export function getRankBelow(rank: Rank): Rank | null {
  switch (rank) {
    case Rank.Ace:
      return null;
    case Rank.Two:
      return Rank.Ace;
    case Rank.Three:
      return Rank.Two;
    case Rank.Four:
      return Rank.Three;
    case Rank.Five:
      return Rank.Four;
    case Rank.Six:
      return Rank.Five;
    case Rank.Seven:
      return Rank.Six;
    case Rank.Eight:
      return Rank.Seven;
    case Rank.Nine:
      return Rank.Eight;
    case Rank.Ten:
      return Rank.Nine;
    case Rank.Jack:
      return Rank.Ten;
    case Rank.Queen:
      return Rank.Jack;
    case Rank.King:
      return Rank.Queen;
  }
}

/**
 * Gets the rank one above the given rank.
 *
 * @param rank - The rank to get the rank above.
 * @returns The rank above the given rank, or null if there is no rank above.
 */
export function getRankAbove(rank: Rank): Rank | null {
  switch (rank) {
    case Rank.Ace:
      return Rank.Two;
    case Rank.Two:
      return Rank.Three;
    case Rank.Three:
      return Rank.Four;
    case Rank.Four:
      return Rank.Five;
    case Rank.Five:
      return Rank.Six;
    case Rank.Six:
      return Rank.Seven;
    case Rank.Seven:
      return Rank.Eight;
    case Rank.Eight:
      return Rank.Nine;
    case Rank.Nine:
      return Rank.Ten;
    case Rank.Ten:
      return Rank.Jack;
    case Rank.Jack:
      return Rank.Queen;
    case Rank.Queen:
      return Rank.King;
    case Rank.King:
      return null;
  }
}
