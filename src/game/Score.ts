import { AllCardSources, IMoveResult } from "./Solitaire.js";

export type ScoringMode = 'standard' | 'vegas';

/**
 * A class that keeps user score for the game.
 */
export class Score {
  /**
   * Scoring mode: 'standard' or 'vegas'.
   */
  scoringMode: ScoringMode = (localStorage.getItem('solitaire_scoring_mode') as ScoringMode) || 'standard';

  /**
   * In Vegas mode, whether the bankroll carries over across consecutive games.
   */
  vegasCumulative: boolean = localStorage.getItem('solitaire_vegas_cumulative') === 'true';

  /**
   * The cumulative Vegas bankroll.
   */
  vegasBankroll: number = Number(localStorage.getItem('solitaire_vegas_bankroll')) || 0;

  /**
   * The current user score.
   */
  current = 0;

  /**
   * The timestamp when the first move was made.
   */
  startTime: number | null = null;

  /**
   * The timestamp when the game was won/ended.
   */
  endTime: number | null = null;

  /**
   * The timestamp when the timer was paused.
   */
  pausedAt: number | null = null;

  /**
   * Total accumulated paused duration in milliseconds.
   */
  totalPausedTime = 0;

  /**
   * Whether the timer is currently paused.
   */
  isPaused = false;

  setScoringMode(mode: ScoringMode): void {
    this.scoringMode = mode;
    localStorage.setItem('solitaire_scoring_mode', mode);
  }

  setVegasCumulative(enabled: boolean): void {
    this.vegasCumulative = enabled;
    localStorage.setItem('solitaire_vegas_cumulative', String(enabled));
  }

  resetBankroll(): void {
    this.vegasBankroll = 0;
    localStorage.setItem('solitaire_vegas_bankroll', '0');
  }

  saveBankroll(): void {
    localStorage.setItem('solitaire_vegas_bankroll', String(this.vegasBankroll));
  }

  startTimer(): void {
    if (!this.startTime) {
      this.startTime = Date.now();
      this.endTime = null;
      this.pausedAt = null;
      this.totalPausedTime = 0;
      this.isPaused = false;
    } else if (this.isPaused) {
      this.resumeTimer();
    }
  }

  pauseTimer(): void {
    if (this.startTime && !this.endTime && !this.isPaused) {
      this.isPaused = true;
      this.pausedAt = Date.now();
    }
  }

  resumeTimer(): void {
    if (this.startTime && !this.endTime && this.isPaused) {
      if (this.pausedAt) {
        this.totalPausedTime += Date.now() - this.pausedAt;
        this.pausedAt = null;
      }
      this.isPaused = false;
    }
  }

  stopTimer(): void {
    if (this.startTime && !this.endTime) {
      if (this.isPaused && this.pausedAt) {
        this.totalPausedTime += Date.now() - this.pausedAt;
        this.pausedAt = null;
        this.isPaused = false;
      }
      this.endTime = Date.now();
    }
  }

  reset(): void {
    if (this.scoringMode === 'vegas') {
      this.current = -52;
      if (this.vegasCumulative) {
        this.vegasBankroll -= 52;
        this.saveBankroll();
      }
    } else {
      this.current = 0;
    }
    this.startTime = null;
    this.endTime = null;
    this.pausedAt = null;
    this.totalPausedTime = 0;
    this.isPaused = false;
  }

  /**
   * Gets effective elapsed time in milliseconds, subtracting paused periods.
   */
  getElapsedMs(): number {
    if (!this.startTime) {
      return 0;
    }
    const currentPaused = (this.isPaused && this.pausedAt) ? (Date.now() - this.pausedAt) : 0;
    const end = this.endTime ?? Date.now();
    return Math.max(0, end - this.startTime - this.totalPausedTime - currentPaused);
  }

  /**
   * Gets the elapsed time since the game started, formatted as HH:MM:SS.
   * Paused intervals and inactive window/tab periods are subtracted.
   * @returns The elapsed time as a string.
   */
  getElapsedTime(): string {
    const effectiveElapsedMs = this.getElapsedMs();
    const totalSeconds = Math.floor(effectiveElapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number): string => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Updates the user score after a move.
   * @param from The from pile
   * @param to The target pile
   * @param moveResult The result of moving a card.
   */
  update(from: AllCardSources, to: AllCardSources, moveResult: IMoveResult): void {
    if (moveResult.moved) {
      this.startTimer();
    }
    const points = this.computeMovePoints(from, to, moveResult);
    this.current += points;
    if (this.scoringMode === 'standard') {
      this.current = Math.max(0, this.current);
    } else if (this.scoringMode === 'vegas' && this.vegasCumulative) {
      this.vegasBankroll += points;
      this.saveBankroll();
    }
  }

  reduce(from: AllCardSources, to: AllCardSources, moveResult: IMoveResult): void {
    const points = this.computeMovePoints(from, to, moveResult);
    this.current -= points;
    if (this.scoringMode === 'standard') {
      this.current = Math.max(0, this.current);
    } else if (this.scoringMode === 'vegas' && this.vegasCumulative) {
      this.vegasBankroll -= points;
      this.saveBankroll();
    }
  }

  /**
   * The scoring system:
   * 
   * Standard scoring:
   * - Stock to tableau: 5 points
   * - Tableau to foundation: 10 points
   * - Turn over tableau card: 5 points
   * - Foundation back to tableau: -15 points
   * 
   * Vegas scoring:
   * - Each card moved to Foundation: +$5
   * - Card moved from Foundation back to Tableau: -$5
   * - Other moves: $0
   * 
   * @param from The from pile
   * @param to The target pile
   * @param moveResult The result of moving a card.
   */
  computeMovePoints(from: AllCardSources, to: AllCardSources, moveResult: IMoveResult): number {
    if (!moveResult.moved) {
      return 0;
    }
    if (this.scoringMode === 'vegas') {
      if (to === 'foundation') {
        return 5;
      }
      if (from === 'foundation' && to === 'tableau') {
        return -5;
      }
      return 0;
    }

    let result = 0;
    if (from === 'waste' && to === 'tableau') {
      result = 5;
    } else if (from === 'waste' && to === 'foundation') {
      result = 10;
    } else if (from === 'tableau' && to === 'foundation') {
      result = 10;
      if (moveResult.newFlipped) {
        result += 5;
      }
    } else if (from === 'tableau' && moveResult.newFlipped) {
      result = 5;
    } else if (from === 'foundation' && to === 'tableau') {
      result = -15;
    }
    return result;
  }

  /**
   * Formats current score/bankroll for UI display.
   */
  getFormattedScore(): string {
    if (this.scoringMode === 'vegas') {
      const val = this.vegasCumulative ? this.vegasBankroll : this.current;
      if (val < 0) {
        return `-$${Math.abs(val)}`;
      }
      if (val > 0) {
        return `+$${val}`;
      }
      return `$0`;
    }
    return String(this.current);
  }

  getScoreClass(): 'positive' | 'negative' | 'neutral' {
    if (this.scoringMode === 'vegas') {
      const val = this.vegasCumulative ? this.vegasBankroll : this.current;
      if (val > 0) return 'positive';
      if (val < 0) return 'negative';
      return 'neutral';
    }
    return 'neutral';
  }
}

