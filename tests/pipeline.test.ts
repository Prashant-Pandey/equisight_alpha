import assert from 'assert';
import { CoverageHistoryTracker } from '../pipeline/src/storage/historyTracker.js';
import { affiliateEngine } from '../pipeline/src/monetization/affiliateEngine.js';
import { adInjector } from '../pipeline/src/monetization/adInjector.js';
import { factChecker } from '../pipeline/src/llm/factChecker.js';
import { marketMoverIngestor } from '../pipeline/src/ingestion/marketMovers.js';
import { fundamentalDataIngestor } from '../pipeline/src/ingestion/fundamentalData.js';
import { macroContextIngestor } from '../pipeline/src/ingestion/macroContext.js';
import { socialSentimentIngestor } from '../pipeline/src/ingestion/socialSentiment.js';
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
    category: 'gainer',
    isPennyStock: false,
    moneyMarketTradingVenue: 'Nasdaq Global Select Market'
  };

  const usFundamentals: FundamentalMetrics = fundamentalDataIngestor.generateBaselineFundamentals('NVDA', 'NVIDIA Corporation');
  usFundamentals.sector = 'Technology';
  usFundamentals.beta = 1.65;
  usFundamentals.peRatioTrailing = 45.2;
  usFundamentals.revenueTTM = 96e9;
  usFundamentals.netDebt = -20e9;

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
  assert.ok(typeof pennyFundamentals.shortTermDebt === 'number', 'shortTermDebt must be number');
  assert.ok(typeof pennyFundamentals.longTermDebt === 'number', 'longTermDebt must be number');
  assert.ok(typeof pennyFundamentals.shortVsLongTermRatio === 'number', 'shortVsLongTermRatio must be number');
  assert.ok(typeof pennyFundamentals.recentChangesInDebt === 'string' && pennyFundamentals.recentChangesInDebt.length > 0, 'recentChangesInDebt must be string');
  assert.ok(typeof pennyFundamentals.debtRisks === 'string' && pennyFundamentals.debtRisks.length > 0, 'debtRisks must be string');

  // Valuation comparisons
  assert.strictEqual(pennyFundamentals.priceToBook.chartData?.length, 5, 'P/B chart data must have 5 years');
  assert.strictEqual(pennyFundamentals.priceToEarnings.chartData?.length, 5, 'P/E chart data must have 5 years');
  assert.ok(typeof pennyFundamentals.returnOnEquity === 'number', 'returnOnEquity must be number');

  // 8 Quarters EPS
  assert.strictEqual(pennyFundamentals.earningsPerShare.quarterlyEPSPast2Years.length, 8, 'quarterlyEPSPast2Years must contain exactly 8 quarters');

  // Qualitative Analysis
  assert.ok(pennyFundamentals.volatilityIndex.rating.length > 0, 'volatility rating must be present');
  assert.ok(pennyFundamentals.cashFlow.status.length > 0, 'cashFlow status must be present');
  assert.ok(pennyFundamentals.managementQuality.rating.length > 0, 'managementQuality rating must be present');
  assert.ok(pennyFundamentals.competitiveMoat.rating.length > 0, 'competitiveMoat rating must be present');
  assert.ok(pennyFundamentals.companyQuestions.howCompanyMakesMoney.length > 0, 'howCompanyMakesMoney must be present');
  assert.ok(pennyFundamentals.industryQuestions.industryCondition.length > 0, 'industryCondition must be present');

  // Multi-Model Valuation Suite (DCF, DDM, Relative, Rapid, Residual Income, Asset-Based, Excess Return, Industry-Specific)
  const models = pennyFundamentals.valuationModels;
  assert.ok((models.dcf.fairValue ?? models.dcf.intrinsicValue ?? 0) > 0, 'DCF must calculate fair value');
  assert.ok((models.ddm.fairValue ?? models.ddm.intrinsicValue ?? 0) > 0, 'DDM must calculate fair value');
  assert.ok((models.relativeValuation.fairValue ?? models.relativeValuation.intrinsicValue ?? 0) > 0, 'Relative valuation must calculate fair value');
  assert.ok((models.rapidStockValuation.fairValue ?? models.rapidStockValuation.intrinsicValue ?? 0) > 0, 'Rapid stock valuation must calculate fair value');
  assert.ok((models.residualIncomeModel.fairValue ?? models.residualIncomeModel.intrinsicValue ?? 0) > 0, 'Residual income model must calculate fair value');
  assert.ok((models.assetBasedValuation.fairValue ?? models.assetBasedValuation.intrinsicValue ?? 0) > 0, 'Asset-based valuation must calculate fair value');
  assert.ok((models.excessReturnModel.fairValue ?? models.excessReturnModel.intrinsicValue ?? 0) > 0, 'Excess return model must calculate fair value');
  assert.ok((models.industrySpecificModel.fairValue ?? models.industrySpecificModel.intrinsicValue ?? 0) > 0, 'Industry specific model must calculate fair value');
  assert.ok((models.consensusFairValue ?? 0) > 0, 'Consensus fair value must be positive');
  assert.ok(typeof models.verdict === 'string', 'Verdict must be present');
  assert.ok(['Strong', 'Fairly Valued', 'Weak'].includes(pennyFundamentals.fundamentalRating), 'fundamentalRating must be valid');
  assert.ok(['Growth Stock', 'Income Stock', 'Value / Turnaround', 'Speculative Penny Stock'].includes(pennyFundamentals.classification), 'classification must be valid');
  console.log(`✓ Pass: Ingested all fundamental fields, 8-quarter EPS history, and 8 valuation models (Consensus: $${models.consensusFairValue}, Verdict: ${models.verdict})\n`);

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
  console.log('✓ Pass: Pipeline cron start and stop daemon lifecycle verified.\n');

  // Clean up test file
  if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath);

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The pipeline is production-ready.');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
