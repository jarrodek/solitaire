import { Card, Suit, Rank } from "./Card.js";

export class Deck {
  stock: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.stock = [];
    const ranks = Object.values(Rank);
    const suits = Object.values(Suit);

    for (const rank of ranks) {
      for (const suit of suits) {
        this.stock.push(new Card(suit, rank));
      }
    }
  }

  shuffle(): void {
    const { stock: cards } = this;
    const cp = Array.from(cards);
    for (let i = cp.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cp[i], cp[j]] = [cp[j], cp[i]];
    }
    this.stock = cp;
  }

  deal(): Card | null {
    if (this.stock.length > 0) {
      return this.stock.pop()!;
    } else {
      return null;
    }
  }

  getCards(): Card[] {
    return this.stock;
  }

  /**
   * Tests whether the deck is empty.
   */
  empty(): boolean {
    return this.stock.length === 0;
  }
}
