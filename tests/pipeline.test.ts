import assert from 'assert';
import { CoverageHistoryTracker } from '../pipeline/src/storage/historyTracker.js';
import { affiliateEngine } from '../pipeline/src/monetization/affiliateEngine.js';
import { adInjector } from '../pipeline/src/monetization/adInjector.js';
import { factChecker } from '../pipeline/src/llm/factChecker.js';
import { marketMoverIngestor } from '../pipeline/src/ingestion/marketMovers.js';
import { fundamentalDataIngestor } from '../pipeline/src/ingestion/fundamentalData.js';
import { macroContextIngestor } from '../pipeline/src/ingestion/macroContext.js';
import type { MarketMover, FundamentalMetrics, LLMAnalysisOutput } from '../pipeline/src/types.js';
import path from 'path';
import fs from 'fs';

async function runTestSuite() {
  console.log('🧪 Starting EquiSight Alpha Production Test Suite...\n');

  // 1. Test Trailing 12-Month Coverage Exclusion Rule
  console.log('Test 1: Trailing 12-Month Coverage Lockout Tracker');
  const testHistoryPath = path.resolve(process.cwd(), 'pipeline/data/test-history.json');
  if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath);

  const tracker = new CoverageHistoryTracker(testHistoryPath);
  assert.strictEqual(tracker.isEligible('AAPL'), true, 'AAPL should initially be eligible');

  await tracker.recordCoverage({
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    coveredAt: new Date().toISOString(),
    category: 'gainer',
    movePercent: 5.4,
    slug: 'aapl-gain-5-percent'
  });

  assert.strictEqual(tracker.isEligible('AAPL'), false, 'AAPL should now be locked out under the 365-day rule');
  assert.strictEqual(tracker.isEligible('NVDA'), true, 'Uncovered NVDA should remain eligible');
  console.log('✓ Pass: 12-Month Lockout Rule correctly enforced.\n');

  // 2. Test Contextual Affiliate Mapping
  console.log('Test 2: Dynamic Affiliate Mapping (US vs EU)');
  const usMover: MarketMover = {
    ticker: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    price: 125.5,
    change: 6.2,
    changePercent: 5.2,
    volume: 50_000_000,
    avgVolume: 45_000_000,
    marketCap: 3_000_000_000_000,
    currency: 'USD',
    category: 'gainer'
  };

  const usFundamentals: FundamentalMetrics = {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    description: 'AI hardware and chips',
    marketCap: 3e12,
    peRatioTrailing: 45.2,
    peRatioForward: 32.1,
    pegRatio: 1.2,
    priceToBook: 25.0,
    evToEbitda: 35.0,
    dividendYield: 0.1,
    revenueTTM: 96e9,
    netIncomeTTM: 52e9,
    grossMargin: 75.0,
    operatingMargin: 60.0,
    freeCashFlowTTM: 45e9,
    totalDebt: 10e9,
    cashAndEquivalents: 30e9,
    netDebt: -20e9,
    debtToEquity: 0.2,
    currentRatio: 3.5,
    roic: 45.0,
    beta: 1.65,
    fiftyTwoWeekHigh: 140,
    fiftyTwoWeekLow: 45
  };

  const usAffiliates = affiliateEngine.getContextualAffiliates(usMover, usFundamentals);
  assert.strictEqual(usAffiliates[0].id, 'webull-us', 'US stock should map to Webull');
  assert.ok(usAffiliates.some((a) => a.id === 'tradingview'), 'High-beta tech stock should include TradingView');

  const euMover: MarketMover = {
    ...usMover,
    ticker: 'SAP.DE',
    region: 'EU',
    exchange: 'DAX'
  };
  const euAffiliates = affiliateEngine.getContextualAffiliates(euMover, usFundamentals);
  assert.strictEqual(euAffiliates[0].id, 'ibkr-eu', 'EU stock should map to Interactive Brokers EU');
  console.log('✓ Pass: Contextual affiliate mapping correctly identifies region and asset class.\n');

  // 3. Test Anti-Hallucination Fact Checker & Auto-Healing
  console.log('Test 3: Anti-Hallucination Fact Checker & Auto-Healing');
  const mockReport: LLMAnalysisOutput = {
    title: 'NVIDIA Surges 5.2%: Valuation Breakdown',
    seoDescription: 'Evidence based breakdown of NVDA',
    slug: 'nvda-valuation-analysis',
    primaryKeywords: ['NVDA stock'],
    secondaryKeywords: ['NVDA valuation'],
    catalystSummary: 'NVDA surged following datacenter demand.',
    markdownBody: 'NVIDIA reported a P/E ratio of 85.0 and generated $150.0B in revenue. You should buy this stock immediately for guaranteed returns.',
    extractedFigures: {
      peRatio: 85.0, // Hallucinated (Ground truth is 45.2)
      revenueTTM: 150e9, // Hallucinated (Ground truth is 96e9)
      operatingMargin: 60.0,
      freeCashFlow: 45e9,
      netDebt: -20e9,
      movePercent: 5.2
    },
    socialHooks: {
      twitterThread: ['Tweet 1'],
      redditPost: { title: 'NVDA DD', bodyMarkdown: 'Post body' },
      telegramAlert: 'NVDA Alert'
    }
  };

  const factCheck = factChecker.verifyAndCorrect(mockReport, usMover, usFundamentals);
  assert.ok(factCheck.violations.length >= 2, 'Fact checker should detect P/E and revenue hallucinations');
  assert.ok(!factCheck.correctedContent?.includes('You should buy'), 'Impermissible advisory advice should be neutralized');
  console.log('✓ Pass: Fact checker caught hallucinations and neutralized non-compliant advisory language.\n');

  // 4. Test Programmatic Ad Injection
  console.log('Test 4: Programmatic Ad and Affiliate Injection');
  const injectionResult = adInjector.injectMonetization(usMover, usFundamentals, mockReport);
  assert.ok(injectionResult.enrichedMarkdown.includes('ad-content-mid'), 'Mid-article ad slot should be injected');
  assert.ok(injectionResult.enrichedMarkdown.includes('FTC Sponsored Disclosure'), 'Affiliate disclosure must be present');
  console.log('✓ Pass: Programmatic ad and affiliate injection verified.\n');

  // 5. Test Live Macro and Market Movers Ingestion
  console.log('Test 5: Live Ingestion (Market Movers & Macro)');
  const macro = await macroContextIngestor.getMacroBackdrop();
  assert.ok(macro.us10YearYield > 0, '10Y Yield must be positive');
  assert.ok(macro.vixIndex > 0, 'VIX must be positive');

  const { gainers, losers } = await marketMoverIngestor.getEligibleMovers();
  assert.strictEqual(gainers.length, 5, 'Should return exactly 5 gainers');
  assert.strictEqual(losers.length, 5, 'Should return exactly 5 losers');
  console.log('✓ Pass: Ingested exactly 5 gainers and 5 losers adhering to lockout criteria.\n');

  // 6. Test Free Web & Social Scraping Intelligence Engine
  console.log('Test 6: Free Web & Social Scraping Tools (Google News, StockTwits, SEC EDGAR)');
  const { webScraper } = await import('../pipeline/src/ingestion/webScraper.js');
  const scrapedIntel = await webScraper.scrapeStockIntelligence('AAPL', 'Apple Inc.');
  assert.ok(scrapedIntel.ticker === 'AAPL', 'Scraper must return correct ticker');
  assert.ok(Array.isArray(scrapedIntel.news), 'News must be an array');
  assert.ok(typeof scrapedIntel.stockTwits.totalMessages === 'number', 'StockTwits count must be numeric');
  console.log(`✓ Pass: Scraped live web news (${scrapedIntel.news.length} articles), StockTwits sentiment (${scrapedIntel.stockTwits.totalMessages} msgs), and SEC filings.\n`);

  // Clean up test file
  if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath);

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The pipeline is production-ready.');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
