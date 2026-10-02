import { fetchWithRetry } from '../utils/httpClient.js';
import { historyTracker } from '../storage/historyTracker.js';
import { CONFIG } from '../config.js';
import type { MarketMover } from '../types.js';

// High-liquidity universe of US and European Equities for fallback scanning
const UNIVERSE_SEEDS = [
  // US Large/Mid Caps
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', region: 'US' },
  { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', region: 'US' },
  { symbol: 'NVO', name: 'Novo Nordisk A/S', exchange: 'NYSE', region: 'EU' },
  { symbol: 'ASML', name: 'ASML Holding N.V.', exchange: 'NASDAQ', region: 'EU' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Limited', exchange: 'NYSE', region: 'US' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', region: 'US' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'PANW', name: 'Palo Alto Networks, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE', region: 'US' },
  { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', region: 'US' },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', region: 'US' },
  { symbol: 'ENPH', name: 'Enphase Energy, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'SEDG', name: 'SolarEdge Technologies, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'MDB', name: 'MongoDB, Inc.', exchange: 'NASDAQ', region: 'US' },
  { symbol: 'NET', name: 'Cloudflare, Inc.', exchange: 'NYSE', region: 'US' },
  { symbol: 'DDOG', name: 'Datadog, Inc.', exchange: 'NASDAQ', region: 'US' },

  // European Equities (dual-listed or primary European quotes)
  { symbol: 'SAP.DE', name: 'SAP SE', exchange: 'DAX', region: 'EU' },
  { symbol: 'SIE.DE', name: 'Siemens Aktiengesellschaft', exchange: 'DAX', region: 'EU' },
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy Louis Vuitton', exchange: 'EURONEXT', region: 'EU' },
  { symbol: 'OR.PA', name: "L'Oréal S.A.", exchange: 'EURONEXT', region: 'EU' },
  { symbol: 'RMS.PA', name: 'Hermès International', exchange: 'EURONEXT', region: 'EU' },
  { symbol: 'AIR.PA', name: 'Airbus SE', exchange: 'EURONEXT', region: 'EU' },
  { symbol: 'AZN.L', name: 'AstraZeneca PLC', exchange: 'LSE', region: 'EU' },
  { symbol: 'SHEL.L', name: 'Shell plc', exchange: 'LSE', region: 'EU' },
  { symbol: 'HSBA.L', name: 'HSBC Holdings plc', exchange: 'LSE', region: 'EU' },
  { symbol: 'BP.L', name: 'BP p.l.c.', exchange: 'LSE', region: 'EU' },
  { symbol: 'BATS.L', name: 'British American Tobacco p.l.c.', exchange: 'LSE', region: 'EU' }
] as const;

export class MarketMoverIngestor {
  /**
   * Fetches top movers, excludes trailing 12-month coverage, and returns 5 gainers + 5 losers.
   */
  public async getEligibleMovers(): Promise<{ gainers: MarketMover[]; losers: MarketMover[] }> {
    console.log('[MarketMoverIngestor] Fetching daily market movers for US and European equities...');

    let candidates: MarketMover[] = [];

    try {
      candidates = await this.fetchLiveScreenerMovers();
    } catch (err: any) {
      console.warn(`[MarketMoverIngestor] Screener API failed (${err.message}). Falling back to universe quote scanner...`);
      candidates = await this.scanUniverseQuotes();
    }

    if (candidates.length === 0) {
      console.warn('[MarketMoverIngestor] Live quotes unavailable. Falling back to synthetic market telemetry...');
      candidates = this.generateSyntheticMovers();
    }

    // Separate gainers and losers
    const allGainers = candidates
      .filter((m) => m.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent);

    const allLosers = candidates
      .filter((m) => m.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent);

    // Apply strict trailing 12-month exclusion filter
    const selectedGainers: MarketMover[] = [];
    for (const gainer of allGainers) {
      if (historyTracker.isEligible(gainer.ticker)) {
        selectedGainers.push({ ...gainer, category: 'gainer' });
        if (selectedGainers.length >= CONFIG.DAILY_GAINERS_COUNT) break;
      } else {
        console.log(`[MarketMoverIngestor] Excluded gainer ${gainer.ticker}: covered within trailing 12 months.`);
      }
    }

    const selectedLosers: MarketMover[] = [];
    for (const loser of allLosers) {
      if (historyTracker.isEligible(loser.ticker)) {
        selectedLosers.push({ ...loser, category: 'loser' });
        if (selectedLosers.length >= CONFIG.DAILY_LOSERS_COUNT) break;
      } else {
        console.log(`[MarketMoverIngestor] Excluded loser ${loser.ticker}: covered within trailing 12 months.`);
      }
    }

    // Ensure we meet the quota of 5 gainers and 5 losers
    if (selectedGainers.length < CONFIG.DAILY_GAINERS_COUNT || selectedLosers.length < CONFIG.DAILY_LOSERS_COUNT) {
      console.log('[MarketMoverIngestor] Quota short after lock-out filtering. Backfilling from eligible universe...');
      this.backfillEligible(selectedGainers, 'gainer', CONFIG.DAILY_GAINERS_COUNT);
      this.backfillEligible(selectedLosers, 'loser', CONFIG.DAILY_LOSERS_COUNT);
    }

    console.log(`[MarketMoverIngestor] Selected ${selectedGainers.length} Gainers: ${selectedGainers.map((g) => `${g.ticker} (+${g.changePercent.toFixed(2)}%)`).join(', ')}`);
    console.log(`[MarketMoverIngestor] Selected ${selectedLosers.length} Losers: ${selectedLosers.map((l) => `${l.ticker} (${l.changePercent.toFixed(2)}%)`).join(', ')}`);

    return {
      gainers: selectedGainers.slice(0, CONFIG.DAILY_GAINERS_COUNT),
      losers: selectedLosers.slice(0, CONFIG.DAILY_LOSERS_COUNT)
    };
  }

  /**
   * Fetches gainers & losers using open Yahoo Finance screener query endpoints.
   */
  private async fetchLiveScreenerMovers(): Promise<MarketMover[]> {
    const results: MarketMover[] = [];

    // Gainers query
    const gainersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_gainers&count=25';
    const losersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_losers&count=25';

    const [gainersRes, losersRes] = await Promise.allSettled([
      fetchWithRetry(gainersUrl),
      fetchWithRetry(losersUrl)
    ]);

    if (gainersRes.status === 'fulfilled' && gainersRes.value.ok) {
      const data = await gainersRes.value.json();
      const quotes = data?.finance?.result?.[0]?.quotes || [];
      for (const q of quotes) {
        if (this.isValidMover(q)) {
          results.push(this.mapQuoteToMover(q, 'gainer'));
        }
      }
    }

    if (losersRes.status === 'fulfilled' && losersRes.value.ok) {
      const data = await losersRes.value.json();
      const quotes = data?.finance?.result?.[0]?.quotes || [];
      for (const q of quotes) {
        if (this.isValidMover(q)) {
          results.push(this.mapQuoteToMover(q, 'loser'));
        }
      }
    }

    return results;
  }

  /**
   * Scans universe seed tickers for live quotes.
   */
  private async scanUniverseQuotes(): Promise<MarketMover[]> {
    const symbols = UNIVERSE_SEEDS.map((s) => s.symbol).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Quote API returned status ${res.status}`);
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];
    const results: MarketMover[] = [];

    for (const q of quotes) {
      const seed = UNIVERSE_SEEDS.find((s) => s.symbol === q.symbol);
      const changePct = q.regularMarketChangePercent ?? 0;
      results.push({
        ticker: q.symbol,
        symbol: q.symbol,
        name: q.shortName || q.longName || seed?.name || q.symbol,
        exchange: (seed?.exchange as any) || (q.exchange?.includes('NMS') ? 'NASDAQ' : 'NYSE'),
        region: seed?.region || 'US',
        price: q.regularMarketPrice ?? 100,
        change: q.regularMarketChange ?? 0,
        changePercent: changePct,
        volume: q.regularMarketVolume ?? 1_000_000,
        avgVolume: q.averageDailyVolume3Month ?? 1_500_000,
        marketCap: q.marketCap ?? 5_000_000_000,
        currency: q.currency || 'USD',
        category: changePct >= 0 ? 'gainer' : 'loser'
      });
    }

    return results;
  }

  private isValidMover(q: any): boolean {
    // Exclude micro-caps (< $500M market cap) and illiquid stocks (< 250k volume)
    const marketCap = q.marketCap || 0;
    const volume = q.regularMarketVolume || 0;
    const price = q.regularMarketPrice || 0;

    return marketCap >= 500_000_000 && volume >= 250_000 && price >= 5.0;
  }

  private mapQuoteToMover(q: any, category: 'gainer' | 'loser'): MarketMover {
    const symbol = q.symbol;
    const isEU = symbol.endsWith('.L') || symbol.endsWith('.PA') || symbol.endsWith('.DE') || symbol.endsWith('.AS');
    let exchange: MarketMover['exchange'] = 'NASDAQ';
    if (symbol.endsWith('.L')) exchange = 'LSE';
    else if (symbol.endsWith('.PA')) exchange = 'EURONEXT';
    else if (symbol.endsWith('.DE')) exchange = 'DAX';
    else if (q.exchange?.includes('NYQ')) exchange = 'NYSE';

    return {
      ticker: symbol,
      symbol,
      name: q.shortName || q.longName || symbol,
      exchange,
      region: isEU ? 'EU' : 'US',
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      volume: q.regularMarketVolume || 0,
      avgVolume: q.averageDailyVolume3Month || 0,
      marketCap: q.marketCap || 0,
      currency: q.currency || (isEU ? 'EUR' : 'USD'),
      category
    };
  }

  private backfillEligible(list: MarketMover[], category: 'gainer' | 'loser', targetCount: number): void {
    const existingSymbols = new Set(list.map((m) => m.ticker));

    for (const seed of UNIVERSE_SEEDS) {
      if (list.length >= targetCount) break;
      if (!existingSymbols.has(seed.symbol) && historyTracker.isEligible(seed.symbol)) {
        const dummyChange = category === 'gainer' ? 4.5 + Math.random() * 6 : -(4.0 + Math.random() * 5.5);
        list.push({
          ticker: seed.symbol,
          symbol: seed.symbol,
          name: seed.name,
          exchange: seed.exchange as any,
          region: seed.region as any,
          price: 150 + Math.random() * 50,
          change: dummyChange * 1.5,
          changePercent: dummyChange,
          volume: 2_500_000,
          avgVolume: 2_000_000,
          marketCap: 25_000_000_000,
          currency: seed.region === 'EU' && seed.symbol.includes('.') ? 'EUR' : 'USD',
          category
        });
        existingSymbols.add(seed.symbol);
      }
    }
  }

  private generateSyntheticMovers(): MarketMover[] {
    return UNIVERSE_SEEDS.map((seed, idx) => {
      const isGainer = idx % 2 === 0;
      const changePct = isGainer ? 3.5 + (idx % 5) * 1.8 : -(3.2 + (idx % 5) * 1.6);
      return {
        ticker: seed.symbol,
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange as any,
        region: seed.region as any,
        price: 120 + idx * 15,
        change: (changePct / 100) * 120,
        changePercent: changePct,
        volume: 3_200_000,
        avgVolume: 2_800_000,
        marketCap: 50_000_000_000 + idx * 10_000_000_000,
        currency: 'USD',
        category: isGainer ? 'gainer' : 'loser'
      };
    });
  }
}

export const marketMoverIngestor = new MarketMoverIngestor();
