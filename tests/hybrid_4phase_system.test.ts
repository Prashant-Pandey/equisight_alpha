import assert from 'node:assert/strict';
import {
  buildPhase1GroundTruthPacket,
  formatGroundTruthForPrompt
} from '../pipeline/src/ingestion/phase1GroundTruth.js';
import {
  dialecticDebateEngine,
  formatDebateTranscriptMarkdown
} from '../pipeline/src/llm/dialecticDebate.js';
import {
  riskGuardianEngine,
  formatRiskGuardianMarkdown
} from '../pipeline/src/llm/riskGuardian.js';
import { reflectionEngine } from '../pipeline/src/storage/reflectionEngine.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment
} from '../pipeline/src/types.js';

async function runIntegrationTest() {
  console.log('=== Testing 4-Phase Hybrid Stock Analysis Architecture ===');

  const mover: MarketMover = {
    ticker: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    price: 138.5,
    change: 5.2,
    changePercent: 3.9,
    volume: 68_000_000,
    avgVolume: 45_000_000,
    marketCap: 3_380_000_000_000,
    currency: 'USD',
    category: 'gainer',
    isPennyStock: false,
    moneyMarketTradingVenue: 'NASDAQ Global Select',
    archetype: 'moat',
    archetypeScore: 0.91
  };

  const fundamentals: FundamentalMetrics = {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    industry: 'Semiconductors',
    description: 'Accelerated computing and AI data center infrastructure provider.',
    marketCap: 3_380_000_000_000,
    peRatioTrailing: 52.4,
    peRatioForward: 34.1,
    pegRatio: 1.25,
    evToEbitda: 41.2,
    dividendYield: 0.03,
    revenueTTM: 113_200_000_000,
    netIncomeTTM: 63_000_000_000,
    grossMargin: 75.2,
    operatingMargin: 62.1,
    freeCashFlowTTM: 56_500_000_000,
    cashAndEquivalents: 38_500_000_000,
    netDebt: -28_000_000_000,
    currentRatio: 4.1,
    roic: 68.4,
    beta: 1.65,
    fiftyTwoWeekHigh: 149.76,
    fiftyTwoWeekLow: 75.6,
    totalDebt: 10_500_000_000,
    debtToEquity: 0.19,
    shortTermDebt: 1_250_000_000,
    longTermDebt: 9_250_000_000,
    shortVsLongTermRatio: '12% Short / 88% Long',
    recentChangesInDebt: 'Stable long-term senior notes with ample cash coverage.',
    debtRisks: 'Minimal refinancing wall risk.',
    priceToBook: { current: 51.2, industryAverage: 8.5, historicalAverage5Y: 26.4 },
    priceToEarnings: { current: 52.4, industryAverage: 28.0, historicalAverage5Y: 48.0 },
    returnOnEquity: 115.0,
    earningsPerShare: {
      currentTTM: 2.64,
      quarterlyEPSPast2Years: [
        { quarter: 'Q1', eps: 0.61 },
        { quarter: 'Q2', eps: 0.68 },
        { quarter: 'Q3', eps: 0.81 },
        { quarter: 'Q4', eps: 0.89 }
      ]
    },
    volatilityIndex: { value: 1.65, rating: 'High' },
    cashFlow: { operatingCashFlow: 61_000_000_000, freeCashFlow: 56_500_000_000, status: 'Strong' },
    managementQuality: { rating: 'Exemplary', trackRecord: 'High ROIC capital allocation.' },
    competitiveMoat: {
      rating: 'Wide',
      trend: 'Positive',
      summary: 'CUDA software ecosystem switching costs and proprietary interconnect intangible assets.'
    },
    companyQuestions: {
      howCompanyMakesMoney: 'Data center AI accelerators, networking, and enterprise software.',
      productsDemandAndWhy: 'Hyperscaler AI cluster buildouts.',
      pastPerformanceSummary: 'Triple-digit data center revenue expansion.',
      growthAndProfitabilityOutlook: 'Next-gen architecture ramp.'
    },
    industryQuestions: {
      industryCondition: 'Secular AI infrastructure expansion.',
      obstaclesAndChallenges: 'Export controls and hyperscaler custom silicon.',
      economicPoliticalCulturalRisks: 'Semiconductor tariff and geopolitical supply chain risk.'
    },
    valuationModels: {
      dcf: { intrinsicValue: 152.0, discountRate: 9.8, terminalGrowth: 3.5, upsidePercent: 9.75 },
      ddm: { intrinsicValue: null, applicable: false },
      relativeValuation: { intrinsicValue: 144.0, peerMedianPE: 32.0, multipleType: 'P/E Multiples' },
      rapidStockValuation: { intrinsicValue: 149.0, methodology: 'PEG Multiplier' },
      residualIncomeModel: { intrinsicValue: 146.5, equityCharge: 10.2 },
      assetBasedValuation: { netAssetValue: 28.0, liquidationValue: 21.0 },
      excessReturnModel: { intrinsicValue: 158.0, excessReturnPercent: 58.6 },
      industrySpecificModel: { name: 'EV/Sales', intrinsicValue: 145.0, description: 'Semiconductor EV/Sales' },
      consensusFairValue: 150.0,
      verdict: 'Undervalued'
    },
    fundamentalRating: 'Strong',
    classification: 'Growth Stock',
    uncertaintyRating: 'High',
    starRating: 4,
    starRatingString: '★★★★'
  };

  const macro: MacroBackdrop = {
    us10YearYield: 4.2,
    us2YearYield: 4.0,
    fedFundsRate: 4.75,
    ecbPolicyRate: 3.25,
    vixIndex: 18.5,
    crudeOilWTI: 71.2,
    cpiInflationRate: 2.6,
    dxyDollarIndex: 103.8,
    sectorImpactSummary: 'Stable real yields support long-duration secular growth.'
  };

  const sentiment: SocialSentiment = {
    ticker: 'NVDA',
    bullishPercent: 74,
    bearishPercent: 26,
    sentimentScore: 0.48,
    volumeChange24h: 51.1,
    dominantThemes: ['AI CapEx', 'Blackwell Ramp'],
    sampleCatalysts: ['Hyperscaler CapEx expansion'],
    sourcesAnalyzed: 42,
    isArtificiallyInflated: false,
    artificialInflationRisk: 'Moderate',
    volumeAnomalyRatio: 1.51,
    majorPriceDriver: 'Institutional Accumulation',
    newsImpact: 'Positive',
    socialMediaImpact: 'Moderate',
    optionGammaImbalance: {
      imbalanceRatio: 1.85,
      netGammaExposure: 'Moderate Call Gamma Skew',
      riskLevel: 'Moderate',
      status: 'Active Call Positioning'
    },
    freeFloatConcentration: {
      freeFloatShares: 23_500_000_000,
      freeFloatPercent: 96.0,
      floatTurnoverRatio: 0.0029,
      concentrationLevel: 'Low',
      status: 'Deep Institutional Float'
    },
    catalystAlignment: 'ALIGNED'
  };

  // 1. Test Phase 1: Deterministic Ground Truth Packet
  const phase1Packet = buildPhase1GroundTruthPacket(mover, fundamentals, macro, sentiment);
  assert.equal(phase1Packet.ticker, 'NVDA');
  assert.ok(phase1Packet.forensicAudit.compositeScore >= 0);
  assert.ok(phase1Packet.forensicAudit.weaponizedBearFlags.length > 0, 'Must extract weaponized bear flags for Phase 2');
  assert.ok(Object.keys(phase1Packet.immutableNumericLedger).length > 10, 'Must populate immutable numeric ledger');
  const promptBlock = formatGroundTruthForPrompt(phase1Packet);
  assert.ok(promptBlock.includes('IMMUTABLE NUMERIC LEDGER') || promptBlock.includes('NVDA'));
  console.log('✓ Phase 1 (Deterministic Ground Truth Engine) verified.');

  // 2. Test Phase 4 -> Phase 2 Feedback Retrieval
  const lessons = reflectionEngine.getLessonsForDebate({
    ticker: 'NVDA',
    sector: 'Technology',
    archetype: 'moat',
    limit: 4
  });
  assert.ok(Array.isArray(lessons) && lessons.length > 0, 'Phase 4 must supply lessons to Phase 2');
  console.log(`✓ Phase 4 -> Phase 2 Memory Retrieval verified (${lessons.length} lessons loaded).`);

  // 3. Test Phase 2: Adversarial Dialectic Debate Engine
  const debate = await dialecticDebateEngine.runAdversarialDebate({
    mover,
    fundamentals,
    macro,
    sentiment,
    forensicSummaryText: promptBlock,
    weaponizedBearFlags: phase1Packet.forensicAudit.weaponizedBearFlags,
    institutionalMemoryLessons: lessons
  });
  assert.equal(debate.ticker, 'NVDA');
  assert.ok(debate.rounds.length >= 2, 'Debate must execute multiple adversarial rounds');
  assert.ok(debate.stressTestedBullTheses.length >= 2, 'Debate must output stress-tested Bull theses');
  assert.ok(debate.stressTestedBearTheses.length >= 2, 'Debate must output stress-tested Bear theses');
  const debateMd = formatDebateTranscriptMarkdown(debate);
  assert.ok(debateMd.includes('Adversarial Bull vs. Bear Dialectical Cross-Examination'));
  console.log(`✓ Phase 2 (Adversarial Dialectic Debate Engine) verified (${debate.roundsCompleted} rounds, edge: ${debate.winningEdge}).`);

  // 4. Test Phase 3: Independent Risk Guardian & Uncertainty Calibration
  const riskAudit = await riskGuardianEngine.auditAndCalibrateRisk({
    mover,
    fundamentals,
    macro,
    sentiment,
    forensicCompositeScore: phase1Packet.forensicAudit.compositeScore,
    forensicSeverity: phase1Packet.forensicAudit.compositeSeverity,
    forensicActiveAlertsCount: phase1Packet.forensicAudit.activeAlerts.length,
    debateWinningEdge: debate.winningEdge,
    unresolvedDebateTensions: debate.unresolvedTensions
  });
  assert.equal(riskAudit.ticker, 'NVDA');
  assert.ok(riskAudit.compositeRiskScore >= 1 && riskAudit.compositeRiskScore <= 10);
  assert.ok(riskAudit.riskProfiles.conservative && riskAudit.riskProfiles.moderate && riskAudit.riskProfiles.aggressive);
  const riskMd = formatRiskGuardianMarkdown(riskAudit);
  assert.ok(riskMd.includes('Independent Risk Guardian & Uncertainty Governance Audit'));
  console.log(`✓ Phase 3 (Synthesis & Risk Governance Engine) verified (status: ${riskAudit.governanceStatus}, score: ${riskAudit.compositeRiskScore}/10).`);

  // 5. Test Phase 4: Snapshot Recording & Post-Settlement Evaluation
  const snapshot = reflectionEngine.recordAnalysisSnapshot({
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    archetype: 'moat',
    priceAtCoverage: 138.5,
    consensusFairValue: 150.0,
    fundamentalRating: 'Strong',
    starRating: 4,
    uncertaintyRating: riskAudit.calibratedUncertaintyRating,
    forensicCompositeScore: phase1Packet.forensicAudit.compositeScore,
    debateWinningEdge: debate.winningEdge,
    riskGovernanceStatus: riskAudit.governanceStatus,
    bullCoreThesis: debate.stressTestedBullTheses[0]?.point,
    bearCoreThesis: debate.stressTestedBearTheses[0]?.point,
    slug: '2026-10-25-nvda-gain-4-percent-fundamental-analysis'
  });
  assert.equal(snapshot.ticker, 'NVDA');

  const reflection = reflectionEngine.evaluateReportOutcome(snapshot, 149.2, 8.4);
  assert.equal(reflection.ticker, 'NVDA');
  assert.equal(reflection.directionalAccuracy, 'ACCURATE');
  assert.ok(reflection.distilledInstitutionalLesson.length > 20);
  console.log(`✓ Phase 4 (Continuous Learning & Episodic Reflection Engine) verified (outcome: ${reflection.directionalAccuracy}, return: +${reflection.realizedReturnPct}%).`);

  console.log('=== ALL 4 PHASES PASSED END-TO-END INTEGRATION VERIFICATION ===');
}

runIntegrationTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
