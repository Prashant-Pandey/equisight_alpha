import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  ArchetypeScreener,
  archetypeScreener,
  computeCrossSectionalZScores,
  computePiotroskiFScore,
  computeAltmanZScore,
  computeRsi14,
  computeRealizedVolatility30Day,
  type ArchetypeCandidate
} from '../pipeline/src/ingestion/archetypeScreener.js';
import { marketMoverIngestor } from '../pipeline/src/ingestion/marketMovers.js';
import { CoverageHistoryTracker } from '../pipeline/src/storage/historyTracker.js';
import {
  parseArchetypeFromArgv,
  getScheduledDayArchetype
} from '../pipeline/src/orchestrator.js';

async function runArchetypeTestSuite() {
  console.log('🧪 Starting Institutional Equity Selection Archetype Test Suite...\n');

  // =========================================================================
  // Test 1: Layer 0 - Universal Eligibility & Liquidity Gate
  // =========================================================================
  console.log('--- Test 1: Universal Eligibility & Liquidity Gate ---');
  const screener = new ArchetypeScreener({ ignoreLockout: true });

  // Baseline qualified candidate
  const qualifiedCandidate: ArchetypeCandidate = {
    ticker: 'QUAL',
    symbol: 'QUAL',
    name: 'Qualified Institutional Corp',
    exchange: 'NYSE',
    price: 85.0,
    change: 1.0,
    changePercent: 1.2,
    volume: 2_500_000,
    avgVolume: 2_000_000,
    marketCap: 45_000_000_000, // $45B
    sector: 'Technology',
    industry: 'Software',
    securityType: 'CS',
    country: 'US',
    hasContinuousSecFilings: true
  };

  const qualRes = screener.passesUniversalGate(qualifiedCandidate);
  assert.strictEqual(qualRes.passed, true, 'Fully qualified candidate must pass Universal Gate');

  // Check 1.1: Rejection of OTC / Pink Sheets
  const otcCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'OTCP',
    exchange: 'OTC'
  };
  const otcRes = screener.passesUniversalGate(otcCandidate);
  assert.strictEqual(otcRes.passed, false, 'OTC exchange must be rejected');
  assert.ok(otcRes.reasons.some((r) => r.includes('OTC excluded')), 'Rejection reason must note OTC exclusion');

  // Check 1.2: Rejection of Non-Common Shares (e.g. ETF / ADR)
  const etfCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'SPYQ',
    securityType: 'ETF'
  };
  const etfRes = screener.passesUniversalGate(etfCandidate);
  assert.strictEqual(etfRes.passed, false, 'ETF must be rejected');
  assert.ok(etfRes.reasons.some((r) => r.includes('not Common Stock')), 'Must require Common Stock');

  // Check 1.3: Rejection of Market Cap < $2.0B
  const smallCapCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'SMAL',
    marketCap: 1_200_000_000 // $1.2B
  };
  const smallRes = screener.passesUniversalGate(smallCapCandidate);
  assert.strictEqual(smallRes.passed, false, 'Sub-$2B market cap must be rejected');
  assert.ok(smallRes.reasons.some((r) => r.includes('$2.0B universal floor')));

  // Check 1.4: Rejection of Share Price < $10.00
  const pennyCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'PENY',
    price: 4.80
  };
  const pennyRes = screener.passesUniversalGate(pennyCandidate);
  assert.strictEqual(pennyRes.passed, false, 'Sub-$10 price must be rejected');
  assert.ok(pennyRes.reasons.some((r) => r.includes('$10.00 universal floor')));

  // Check 1.5: Rejection of ADTV < 500,000 shares/day
  const illiquidCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'ILLQ',
    avgVolume: 250_000,
    volume: 250_000
  };
  const illiquidRes = screener.passesUniversalGate(illiquidCandidate);
  assert.strictEqual(illiquidRes.passed, false, 'Sub-500k ADTV must be rejected');
  assert.ok(illiquidRes.reasons.some((r) => r.includes('500,000 shares/day floor')));

  // Check 1.6: Rejection of ADDV < $15.0 Million/day (Price * Volume)
  const lowDollarVolCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    ticker: 'LDV',
    price: 12.0,
    avgVolume: 600_000 // ADDV = $7.2M < $15M
  };
  const lowDollarRes = screener.passesUniversalGate(lowDollarVolCandidate);
  assert.strictEqual(lowDollarRes.passed, false, 'Sub-$15M ADDV must be rejected');
  assert.ok(lowDollarRes.reasons.some((r) => r.includes('$15.0M/day floor')));

  console.log('✓ Pass: Layer 0 Universal Gate rigorously excludes uninvestable / penny / illiquid equities.\n');

  // =========================================================================
  // Test 2: Failure Modes & Guardrails (§9)
  // =========================================================================
  console.log('--- Test 2: Failure Modes & Guardrails (§9) ---');

  // Check 2.1: Earnings Blackout Window (<48h) for Non-PEAD vs PEAD
  const nearEarningsCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    hasEarningsWithin48Hours: true
  };
  const guardMoat = screener.passesGuardrails(nearEarningsCandidate, 'moat');
  assert.strictEqual(guardMoat.passed, false, 'Moat archetype must enforce 48h earnings blackout');

  const guardPead = screener.passesGuardrails(nearEarningsCandidate, 'pead');
  assert.strictEqual(guardPead.passed, true, 'PEAD archetype is catalyst-driven and permits earnings announcements');

  // Check 2.2: M&A Cash Buyout Distortion (30-day realized volatility < 0.2% or Merger Agreement)
  const buyoutCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    realizedVolatility30Day: 0.001 // 0.1% volatility (frozen arbitrage stock)
  };
  const guardBuyout = screener.passesGuardrails(buyoutCandidate, 'quant');
  assert.strictEqual(guardBuyout.passed, false, 'Frozen M&A cash buyout stock must be rejected');
  assert.ok(guardBuyout.reasons.some((r) => r.includes('cash buyout arbitrage freeze')));

  const mergerAgreementCandidate: ArchetypeCandidate = {
    ...qualifiedCandidate,
    hasMergerAgreement: true
  };
  const guardMerger = screener.passesGuardrails(mergerAgreementCandidate, 'moat');
  assert.strictEqual(guardMerger.passed, false, 'Pending merger agreement must be rejected');

  // Check 2.3: Tie-Breaking Rule (§9.4)
  const candidateA: any = {
    ticker: 'TIE_A',
    score: 1.5000,
    institutionalOwnershipPct: 85.0, // Higher institutional sponsorship wins
    realizedVolatility30Day: 0.22
  };
  const candidateB: any = {
    ticker: 'TIE_B',
    score: 1.5000,
    institutionalOwnershipPct: 65.0,
    realizedVolatility30Day: 0.20
  };
  const tieBreakInst = screener.compareCandidates(candidateA, candidateB);
  assert.ok(tieBreakInst < 0, 'Candidate A with higher institutional ownership (85% vs 65%) must rank higher');

  // When institutional ownership is equal, lower 30-day realized volatility wins
  const candidateC: any = {
    ticker: 'TIE_C',
    score: 1.5000,
    institutionalOwnershipPct: 80.0,
    realizedVolatility30Day: 0.15 // Lower vol wins
  };
  const candidateD: any = {
    ticker: 'TIE_D',
    score: 1.5000,
    institutionalOwnershipPct: 80.0,
    realizedVolatility30Day: 0.28
  };
  const tieBreakVol = screener.compareCandidates(candidateC, candidateD);
  assert.ok(tieBreakVol < 0, 'Candidate C with lower volatility (15% vs 28%) must rank higher');

  console.log('✓ Pass: Earnings blackout, M&A cash buyout exclusion, and tie-breaking algorithms verified.\n');

  // =========================================================================
  // Test 3: Archetype 1 - Wide Moat at a Discount (§3)
  // =========================================================================
  console.log('--- Test 3: Archetype 1 - Wide Moat at a Discount (§3) ---');
  const baselinePool = screener.getBaselineCandidatePool();
  const moatResult = screener.screenMoatStocks(baselinePool);

  assert.strictEqual(moatResult.archetype, 'moat');
  assert.strictEqual(moatResult.selected.length, 5, 'Exactly 5 stocks must be selected for Archetype 1');

  // Validate criteria for all selected stocks
  for (const stock of moatResult.selected) {
    assert.ok(stock.marketCap >= 5_000_000_000, `${stock.ticker} must satisfy Market Cap >= $5B`);
    assert.ok((stock.roic5YrAvg ?? 0) >= 15.0, `${stock.ticker} must satisfy 5-Yr Avg ROIC >= 15%`);
    assert.ok((stock.operatingMarginTTM ?? 0) >= 15.0, `${stock.ticker} must satisfy Operating Margin >= 15%`);
    assert.ok((stock.opMarginStdDev5Yr ?? 0) < 4.0, `${stock.ticker} must satisfy Margin StdDev < 4%`);
    assert.ok((stock.netDebtToEbitda ?? 0) < 2.5, `${stock.ticker} must satisfy Net Debt / EBITDA < 2.5x`);
  }

  // Validate Sector Diversification Constraint: Max 2 stocks per GICS sector
  const sectorCountMap = new Map<string, number>();
  for (const s of moatResult.selected) {
    const count = (sectorCountMap.get(s.sector) || 0) + 1;
    sectorCountMap.set(s.sector, count);
    assert.ok(count <= 2, `Sector "${s.sector}" must have <= 2 stocks, got ${count}`);
  }

  console.log(`✓ Pass: Archetype 1 selected exactly 5 stocks: ${moatResult.selected.map((s) => `${s.ticker} (ROIC: ${s.roic5YrAvg}%, Score: ${s.score})`).join(', ')}\n`);

  // =========================================================================
  // Test 4: Archetype 2 - Earnings Catalyst & PEAD (§4)
  // =========================================================================
  console.log('--- Test 4: Archetype 2 - Earnings Catalyst & PEAD (§4) ---');
  const peadResult = screener.screenPeadStocks(baselinePool);

  assert.strictEqual(peadResult.archetype, 'pead');
  assert.strictEqual(peadResult.selected.length, 5, 'Exactly 5 stocks must be selected for Archetype 2');

  for (const stock of peadResult.selected) {
    assert.ok((stock.daysSinceEarnings ?? 0) >= 1 && (stock.daysSinceEarnings ?? 0) <= 5, `${stock.ticker} earnings window must be 1-5 trading days`);
    assert.ok((stock.epsSurprisePct ?? 0) >= 5.0, `${stock.ticker} EPS surprise must be >= +5%`);
    assert.ok((stock.revenueSurprisePct ?? 0) >= 2.0, `${stock.ticker} Revenue surprise must be >= +2%`);
    assert.ok((stock.rvol ?? 0) >= 2.0, `${stock.ticker} RVOL must be >= 2.0x`);
    assert.ok((stock.guidanceRevisionNextQuarter ?? 0) > 0, `${stock.ticker} Guidance revision must be positive`);
    assert.ok((stock.postEarningsMovePct ?? 0) >= 2.5, `${stock.ticker} Post-earnings move must be >= +2.5%`);
  }

  // Validate Industry Diversification Constraint: Max 1 stock per industry
  const industryCountMap = new Map<string, number>();
  for (const s of peadResult.selected) {
    const ind = s.industry.toLowerCase().trim();
    const count = (industryCountMap.get(ind) || 0) + 1;
    industryCountMap.set(ind, count);
    assert.ok(count <= 1, `Industry "${s.industry}" must have <= 1 stock, got ${count}`);
  }

  console.log(`✓ Pass: Archetype 2 selected exactly 5 stocks: ${peadResult.selected.map((s) => `${s.ticker} (EPS: +${s.epsSurprisePct}%, RVOL: ${s.rvol}x, Score: ${s.score})`).join(', ')}\n`);

  // =========================================================================
  // Test 5: Archetype 3 - Contrarian Blue-Chip Pullbacks (§5)
  // =========================================================================
  console.log('--- Test 5: Archetype 3 - Contrarian Blue-Chip Pullbacks (§5) ---');
  const contrarianResult = screener.screenContrarianStocks(baselinePool);

  assert.strictEqual(contrarianResult.archetype, 'contrarian');
  assert.strictEqual(contrarianResult.selected.length, 5, 'Exactly 5 stocks must be selected for Archetype 3');

  for (const stock of contrarianResult.selected) {
    assert.ok(stock.isSp500OrNasdaq100, `${stock.ticker} must be an S&P 500 / NASDAQ-100 constituent`);
    assert.ok((stock.rsi14 ?? 50) <= 35.0, `${stock.ticker} 14-day RSI must be <= 35 (oversold)`);
    assert.ok((stock.drawdown52Wk ?? 0) >= 15.0 && (stock.drawdown52Wk ?? 0) <= 35.0, `${stock.ticker} Drawdown must be between 15% and 35%`);
    assert.ok((stock.piotroskiFScore ?? 0) >= 7, `${stock.ticker} Piotroski F-Score must be >= 7`);
    assert.ok((stock.altmanZScore ?? 0) > 2.99, `${stock.ticker} Altman Z-Score must be > 2.99 (Safe Zone)`);
    assert.ok((stock.freeCashFlowTTM ?? 0) > 0, `${stock.ticker} Free Cash Flow must be > 0`);
  }

  // Validate Sector Diversification: Max 2 per GICS sector
  const contrarianSectorMap = new Map<string, number>();
  for (const s of contrarianResult.selected) {
    const count = (contrarianSectorMap.get(s.sector) || 0) + 1;
    contrarianSectorMap.set(s.sector, count);
    assert.ok(count <= 2, `Sector "${s.sector}" must have <= 2 stocks, got ${count}`);
  }

  console.log(`✓ Pass: Archetype 3 selected exactly 5 stocks: ${contrarianResult.selected.map((s) => `${s.ticker} (RSI: ${s.rsi14}, Altman-Z: ${s.altmanZScore}, Score: ${s.score})`).join(', ')}\n`);

  // =========================================================================
  // Test 6: Archetype 4 - Multi-Factor Quantitative Composite (§6)
  // =========================================================================
  console.log('--- Test 6: Archetype 4 - Multi-Factor Quantitative Composite (§6) ---');
  const quantResult = screener.screenQuantStocks(baselinePool);

  assert.strictEqual(quantResult.archetype, 'quant');
  assert.strictEqual(quantResult.selected.length, 5, 'Exactly 5 stocks must be selected for Archetype 4');

  for (const stock of quantResult.selected) {
    assert.ok(stock.pillarScores, `${stock.ticker} must contain 4 pillar scores`);
    assert.ok(typeof stock.pillarScores.quality === 'number');
    assert.ok(typeof stock.pillarScores.value === 'number');
    assert.ok(typeof stock.pillarScores.momentum === 'number');
    assert.ok(typeof stock.pillarScores.health === 'number');
  }

  // Validate Strict Sector Dispersion: Max 1 stock per GICS sector
  const quantSectorMap = new Map<string, number>();
  for (const s of quantResult.selected) {
    const count = (quantSectorMap.get(s.sector) || 0) + 1;
    quantSectorMap.set(s.sector, count);
    assert.strictEqual(count, 1, `Archetype 4 strict sector dispersion: sector "${s.sector}" must have exactly 1 stock`);
  }

  console.log(`✓ Pass: Archetype 4 selected exactly 5 stocks: ${quantResult.selected.map((s) => `${s.ticker} [${s.sector}] (Score: ${s.score})`).join(', ')}\n`);

  // =========================================================================
  // Test 7: Full 20-Stock Archetype Execution (5 per Archetype)
  // =========================================================================
  console.log('--- Test 7: Full 20-Stock Multi-Strategy Execution (Archetype "all") ---');
  const allArchetypeMovers = await screener.getArchetypeMovers('all', 5);

  assert.strictEqual(allArchetypeMovers.length, 20, 'Archetype "all" must select exactly 20 high-conviction stocks');

  const archetypesPresent = new Set(allArchetypeMovers.map((m) => m.archetype));
  assert.ok(archetypesPresent.has('moat'), 'Must include moat stocks');
  assert.ok(archetypesPresent.has('pead'), 'Must include pead stocks');
  assert.ok(archetypesPresent.has('contrarian'), 'Must include contrarian stocks');
  assert.ok(archetypesPresent.has('quant'), 'Must include quant stocks');

  // Verify MarketMover format integrity
  for (const mover of allArchetypeMovers) {
    assert.ok(mover.ticker, 'Ticker must be present');
    assert.ok(mover.price >= 10.0, 'Price must be >= $10.00');
    assert.ok(mover.marketCap >= 2_000_000_000, 'Market cap must be >= $2.0B');
    assert.strictEqual(mover.isPennyStock, false, 'No penny stocks allowed');
    assert.ok(typeof mover.archetypeScore === 'number', 'Archetype score must be defined');
    assert.ok(mover.archetypeThesis && mover.archetypeThesis.length > 10, 'Archetype thesis must be generated');
  }

  console.log(`✓ Pass: 20-stock execution produced exactly 5 stocks per archetype with full MarketMover schema.\n`);

  // =========================================================================
  // Test 8: MarketMoverIngestor & Orchestrator CLI Integration
  // =========================================================================
  console.log('--- Test 8: MarketMoverIngestor & Orchestrator CLI Integration ---');

  // Test getArchetypeMovers via marketMoverIngestor
  const moatMovers = await marketMoverIngestor.getArchetypeMovers('moat', 5, { ignoreLockout: true });
  assert.strictEqual(moatMovers.length, 5, 'marketMoverIngestor.getArchetypeMovers("moat") must return 5 stocks');
  assert.strictEqual(moatMovers[0].archetype, 'moat');

  // Test CLI Flag Parsing
  assert.strictEqual(parseArchetypeFromArgv(['--archetype=moat']), 'moat');
  assert.strictEqual(parseArchetypeFromArgv(['--archetype', 'pead']), 'pead');
  assert.strictEqual(parseArchetypeFromArgv(['--archetype=contrarian']), 'contrarian');
  assert.strictEqual(parseArchetypeFromArgv(['--archetype', 'quant']), 'quant');
  assert.strictEqual(parseArchetypeFromArgv(['--archetype=all']), 'all');
  assert.strictEqual(parseArchetypeFromArgv(['--run-now']), null);

  // Test Schedule Rotation: Monday=moat, Tuesday=pead, Wednesday=contrarian, Thursday=quant, Friday=all
  const monday = new Date('2026-10-12T12:00:00Z'); // Monday
  const tuesday = new Date('2026-10-13T12:00:00Z'); // Tuesday
  const wednesday = new Date('2026-10-14T12:00:00Z'); // Wednesday
  const thursday = new Date('2026-10-15T12:00:00Z'); // Thursday
  const friday = new Date('2026-10-16T12:00:00Z'); // Friday

  assert.strictEqual(getScheduledDayArchetype(monday), 'moat');
  assert.strictEqual(getScheduledDayArchetype(tuesday), 'pead');
  assert.strictEqual(getScheduledDayArchetype(wednesday), 'contrarian');
  assert.strictEqual(getScheduledDayArchetype(thursday), 'quant');
  assert.strictEqual(getScheduledDayArchetype(friday), 'all');

  console.log('✓ Pass: Orchestrator weekday rotation and CLI argument parsing verified.\n');

  // =========================================================================
  // Test 9: Mathematical Formulas (Piotroski, Altman, RSI, Volatility, Z-Scores)
  // =========================================================================
  console.log('--- Test 9: Mathematical Formula Engines ---');

  // Piotroski F-Score
  const fScore = computePiotroskiFScore({
    netIncomeTTM: 100,
    operatingCashFlowTTM: 120, // Accruals quality: CFO > NI
    totalAssetsCurrent: 1000,
    longTermDebtCurrent: 100,
    currentRatioCurrent: 2.0,
    sharesCurrent: 50,
    grossMarginCurrent: 40,
    assetTurnoverCurrent: 1.2
  });
  assert.ok(fScore >= 7, `Expected high F-Score for healthy operational metrics, got ${fScore}`);

  // Altman Z-Score
  const zScore = computeAltmanZScore({
    workingCapital: 200,
    totalAssets: 1000,
    operatingIncomeEBIT: 150,
    marketCap: 2000,
    totalLiabilities: 400,
    revenue: 1200
  });
  assert.ok(zScore > 2.99, `Expected Altman Z-score in safe zone (>2.99), got ${zScore}`);

  // RSI 14-day
  const upwardPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
  const rsiHigh = computeRsi14(upwardPrices);
  assert.ok(rsiHigh > 70, `Monotonically increasing prices must produce RSI > 70, got ${rsiHigh}`);

  const downwardPrices = [115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
  const rsiLow = computeRsi14(downwardPrices);
  assert.ok(rsiLow < 30, `Monotonically decreasing prices must produce RSI < 30, got ${rsiLow}`);

  // Cross-sectional Z-Score calculation
  const zScores = computeCrossSectionalZScores([10, 20, 30]);
  assert.strictEqual(zScores[1], 0, 'Mean element in symmetrical vector must have Z-score = 0');
  assert.ok(zScores[0] < 0 && zScores[2] > 0, 'Left element must be negative, right positive');

  console.log('✓ Pass: All quantitative mathematical engines verified.\n');

  // =========================================================================
  // Test 10: Pipeline:run 20-Stock Execution Guarantee (5 from Each Category)
  // =========================================================================
  console.log('--- Test 10: Pipeline:run 20-Stock Execution Guarantee (5 from each category) ---');
  const pipelineRunMovers = await marketMoverIngestor.getArchetypeMovers('all', 5);

  assert.strictEqual(pipelineRunMovers.length, 20, 'pipeline:run must output exactly 20 stocks after filtering');

  const categoryCounts: Record<string, number> = {};
  const seenTickers = new Set<string>();

  for (const m of pipelineRunMovers) {
    assert.ok(m.archetype, `Stock $${m.ticker} must have an assigned archetype category`);
    categoryCounts[m.archetype] = (categoryCounts[m.archetype] || 0) + 1;

    assert.ok(!seenTickers.has(m.ticker), `Stock $${m.ticker} must be unique (duplicate found across categories)`);
    seenTickers.add(m.ticker);
  }

  assert.strictEqual(categoryCounts['moat'], 5, 'Must output exactly 5 stocks from moat category');
  assert.strictEqual(categoryCounts['pead'], 5, 'Must output exactly 5 stocks from pead category');
  assert.strictEqual(categoryCounts['contrarian'], 5, 'Must output exactly 5 stocks from contrarian category');
  assert.strictEqual(categoryCounts['quant'], 5, 'Must output exactly 5 stocks from quant category');

  console.log(`✓ Pass: pipeline:run outputs exactly 20 unique stocks with 5 from each category:`);
  console.log(`  - Moat (5): ${pipelineRunMovers.filter((m) => m.archetype === 'moat').map((m) => m.ticker).join(', ')}`);
  console.log(`  - PEAD (5): ${pipelineRunMovers.filter((m) => m.archetype === 'pead').map((m) => m.ticker).join(', ')}`);
  console.log(`  - Contrarian (5): ${pipelineRunMovers.filter((m) => m.archetype === 'contrarian').map((m) => m.ticker).join(', ')}`);
  console.log(`  - Quant (5): ${pipelineRunMovers.filter((m) => m.archetype === 'quant').map((m) => m.ticker).join(', ')}\n`);

  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL INSTITUTIONAL EQUITY SELECTION ARCHETYPE TESTS PASSED (100%)');
  console.log('════════════════════════════════════════════════════════════════════════\n');
}

runArchetypeTestSuite().catch((err) => {
  console.error('✗ Archetype Test Suite Failed:', err);
  process.exit(1);
});
