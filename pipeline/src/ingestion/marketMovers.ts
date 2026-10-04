import { fetchWithRetry } from '../utils/httpClient.js';
import { historyTracker } from '../storage/historyTracker.js';
import { CONFIG } from '../config.js';
import type { MarketMover } from '../types.js';

export function resolveTradingVenue(symbol: string, exchange: string, isPennyStock: boolean): string {
  const normEx = (exchange || '').toUpperCase();
  if (isPennyStock) {
    if (normEx.includes('ASE') || normEx.includes('NYSE')) return 'NYSE American';
    if (normEx.includes('PNK') || normEx.includes('OTC') || normEx === 'OTHER') return 'OTC Markets Pink Sheets';
    return 'Nasdaq Capital Market';
  }

  // Major venue resolution
  if (normEx.includes('NASDAQ') || normEx.includes('NMS')) return 'Nasdaq Global Select Market';
  if (normEx.includes('NYSE') || normEx.includes('NYQ')) return 'New York Stock Exchange';
  if (normEx.includes('LSE')) return 'London Stock Exchange';
  if (normEx.includes('EURONEXT') || normEx.includes('PA')) return 'Euronext Paris';
  if (normEx.includes('DAX') || normEx.includes('DE')) return 'XETRA Frankfurt';
  return 'Cboe BZX';
}

export class MarketMoverIngestor {
  private rawQuoteCache = new Map<string, any>();

  /**
   * Retrieves the raw live quote object from screener results for verified metric hydration.
   */
  public getCachedQuote(symbol: string): any {
    return this.rawQuoteCache.get(symbol.toUpperCase());
  }

  /**
   * Fetches top movers, excludes trailing 12-month coverage, and returns 5 gainers + 5 losers.
   * If includePennyStocks is true, also attaches eligible penny stocks (2 gainers, 3 losers).
   */
  public async getEligibleMovers(options: { includePennyStocks?: boolean } = {}): Promise<{
    gainers: MarketMover[];
    losers: MarketMover[];
    pennyStocks?: { gainers: MarketMover[]; losers: MarketMover[] };
  }> {
    console.log('[MarketMoverIngestor] Fetching daily market movers for US and European equities...');

    const candidates = await this.fetchLiveScreenerMovers();

    if (candidates.length === 0) {
      throw new Error('[MarketMoverIngestor] No market movers returned from live screener API. Please resolve the issue.');
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
      throw new Error(
        `[MarketMoverIngestor] Insufficient eligible market movers after lockout filtering (gainers: ${selectedGainers.length}/${CONFIG.DAILY_GAINERS_COUNT}, losers: ${selectedLosers.length}/${CONFIG.DAILY_LOSERS_COUNT}). Please resolve the issue.`
      );
    }

    console.log(`[MarketMoverIngestor] Selected ${selectedGainers.length} Gainers: ${selectedGainers.map((g) => `${g.ticker} (+${g.changePercent.toFixed(2)}%)`).join(', ')}`);
    console.log(`[MarketMoverIngestor] Selected ${selectedLosers.length} Losers: ${selectedLosers.map((l) => `${l.ticker} (${l.changePercent.toFixed(2)}%)`).join(', ')}`);

    let pennyStocksResult: { gainers: MarketMover[]; losers: MarketMover[] } | undefined;
    if (options.includePennyStocks) {
      pennyStocksResult = await this.getEligiblePennyStocks();
    }

    return {
      gainers: selectedGainers.slice(0, CONFIG.DAILY_GAINERS_COUNT),
      losers: selectedLosers.slice(0, CONFIG.DAILY_LOSERS_COUNT),
      ...(pennyStocksResult ? { pennyStocks: pennyStocksResult } : {})
    };
  }

  /**
   * Fetches 5 Penny Stocks (< $5.00): exactly 2 Top Gainers and 3 Top Losers from live market screeners.
   */
  public async getEligiblePennyStocks(): Promise<{ gainers: MarketMover[]; losers: MarketMover[] }> {
    console.log('[MarketMoverIngestor] Scanning live penny stock universe (< $5.00) for 2 Gainers and 3 Losers...');

    const pennyMovers = await this.fetchLivePennyStockMovers();

    if (pennyMovers.length === 0) {
      throw new Error('[MarketMoverIngestor] No penny stock movers (< $5.00) returned from live screener API. Please resolve the issue.');
    }

    const eligibleGainers = pennyMovers
      .filter((m) => m.changePercent > 0 && historyTracker.isEligible(m.ticker))
      .sort((a, b) => b.changePercent - a.changePercent);

    const eligibleLosers = pennyMovers
      .filter((m) => m.changePercent < 0 && historyTracker.isEligible(m.ticker))
      .sort((a, b) => a.changePercent - b.changePercent);

    const selectedGainers: MarketMover[] = eligibleGainers.slice(0, 2);
    const selectedLosers: MarketMover[] = eligibleLosers.slice(0, 3);

    if (selectedGainers.length < 2 || selectedLosers.length < 3) {
      throw new Error(
        `[MarketMoverIngestor] Insufficient eligible penny stock movers after lockout filtering (gainers: ${selectedGainers.length}/2, losers: ${selectedLosers.length}/3). Please resolve the issue.`
      );
    }

    console.log(`[MarketMoverIngestor] Penny Gainers (2): ${selectedGainers.map((g) => `${g.ticker} [${g.moneyMarketTradingVenue}] (+${g.changePercent.toFixed(2)}%)`).join(', ')}`);
    console.log(`[MarketMoverIngestor] Penny Losers (3): ${selectedLosers.map((l) => `${l.ticker} [${l.moneyMarketTradingVenue}] (${l.changePercent.toFixed(2)}%)`).join(', ')}`);

    return {
      gainers: selectedGainers,
      losers: selectedLosers
    };
  }

  /**
   * Scans live penny stock quotes (< $5.00) from active Yahoo Finance predefined screeners.
   */
  private async fetchLivePennyStockMovers(): Promise<MarketMover[]> {
    const scrUrls = [
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=small_cap_gainers&count=100',
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=aggressive_small_caps&count=100',
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=most_actives&count=100'
    ];

    const responses = await Promise.all(scrUrls.map((u) => fetchWithRetry(u)));
    for (const res of responses) {
      if (!res.ok) {
        throw new Error(`Penny screener API returned status ${res.status}: ${res.statusText}`);
      }
    }

    const datas = await Promise.all(responses.map((r) => r.json()));
    for (const d of datas) {
      if (d?.finance?.error) {
        throw new Error(`Penny screener API error: ${d.finance.error.description || JSON.stringify(d.finance.error)}`);
      }
    }

    const seen = new Set<string>();
    const results: MarketMover[] = [];

    for (const d of datas) {
      const quotes = d?.finance?.result?.[0]?.quotes || [];
      for (const q of quotes) {
        const symbol = q.symbol;
        if (!symbol || seen.has(symbol)) continue;

        const price = q.regularMarketPrice ?? 0;
        if (price <= 0 || price >= 5.0) continue; // Penny stock strict filter (< $5.00)

        seen.add(symbol);
        this.rawQuoteCache.set(symbol.toUpperCase(), q);

        const changePct = q.regularMarketChangePercent ?? 0;
        const exchange = q.exchange?.includes('NYQ') || q.exchange?.includes('ASE') ? 'NYSE' : 'NASDAQ';
        const venue = resolveTradingVenue(symbol, exchange, true);

        results.push({
          ticker: symbol,
          symbol,
          name: q.shortName || q.longName || symbol,
          exchange: exchange as any,
          region: 'US',
          price,
          change: q.regularMarketChange ?? 0,
          changePercent: changePct,
          volume: q.regularMarketVolume ?? 0,
          avgVolume: q.averageDailyVolume3Month ?? 0,
          marketCap: q.marketCap ?? 0,
          currency: q.currency || 'USD',
          category: changePct >= 0 ? 'gainer' : 'loser',
          isPennyStock: true,
          moneyMarketTradingVenue: venue
        });
      }
    }

    return results;
  }

  /**
   * Fetches gainers & losers using open Yahoo Finance screener query endpoints.
   */
  private async fetchLiveScreenerMovers(): Promise<MarketMover[]> {
    const results: MarketMover[] = [];

    const gainersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_gainers&count=50';
    const losersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_losers&count=50';

    const [gainersRes, losersRes] = await Promise.all([
      fetchWithRetry(gainersUrl),
      fetchWithRetry(losersUrl)
    ]);

    if (!gainersRes.ok) {
      throw new Error(`Gainers screener API returned status ${gainersRes.status}: ${gainersRes.statusText}`);
    }
    if (!losersRes.ok) {
      throw new Error(`Losers screener API returned status ${losersRes.status}: ${losersRes.statusText}`);
    }

    const [gainersData, losersData] = await Promise.all([
      gainersRes.json(),
      losersRes.json()
    ]);

    if (gainersData?.finance?.error) {
      throw new Error(`Gainers screener API error: ${gainersData.finance.error.description || JSON.stringify(gainersData.finance.error)}`);
    }
    if (losersData?.finance?.error) {
      throw new Error(`Losers screener API error: ${losersData.finance.error.description || JSON.stringify(losersData.finance.error)}`);
    }

    const gainersQuotes = gainersData?.finance?.result?.[0]?.quotes || [];
    for (const q of gainersQuotes) {
      if (this.isValidMover(q)) {
        results.push(this.mapQuoteToMover(q, 'gainer'));
      }
    }

    const losersQuotes = losersData?.finance?.result?.[0]?.quotes || [];
    for (const q of losersQuotes) {
      if (this.isValidMover(q)) {
        results.push(this.mapQuoteToMover(q, 'loser'));
      }
    }

    return results;
  }

  private isValidMover(q: any): boolean {
    const marketCap = q.marketCap || 0;
    const volume = q.regularMarketVolume || 0;
    const price = q.regularMarketPrice || 0;

    return marketCap >= 500_000_000 && volume >= 250_000 && price >= 5.0;
  }

  private mapQuoteToMover(q: any, category: 'gainer' | 'loser'): MarketMover {
    const symbol = q.symbol;
    this.rawQuoteCache.set(symbol.toUpperCase(), q);
    const isEU = symbol.endsWith('.L') || symbol.endsWith('.PA') || symbol.endsWith('.DE') || symbol.endsWith('.AS');
    let exchange: MarketMover['exchange'] = 'NASDAQ';
    if (symbol.endsWith('.L')) exchange = 'LSE';
    else if (symbol.endsWith('.PA')) exchange = 'EURONEXT';
    else if (symbol.endsWith('.DE')) exchange = 'DAX';
    else if (q.exchange?.includes('NYQ')) exchange = 'NYSE';

    const price = q.regularMarketPrice || 0;
    const isPenny = price < 5.0;

    return {
      ticker: symbol,
      symbol,
      name: q.shortName || q.longName || symbol,
      exchange,
      region: isEU ? 'EU' : 'US',
      price,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      volume: q.regularMarketVolume || 0,
      avgVolume: q.averageDailyVolume3Month || 0,
      marketCap: q.marketCap || 0,
      currency: q.currency || (isEU ? 'EUR' : 'USD'),
      category,
      isPennyStock: isPenny,
      moneyMarketTradingVenue: resolveTradingVenue(symbol, exchange, isPenny)
    };
  }
}

export const marketMoverIngestor = new MarketMoverIngestor();
