import { Rank } from "../cards/Card.js";

export function rankToLabel(rank: Rank): string {
  switch (rank) {
    case Rank.Ace: return 'A';
    case Rank.Jack: return 'J';
    case Rank.Queen: return 'Q';
    case Rank.King: return 'K';
    default: return rank;
  }
}
