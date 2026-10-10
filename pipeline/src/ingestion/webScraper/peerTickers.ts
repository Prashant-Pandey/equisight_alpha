/**
 * Peer equity ticker discovery via Finnhub peers API and Yahoo recommendations.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { CONFIG } from '../../config.js';
import { getYahooAuth } from './yahooAuth.js';

export async function fetchPeerTickers(ticker: string, sector?: string): Promise<string[]> {
  const cleanTicker = ticker.split('.')[0].trim().toUpperCase();
  const candidatePeers: string[] = [];

  // 1. Primary Source: Finnhub Peers API (Official stock peer endpoint)
  if (CONFIG.FINNHUB_API_KEY) {
    try {
      const url = `https://finnhub.io/api/v1/stock/peers?symbol=${encodeURIComponent(cleanTicker)}&token=${CONFIG.FINNHUB_API_KEY}`;
      const res = await fetchWithRetry(url, { timeoutMs: 3500, retries: 1 });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const sym of list) {
            if (typeof sym === 'string') {
              const s = sym.trim().toUpperCase();
              if (s && s !== cleanTicker && !s.includes('.') && !candidatePeers.includes(s)) {
                candidatePeers.push(s);
              }
            }
          }
        }
      }
    } catch {}
  }

  if (candidatePeers.length >= 3) {
    return candidatePeers.slice(0, 5);
  }

  // 2. Secondary Source: Yahoo Finance Recommendations / Similar Equities API
  try {
    const auth = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(cleanTicker)}`;
    const res = await fetchWithRetry(url, {
      timeoutMs: 3500,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...(auth?.cookie ? { 'Cookie': auth.cookie } : {})
      }
    });
    if (res.ok) {
      const json = await res.json();
      const recList = json?.finance?.result?.[0]?.recommendedSymbols || [];
      for (const item of recList) {
        const sym = typeof item?.symbol === 'string' ? item.symbol.trim().toUpperCase() : '';
        if (sym && sym !== cleanTicker && !sym.includes('=') && !candidatePeers.includes(sym)) {
          candidatePeers.push(sym);
        }
      }
    }
  } catch {}

  return candidatePeers.slice(0, 5);
}
