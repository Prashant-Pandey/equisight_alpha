/**
 * StockTwits public stream sentiment and theme scraper.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import type { StockIntelligenceScrapeResult } from './types.js';

export async function fetchStockTwitsSentiment(ticker: string): Promise<StockIntelligenceScrapeResult['stockTwits']> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  const url = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(cleanTicker)}.json`;

  let bullishCount = 0;
  let bearishCount = 0;
  let totalMessages = 0;
  const sampleMessages: string[] = [];
  const themes = new Set<string>();

  try {
    const res = await fetchWithRetry(url, { retries: 1, timeoutMs: 5000 });
    if (res.ok) {
      const data = await res.json();
      const messages = data?.messages || [];

      for (const msg of messages) {
        totalMessages++;
        const sentiment = msg?.entities?.sentiment?.basic;
        if (sentiment === 'Bullish') bullishCount++;
        else if (sentiment === 'Bearish') bearishCount++;

        const text: string = (msg.body || '').toLowerCase();
        if (text.includes('earnings') || text.includes('guidance')) themes.add('Earnings & Guidance');
        if (text.includes('revenue') || text.includes('growth') || text.includes('sales')) themes.add('Top-Line Growth');
        if (text.includes('valuation') || text.includes('pe') || text.includes('overvalued')) themes.add('Valuation Multiples');
        if (text.includes('short') || text.includes('squeeze') || text.includes('breakout')) themes.add('Technical Momentum');
        if (text.includes('fed') || text.includes('rate') || text.includes('yield')) themes.add('Macro / Rates');

        if (sampleMessages.length < 3 && msg.body && msg.body.length > 25) {
          sampleMessages.push(msg.body.replace(/\n/g, ' ').slice(0, 140));
        }
      }
    }
  } catch (err: any) {
    console.warn(`[WebScraper] StockTwits stream unavailable for $${cleanTicker}: ${err.message}`);
  }

  return {
    bullishCount,
    bearishCount,
    totalMessages,
    sampleMessages,
    extractedThemes: Array.from(themes)
  };
}
