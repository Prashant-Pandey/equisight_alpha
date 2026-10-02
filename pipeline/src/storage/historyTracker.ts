import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import type { CoverageRecord } from '../types.js';

export class CoverageHistoryTracker {
  private filePath: string;
  private records: Map<string, CoverageRecord> = new Map();

  constructor(filePath = CONFIG.HISTORY_FILE) {
    this.filePath = filePath;
    this.init();
  }

  private init(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: CoverageRecord[] = JSON.parse(raw);
        for (const record of list) {
          this.records.set(record.ticker.toUpperCase(), record);
        }
      } else {
        // Initialize with empty array
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (error) {
      console.error('[CoverageHistoryTracker] Failed to initialize history:', error);
      this.records = new Map();
    }
  }

  /**
   * Checks if a ticker is eligible for coverage under the trailing 12-month exclusion rule.
   * If covered within the last 365 days, returns false.
   */
  public isEligible(ticker: string): boolean {
    const symbol = ticker.toUpperCase();
    const existing = this.records.get(symbol);
    if (!existing) {
      return true;
    }

    const coveredDate = new Date(existing.coveredAt).getTime();
    const now = Date.now();
    const elapsedDays = (now - coveredDate) / (1000 * 60 * 60 * 24);

    return elapsedDays >= CONFIG.COVERAGE_LOCKOUT_DAYS;
  }

  /**
   * Record new coverage for a ticker. Updates local memory and persists to disk.
   */
  public async recordCoverage(record: CoverageRecord): Promise<void> {
    const symbol = record.ticker.toUpperCase();
    this.records.set(symbol, {
      ...record,
      ticker: symbol,
      coveredAt: new Date().toISOString()
    });

    await this.persist();
  }

  /**
   * Saves records atomically to prevent race conditions or partial file corruption.
   */
  private async persist(): Promise<void> {
    const recordsArray = Array.from(this.records.values());
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;

    await fs.promises.writeFile(tempPath, JSON.stringify(recordsArray, null, 2), 'utf-8');
    await fs.promises.rename(tempPath, this.filePath);
  }

  /**
   * Retrieve count and list of active locked-out tickers.
   */
  public getLockedCount(): number {
    let count = 0;
    const now = Date.now();
    for (const record of this.records.values()) {
      const elapsedDays = (now - new Date(record.coveredAt).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsedDays < CONFIG.COVERAGE_LOCKOUT_DAYS) {
        count++;
      }
    }
    return count;
  }

  public getAllRecords(): CoverageRecord[] {
    return Array.from(this.records.values());
  }
}

export const historyTracker = new CoverageHistoryTracker();
