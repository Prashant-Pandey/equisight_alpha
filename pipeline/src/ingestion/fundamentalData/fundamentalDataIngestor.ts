/**
 * Verified fundamental data ingestion orchestrator.
 * Coordinates screener caches, SEC XBRL filings, and valuation enrichment.
 */

import { CONFIG } from '../../config.js';
import { webScraper } from '../webScraper.js';
import { marketMoverIngestor } from '../marketMovers.js';
import { SECTOR_ETF_MAP } from '../valuationBenchmarks.js';
import { assembleRawFundamentals } from './rawMetricsAssembler.js';
import { enrichFundamentalMetrics } from './metricsEnricher.js';
import { fetchYahooChart, fetchFinnhubMetrics } from './fundamentalDataFetcher.js';
import type { FundamentalMetrics, MacroBackdrop } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export class FundamentalDataIngestor {
  public async getFundamentals(ticker: string, companyName?: string, macro?: MacroBackdrop): Promise<FundamentalMetrics> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    console.log(`[FundamentalDataIngestor] Ingesting verified financial data for $${cleanTicker}...`);

    const screenerQuote = marketMoverIngestor.getCachedQuote(cleanTicker) || marketMoverIngestor.getCachedQuote(ticker);

    let secData: any = null;
    try {
      secData = await webScraper.fetchSecDisclosures(cleanTicker);
      if (secData?.latestRevenueTTM) {
        console.log(`[FundamentalDataIngestor] Ingested verified SEC EDGAR disclosures for $${cleanTicker} (CIK: ${secData.cik})...`);
      }
    } catch (err: any) {
      console.warn(`[FundamentalDataIngestor] SEC EDGAR check for ${cleanTicker}: ${err.message}`);
    }

    let chartMeta: any = null;
    if (!screenerQuote) {
      try {
        chartMeta = await fetchYahooChart(ticker);
      } catch (err: any) {
        console.warn(`[FundamentalDataIngestor] Live chart check for ${ticker}: ${err.message}`);
      }
    }

    let finnhubData: any = null;
    if (CONFIG.FINNHUB_API_KEY && !screenerQuote && !secData) {
      try {
        finnhubData = await fetchFinnhubMetrics(cleanTicker, this.enrichFundamentalMetrics.bind(this));
      } catch (err: any) {
        console.warn(`[FundamentalDataIngestor] Finnhub fallback check: ${err.message}`);
      }
    }

    const hasScreenerData = Boolean(screenerQuote && (screenerQuote.regularMarketPrice || screenerQuote.marketCap));
    const hasSecData = Boolean(secData && (secData.latestRevenueTTM || secData.totalAssets));
    const hasChartData = Boolean(chartMeta && (chartMeta.regularMarketPrice || chartMeta.fiftyTwoWeekHigh));
    const hasFinnhubData = Boolean(finnhubData && finnhubData.marketCap > 0);

    if (!hasScreenerData && !hasSecData && !hasChartData && !hasFinnhubData) {
      throw new Error(`[FundamentalDataIngestor] No verified fundamental data available for ${ticker} from live market data or SEC filings. Data synthesis is disallowed.`);
    }

    let profile = webScraper.getCachedCompanyProfile(cleanTicker);
    if (!profile) {
      try {
        profile = (await webScraper.fetchCompanyProfile(cleanTicker)) || undefined;
      } catch {}
    }

    const sectorCandidate = screenerQuote?.sector || 'General Equities';
    const peerTickers = await webScraper.fetchPeerTickers(cleanTicker, sectorCandidate);
    let peerData: Record<string, any> = {};
    if (peerTickers.length > 0) {
      try {
        peerData = await webScraper.fetchPeerQuotes(peerTickers);
      } catch {}
    }

    const sectorEtf = SECTOR_ETF_MAP[sectorCandidate as keyof typeof SECTOR_ETF_MAP] || 'SPY';
    let etfData: { price?: number; trailingPE?: number; forwardPE?: number } | undefined;
    try {
      const etfQuotes = await webScraper.fetchPeerQuotes([sectorEtf]);
      etfData = etfQuotes[sectorEtf] as any;
    } catch {}

    const raw = assembleRawFundamentals({
      ticker, cleanTicker, companyName, screenerQuote, secData, chartMeta,
      profile, peerTickers, peerData, etfData, macro
    });

    return this.enrichFundamentalMetrics(raw);
  }

  public enrichFundamentalMetrics(raw: RawFundamentalInput): FundamentalMetrics {
    return enrichFundamentalMetrics(raw);
  }

  private async fetchYahooChart(ticker: string): Promise<any | null> {
    return fetchYahooChart(ticker);
  }

  private async fetchFinnhubMetrics(ticker: string): Promise<FundamentalMetrics | null> {
    return fetchFinnhubMetrics(ticker, this.enrichFundamentalMetrics.bind(this));
  }
}

export const fundamentalDataIngestor = new FundamentalDataIngestor();
