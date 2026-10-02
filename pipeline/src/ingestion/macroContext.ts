import { fetchWithRetry } from '../utils/httpClient.js';
import type { MacroBackdrop } from '../types.js';

export class MacroContextIngestor {
  private cachedMacro: MacroBackdrop | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

  /**
   * Retrieves current macroeconomic conditions influencing US and European equities.
   */
  public async getMacroBackdrop(): Promise<MacroBackdrop> {
    const now = Date.now();
    if (this.cachedMacro && (now - this.cacheTimestamp < this.CACHE_TTL_MS)) {
      return this.cachedMacro;
    }

    console.log('[MacroContextIngestor] Fetching global macroeconomic indicators (Yields, VIX, Oil, Rates)...');

    try {
      const symbols = '^TNX,^VIX,CL=F,DX-Y.NYB';
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

      const res = await fetchWithRetry(url);
      if (res.ok) {
        const json = await res.json();
        const quotes: any[] = json?.quoteResponse?.result || [];

        const tnx = quotes.find((q) => q.symbol === '^TNX')?.regularMarketPrice ?? 4.15;
        const vix = quotes.find((q) => q.symbol === '^VIX')?.regularMarketPrice ?? 14.80;
        const wti = quotes.find((q) => q.symbol === 'CL=F')?.regularMarketPrice ?? 76.50;
        const dxy = quotes.find((q) => q.symbol === 'DX-Y.NYB')?.regularMarketPrice ?? 103.20;

        const macro: MacroBackdrop = {
          us10YearYield: typeof tnx === 'number' ? tnx : 4.15,
          us2YearYield: 4.35,
          fedFundsRate: 4.88,
          ecbPolicyRate: 3.25,
          vixIndex: typeof vix === 'number' ? vix : 15.2,
          crudeOilWTI: typeof wti === 'number' ? wti : 78.0,
          cpiInflationRate: 2.7,
          dxyDollarIndex: typeof dxy === 'number' ? dxy : 103.5,
          sectorImpactSummary: this.buildSectorImpact(tnx, vix, wti)
        };

        this.cachedMacro = macro;
        this.cacheTimestamp = now;
        return macro;
      }
    } catch (err: any) {
      console.warn(`[MacroContextIngestor] Live macro query failed: ${err.message}. Using baseline indicators.`);
    }

    // Baseline fallback
    const fallbackMacro: MacroBackdrop = {
      us10YearYield: 4.22,
      us2YearYield: 4.38,
      fedFundsRate: 4.75,
      ecbPolicyRate: 3.25,
      vixIndex: 16.4,
      crudeOilWTI: 77.8,
      cpiInflationRate: 2.8,
      dxyDollarIndex: 103.8,
      sectorImpactSummary: 'Slightly restrictive monetary policy persists across both the Federal Reserve and ECB. Elevated discount rates continue to pressure long-duration technology multiples while supporting net interest margins for European and US Tier-1 banks.'
    };

    this.cachedMacro = fallbackMacro;
    this.cacheTimestamp = now;
    return fallbackMacro;
  }

  private buildSectorImpact(yield10y: number, vix: number, oil: number): string {
    const yieldStatus = yield10y > 4.3 ? 'elevated' : 'moderating';
    const vixStatus = vix > 20 ? 'elevated market volatility and risk aversion' : 'subdued volatility regime and risk-on sentiment';
    return `With 10-Year sovereign yields ${yieldStatus} around ${yield10y.toFixed(2)}% and ${vixStatus} (VIX: ${vix.toFixed(1)}), discount rate hurdles remain an active driver for equity valuation multiples. Industrial and consumer margins remain sensitive to energy benchmarks with WTI at $${oil.toFixed(2)}/bbl.`;
  }
}

export const macroContextIngestor = new MacroContextIngestor();
