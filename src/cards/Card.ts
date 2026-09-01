export enum Suit {
  Hearts = "Hearts",
  Diamonds = "Diamonds",
  Clubs = "Clubs",
  Spades = "Spades",
}

export enum Rank {
  Ace = "Ace",
  Two = "2",
  Three = "3",
  Four = "4",
  Five = "5",
  Six = "6",
  Seven = "7",
  Eight = "8",
  Nine = "9",
  Ten = "10",
  Jack = "Jack",
  Queen = "Queen",
  King = "King",
}

export class Card {
  faceUp = false;

  /**
   * Cards random id.
   */
  id: string;
  
  constructor(public suit: Suit, public rank: Rank, id: string = crypto.randomUUID()) {
    // numeric ids are not allowed so prefix them with a character
    this.id = `c${id}`;
  }

  toString(): string {
    return `${this.rank} of ${this.suit}`;
  }

  /**
   * Checks whether the passed `card` has equal suit as this card.
   * 
   * @param card The card to compare.
   * @return True when both cards has equal suit.
   */
  equalSuit(card: Card): boolean {
    return this.suit === card.suit;
  }

  /**
   * @param card The card to compare.
   * @returns True when the suit has a different color to the passed card.
   */
  isAlternateSuit(card: Card): boolean {
    if ([Suit.Hearts, Suit.Diamonds].includes(this.suit)) {
      return [Suit.Clubs, Suit.Spades].includes(card.suit);
    } else {
      return [Suit.Hearts, Suit.Diamonds].includes(card.suit);
    }
  }

  /**
   * Checks whether the passed `card` has equal rank as this card.
   * 
   * @param card The card to compare.
   * @return True when both cards has equal ranks.
   */
  equalRank(card: Card): boolean {
    return this.rank === card.rank;
  }

  /**
   * Checks whether the current card has a lower rank than the passed `card`.
   * Note on implementation: In the ordered Rank array (Ace=0, King=12), this evaluates
   * whether this card's rank index is greater than the other card's rank index.
   * In Klondike Solitaire tableau rules, a descending sequence is built (e.g., a lower-ranked
   * card can be placed upon a card of next rank above).
   * 
   * @param card The card to compare.
   * @return True when this card has a lower rank than the passed `card`.
   */
  lowerRankTo(card: Card): boolean {
    if (this.equalRank(card)) {
      return false;
    }
    const ordered = Object.values(Rank);
    const myIndex = ordered.indexOf(this.rank);
    const otherIndex = ordered.indexOf(card.rank);
    return myIndex > otherIndex;
  }

  /**
   * Checks whether the current card has a higher rank than the passed `card`.
   * Evaluates the inverse of `lowerRankTo()`.
   * 
   * @param card The card to compare.
   * @return True when this card has a higher rank than the passed `card`.
   */
  higherRankTo(card: Card): boolean {
    if (this.equalRank(card)) {
      return false;
    }
    return !this.lowerRankTo(card);
  }
}

