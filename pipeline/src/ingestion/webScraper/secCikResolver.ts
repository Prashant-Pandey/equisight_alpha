/**
 * SEC EDGAR CIK resolver with in-memory caching.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { CONFIG } from '../../config.js';

let secTickerCache: Map<string, string> | null = null;

export async function resolveSecCik(cleanTicker: string): Promise<string | null> {
  const userAgent = CONFIG.SEC_EDGAR_USER_AGENT || 'EquiSightResearch admin@equisight-alpha.com';

  if (!secTickerCache) {
    secTickerCache = new Map();
    try {
      const dirRes = await fetchWithRetry('https://www.sec.gov/files/company_tickers.json', {
        retries: 2,
        timeoutMs: 10000,
        headers: { 'User-Agent': userAgent }
      });
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        for (const key in dirData) {
          const item = dirData[key];
          if (item?.ticker && item?.cik_str) {
            secTickerCache.set(item.ticker.toUpperCase(), item.cik_str.toString().padStart(10, '0'));
          }
        }
      }
    } catch {
      // Allow fallback if lookup fails
    }
  }

  return secTickerCache.get(cleanTicker) || null;
}
