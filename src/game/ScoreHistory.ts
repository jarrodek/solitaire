import { ScoringMode } from './Score.js';
import { GameDifficulty } from './Difficulty.js';

export interface IScoreRecord {
  id?: number;
  score: number;
  moves: number;
  timeMs: number;
  elapsedTime: string;
  scoringMode: ScoringMode;
  difficulty: GameDifficulty;
  drawCount: 1 | 3;
  date: number; // timestamp
  timeBonus?: number;
}

export interface IRankedScoreRecord extends IScoreRecord {
  rank: number;
  isCurrent?: boolean;
}

export interface ILeaderboardData {
  topRecords: IRankedScoreRecord[];
  currentRank?: number;
  currentRecord?: IRankedScoreRecord;
  totalCount: number;
}

const DB_NAME = 'solitaire_db';
const DB_VERSION = 2;
const STORE_NAME = 'scores';

export class ScoreHistory {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          // Compound index for filtering by mode and ordering by score
          store.createIndex('mode_score', ['scoringMode', 'score'], { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        if (event.oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const store = tx.objectStore(STORE_NAME);
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              const rec = cursor.value as IScoreRecord;
              if (rec.scoringMode === 'standard' && rec.score < 2000 && !rec.timeBonus && rec.timeMs > 0) {
                const sec = Math.floor(rec.timeMs / 1000);
                const bonus = Math.floor(700000 / Math.max(30, sec));
                rec.score += bonus;
                rec.timeBonus = bonus;
                cursor.update(rec);
              }
              cursor.continue();
            }
          };
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Adds a won game record to IndexedDB.
   * Returns the generated record ID.
   */
  async addRecord(record: Omit<IScoreRecord, 'id'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves the top N records for a given scoring mode (default 10),
   * ordered descending by score (with tie-breaker: timeMs asc, moves asc).
   */
  async getTopScores(mode: ScoringMode, limit: number = 10): Promise<IScoreRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('mode_score');

      // Bound range for the specified scoring mode
      const range = IDBKeyRange.bound(
        [mode, -Number.MAX_SAFE_INTEGER],
        [mode, Number.MAX_SAFE_INTEGER]
      );

      const records: IScoreRecord[] = [];
      const req = index.openCursor(range, 'prev');

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && records.length < limit) {
          records.push(cursor.value);
          cursor.continue();
        } else {
          // Tie-break equal scores: faster timeMs first, then fewer moves, then earlier date
          records.sort((a, b) => b.score - a.score || a.timeMs - b.timeMs || a.moves - b.moves || a.date - b.date);
          resolve(records.slice(0, limit));
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Calculates the 1-based rank of a specific game record among won games of the same mode.
   * Uses IndexedDB's B-tree index to count strictly higher scores without loading full rows,
   * plus inspects equal scores for tie-breaking.
   */
  async getRank(record: IScoreRecord): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('mode_score');

      // Count scores strictly higher than record.score
      const higherRange = IDBKeyRange.bound(
        [record.scoringMode, record.score],
        [record.scoringMode, Number.MAX_SAFE_INTEGER],
        true, // lowerOpen = true: strictly greater
        false
      );
      const higherCountReq = index.count(higherRange);

      // Check equal scores for tie-breaking
      const equalRange = IDBKeyRange.bound(
        [record.scoringMode, record.score],
        [record.scoringMode, record.score]
      );
      const equalReq = index.getAll(equalRange);

      tx.oncomplete = () => {
        const strictlyHigher = higherCountReq.result || 0;
        const equalScores: IScoreRecord[] = equalReq.result || [];
        let betterTies = 0;
        for (const item of equalScores) {
          if (item.id === record.id) continue;
          if (item.timeMs < record.timeMs) {
            betterTies++;
          } else if (item.timeMs === record.timeMs && item.moves < record.moves) {
            betterTies++;
          } else if (item.timeMs === record.timeMs && item.moves === record.moves && item.date < record.date) {
            betterTies++;
          }
        }
        resolve(strictlyHigher + betterTies + 1);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Generates leaderboard data for the specified mode.
   * If currentRecordId is provided:
   * - If within the top 10, marks that entry with isCurrent: true.
   * - If outside top 10 (e.g. 15th), includes top 10 plus currentRecord with rank 15.
   */
  async getLeaderboard(mode: ScoringMode, currentRecordId?: number): Promise<ILeaderboardData> {
    const top = await this.getTopScores(mode, 10);
    const db = await this.getDB();

    const totalCount: number = await new Promise((res, rej) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const range = IDBKeyRange.bound(
        [mode, -Number.MAX_SAFE_INTEGER],
        [mode, Number.MAX_SAFE_INTEGER]
      );
      const req = tx.objectStore(STORE_NAME).index('mode_score').count(range);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    let currentRank: number | undefined;
    let currentRecord: IRankedScoreRecord | undefined;
    let currentFoundInTop = false;

    const topRecords: IRankedScoreRecord[] = top.map((rec, idx) => {
      const isCurr = rec.id === currentRecordId;
      if (isCurr) {
        currentFoundInTop = true;
        currentRank = idx + 1;
        currentRecord = { ...rec, rank: idx + 1, isCurrent: true };
      }
      return {
        ...rec,
        rank: idx + 1,
        isCurrent: isCurr,
      };
    });

    if (currentRecordId && !currentFoundInTop) {
      const fullRecord: IScoreRecord | undefined = await new Promise((res, rej) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(currentRecordId);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });

      if (fullRecord) {
        currentRank = await this.getRank(fullRecord);
        currentRecord = { ...fullRecord, rank: currentRank, isCurrent: true };
      }
    }

    return {
      topRecords,
      currentRank,
      currentRecord,
      totalCount,
    };
  }

  /**
   * Clears all score history from IndexedDB.
   */
  async clearHistory(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const scoreHistory = new ScoreHistory();
