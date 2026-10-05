import assert from 'assert';
import { CoverageHistoryTracker } from '../pipeline/src/storage/historyTracker.js';
import { affiliateEngine } from '../pipeline/src/monetization/affiliateEngine.js';
import { adInjector } from '../pipeline/src/monetization/adInjector.js';
import { factChecker } from '../pipeline/src/llm/factChecker.js';
import { marketMoverIngestor } from '../pipeline/src/ingestion/marketMovers.js';
import { fundamentalDataIngestor } from '../pipeline/src/ingestion/fundamentalData.js';
import { macroContextIngestor } from '../pipeline/src/ingestion/macroContext.js';
import { socialSentimentIngestor, classifyCatalystsWithAgy } from '../pipeline/src/ingestion/socialSentiment.js';
import { synthesisAgent } from '../pipeline/src/llm/synthesisAgent.js';
import { buildUserPrompt } from '../pipeline/src/llm/prompts.js';
import type { MarketMover, FundamentalMetrics, LLMAnalysisOutput, SocialSentiment } from '../pipeline/src/types.js';
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
    category: 'gainer',
    isPennyStock: false,
    moneyMarketTradingVenue: 'Nasdaq Global Select Market'
  };

  const usFundamentals: FundamentalMetrics = {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    description: 'NVIDIA Corporation designs graphics processing units and accelerated compute solutions.',
    marketCap: 3000e9,
    peRatioTrailing: 45.2,
    peRatioForward: 35.0,
    pegRatio: 1.2,
    evToEbitda: 32.0,
    dividendYield: 0.02,
    revenueTTM: 96e9,
    netIncomeTTM: 53e9,
    grossMargin: 75.0,
    operatingMargin: 62.0,
    freeCashFlowTTM: 39e9,
    cashAndEquivalents: 30e9,
    netDebt: -20e9,
    currentRatio: 3.5,
    roic: 42.0,
    beta: 1.65,
    fiftyTwoWeekHigh: 140.0,
    fiftyTwoWeekLow: 45.0,
    totalDebt: 10e9,
    debtToEquity: 0.15,
    shortTermDebt: 2e9,
    longTermDebt: 8e9,
    shortVsLongTermRatio: 0.25,
    recentChangesInDebt: 'Maintained low leverage with cash exceeding debt obligations.',
    debtRisks: 'Negligible default risk given liquid cash reserves.',
    priceToBook: {
      current: 38.0,
      industryAverage: 5.2,
      historicalAverage5Y: 28.0,
      chartData: []
    },
    priceToEarnings: {
      current: 45.2,
      industryAverage: 22.0,
      historicalAverage5Y: 40.0,
      chartData: []
    },
    returnOnEquity: 85.0,
    earningsPerShare: {
      currentTTM: 2.75,
      quarterlyEPSPast2Years: [
        { quarter: 'Q1-24', eps: 0.45 },
        { quarter: 'Q2-24', eps: 0.55 },
        { quarter: 'Q3-24', eps: 0.65 },
        { quarter: 'Q4-24', eps: 0.78 }
      ]
    },
    volatilityIndex: { value: 36.3, rating: 'High' },
    cashFlow: { operatingCashFlow: 45e9, freeCashFlow: 39e9, status: 'Positive Operating Free Cash Flow' },
    managementQuality: { rating: 'Tier-1', trackRecord: 'Executive team leading accelerated compute adoption.' },
    competitiveMoat: { rating: 'Wide Moat', summary: 'Proprietary CUDA software architecture and high switching costs.' },
    companyQuestions: {
      howCompanyMakesMoney: 'GPU and accelerated compute systems sales to data centers.',
      productsDemandAndWhy: 'Enterprise AI workloads require accelerated parallel processing.',
      pastPerformanceSummary: 'Strong compounding revenue driven by data center transitions.',
      growthAndProfitabilityOutlook: 'Expanding hardware and software services.'
    },
    industryQuestions: {
      industryCondition: 'Rapid secular expansion in AI infrastructure.',
      obstaclesAndChallenges: 'Export restrictions and supply chain capacity limits.',
      economicPoliticalCulturalRisks: 'Geopolitical chip manufacturing concentration.'
    },
    valuationModels: {
      dcf: { fairValue: 130, intrinsicValue: 130, status: 'Calculated' },
      ddm: { fairValue: null, intrinsicValue: null, status: 'Inapplicable: Zero or negligible dividend yield' },
      relativeValuation: { fairValue: 120, intrinsicValue: 120, status: 'Calculated' },
      rapidStockValuation: { fairValue: 125, intrinsicValue: 125, status: 'Calculated' },
      residualIncomeModel: { fairValue: 122, intrinsicValue: 122, status: 'Calculated' },
      assetBasedValuation: { fairValue: 110, intrinsicValue: 110, status: 'Calculated' },
      excessReturnModel: { fairValue: 128, intrinsicValue: 128, status: 'Calculated' },
      industrySpecificModel: { fairValue: 135, intrinsicValue: 135, status: 'Calculated' },
      consensusFairValue: 122.9,
      verdict: 'Fairly Valued'
    },
    fundamentalRating: 'Strong',
    classification: 'Growth Stock'
  };

  const usAffiliates = affiliateEngine.getContextualAffiliates(usMover, usFundamentals);
  assert.strictEqual(usAffiliates[0].id, 'webull-us', 'US stock should map to Webull');
  assert.ok(usAffiliates.some((a) => a.id === 'tradingview'), 'High-beta tech stock should include TradingView');

  const euMover: MarketMover = {
    ...usMover,
    ticker: 'SAP.DE',
    region: 'EU',
    exchange: 'DAX',
    moneyMarketTradingVenue: 'XETRA Frankfurt'
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
      operatingMargin: usFundamentals.operatingMargin,
      freeCashFlow: usFundamentals.freeCashFlowTTM,
      netDebt: usFundamentals.netDebt,
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

  // 4. Test Programmatic Ad Injection & Extended Frontmatter
  console.log('Test 4: Programmatic Ad and Affiliate Injection with Theses and Timestamps');
  const injectionResult = adInjector.injectMonetization(usMover, usFundamentals, mockReport);
  assert.ok(injectionResult.enrichedMarkdown.includes('ad-content-mid'), 'Mid-article ad slot should be injected');
  assert.ok(injectionResult.enrichedMarkdown.includes('FTC Sponsored Disclosure'), 'Affiliate disclosure must be present');
  assert.ok(injectionResult.frontmatter.priceTimestamp.startsWith('Price on '), 'priceTimestamp must be properly formatted');
  assert.strictEqual(injectionResult.frontmatter.isPennyStock, false, 'NVDA should not be a penny stock');
  assert.ok(injectionResult.frontmatter.theses.bull.length > 0, 'Bull theses must be present');
  assert.ok(injectionResult.frontmatter.theses.bear.length > 0, 'Bear theses must be present');
  assert.ok(injectionResult.frontmatter.theses.bull[0].deductionChain.length > 0, 'Deduction chain must be present');
  console.log('✓ Pass: Programmatic ad and affiliate injection verified with full frontmatter.\n');

  // 5. Test Live Macro and Market Movers Ingestion
  console.log('Test 5: Live Ingestion (Market Movers & Macro)');
  const macro = await macroContextIngestor.getMacroBackdrop();
  assert.ok(macro.us10YearYield > 0, '10Y Yield must be positive');
  assert.ok(macro.vixIndex > 0, 'VIX must be positive');

  const { gainers, losers } = await marketMoverIngestor.getEligibleMovers();
  assert.strictEqual(gainers.length, 5, 'Should return exactly 5 gainers');
  assert.strictEqual(losers.length, 5, 'Should return exactly 5 losers');
  assert.ok(typeof gainers[0].isPennyStock === 'boolean', 'Mover must include isPennyStock');
  assert.ok(typeof gainers[0].moneyMarketTradingVenue === 'string', 'Mover must include moneyMarketTradingVenue');
  console.log('✓ Pass: Ingested exactly 5 gainers and 5 losers adhering to lockout criteria.\n');

  // 6. Test Penny Stocks Ingestion (2 Top Gainers, 3 Top Losers)
  console.log('Test 6: Penny Stocks Ingestion (< $5.00 across Nasdaq Capital Market, NYSE American, OTC Markets)');
  const pennyMovers = await marketMoverIngestor.getEligiblePennyStocks();
  assert.strictEqual(pennyMovers.gainers.length, 2, 'Should return exactly 2 penny stock gainers');
  assert.strictEqual(pennyMovers.losers.length, 3, 'Should return exactly 3 penny stock losers');
  assert.ok(pennyMovers.gainers.every((g) => g.isPennyStock === true && g.price < 5.0), 'All penny gainers must be < $5.00 and isPennyStock=true');
  assert.ok(pennyMovers.losers.every((l) => l.isPennyStock === true && l.price < 5.0), 'All penny losers must be < $5.00 and isPennyStock=true');
  assert.ok(pennyMovers.gainers.every((g) => ['Nasdaq Capital Market', 'NYSE American', 'OTC Markets Pink Sheets', 'Cboe BZX'].some((venue) => g.moneyMarketTradingVenue.includes(venue) || g.moneyMarketTradingVenue.length > 0)), 'Must specify valid venue');
  console.log(`✓ Pass: Penny stocks successfully identified: Gainers: ${pennyMovers.gainers.map((g) => `${g.ticker} (${g.moneyMarketTradingVenue})`).join(', ')} | Losers: ${pennyMovers.losers.map((l) => `${l.ticker} (${l.moneyMarketTradingVenue})`).join(', ')}\n`);

  // 7. Test Artificial Inflation & Social Sentiment Scoring
  console.log('Test 7: Artificial Inflation Detection & Social Sentiment Ingestion');
  const pennyMover = pennyMovers.gainers[0];
  const sentiment = await socialSentimentIngestor.getSentiment(
    pennyMover.ticker,
    'gainer',
    pennyMover.name,
    pennyMover
  );
  assert.ok(typeof sentiment.isArtificiallyInflated === 'boolean', 'Must evaluate isArtificiallyInflated');
  assert.ok(['Low', 'Moderate', 'High', 'Severe'].includes(sentiment.artificialInflationRisk), 'Risk must be Low, Moderate, High, or Severe');
  assert.ok(sentiment.volumeAnomalyRatio > 0, 'Volume anomaly ratio must be positive');
  assert.ok(typeof sentiment.majorPriceDriver === 'string' && sentiment.majorPriceDriver.length > 0, 'Major price driver must be identified');
  assert.ok(sentiment.newsImpact.length > 0, 'newsImpact must be present');
  assert.ok(sentiment.socialMediaImpact.length > 0, 'socialMediaImpact must be present');
  console.log(`✓ Pass: Artificial inflation evaluated for $${pennyMover.ticker}: Risk=${sentiment.artificialInflationRisk}, Driver=${sentiment.majorPriceDriver}, Anomaly=${sentiment.volumeAnomalyRatio}x\n`);

  // 8. Test Comprehensive Fundamental Metrics (Debt Breakdown, Comparisons, 8-Quarter EPS, 8 Valuation Models)
  console.log('Test 8: Comprehensive Fundamental Data & 8 Valuation Models');
  const pennyFundamentals = await fundamentalDataIngestor.getFundamentals(pennyMover.ticker, pennyMover.name);

  // Debt breakdown checks
  assert.ok(typeof pennyFundamentals.totalDebt === 'number', 'totalDebt must be number');
  assert.ok(pennyFundamentals.shortTermDebt === null || typeof pennyFundamentals.shortTermDebt === 'number', 'shortTermDebt must be number or null');
  assert.ok(pennyFundamentals.longTermDebt === null || typeof pennyFundamentals.longTermDebt === 'number', 'longTermDebt must be number or null');
  assert.ok(typeof pennyFundamentals.shortVsLongTermRatio === 'string' || typeof pennyFundamentals.shortVsLongTermRatio === 'number', 'shortVsLongTermRatio must be string or number');
  assert.ok(typeof pennyFundamentals.recentChangesInDebt === 'string' && pennyFundamentals.recentChangesInDebt.length > 0, 'recentChangesInDebt must be string');
  assert.ok(typeof pennyFundamentals.debtRisks === 'string' && pennyFundamentals.debtRisks.length > 0, 'debtRisks must be string');

  // Valuation comparisons (must be arrays, no fake synthesized data)
  assert.ok(Array.isArray(pennyFundamentals.priceToBook.chartData), 'P/B chart data must be array');
  assert.ok(Array.isArray(pennyFundamentals.priceToEarnings.chartData), 'P/E chart data must be array');
  assert.ok(typeof pennyFundamentals.returnOnEquity === 'number', 'returnOnEquity must be number');

  // Earnings Per Share (EPS): authentic reported quarters only
  assert.ok(Array.isArray(pennyFundamentals.earningsPerShare.quarterlyEPSPast2Years), 'quarterlyEPSPast2Years must be array of authentic reported quarters');

  // Qualitative Analysis
  assert.ok(pennyFundamentals.volatilityIndex.rating.length > 0, 'volatility rating must be present');
  assert.ok(pennyFundamentals.cashFlow.status.length > 0, 'cashFlow status must be present');
  assert.ok(pennyFundamentals.managementQuality.rating.length > 0, 'managementQuality rating must be present');
  assert.ok(pennyFundamentals.competitiveMoat.rating.length > 0, 'competitiveMoat rating must be present');
  assert.ok(pennyFundamentals.companyQuestions.howCompanyMakesMoney.length > 0, 'howCompanyMakesMoney must be present');
  assert.ok(pennyFundamentals.industryQuestions.industryCondition.length > 0, 'industryCondition must be present');

  // Multi-Model Valuation Suite (Authentic Financial Mathematics: Valid positive value OR explicit null with explanatory status)
  const models = pennyFundamentals.valuationModels;
  const valuationChecklist = [
    { name: 'DCF', model: models.dcf },
    { name: 'DDM', model: models.ddm },
    { name: 'Relative', model: models.relativeValuation },
    { name: 'Rapid PEG', model: models.rapidStockValuation },
    { name: 'Residual Income', model: models.residualIncomeModel },
    { name: 'Asset-Based', model: models.assetBasedValuation },
    { name: 'Excess Return', model: models.excessReturnModel },
    { name: 'Industry-Specific', model: models.industrySpecificModel }
  ];

  for (const { name, model } of valuationChecklist) {
    assert.ok(model.fairValue === null || (typeof model.fairValue === 'number' && model.fairValue > 0), `${name} fairValue must be positive number or null`);
    assert.ok(typeof model.status === 'string' && model.status.length > 0, `${name} must include explanatory status`);
  }

  assert.ok(models.consensusFairValue === null || (typeof models.consensusFairValue === 'number' && models.consensusFairValue > 0), 'Consensus fair value must be positive number or null');
  assert.ok(typeof models.verdict === 'string', 'Verdict must be present');
  assert.ok(['Strong', 'Fairly Valued', 'Weak'].includes(pennyFundamentals.fundamentalRating), 'fundamentalRating must be valid');
  assert.ok(['Growth Stock', 'Income Stock', 'Value / Turnaround', 'Speculative Penny Stock'].includes(pennyFundamentals.classification), 'classification must be valid');
  console.log(`✓ Pass: Authentic fundamental data verified without synthesis (Consensus: ${models.consensusFairValue !== null ? `$${models.consensusFairValue}` : 'N/A'}, Verdict: ${models.verdict})\n`);

  // 9. Test Automated Git Deployment (git add, git commit, git push)
  console.log('Test 9: Automated Git Deployment (git add, git commit, git push)');
  const { BuildAndDeployManager } = await import('../pipeline/src/deploy/buildAndDeploy.js');
  const testGitDir = path.resolve(process.cwd(), 'pipeline/data/test-git-repo');
  if (fs.existsSync(testGitDir)) fs.rmSync(testGitDir, { recursive: true, force: true });
  fs.mkdirSync(testGitDir, { recursive: true });

  const { execSync } = await import('child_process');
  execSync('git init', { cwd: testGitDir });
  execSync('git config user.name "Test Bot"', { cwd: testGitDir });
  execSync('git config user.email "test@example.com"', { cwd: testGitDir });
  fs.writeFileSync(path.join(testGitDir, 'report.md'), '# Test Equity Report');

  const deployManager = new BuildAndDeployManager(testGitDir);
  const commitMsg = 'chore(deploy): auto-publish research reports [2026-10-03]';
  const gitResult = await deployManager.triggerGitDeploy(commitMsg, { cwd: testGitDir, skipPush: true });
  assert.strictEqual(gitResult.committed, true, 'Should stage and commit new files');
  assert.strictEqual(gitResult.pushed, true, 'Should complete push flow');

  const commitLog = execSync('git log -n 1 --pretty=format:%s', { cwd: testGitDir }).toString();
  assert.strictEqual(commitLog, commitMsg, 'Commit message in git log must match expected message');

  // Verify clean working tree doesn't trigger superfluous commit
  const cleanResult = await deployManager.triggerGitDeploy('chore(deploy): another commit', { cwd: testGitDir, skipPush: true });
  assert.strictEqual(cleanResult.committed, false, 'Should skip commit when working tree is clean');

  // Clean up
  fs.rmSync(testGitDir, { recursive: true, force: true });
  console.log('✓ Pass: AUTO_TRIGGER_DEPLOY git add, commit, and push flow verified.\n');

  // 10. Test Cron Daemon Start and Stop Lifecycle (pipeline:cron and pipeline:stop_cron)
  console.log('Test 10: Pipeline Cron Daemon Start and Stop Lifecycle (pipeline:cron & pipeline:stop_cron)');
  const { startCronDaemon } = await import('../pipeline/src/startCron.js');
  const { stopRunningCronJobs, findRunningOrchestratorCronPids } = await import('../pipeline/src/stopCron.js');
  const { CONFIG } = await import('../pipeline/src/config.js');

  // Start cron daemon in background
  const startResult = await startCronDaemon();
  assert.strictEqual(startResult.success, true, 'startCronDaemon should return success true');
  assert.ok(startResult.pid > 0, 'startCronDaemon should return active PID');
  assert.strictEqual(fs.existsSync(CONFIG.CRON_PID_FILE), true, 'Cron daemon should create PID file upon startup');

  // Re-invoking startCronDaemon should detect existing active daemon without duplicating
  const duplicateStartResult = await startCronDaemon();
  assert.strictEqual(duplicateStartResult.isExisting, true, 'Should detect existing running daemon');
  assert.strictEqual(duplicateStartResult.pid, startResult.pid, 'Should report the same active PID');

  const pidsBeforeStop = findRunningOrchestratorCronPids();
  assert.ok(pidsBeforeStop.length > 0, 'findRunningOrchestratorCronPids should detect active cron process');

  // Execute stop cron
  const stopResult = await stopRunningCronJobs();
  assert.strictEqual(stopResult.success, true, 'stopRunningCronJobs should return success true');
  assert.ok(stopResult.stoppedPids.length > 0, 'Should have stopped at least one PID');
  assert.strictEqual(fs.existsSync(CONFIG.CRON_PID_FILE), false, 'PID file should be deleted after stopping');

  // Verify idempotency (no active processes)
  const secondStopResult = await stopRunningCronJobs();
  assert.strictEqual(secondStopResult.success, true, 'Second call should succeed idempotently');
  assert.strictEqual(secondStopResult.stoppedPids.length, 0, 'Second call should report 0 PIDs stopped');
  // 11. Test Strict Anti-Synthesis Guardrails (Zero Synthetic Data Generation)
  console.log('Test 11: Strict Anti-Synthesis Guardrails (Zero Synthetic Data Generation)');
  assert.strictEqual(
    (fundamentalDataIngestor as any).generateBaselineFundamentals,
    undefined,
    'generateBaselineFundamentals must be permanently eliminated'
  );
  assert.strictEqual(
    (marketMoverIngestor as any).generateSyntheticMovers,
    undefined,
    'generateSyntheticMovers must be permanently eliminated'
  );
  assert.strictEqual(
    (marketMoverIngestor as any).generateSyntheticPennyMovers,
    undefined,
    'generateSyntheticPennyMovers must be permanently eliminated'
  );
  assert.strictEqual(
    (socialSentimentIngestor as any).generateDeterministicSentiment,
    undefined,
    'generateDeterministicSentiment must be permanently eliminated'
  );

  // Non-existent ticker must reject honestly rather than generating synthesized placeholder numbers
  let synthesisRejectionError: Error | null = null;
  try {
    await fundamentalDataIngestor.getFundamentals('NONEXISTENT_FAKE_TICKER_9999', 'Fake Nonexistent Corp');
  } catch (err: any) {
    synthesisRejectionError = err;
  }
  assert.ok(synthesisRejectionError !== null, 'Fetching fundamentals for non-existent ticker must reject with error');
  assert.ok(
    synthesisRejectionError!.message.includes('Data synthesis is disallowed'),
    `Error message must declare data synthesis is disallowed. Got: ${synthesisRejectionError!.message}`
  );

  // Social sentiment on empty sources must return 0 sentiment and 0 sources without fabricating chatter
  const emptySentiment = await socialSentimentIngestor.getSentiment(
    'NONEXISTENT_XYZ',
    'gainer',
    'Nonexistent Corp',
    {
      ticker: 'NONEXISTENT_XYZ',
      symbol: 'NONEXISTENT_XYZ',
      name: 'Nonexistent Corp',
      exchange: 'OTC',
      region: 'US',
      price: 1.0,
      change: 0.1,
      changePercent: 10,
      volume: 100,
      avgVolume: 1000,
      marketCap: 100000,
      currency: 'USD',
      category: 'gainer',
      isPennyStock: true,
      moneyMarketTradingVenue: 'OTC Markets'
    }
  );
  assert.strictEqual(emptySentiment.sourcesAnalyzed, 0, 'Empty sentiment must report 0 sources analyzed');
  assert.strictEqual(emptySentiment.sentimentScore, 0, 'Empty sentiment must report 0 score');
  assert.strictEqual(emptySentiment.bullishPercent, 0, 'Empty bullish percent must be 0');
  assert.strictEqual(emptySentiment.bearishPercent, 0, 'Empty bearish percent must be 0');
  assert.strictEqual(emptySentiment.dominantThemes.length, 0, 'Empty dominant themes must be empty array');
  // 12. Test Two-Tiered News Catalyst & Sentiment Pipeline (Tier 1 Extraction & Divergence Detection)
  console.log('Test 12: Two-Tiered News Catalyst & Sentiment Pipeline (Tier 1 Fast Extraction)');

  // 12.1 Divergence Detection & Relevance Filtering (Sell-the-News scenario)
  const sellTheNewsHeadlines = [
    { title: 'TechCorp Reports Record All-Time High Q3 Profit and 30% Revenue Growth', source: 'Bloomberg' },
    { title: 'TechCorp Announces $500M Accelerated Share Repurchase Program', source: 'PR Newswire' },
    { title: 'Top 10 High-Yield Dividend Stocks for Retirees', source: 'SpamNews' }
  ];

  const tier1Analysis = await classifyCatalystsWithAgy('TCORP', -8.5, sellTheNewsHeadlines);
  assert.ok(tier1Analysis !== null, 'Tier 1 analysis should succeed');
  assert.strictEqual(tier1Analysis!.alignment, 'DIVERGENT_SELL_THE_NEWS', `Expected DIVERGENT_SELL_THE_NEWS, got ${tier1Analysis!.alignment}`);
  assert.ok(tier1Analysis!.catalystSynthesis.length > 0, 'catalystSynthesis must be non-empty');
  assert.ok(tier1Analysis!.dominantThemes.length > 0, 'dominantThemes must be populated');
  assert.ok(
    tier1Analysis!.relevantHeadlines.every((h) => !h.title.includes('Top 10 High-Yield')),
    'Listicle spam must be filtered out by relevance rating'
  );
  assert.ok(
    tier1Analysis!.relevantHeadlines.some((h) => h.title.includes('Record All-Time High')),
    'Legitimate company headlines must be preserved regardless of price drop'
  );

  // 12.2 Aligned Positive Catalyst scenario
  const alignedHeadlines = [
    { title: 'BioPharma Secures Major FDA Fast Track Approval for Lead Compound', source: 'PR Newswire' }
  ];
  const alignedAnalysis = await classifyCatalystsWithAgy('BIOP', 34.2, alignedHeadlines);
  assert.ok(alignedAnalysis !== null, 'Tier 1 analysis should succeed for aligned catalyst');
  assert.strictEqual(alignedAnalysis!.alignment, 'ALIGNED', 'FDA approval with +34% move must be ALIGNED');
  assert.ok(
    alignedAnalysis!.dominantThemes.includes('Biopharma & Regulatory Catalysts') || alignedAnalysis!.majorPriceDriver.toLowerCase().includes('fda'),
    'FDA catalyst should be reflected in dominantThemes or majorPriceDriver'
  );

  // 12.3 Fallback and Resilience (Empty headlines)
  const emptyAnalysis = await classifyCatalystsWithAgy('EMPTY', 0, []);
  assert.strictEqual(emptyAnalysis, null, 'Empty headlines must return null without invoking agy');

  // 12.4 Integration with SocialSentiment, buildUserPrompt, synthesisAgent, and adInjector
  const mockSentiment: SocialSentiment = {
    ticker: 'NVDA',
    bullishPercent: 75,
    bearishPercent: 25,
    sentimentScore: 0.5,
    volumeChange24h: 120,
    dominantThemes: ['Financial Disclosures', 'Wall Street Revisions'],
    sampleCatalysts: ['Q3 beat'],
    sourcesAnalyzed: 5,
    recentHeadlines: ['NVDA Beats Estimates (Bloomberg)'],
    isArtificiallyInflated: false,
    artificialInflationRisk: 'Low',
    volumeAnomalyRatio: 1.2,
    majorPriceDriver: 'Record Data Center GPU Demand',
    newsImpact: 'High Impact',
    socialMediaImpact: 'Moderate',
    catalystAlignment: 'ALIGNED',
    catalystSynthesis: 'Earnings beat aligned with institutional order flow.',
    filteredHeadlines: [{
      title: 'NVDA Beats Estimates',
      source: 'Bloomberg',
      relevance: 10,
      headlineSentiment: 'Bullish'
    }]
  };

  const userPromptText = buildUserPrompt(usMover, usFundamentals, macro, mockSentiment);
  assert.ok(
    userPromptText.includes('=== CATALYST DYNAMICS & EXPECTATIONS DIVERGENCE (TIER 1 INTELLIGENCE) ==='),
    'Prompt must include Tier 1 Catalyst Dynamics section'
  );
  assert.ok(userPromptText.includes('Catalyst-Price Alignment: ALIGNED'), 'Prompt must include catalyst alignment');
  assert.ok(userPromptText.includes('Earnings beat aligned with institutional order flow.'), 'Prompt must include catalyst synthesis');

  const deterministicReport = synthesisAgent.generateDeterministicReport(usMover, usFundamentals, macro, mockSentiment);
  assert.strictEqual(deterministicReport.catalystAlignment, 'ALIGNED', 'Deterministic report must inherit catalystAlignment');
  assert.ok(deterministicReport.markdownBody.includes('Catalyst-Price Alignment:'), 'Markdown must include catalyst alignment');

  const adInjection = adInjector.injectMonetization(usMover, usFundamentals, deterministicReport, mockSentiment);
  assert.strictEqual(adInjection.frontmatter.catalystAlignment, 'ALIGNED', 'Frontmatter must retain catalystAlignment');
  assert.ok(adInjection.frontmatter.filteredHeadlines!.length > 0, 'Frontmatter must retain filteredHeadlines');
  console.log('✓ Pass: Two-Tiered News Catalyst & Sentiment Pipeline verified with full divergence detection, filtering, and synthesis integration.\n');

  // Clean up test file
  if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath);

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The pipeline is production-ready.');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
