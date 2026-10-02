import { fetchWithRetry } from '../utils/httpClient.js';
import { CONFIG } from '../config.js';

export interface ScrapedNewsArticle {
  title: string;
  source: string;
  pubDate: string;
  link: string;
}

export interface ScrapedRedditPost {
  title: string;
  author?: string;
  pubDate?: string;
  link?: string;
}

export interface SecFinancialDisclosures {
  cik: string;
  entityName: string;
  latestRevenueTTM?: number;
  latestNetIncomeTTM?: number;
  latest10KFilingDate?: string;
  fiscalYear?: number;
}

export interface StockIntelligenceScrapeResult {
  ticker: string;
  news: ScrapedNewsArticle[];
  stockTwits: {
    bullishCount: number;
    bearishCount: number;
    totalMessages: number;
    sampleMessages: string[];
    extractedThemes: string[];
  };
  redditPosts: ScrapedRedditPost[];
  secDisclosures?: SecFinancialDisclosures | null;
}

// In-memory cache for SEC company ticker to CIK mapping
let secTickerCache: Map<string, string> | null = null;

export class WebScraper {
  /**
   * Scrapes live financial news headlines from Google News RSS.
   * Completely open, 0 accounts or paid API keys required.
   */
  public async fetchGoogleNews(ticker: string, companyName?: string): Promise<ScrapedNewsArticle[]> {
    const query = companyName ? `${companyName} ${ticker} stock` : `${ticker} stock`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const res = await fetchWithRetry(url, {
        retries: 1,
        timeoutMs: 6000,
        headers: {
          'Accept': 'application/rss+xml, text/xml, */*'
        }
      });

      if (!res.ok) {
        return [];
      }

      const xml = await res.text();
      const articles: ScrapedNewsArticle[] = [];
      const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const block of itemBlocks.slice(0, 6)) {
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        if (titleMatch) {
          const rawTitle = titleMatch[1]
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .trim();

          articles.push({
            title: rawTitle,
            source: sourceMatch ? sourceMatch[1].trim() : 'Financial Press',
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
            link: linkMatch ? linkMatch[1].trim() : ''
          });
        }
      }

      return articles;
    } catch (err: any) {
      console.warn(`[WebScraper] Google News scraping failed for ${ticker}: ${err.message}`);
      return [];
    }
  }

  /**
   * Scrapes live retail sentiment stream from StockTwits public symbol stream.
   * 100% free, no account needed.
   */
  public async fetchStockTwitsSentiment(ticker: string): Promise<StockIntelligenceScrapeResult['stockTwits']> {
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

  /**
   * Scrapes SEC EDGAR XBRL company facts for verified financial statements.
   * Free official US Government API, no paid keys needed.
   */
  public async fetchSecDisclosures(ticker: string): Promise<SecFinancialDisclosures | null> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    const userAgent = CONFIG.SEC_EDGAR_USER_AGENT || 'EquiSightResearch admin@equisight-alpha.com';

    try {
      // 1. Resolve CIK from cache or download directory
      if (!secTickerCache) {
        secTickerCache = new Map();
        const dirRes = await fetchWithRetry('https://www.sec.gov/files/company_tickers.json', {
          retries: 1,
          timeoutMs: 6000,
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
      }

      const cik = secTickerCache.get(cleanTicker);
      if (!cik) {
        return null;
      }

      // 2. Fetch XBRL company facts
      const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
      const factsRes = await fetchWithRetry(factsUrl, {
        retries: 1,
        timeoutMs: 8000,
        headers: { 'User-Agent': userAgent }
      });

      if (!factsRes.ok) {
        return null;
      }

      const facts = await factsRes.json();
      const entityName = facts?.entityName || cleanTicker;
      const usGaap = facts?.facts?.['us-gaap'];

      let latestRevenue: number | undefined;
      let latestNetIncome: number | undefined;
      let latest10KDate: string | undefined;
      let fiscalYear: number | undefined;

      if (usGaap) {
        // Extract revenue from 10-K units
        const revObj = usGaap.Revenues || usGaap.RevenueFromContractWithCustomerExcludingAssessedTax || usGaap.SalesRevenueNet;
        if (revObj?.units?.USD) {
          const tenKUnits = revObj.units.USD.filter((u: any) => u.form === '10-K');
          const latest = tenKUnits.pop();
          if (latest) {
            latestRevenue = latest.val;
            latest10KDate = latest.filed;
            fiscalYear = latest.fy;
          }
        }

        // Extract net income
        const incObj = usGaap.NetIncomeLoss || usGaap.ProfitLoss;
        if (incObj?.units?.USD) {
          const tenKUnits = incObj.units.USD.filter((u: any) => u.form === '10-K');
          const latest = tenKUnits.pop();
          if (latest) {
            latestNetIncome = latest.val;
          }
        }
      }

      return {
        cik,
        entityName,
        latestRevenueTTM: latestRevenue,
        latestNetIncomeTTM: latestNetIncome,
        latest10KFilingDate: latest10KDate,
        fiscalYear
      };
    } catch (err: any) {
      console.warn(`[WebScraper] SEC EDGAR lookup failed for ${ticker}: ${err.message}`);
      return null;
    }
  }

  /**
   * Scrapes Reddit public search feed for community discussion.
   */
  public async fetchRedditDiscussions(ticker: string): Promise<ScrapedRedditPost[]> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    const url = `https://www.reddit.com/r/stocks/search.rss?q=${encodeURIComponent(cleanTicker)}&restrict_sr=1&sort=new`;

    try {
      const res = await fetchWithRetry(url, {
        retries: 0,
        timeoutMs: 4000,
        headers: { 'User-Agent': 'EquiSightBot/1.0 by equisight' }
      });

      if (!res.ok) {
        return [];
      }

      const xml = await res.text();
      const posts: ScrapedRedditPost[] = [];
      const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

      for (const entry of entryMatches.slice(0, 3)) {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const authorMatch = entry.match(/<name>([\s\S]*?)<\/name>/);
        const linkMatch = entry.match(/<link[^>]*href="([\s\S]*?)"/);

        if (titleMatch) {
          posts.push({
            title: titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
            author: authorMatch ? authorMatch[1] : undefined,
            link: linkMatch ? linkMatch[1] : undefined
          });
        }
      }

      return posts;
    } catch {
      return [];
    }
  }

  /**
   * Unified comprehensive stock intelligence scraping engine.
   * Runs all free zero-touch scrapers concurrently.
   */
  public async scrapeStockIntelligence(ticker: string, companyName?: string): Promise<StockIntelligenceScrapeResult> {
    console.log(`[WebScraper] Executing multi-source web & social scrape for $${ticker}...`);

    const [newsResult, stockTwitsResult, secResult, redditResult] = await Promise.allSettled([
      this.fetchGoogleNews(ticker, companyName),
      this.fetchStockTwitsSentiment(ticker),
      this.fetchSecDisclosures(ticker),
      this.fetchRedditDiscussions(ticker)
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

    console.log(`[WebScraper] Scraped for $${ticker}: ${news.length} news articles, ${stockTwits.totalMessages} StockTwits messages, ${redditPosts.length} Reddit discussions, SEC CIK: ${secDisclosures?.cik || 'N/A'}`);

    return {
      ticker: ticker.toUpperCase(),
      news,
      stockTwits,
      redditPosts,
      secDisclosures
    };
  }
}

export const webScraper = new WebScraper();
