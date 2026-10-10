/**
 * Peer equity quote fetching (market cap, P/E, EV/EBITDA, ROIC).
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { CONFIG } from '../../config.js';
import { getYahooAuth } from './yahooAuth.js';
import type { LivePeerData } from './types.js';

export async function fetchPeerQuotes(symbols: string[]): Promise<Record<string, LivePeerData>> {
  const result: Record<string, LivePeerData> = {};
  if (!symbols.length) return result;

  try {
    const auth = await getYahooAuth();
    const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).join(',');
    const url = auth
      ? `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(cleanSymbols)}&crumb=${encodeURIComponent(auth.crumb)}`
      : `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(cleanSymbols)}`;
    const res = await fetchWithRetry(url, {
      timeoutMs: 5000,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...(auth?.cookie ? { 'Cookie': auth.cookie } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      const list = data?.quoteResponse?.result || [];
      for (const item of list) {
        if (item.symbol) {
          const sym = item.symbol.toUpperCase();
          result[sym] = {
            price: item.regularMarketPrice ?? 0,
            name: item.shortName || item.longName || sym,
            trailingPE: (typeof item.trailingPE === 'number' && item.trailingPE > 0)
              ? parseFloat(item.trailingPE.toFixed(1))
              : undefined,
            forwardPE: (typeof item.forwardPE === 'number' && item.forwardPE > 0)
              ? parseFloat(item.forwardPE.toFixed(1))
              : undefined,
            marketCap: typeof item.marketCap === 'number' ? item.marketCap : 0,
            evToEbitda: (typeof item.enterpriseToEbitda === 'number' && item.enterpriseToEbitda > 0)
              ? parseFloat(item.enterpriseToEbitda.toFixed(1))
              : undefined,
            roic: undefined
          };
        }
      }
    }
  } catch {}

  // Enrich peer EV/EBITDA and ROIC via Finnhub metrics when available
  if (CONFIG.FINNHUB_API_KEY) {
    const symbolsToEnrich = symbols.slice(0, 4);
    await Promise.allSettled(
      symbolsToEnrich.map(async (sym) => {
        const clean = sym.trim().toUpperCase();
        try {
          const mUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(clean)}&metric=all&token=${CONFIG.FINNHUB_API_KEY}`;
          const mRes = await fetchWithRetry(mUrl, { timeoutMs: 3000, retries: 1 });
          if (mRes.ok) {
            const mData = await mRes.json();
            const metric = mData?.metric;
            if (metric) {
              if (!result[clean]) {
                result[clean] = {
                  price: 0,
                  name: clean,
                  marketCap: typeof metric.marketCapitalization === 'number' ? metric.marketCapitalization * 1e6 : 0
                };
              }
              if (result[clean].evToEbitda === undefined && typeof metric.evEbitdaTTM === 'number') {
                result[clean].evToEbitda = parseFloat(metric.evEbitdaTTM.toFixed(1));
              }
              if (result[clean].trailingPE === undefined && typeof metric.peTTM === 'number') {
                result[clean].trailingPE = parseFloat(metric.peTTM.toFixed(1));
              }
              if (result[clean].roic === undefined) {
                if (typeof metric.roiTTM === 'number') {
                  result[clean].roic = parseFloat(metric.roiTTM.toFixed(1));
                } else if (typeof metric.roeTTM === 'number') {
                  result[clean].roic = parseFloat(metric.roeTTM.toFixed(1));
                }
              }
            }
          }
        } catch {}
      })
    );
  }

  return result;
}
