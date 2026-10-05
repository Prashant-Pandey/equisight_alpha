import { fetchWithRetry } from '../utils/httpClient.js';
import { CONFIG } from '../config.js';
import {
  pickDurationFacts,
  instantAt,
  latestInstantDate,
  trailingTwelveMonths,
  discreteQuarters,
  lastTwoAnnuals,
  fiscalQuarterLabel,
  getFacts,
  toMs,
  DAY_MS,
  type FlowMethod
} from './secXbrl.js';

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

export interface SecQuarterlyEPS {
  quarter: string;
  eps: number;
  /** Period end date (ISO). */
  date: string;
  /** Change vs the same fiscal quarter one year earlier, in percent. */
  yoyChangePercent?: number | null;
  /** True when derived by differencing cumulative periods (e.g. Q4 = FY − 9M YTD). */
  derived?: boolean;
}

export interface SecFinancialDisclosures {
  cik: string;
  entityName: string;
  /** SEC Standard Industrial Classification code and description (from submissions API). */
  sic?: string;
  sicDescription?: string;

  // Flow items — always trailing-twelve-month, never a lone 10-Q quarter/YTD value
  latestRevenueTTM?: number;
  latestNetIncomeTTM?: number;
  latestOperatingIncomeTTM?: number;
  latestOperatingCashFlowTTM?: number;
  capitalExpendituresTTM?: number;
  depreciationAmortizationTTM?: number;
  /** Period end and derivation method of the TTM flow figures. */
  ttmPeriodEnd?: string;
  ttmMethod?: FlowMethod;
  /** YoY growth of the last full fiscal year's revenue vs the prior fiscal year, in percent. */
  revenueGrowthYoY?: number;

  // Point-in-time balance-sheet items — all aligned to `balanceSheetDate`
  balanceSheetDate?: string;
  totalAssets?: number;
  totalLiabilities?: number;
  totalDebt?: number;
  /** Debt due within 12 months (short-term borrowings + current maturities of long-term debt). */
  shortTermDebt?: number;
  /** Non-current portion of long-term debt. */
  longTermDebt?: number;
  /** Total debt one year before `balanceSheetDate`, for YoY change. */
  priorYearTotalDebt?: number;
  cashAndEquivalents?: number;
  stockholdersEquity?: number;

  /** Up to 8 most recent discrete fiscal quarters of diluted (else basic) EPS, oldest → newest. */
  quarterlyEPS?: SecQuarterlyEPS[];

  latest10KFilingDate?: string;
  fiscalYear?: number;
  fiscalYearEnd?: string;
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
  optionChain?: {
    calls: any[];
    puts: any[];
    spotPrice?: number;
    expirationDate?: number;
  } | null;
  shareStats?: {
    floatShares?: number;
    sharesOutstanding?: number;
    heldPercentInsiders?: number;
    heldPercentInstitutions?: number;
    sharesShort?: number;
    shortPercentOfFloat?: number;
  } | null;
}

// In-memory cache for SEC company ticker to CIK mapping
let secTickerCache: Map<string, string> | null = null;
// In-memory per-ticker cache of parsed SEC disclosures (in-flight promises are shared)
const secDisclosureCache = new Map<string, Promise<SecFinancialDisclosures | null>>();

// In-memory cache for Yahoo Finance crumb and session cookie
let cachedYahooAuth: { cookie: string; crumb: string; timestamp: number } | null = null;

async function getYahooAuth(): Promise<{ cookie: string; crumb: string } | null> {
  const now = Date.now();
  if (cachedYahooAuth && (now - cachedYahooAuth.timestamp < 1000 * 60 * 45)) {
    return cachedYahooAuth;
  }

  try {
    const cookieRes = await fetchWithRetry('https://fc.yahoo.com', {
      timeoutMs: 4000,
      retries: 1,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }).catch(() => null);

    const rawCookie = cookieRes?.headers.get('set-cookie');
    const cookie = rawCookie ? rawCookie.split(';')[0] : '';
    if (!cookie) return null;

    const crumbRes = await fetchWithRetry('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      timeoutMs: 4000,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': cookie
      }
    });

    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('html') || crumb.includes('Error')) return null;

    cachedYahooAuth = { cookie, crumb, timestamp: now };
    return cachedYahooAuth;
  } catch {
    return null;
  }
}

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
   *
   * Results are cached per ticker for the process lifetime: both the fundamentals and
   * the sentiment ingestors request the same multi-megabyte companyfacts payload.
   */
  public async fetchSecDisclosures(ticker: string): Promise<SecFinancialDisclosures | null> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    let pending = secDisclosureCache.get(cleanTicker);
    if (!pending) {
      pending = this.loadSecDisclosures(cleanTicker);
      secDisclosureCache.set(cleanTicker, pending);
    }
    return pending;
  }

  private async loadSecDisclosures(cleanTicker: string): Promise<SecFinancialDisclosures | null> {
    const ticker = cleanTicker;
    const userAgent = CONFIG.SEC_EDGAR_USER_AGENT || 'EquiSightResearch admin@equisight-alpha.com';

    try {
      // 1. Resolve CIK from cache or download directory
      if (!secTickerCache) {
        secTickerCache = new Map();
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
      }

      const cik = secTickerCache.get(cleanTicker);
      if (!cik) {
        return null;
      }

      // 2. Fetch XBRL company facts (+ submissions metadata for the SIC industry code)
      const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
      const [factsResult, submissionsResult] = await Promise.allSettled([
        fetchWithRetry(factsUrl, { retries: 1, timeoutMs: 8000, headers: { 'User-Agent': userAgent } }),
        fetchWithRetry(submissionsUrl, { retries: 1, timeoutMs: 6000, headers: { 'User-Agent': userAgent } })
      ]);

      if (factsResult.status !== 'fulfilled' || !factsResult.value.ok) {
        return null;
      }

      let sic: string | undefined;
      let sicDescription: string | undefined;
      if (submissionsResult.status === 'fulfilled' && submissionsResult.value.ok) {
        try {
          const sub = await submissionsResult.value.json();
          sic = sub?.sic ? String(sub.sic) : undefined;
          sicDescription = sub?.sicDescription || undefined;
        } catch {
          // SIC is optional enrichment; ignore parse failures
        }
      }

      const facts = await factsResult.value.json();
      const entityName = facts?.entityName || cleanTicker;
      const usGaap = facts?.facts?.['us-gaap'];

      if (!usGaap) {
        return { cik, entityName, sic, sicDescription };
      }

      // ---- Flow items: trailing-twelve-month (never a lone 10-Q quarter / YTD value) ----
      const revenueFacts = pickDurationFacts(usGaap, [
        'Revenues',
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
        'SalesRevenueNet',
        'SalesRevenueGoodsNet'
      ]);
      const ttm = (concepts: string[]) => trailingTwelveMonths(pickDurationFacts(usGaap, concepts));

      const revenueTTM = trailingTwelveMonths(revenueFacts);
      const netIncomeTTM = ttm(['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic']);
      const operatingIncomeTTM = ttm(['OperatingIncomeLoss']);
      const operatingCashFlowTTM = ttm([
        'NetCashProvidedByUsedInOperatingActivities',
        'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'
      ]);
      const capexTTM = ttm([
        'PaymentsToAcquirePropertyPlantAndEquipment',
        'PaymentsToAcquireProductiveAssets',
        'PaymentsForCapitalImprovements'
      ]);
      const depreciationTTM = ttm([
        'DepreciationDepletionAndAmortization',
        'DepreciationAndAmortization',
        'DepreciationAmortizationAndAccretionNet',
        'Depreciation'
      ]);

      const { latest: latestAnnualRevenue, prior: priorAnnualRevenue } = lastTwoAnnuals(revenueFacts);
      const revenueGrowthYoY = latestAnnualRevenue && priorAnnualRevenue && priorAnnualRevenue.val > 0
        ? parseFloat((((latestAnnualRevenue.val - priorAnnualRevenue.val) / priorAnnualRevenue.val) * 100).toFixed(1))
        : undefined;

      // ---- Point-in-time items: all aligned to the latest balance-sheet date ----
      const balanceSheetDate = latestInstantDate(usGaap, ['Assets']) ?? latestInstantDate(usGaap, ['StockholdersEquity', 'Liabilities']);
      const bs = (concepts: string[], asOf = balanceSheetDate) => instantAt(usGaap, concepts, asOf)?.value;

      const debtAt = (asOf?: string) => {
        const debtCurrent = bs(['DebtCurrent'], asOf);
        const currentMaturities = bs(['LongTermDebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent'], asOf);
        const shortTermBorrowings = bs(['ShortTermBorrowings', 'CommercialPaper', 'OtherShortTermBorrowings'], asOf);
        const shortTerm = debtCurrent ?? (
          currentMaturities !== undefined || shortTermBorrowings !== undefined
            ? (currentMaturities ?? 0) + (shortTermBorrowings ?? 0)
            : undefined
        );

        const longTotalInclCurrent = bs(['LongTermDebt'], asOf);
        const longTerm = bs(['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'], asOf) ?? (
          longTotalInclCurrent !== undefined ? Math.max(0, longTotalInclCurrent - (currentMaturities ?? 0)) : undefined
        );

        const total = shortTerm !== undefined || longTerm !== undefined
          ? (shortTerm ?? 0) + (longTerm ?? 0)
          : longTotalInclCurrent;
        return { shortTerm, longTerm, total };
      };

      const debtNow = debtAt(balanceSheetDate);
      const priorYearDate = balanceSheetDate
        ? new Date(toMs(balanceSheetDate) - 365 * DAY_MS).toISOString().slice(0, 10)
        : undefined;
      const debtPriorYear = priorYearDate ? debtAt(priorYearDate) : undefined;

      const totalAssets = bs(['Assets']);
      const stockholdersEquity = bs([
        'StockholdersEquity',
        'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
        'CommonStockholdersEquity'
      ]);
      let totalLiabilities = bs(['Liabilities']);
      if (totalLiabilities === undefined) {
        const liabAndEquity = bs(['LiabilitiesAndStockholdersEquity']);
        const equityInclNci = bs(['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'StockholdersEquity']);
        if (liabAndEquity !== undefined && equityInclNci !== undefined) totalLiabilities = liabAndEquity - equityInclNci;
      }
      const cashAndEquivalents = bs([
        'CashAndCashEquivalentsAtCarryingValue',
        'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
        'Cash'
      ]);

      // ---- 8-quarter EPS progression (diluted preferred, basic fallback) ----
      const epsFacts = pickDurationFacts(
        usGaap,
        ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted', 'EarningsPerShareBasic'],
        'USD/shares'
      );
      const fiscalYearEnd = latestAnnualRevenue?.end ?? lastTwoAnnuals(epsFacts).latest?.end;
      const recentQuarters = discreteQuarters(epsFacts).slice(-12);
      const quarterlyEPS: SecQuarterlyEPS[] = recentQuarters
        .map((q) => {
          const yearAgoMs = toMs(q.end) - 365 * DAY_MS;
          const yearAgo = recentQuarters.find((p) => Math.abs(toMs(p.end) - yearAgoMs) <= 10 * DAY_MS);
          const yoyChangePercent = yearAgo && yearAgo.val !== 0
            ? parseFloat((((q.val - yearAgo.val) / Math.abs(yearAgo.val)) * 100).toFixed(1))
            : null;
          return {
            quarter: fiscalQuarterLabel(q.end, fiscalYearEnd),
            eps: parseFloat(q.val.toFixed(2)),
            date: q.end,
            yoyChangePercent,
            derived: q.derived
          };
        })
        .slice(-8);

      // Latest 10-K filing metadata
      const latest10K = latestAnnualRevenue ?? lastTwoAnnuals(pickDurationFacts(usGaap, ['NetIncomeLoss', 'ProfitLoss'])).latest;

      return {
        cik,
        entityName,
        sic,
        sicDescription,
        latestRevenueTTM: revenueTTM?.value,
        latestNetIncomeTTM: netIncomeTTM?.value,
        latestOperatingIncomeTTM: operatingIncomeTTM?.value,
        latestOperatingCashFlowTTM: operatingCashFlowTTM?.value,
        capitalExpendituresTTM: capexTTM?.value,
        depreciationAmortizationTTM: depreciationTTM?.value,
        ttmPeriodEnd: revenueTTM?.periodEnd ?? netIncomeTTM?.periodEnd,
        ttmMethod: revenueTTM?.method ?? netIncomeTTM?.method,
        revenueGrowthYoY,
        balanceSheetDate,
        totalAssets,
        totalLiabilities,
        totalDebt: debtNow.total,
        shortTermDebt: debtNow.shortTerm,
        longTermDebt: debtNow.longTerm,
        priorYearTotalDebt: debtPriorYear?.total,
        cashAndEquivalents,
        stockholdersEquity,
        quarterlyEPS,
        latest10KFilingDate: latest10K?.filed,
        fiscalYear: latest10K?.fy,
        fiscalYearEnd
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
        retries: 1,
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
   * Fetches exchange-traded options chain contracts (calls & puts) with open interest, volume, and IV.
   * Completely open, 0 paid API keys.
   */
  public async fetchOptionsChain(ticker: string): Promise<{ calls: any[]; puts: any[]; spotPrice?: number; expirationDate?: number } | null> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    try {
      const auth = await getYahooAuth();
      if (!auth) return null;

      const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(cleanTicker)}?crumb=${encodeURIComponent(auth.crumb)}`;
      const res = await fetchWithRetry(url, {
        timeoutMs: 5000,
        retries: 1,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Cookie': auth.cookie
        }
      });

      if (!res.ok) return null;
      const data = await res.json();
      const result = data?.optionChain?.result?.[0];
      if (!result) return null;

      const spotPrice = result.quote?.regularMarketPrice;
      const opt = result.options?.[0];
      return {
        calls: opt?.calls || [],
        puts: opt?.puts || [],
        spotPrice: typeof spotPrice === 'number' ? spotPrice : undefined,
        expirationDate: opt?.expirationDate
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches authentic float, shares outstanding, and insider/institutional ownership stats.
   * Completely open, 0 paid API keys.
   */
  public async fetchShareStatistics(ticker: string): Promise<{
    floatShares?: number;
    sharesOutstanding?: number;
    heldPercentInsiders?: number;
    heldPercentInstitutions?: number;
    sharesShort?: number;
    shortPercentOfFloat?: number;
  } | null> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    try {
      const auth = await getYahooAuth();
      if (!auth) return null;

      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(cleanTicker)}?crumb=${encodeURIComponent(auth.crumb)}&modules=defaultKeyStatistics,majorHoldersBreakdown`;
      const res = await fetchWithRetry(url, {
        timeoutMs: 5000,
        retries: 1,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Cookie': auth.cookie
        }
      });

      if (!res.ok) return null;
      const data = await res.json();
      const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
      const holders = data?.quoteSummary?.result?.[0]?.majorHoldersBreakdown;

      const floatShares = stats?.floatShares?.raw || stats?.floatShares;
      const sharesOutstanding = stats?.sharesOutstanding?.raw || stats?.sharesOutstanding;
      const heldPercentInsiders = stats?.heldPercentInsiders?.raw ?? stats?.heldPercentInsiders ?? holders?.insidersPercentHeld?.raw;
      const heldPercentInstitutions = stats?.heldPercentInstitutions?.raw ?? stats?.heldPercentInstitutions ?? holders?.institutionsPercentHeld?.raw;
      const sharesShort = stats?.sharesShort?.raw || stats?.sharesShort;
      const shortPercentOfFloat = stats?.shortPercentOfFloat?.raw || stats?.shortPercentOfFloat;

      return {
        floatShares: typeof floatShares === 'number' ? floatShares : undefined,
        sharesOutstanding: typeof sharesOutstanding === 'number' ? sharesOutstanding : undefined,
        heldPercentInsiders: typeof heldPercentInsiders === 'number' ? heldPercentInsiders : undefined,
        heldPercentInstitutions: typeof heldPercentInstitutions === 'number' ? heldPercentInstitutions : undefined,
        sharesShort: typeof sharesShort === 'number' ? sharesShort : undefined,
        shortPercentOfFloat: typeof shortPercentOfFloat === 'number' ? shortPercentOfFloat : undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Unified comprehensive stock intelligence scraping engine.
   * Runs all free zero-touch scrapers concurrently.
   */
  public async scrapeStockIntelligence(ticker: string, companyName?: string): Promise<StockIntelligenceScrapeResult> {
    console.log(`[WebScraper] Executing multi-source web & social scrape for $${ticker}...`);

    const [newsResult, stockTwitsResult, secResult, redditResult, optionResult, shareStatsResult] = await Promise.allSettled([
      this.fetchGoogleNews(ticker, companyName),
      this.fetchStockTwitsSentiment(ticker),
      this.fetchSecDisclosures(ticker),
      this.fetchRedditDiscussions(ticker),
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

    console.log(`[WebScraper] Scraped for $${ticker}: ${news.length} news articles, ${stockTwits.totalMessages} StockTwits messages, ${redditPosts.length} Reddit discussions, SEC CIK: ${secDisclosures?.cik || 'N/A'}, Options contracts: ${(optionChain?.calls?.length || 0) + (optionChain?.puts?.length || 0)}, Float: ${shareStats?.floatShares ? `${(shareStats.floatShares / 1e6).toFixed(1)}M` : 'N/A'}`);

    return {
      ticker: ticker.toUpperCase(),
      news,
      stockTwits,
      redditPosts,
      secDisclosures,
      optionChain,
      shareStats
    };
  }
}

export const webScraper = new WebScraper();
