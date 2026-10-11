import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { SitemapGenerator, sitemapGenerator } from '../pipeline/src/seo/sitemapGenerator.js';
import { reportGenerator } from '../pipeline/src/storage/reportGenerator.js';
import type { MarketMover, FinalReportFrontmatter } from '../pipeline/src/types.js';

async function runSitemapTests() {
  console.log('🧪 Starting EquiSight Alpha Sitemap Feature Test Suite...\n');

  // Test 1: Core Static Route Ingestion
  console.log('Test 1: Static Route Ingestion & Defaults');
  const generator = new SitemapGenerator('https://equisight-alpha.com');
  const staticEntries = generator.collectStaticEntries();

  const staticUrls = staticEntries.map((e) => e.loc);
  assert.ok(staticUrls.includes('https://equisight-alpha.com/'), 'Home page must be included');
  assert.ok(staticUrls.includes('https://equisight-alpha.com/reports/'), '/reports/ must be included');
  assert.ok(staticUrls.includes('https://equisight-alpha.com/definitions/'), '/definitions/ must be included');
  assert.ok(staticUrls.includes('https://equisight-alpha.com/disclaimer/'), '/disclaimer/ must be included');

  const homeEntry = staticEntries.find((e) => e.loc === 'https://equisight-alpha.com/');
  assert.strictEqual(homeEntry?.priority, 1.0, 'Home page priority must be 1.0');
  assert.strictEqual(homeEntry?.changefreq, 'daily', 'Home page changefreq must be daily');

  const reportsEntry = staticEntries.find((e) => e.loc === 'https://equisight-alpha.com/reports/');
  assert.strictEqual(reportsEntry?.priority, 0.9, 'Reports hub priority must be 0.9');
  console.log('✓ Pass: Core static routes correctly indexed with standard priorities.\n');

  // Test 2: Dynamic Report & Ticker Hub Route Extraction in Isolation
  console.log('Test 2: Dynamic Report & Ticker Extraction with Mock Directory');
  const tempReportsDir = path.resolve(process.cwd(), 'pipeline/data/test-sitemap-reports');
  if (fs.existsSync(tempReportsDir)) fs.rmSync(tempReportsDir, { recursive: true, force: true });
  fs.mkdirSync(tempReportsDir, { recursive: true });

  const sampleReportContent = `---
title: "Tesla Stock Surge: Valuation & Analysis"
slug: "tsla-surge-valuation-analysis"
publishDate: "2026-10-10T12:00:00.000Z"
ticker: "TSLA"
companyName: "Tesla, Inc."
exchange: "NASDAQ"
category: "gainer"
movePercent: 8.5
currentPrice: 245.5
marketCap: 780000000000
---
# Tesla Analysis Content
`;
  fs.writeFileSync(path.join(tempReportsDir, '2026-10-10-tsla-surge-valuation-analysis.md'), sampleReportContent);

  const { reportEntries, tickerEntries } = generator.collectReportAndTickerEntries(tempReportsDir);

  const reportUrls = reportEntries.map((e) => e.loc);
  assert.ok(reportUrls.includes('https://equisight-alpha.com/reports/2026-10-10-tsla-surge-valuation-analysis/'), 'Report analysis URL must be generated');
  assert.ok(reportUrls.includes('https://equisight-alpha.com/reports/2026-10-10-tsla-surge-valuation-analysis/print/'), 'Report print URL must be generated');
  assert.ok(reportUrls.includes('https://equisight-alpha.com/institutional-summary/2026-10-10-tsla-surge-valuation-analysis/'), 'Report institutional summary URL must be generated');

  const tickerUrls = tickerEntries.map((e) => e.loc);
  assert.ok(tickerUrls.includes('https://equisight-alpha.com/tickers/tsla/'), 'Ticker hub URL must be generated in lowercase');

  // Verify priorities
  const reportMain = reportEntries.find((e) => e.loc.endsWith('/reports/2026-10-10-tsla-surge-valuation-analysis/'));
  assert.strictEqual(reportMain?.priority, 0.9, 'Report main URL priority must be 0.9');
  const tickerEntry = tickerEntries.find((e) => e.loc.endsWith('/tickers/tsla/'));
  assert.strictEqual(tickerEntry?.priority, 0.7, 'Ticker hub priority must be 0.7');

  console.log('✓ Pass: Isolated report directory scanned and generated 3 report routes + 1 ticker route.\n');

  // Test 3: XML Schema Validation & Escaping
  console.log('Test 3: XML Schema Validation & Protocol Conformance');
  const xmlOutput = generator.buildUrlSetXml([...staticEntries, ...reportEntries, ...tickerEntries]);

  assert.ok(xmlOutput.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must contain XML declaration');
  assert.ok(xmlOutput.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Must include sitemap 0.9 namespace');
  assert.ok(xmlOutput.includes('<loc>https://equisight-alpha.com/reports/2026-10-10-tsla-surge-valuation-analysis/</loc>'), 'Must enclose loc tags');
  assert.ok(xmlOutput.includes('<lastmod>'), 'Must enclose lastmod tags');
  assert.ok(xmlOutput.includes('<changefreq>'), 'Must enclose changefreq tags');
  assert.ok(xmlOutput.includes('<priority>'), 'Must enclose priority tags');

  const indexXml = generator.buildSitemapIndexXml([
    { loc: 'https://equisight-alpha.com/sitemap-0.xml', lastmod: '2026-10-10T12:00:00.000Z' }
  ]);
  assert.ok(indexXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Index must contain XML declaration');
  assert.ok(indexXml.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Must contain sitemapindex root');
  assert.ok(indexXml.includes('<loc>https://equisight-alpha.com/sitemap-0.xml</loc>'), 'Must link to sitemap-0.xml');
  console.log('✓ Pass: XML schema conforms to Sitemaps XML protocol.\n');

  // Test 4: Generation to Target Output Directories
  console.log('Test 4: Sitemap File Writing Across Target Directories');
  const tempOutputDir = path.resolve(process.cwd(), 'pipeline/data/test-sitemap-output');
  if (fs.existsSync(tempOutputDir)) fs.rmSync(tempOutputDir, { recursive: true, force: true });
  fs.mkdirSync(tempOutputDir, { recursive: true });

  const result = await generator.generateSitemap({
    reportsDir: tempReportsDir,
    outputDirs: [tempOutputDir],
    siteUrl: 'https://equisight-alpha.com'
  });

  assert.strictEqual(result.success, true, 'Sitemap generation must report success');
  assert.ok(result.urlCount >= 8, `Expected at least 8 URLs (4 static + 3 report + 1 ticker), got ${result.urlCount}`);
  assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'sitemap-0.xml')), true, 'sitemap-0.xml must be created');
  assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'sitemap.xml')), true, 'sitemap.xml must be created');
  assert.strictEqual(fs.existsSync(path.join(tempOutputDir, 'sitemap-index.xml')), true, 'sitemap-index.xml must be created');

  const writtenSitemapXml = fs.readFileSync(path.join(tempOutputDir, 'sitemap-0.xml'), 'utf-8');
  assert.ok(writtenSitemapXml.includes('https://equisight-alpha.com/tickers/tsla/'), 'Written XML must contain TSLA ticker');
  console.log('✓ Pass: Sitemaps written correctly to target directory with valid contents.\n');

  // Test 5: End-to-End Triggering from reportGenerator.saveReport
  console.log('Test 5: Automatic Sitemap Update via reportGenerator.saveReport');
  const mockMover: MarketMover = {
    ticker: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    price: 130.0,
    change: 5.0,
    changePercent: 4.0,
    volume: 30000000,
    avgVolume: 25000000,
    marketCap: 3200000000000,
    currency: 'USD',
    category: 'gainer',
    isPennyStock: false,
    moneyMarketTradingVenue: 'Nasdaq Global Select Market'
  };

  const mockFrontmatter: FinalReportFrontmatter = {
    title: 'NVIDIA Q3 Analysis: Accelerating Moat',
    description: 'NVIDIA fundamental valuation breakdown.',
    publishDate: new Date().toISOString(),
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    sector: 'Technology',
    industry: 'Semiconductors',
    category: 'gainer',
    movePercent: 4.0,
    currentPrice: 130.0,
    currency: 'USD',
    marketCap: 3200000000000,
    peRatio: 45.0,
    forwardPE: 35.0,
    dividendYield: 0.02,
    riskScore: 4,
    tags: ['NVDA', 'AI', 'Semiconductors'],
    keywords: ['NVDA stock'],
    affiliates: [],
    adSlots: { topBanner: true, midArticle: true, bottomBanner: true },
    socialHooks: { twitter: [], redditTitle: '', telegram: '' },
    isPennyStock: false,
    moneyMarketTradingVenue: 'Nasdaq Global Select Market',
    priceTimestamp: 'Price on Oct 10, 2026',
    totalDebt: 10000000000,
    debtToEquity: 0.15,
    shortTermDebt: 2000000000,
    longTermDebt: 8000000000,
    shortVsLongTermRatio: 0.2,
    recentChangesInDebt: 'Low debt profile',
    debtRisks: 'Negligible',
    priceToBook: { current: 35.0, industryAverage: 6.0, historicalAverage5Y: 25.0 },
    priceToEarnings: { current: 45.0, industryAverage: 25.0, historicalAverage5Y: 35.0 },
    returnOnEquity: 80.0,
    earningsPerShare: { currentTTM: 2.8, quarterlyEPSPast2Years: [] },
    volatilityIndex: { value: 35.0, rating: 'High' },
    cashFlow: { operatingCashFlow: 40000000000, freeCashFlow: 35000000000, status: 'Positive Operating Free Cash Flow' },
    managementQuality: { rating: 'Tier-1', trackRecord: 'High Execution' },
    competitiveMoat: { rating: 'Wide Moat', summary: 'Software and Hardware ecosystem' },
    companyQuestions: { howCompanyMakesMoney: 'GPU sales', productsDemandAndWhy: 'AI training', pastPerformanceSummary: 'Strong', growthAndProfitabilityOutlook: 'Rapid' },
    industryQuestions: { industryCondition: 'Secular growth', obstaclesAndChallenges: 'Export controls', economicPoliticalCulturalRisks: 'Geopolitics' },
    valuationModels: {
      dcf: { fairValue: 135, intrinsicValue: 135, status: 'Calculated' },
      ddm: { fairValue: null, intrinsicValue: null, status: 'Inapplicable' },
      relativeValuation: { fairValue: 125, intrinsicValue: 125, status: 'Calculated' },
      rapidStockValuation: { fairValue: 130, intrinsicValue: 130, status: 'Calculated' },
      residualIncomeModel: { fairValue: 128, intrinsicValue: 128, status: 'Calculated' },
      assetBasedValuation: { fairValue: 110, intrinsicValue: 110, status: 'Calculated' },
      excessReturnModel: { fairValue: 132, intrinsicValue: 132, status: 'Calculated' },
      industrySpecificModel: { fairValue: 138, intrinsicValue: 138, status: 'Calculated' },
      consensusFairValue: 128.5,
      verdict: 'Fairly Valued'
    },
    fundamentalRating: 'Strong',
    classification: 'Growth Stock',
    isArtificiallyInflated: false,
    artificialInflationRisk: 'Low',
    volumeAnomalyRatio: 1.1,
    majorPriceDriver: 'Demand expansion',
    newsImpact: 'High',
    socialMediaImpact: 'Moderate',
    theses: { bull: [], bear: [] }
  };

  const reportSlug = 'nvda-q3-accelerating-moat-test';
  const savedReportPath = await reportGenerator.saveReport(
    mockMover,
    reportSlug,
    mockFrontmatter,
    '## NVDA Test Report Body Content'
  );

  assert.ok(fs.existsSync(savedReportPath), 'Report file must exist on disk');

  // Verify that public/sitemap-0.xml now includes the NVDA report
  const publicSitemap0 = path.resolve(process.cwd(), 'public/sitemap-0.xml');
  assert.ok(fs.existsSync(publicSitemap0), 'public/sitemap-0.xml must exist');
  const publicXmlContent = fs.readFileSync(publicSitemap0, 'utf-8');

  const actualSlug = path.basename(savedReportPath, '.md');
  assert.ok(
    publicXmlContent.includes(actualSlug),
    `Sitemap must contain newly saved report slug: ${actualSlug}`
  );
  assert.ok(
    publicXmlContent.includes('/tickers/nvda/'),
    'Sitemap must contain newly saved ticker /tickers/nvda/'
  );
  assert.ok(
    publicXmlContent.includes(`/institutional-summary/${actualSlug}/`),
    'Sitemap must contain institutional summary route for new report'
  );
  assert.ok(
    publicXmlContent.includes(`/reports/${actualSlug}/print/`),
    'Sitemap must contain print route for new report'
  );

  // Clean up mock report file
  if (fs.existsSync(savedReportPath)) {
    fs.unlinkSync(savedReportPath);
  }
  // Regenerate sitemap once more to restore baseline state
  await sitemapGenerator.generateSitemap();
  console.log('✓ Pass: reportGenerator.saveReport automatically ran sitemap feature and indexed new report.\n');

  // Test 6: Search Engine Ping Resilience
  console.log('Test 6: Graceful Search Engine Ping Handling');
  const pingRes = await generator.pingSearchEngines('https://equisight-alpha.com/sitemap-index.xml');
  assert.ok(typeof pingRes.google === 'boolean', 'Google ping result must be boolean');
  assert.ok(typeof pingRes.bing === 'boolean', 'Bing ping result must be boolean');
  console.log('✓ Pass: pingSearchEngines executed safely without unhandled exceptions.\n');

  // Clean up mock directories
  if (fs.existsSync(tempReportsDir)) fs.rmSync(tempReportsDir, { recursive: true, force: true });
  if (fs.existsSync(tempOutputDir)) fs.rmSync(tempOutputDir, { recursive: true, force: true });

  console.log('🎉 ALL SITEMAP FEATURE TESTS PASSED SUCCESSFULLY!\n');
}

runSitemapTests().catch((err) => {
  console.error('❌ Sitemap test suite failed:', err);
  process.exit(1);
});
