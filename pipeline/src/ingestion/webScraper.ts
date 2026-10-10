/**
 * Unified multi-source web, social sentiment, SEC filings, and options scraper.
 * Facade coordinating domain-specific scrapers in ./webScraper/.
 */

import {
  fetchGoogleNews,
  fetchStockTwitsSentiment,
  fetchSecDisclosures,
  fetchRedditDiscussions,
  fetchOptionsChain,
  fetchShareStatistics,
  getCachedCompanyProfile,
  fetchCompanyProfile,
  fetchPeerTickers,
  fetchPeerQuotes,
  type StockIntelligenceScrapeResult,
  type ScrapedNewsArticle,
  type ScrapedRedditPost,
  type SecFinancialDisclosures,
  type CompanyProfile,
  type LivePeerData
} from './webScraper/index.js';

export * from './webScraper/index.js';

export class WebScraper {
  public async fetchGoogleNews(ticker: string, companyName?: string): Promise<ScrapedNewsArticle[]> {
    return fetchGoogleNews(ticker, companyName);
  }

  public async fetchStockTwitsSentiment(ticker: string): Promise<StockIntelligenceScrapeResult['stockTwits']> {
    return fetchStockTwitsSentiment(ticker);
  }

  public async fetchSecDisclosures(ticker: string): Promise<SecFinancialDisclosures | null> {
    return fetchSecDisclosures(ticker);
  }

  public async fetchRedditDiscussions(ticker: string, companyName?: string): Promise<ScrapedRedditPost[]> {
    return fetchRedditDiscussions(ticker, companyName);
  }

  public async fetchOptionsChain(ticker: string): Promise<{ calls: any[]; puts: any[]; spotPrice?: number; expirationDate?: number } | null> {
    return fetchOptionsChain(ticker);
  }

  public async fetchShareStatistics(ticker: string): Promise<{
    floatShares?: number;
    sharesOutstanding?: number;
    heldPercentInsiders?: number;
    heldPercentInstitutions?: number;
    sharesShort?: number;
    shortPercentOfFloat?: number;
  } | null> {
    return fetchShareStatistics(ticker);
  }

  public getCachedCompanyProfile(ticker: string): CompanyProfile | undefined {
    return getCachedCompanyProfile(ticker);
  }

  public async fetchCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
    return fetchCompanyProfile(ticker);
  }

  public async fetchPeerTickers(ticker: string, sector?: string): Promise<string[]> {
    return fetchPeerTickers(ticker, sector);
  }

  public async fetchPeerQuotes(symbols: string[]): Promise<Record<string, LivePeerData>> {
    return fetchPeerQuotes(symbols);
  }

  public async scrapeStockIntelligence(ticker: string, companyName?: string): Promise<StockIntelligenceScrapeResult> {
    console.log(`[WebScraper] Executing multi-source web & social scrape for $${ticker}...`);

    const [newsResult, stockTwitsResult, secResult, redditResult, optionResult, shareStatsResult] = await Promise.allSettled([
      this.fetchGoogleNews(ticker, companyName),
      this.fetchStockTwitsSentiment(ticker),
      this.fetchSecDisclosures(ticker),
      this.fetchRedditDiscussions(ticker, companyName),
      this.fetchOptionsChain(ticker),
      this.fetchShareStatistics(ticker)
    ]);

    const news = newsResult.status === 'fulfilled' ? newsResult.value : [];
    const stockTwits = stockTwitsResult.status === 'fulfilled' ? stockTwitsResult.value : {
      bullishCount: 0,
      bearishCount: 0,
      totalMessages: 0,
      sampleMessages: [],
      extractedThemes: []
    };
    const secDisclosures = secResult.status === 'fulfilled' ? secResult.value : null;
    const redditPosts = redditResult.status === 'fulfilled' ? redditResult.value : [];
    const optionChain = optionResult.status === 'fulfilled' ? optionResult.value : null;
    const shareStats = shareStatsResult.status === 'fulfilled' ? shareStatsResult.value : null;
    const companyProfile = this.getCachedCompanyProfile(ticker) || null;

    console.log(`[WebScraper] Scraped for $${ticker}: ${news.length} news articles, ${stockTwits.totalMessages} StockTwits messages, ${redditPosts.length} Reddit discussions, SEC CIK: ${secDisclosures?.cik || 'N/A'}, Options contracts: ${(optionChain?.calls?.length || 0) + (optionChain?.puts?.length || 0)}, Float: ${shareStats?.floatShares ? `${(shareStats.floatShares / 1e6).toFixed(1)}M` : 'N/A'}`);

    return {
      ticker: ticker.toUpperCase(),
      news,
      stockTwits,
      redditPosts,
      secDisclosures,
      optionChain,
      shareStats,
      companyProfile
    };
  }
}

export const webScraper = new WebScraper();
