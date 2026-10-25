import assert from 'assert';
import {
  TITLE_AND_EXEC_SCHEMA,
  TRADING_ACTIVITY_SCHEMA,
  BALANCE_SHEET_SOLVENCY_SCHEMA,
  PROFITABILITY_OPERATING_SCHEMA,
  MOAT_AND_COMPETITOR_SCHEMA,
  VALUATION_ENGINE_SCHEMA,
  BULL_BEAR_THESES_SCHEMA
} from '../pipeline/src/llm/schemas.js';
import {
  buildTitleAndExecSystemPrompt,
  buildTitleAndExecUserPrompt,
  buildTradingActivitySystemPrompt,
  buildTradingActivityUserPrompt,
  buildBalanceSheetSolvencySystemPrompt,
  buildBalanceSheetSolvencyUserPrompt,
  buildProfitabilityOperatingSystemPrompt,
  buildProfitabilityOperatingUserPrompt,
  buildMoatAndCompetitorSystemPrompt,
  buildMoatAndCompetitorUserPrompt,
  buildValuationEngineSystemPrompt,
  buildValuationEngineUserPrompt,
  buildBullBearThesesSystemPrompt,
  buildBullBearThesesUserPrompt
} from '../pipeline/src/llm/prompts.js';
import {
  titleAndExecAgent,
  tradingActivityAgent,
  balanceSheetSolvencyAgent,
  profitabilityOperatingAgent,
  moatAndCompetitorAgent,
  valuationEngineAgent,
  bullBearThesesAgent,
  type SubSectionAgentContext
} from '../pipeline/src/llm/subSectionAgents.js';
import { synthesisAgent } from '../pipeline/src/llm/synthesisAgent.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  TitleAndExecOutput,
  TradingActivityOutput,
  BalanceSheetSolvencyOutput,
  ProfitabilityOperatingOutput,
  MoatAndCompetitorOutput,
  ValuationEngineOutput,
  BullBearThesesOutput
} from '../pipeline/src/types.js';

console.log('🧪 Running Specialized Sub-Section Agents & Modular LLM Invocations Test Suite...\n');

// Mock fixtures
const mockMover: MarketMover = {
  ticker: 'NVDA',
  symbol: 'NVDA',
  name: 'NVIDIA Corporation',
  exchange: 'NASDAQ',
  region: 'US',
  price: 135.50,
  change: 6.50,
  changePercent: 5.04,
  volume: 45_000_000,
  avgVolume: 35_000_000,
  marketCap: 3_300_000_000_000,
  currency: 'USD',
  category: 'gainer',
  isPennyStock: false,
  moneyMarketTradingVenue: 'Nasdaq Global Select Market'
};

const mockFundamentals: FundamentalMetrics = {
  ticker: 'NVDA',
  companyName: 'NVIDIA Corporation',
  sector: 'Technology',
  industry: 'Semiconductors',
  description: 'NVIDIA designs accelerated computing and AI hardware/software stacks.',
  marketCap: 3.3e12,
  peRatioTrailing: 48.5,
  peRatioForward: 32.0,
  pegRatio: 1.2,
  evToEbitda: 35.0,
  dividendYield: 0.05,
  revenueTTM: 96e9,
  netIncomeTTM: 53e9,
  grossMargin: 75.5,
  operatingMargin: 61.2,
  freeCashFlowTTM: 45e9,
  cashAndEquivalents: 31e9,
  netDebt: -20e9,
  currentRatio: 3.5,
  roic: 58.0,
  beta: 1.65,
  fiftyTwoWeekHigh: 140.0,
  fiftyTwoWeekLow: 75.0,
  totalDebt: 11e9,
  debtToEquity: 0.18,
  shortTermDebt: 1.2e9,
  longTermDebt: 9.8e9,
  shortVsLongTermRatio: '11% Short / 89% Long',
  recentChangesInDebt: 'Maintained low leverage with standard senior notes structure.',
  debtRisks: 'Negligible solvency risk; operating cash flow covers debt obligations over 4x.',
  priceToBook: {
    current: 45.0,
    industryAverage: 12.0,
    historicalAverage5Y: 28.0,
    chartData: []
  },
  priceToEarnings: {
    current: 48.5,
    industryAverage: 28.0,
    historicalAverage5Y: 55.0,
    chartData: []
  },
  returnOnEquity: 115.0,
  earningsPerShare: {
    currentTTM: 2.80,
    quarterlyEPSPast2Years: [
      { quarter: 'Q1-25', eps: 0.61, beat: true },
      { quarter: 'Q2-25', eps: 0.68, beat: true },
      { quarter: 'Q3-25', eps: 0.78, beat: true },
      { quarter: 'Q4-25', eps: 0.81, beat: true }
    ]
  },
  classification: 'Growth Stock',
  starRating: 4,
  starRatingString: '★★★★☆',
  uncertaintyRating: 'High',
  priceToFairValue: 0.91,
  fiveStarPrice: 110.0,
  oneStarPrice: 185.0,
  valuationModels: {
    dcf: { fairValue: 155.0, upsidePercent: 14.4, modelName: '3-stage fade model', fadeYears: 15, stage1GrowthRate: 20, discountRate: 8.5 },
    ddm: { fairValue: 30.0, upsidePercent: -77.8, status: 'Inapplicable for high-growth tech' },
    rapidStockValuation: { fairValue: 145.0, upsidePercent: 7.0, status: 'Rapid PEG multiplier' },
    relativeValuation: { fairValue: 140.0, upsidePercent: 3.3, status: 'Peer multiple valuation' },
    residualIncomeModel: { fairValue: 150.0, upsidePercent: 10.7, status: 'Edwards-Bell-Ohlson model' },
    assetBasedValuation: { fairValue: 25.0, upsidePercent: -81.5, status: 'NAV liquidation floor' },
    industrySpecificModel: { fairValue: 152.0, upsidePercent: 12.2, status: 'Semiconductor asset capacity' },
    excessReturnModel: { fairValue: 158.0, upsidePercent: 16.6, status: 'EVA Spread model' },
    consensusFairValue: 148.50,
    verdict: 'Modestly Undervalued'
  },
  managementQuality: {
    rating: 'Exemplary',
    trackRecord: 'Founder-led execution with world-class GPU and software ecosystem leadership.'
  },
  competitiveMoat: {
    rating: 'Wide',
    trend: 'Positive',
    summary: 'Entrenched CUDA software lock-in and high switching costs across AI hyperscalers.',
    sources: {
      intangibleAssets: { rating: 'High', substantiation: 'Proprietary TensorRT and CUDA architectures.' },
      switchingCosts: { rating: 'Wide', substantiation: 'CUDA software developers and enterprise workflows locked in.' },
      networkEffect: { rating: 'High', substantiation: 'Millions of AI engineers code exclusively in CUDA ecosystem.' },
      costAdvantage: { rating: 'High', substantiation: 'Massive scale manufacturing volume with TSMC.' },
      efficientScale: { rating: 'None', substantiation: 'Market size supports competing hardware architectures.' }
    }
  },
  competitorBenchmarking: {
    peers: [
      { ticker: 'AMD', name: 'Advanced Micro Devices', marketCap: 250e9, peRatio: 45.0, evToEbitda: 32.0, moat: 'Narrow', roic: 12.0 },
      { ticker: 'INTC', name: 'Intel Corporation', marketCap: 95e9, peRatio: null, evToEbitda: 14.0, moat: 'None', roic: -2.5 }
    ],
    commentary: 'NVIDIA commands significant margin and ROIC premium due to CUDA ecosystem dominance.'
  },
  sectorDynamics: {
    industryCondition: 'AI data center infrastructure spending remains in structural hyper-growth.',
    macroConditionSimplified: 'Tech companies are seeing strong adoption of AI accelerators across enterprise clusters.',
    obstaclesAndChallenges: 'Export restrictions and advanced packaging supply constraints.',
    obstaclesAndChallengesSimplified: 'Chip packaging bottlenecks and global trade export rules.',
    economicPoliticalCulturalRisks: 'Geopolitical export tariffs and power grid availability.',
    economicPoliticalCulturalRisksSimplified: 'Power consumption limits and regulatory export scrutiny.'
  },
  companyQuestions: {
    howCompanyMakesMoney: 'NVIDIA makes money through Compute & Networking and Graphics segments.',
    productsDemandAndWhy: 'H100/Blackwell GPU architectures power sovereign and enterprise LLM training.',
    pastPerformanceSummary: 'Delivered historic revenue acceleration driven by data center AI demand.',
    growthAndProfitabilityOutlook: 'Expanding into enterprise software, sovereign AI clusters, and robotics.'
  }
};

const mockMacro: MacroBackdrop = {
  us10YearYield: 4.15,
  us2YearYield: 3.95,
  treasuryBill13WeekYield: 4.50,
  fedFundsRate: 4.85,
  ecbPolicyRate: 3.25,
  vixIndex: 15.4,
  crudeOilWTI: 72.50,
  cpiInflationRate: 2.80,
  dxyDollarIndex: 103.50,
  sectorImpactSummary: 'Benign rate backdrop supports long-duration tech equity multiples.'
};

const mockSentiment: SocialSentiment = {
  sentimentScore: 0.85,
  bullishPercent: 82,
  bearishPercent: 18,
  volumeAnomalyRatio: 1.28,
  majorPriceDriver: 'Blackwell architecture volume ramp and hyperscaler CapEx expansion',
  catalystAlignment: 'ALIGNED',
  catalystSynthesis: 'Session gains reflect authentic institutional accumulation on strong hardware delivery metrics.',
  artificialInflationRisk: 'Low',
  isArtificiallyInflated: false,
  newsImpact: 'Key institutional partners reiterated multi-gigawatt data center expansion commitments.',
  socialMediaImpact: 'Bullish retail and developer sentiment discussing Blackwell benchmark results.',
  sourcesAnalyzed: 1420
};

// ============================================================================
// TEST 1: Specialized Prompt Directives for all 7 Sub-Sections
// ============================================================================
console.log('--- Test 1: Specialized Prompt Directives for all 7 Sub-Sections ---');

// 1. Title & Executive Summary
const p1Sys = buildTitleAndExecSystemPrompt();
const p1User = buildTitleAndExecUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p1Sys.includes('Title & Executive Summary'), 'Agent 1 system prompt targets Title & Exec');
assert.ok(p1Sys.includes('TITLE_AND_EXEC_SCHEMA'), 'Agent 1 enforces TITLE_AND_EXEC_SCHEMA');
assert.ok(p1User.includes('=== SESSION CATALYST INTELLIGENCE ==='), 'Agent 1 user prompt contains catalyst intelligence');

// 2. Trading Activity
const p2Sys = buildTradingActivitySystemPrompt();
const p2User = buildTradingActivityUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p2Sys.includes('Trading Activity, Catalyst-Price Alignment & Artificial Inflation Analysis'), 'Agent 2 system prompt targets Section 1');
assert.ok(p2Sys.includes('Short-Term Tactical Momentum & Market Timing Analysis'), 'Agent 2 instructs TradingAgents framework');
assert.ok(p2Sys.includes('TRADING_ACTIVITY_SCHEMA'), 'Agent 2 enforces TRADING_ACTIVITY_SCHEMA');
assert.ok(p2User.includes('=== ORDER FLOW & LIQUIDITY METRICS ==='), 'Agent 2 user prompt contains order flow metrics');

// 3. Balance Sheet & Solvency
const p3Sys = buildBalanceSheetSolvencySystemPrompt();
const p3User = buildBalanceSheetSolvencyUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p3Sys.includes('Balance Sheet & Solvency Stress Test (with Full Debt Breakdown)'), 'Agent 3 system prompt targets Section 2');
assert.ok(p3Sys.includes('BALANCE_SHEET_SOLVENCY_SCHEMA'), 'Agent 3 enforces BALANCE_SHEET_SOLVENCY_SCHEMA');
assert.ok(p3User.includes('=== BALANCE SHEET & DEBT DATA ==='), 'Agent 3 user prompt contains debt breakdown');

// 4. Profitability & Operating Health
const p4Sys = buildProfitabilityOperatingSystemPrompt();
const p4User = buildProfitabilityOperatingUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p4Sys.includes('Profitability, Operating Health & Segment Dynamics'), 'Agent 4 system prompt targets Section 3 & 4');
assert.ok(p4Sys.includes('How does the company make money?'), 'Agent 4 enforces bulleted segment breakdown');
assert.ok(p4Sys.includes('PROFITABILITY_OPERATING_SCHEMA'), 'Agent 4 enforces PROFITABILITY_OPERATING_SCHEMA');
assert.ok(p4User.includes('=== 8-QUARTER EPS PROGRESSION ==='), 'Agent 4 user prompt contains EPS progression');

// 5. Moat & Competitor Benchmarking
const p5Sys = buildMoatAndCompetitorSystemPrompt();
const p5User = buildMoatAndCompetitorUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p5Sys.includes('Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix'), 'Agent 5 system prompt targets Section 5 & 6');
assert.ok(p5Sys.includes('macroConditionSimplified'), 'Agent 5 instructs non-technical macro condition');
assert.ok(p5Sys.includes('MOAT_AND_COMPETITOR_SCHEMA'), 'Agent 5 enforces MOAT_AND_COMPETITOR_SCHEMA');
assert.ok(p5User.includes('=== 5 MOAT PILLARS DECONSTRUCTION ==='), 'Agent 5 user prompt contains 5 moat pillars');

// 6. Multi-Model Valuation Engine
const p6Sys = buildValuationEngineSystemPrompt();
const p6User = buildValuationEngineUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p6Sys.includes('Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)'), 'Agent 6 system prompt targets Section 7 & 8');
assert.ok(p6Sys.includes('VALUATION_ENGINE_SCHEMA'), 'Agent 6 enforces VALUATION_ENGINE_SCHEMA');
assert.ok(p6User.includes('=== MULTI-MODEL VALUATION OUTPUTS ==='), 'Agent 6 user prompt contains 8-model valuation outputs');

// 7. Bull & Bear Theses
const p7Sys = buildBullBearThesesSystemPrompt();
const p7User = buildBullBearThesesUserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(p7Sys.includes('Objective Bull & Bear Theses with Cited Sources & Deduction Chains'), 'Agent 7 system prompt targets Section 9');
assert.ok(p7Sys.includes('Vertical integration'), 'Agent 7 specifies vertical integration core point');
assert.ok(p7Sys.includes('BULL_BEAR_THESES_SCHEMA'), 'Agent 7 enforces BULL_BEAR_THESES_SCHEMA');
assert.ok(p7User.includes('=== KEY FUNDAMENTAL EVIDENCE ==='), 'Agent 7 user prompt contains fundamental evidence');

console.log('✓ Pass: All 7 specialized sub-section prompt builders verified with focused domain directives.\n');

// ============================================================================
// TEST 2: Schema Configuration for all 7 Sub-Sections
// ============================================================================
console.log('--- Test 2: Schema Configuration for all 7 Sub-Sections ---');

assert.strictEqual(TITLE_AND_EXEC_SCHEMA.type, 'object');
assert.ok(TITLE_AND_EXEC_SCHEMA.required.includes('title'));
assert.ok(TITLE_AND_EXEC_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(TRADING_ACTIVITY_SCHEMA.type, 'object');
assert.ok(TRADING_ACTIVITY_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(BALANCE_SHEET_SOLVENCY_SCHEMA.type, 'object');
assert.ok(BALANCE_SHEET_SOLVENCY_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(PROFITABILITY_OPERATING_SCHEMA.type, 'object');
assert.ok(PROFITABILITY_OPERATING_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(MOAT_AND_COMPETITOR_SCHEMA.type, 'object');
assert.ok(MOAT_AND_COMPETITOR_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(VALUATION_ENGINE_SCHEMA.type, 'object');
assert.ok(VALUATION_ENGINE_SCHEMA.required.includes('sectionMarkdown'));

assert.strictEqual(BULL_BEAR_THESES_SCHEMA.type, 'object');
assert.ok(BULL_BEAR_THESES_SCHEMA.required.includes('sectionMarkdown'));
assert.ok(BULL_BEAR_THESES_SCHEMA.required.includes('theses'));
assert.ok(BULL_BEAR_THESES_SCHEMA.required.includes('socialHooks'));

console.log('✓ Pass: All 7 specialized schemas strictly defined and typed.\n');

// ============================================================================
// TEST 3: Individual Agent Execution & Deterministic Fallbacks
// ============================================================================
console.log('--- Test 3: Individual Agent Execution & Deterministic Fallbacks ---');

// Simulated dummy LLM that returns null to test graceful deterministic fallbacks
const mockFailingLLM = async () => null;

const subContext: SubSectionAgentContext = {
  mover: mockMover,
  fundamentals: mockFundamentals,
  macro: mockMacro,
  sentiment: mockSentiment,
  executeLLM: mockFailingLLM
};

async function runAgentFallbackTests() {
  const o1 = await titleAndExecAgent.execute(subContext);
  assert.ok(o1.title.length > 0, 'Agent 1 generates title');
  assert.ok(o1.sectionMarkdown.includes('## Executive Summary & Session Catalyst'), 'Agent 1 produces executive summary markdown');

  const o2 = await tradingActivityAgent.execute(subContext);
  assert.ok(o2.sectionMarkdown.includes('## 1. Trading Activity & Artificial Inflation Analysis'), 'Agent 2 produces Section 1 markdown');
  assert.ok(o2.sectionMarkdown.includes('### Short-Term Tactical Momentum & Market Timing Analysis'), 'Agent 2 includes TradingAgents framework');

  const o3 = await balanceSheetSolvencyAgent.execute(subContext);
  assert.ok(o3.sectionMarkdown.includes('## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)'), 'Agent 3 produces Section 2 markdown');
  assert.strictEqual(o3.totalDebt, 11e9, 'Agent 3 outputs total debt');

  const o4 = await profitabilityOperatingAgent.execute(subContext);
  assert.ok(o4.sectionMarkdown.includes('## 3. Profitability, Operating Health & Segment Dynamics'), 'Agent 4 produces Section 3 markdown');
  assert.ok(o4.sectionMarkdown.includes('## 4. Qualitative Deep Dive: 4 Key Company Questions'), 'Agent 4 produces Section 4 markdown');

  const o5 = await moatAndCompetitorAgent.execute(subContext);
  assert.ok(o5.sectionMarkdown.includes('## 5. Industry Deep Dive & Sector Dynamics'), 'Agent 5 produces Section 5 markdown');
  assert.ok(o5.sectionMarkdown.includes('## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking'), 'Agent 5 produces Section 6 markdown');
  assert.ok(Boolean(o5.macroConditionSimplified && o5.macroConditionSimplified.length > 0), 'Agent 5 simplified macro condition');

  const o6 = await valuationEngineAgent.execute(subContext);
  assert.ok(o6.sectionMarkdown.includes('## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)'), 'Agent 6 produces Section 7 markdown');
  assert.ok(o6.sectionMarkdown.includes('## 8. Macroeconomic Headwinds & Sector Multiples'), 'Agent 6 produces Section 8 markdown');
  assert.strictEqual(o6.consensusFairValue, 148.50, 'Agent 6 outputs consensus fair value');

  const o7 = await bullBearThesesAgent.execute(subContext);
  assert.ok(o7.sectionMarkdown.includes('## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)'), 'Agent 7 produces Section 9 markdown');
  assert.ok(o7.theses.bull.length > 0, 'Agent 7 outputs bull theses');
  assert.ok(o7.theses.bear.length > 0, 'Agent 7 outputs bear theses');
  assert.ok(o7.socialHooks.twitterThread.length > 0, 'Agent 7 outputs social hooks');

  console.log('✓ Pass: All 7 specialized agents execute reliably with graceful deterministic fallbacks.\n');
}

// ============================================================================
// TEST 4: End-to-End Multi-Agent Synthesis & Report Stitching
// ============================================================================
console.log('--- Test 4: End-to-End Multi-Agent Synthesis & Report Stitching ---');

async function runEndToEndSynthesisTest() {
  // Stub LLM call to return null so test runs instantly via deterministic fallbacks
  const originalExecute = (synthesisAgent as any).executeLLMCall;
  (synthesisAgent as any).executeLLMCall = async () => null;

  try {
    const fullReport = await synthesisAgent.generateReport(mockMover, mockFundamentals, mockMacro, mockSentiment);

    assert.ok(fullReport.title.length > 0, 'Report must have title');
    assert.ok(fullReport.slug.length > 0, 'Report must have slug');
    assert.ok(fullReport.seoDescription.length > 0, 'Report must have SEO description');
    assert.ok(fullReport.executiveSummaryData, 'Report must have executiveSummaryData');
    assert.ok(fullReport.theses && fullReport.theses.bull.length > 0, 'Report must have bull theses');
    assert.ok(fullReport.theses && fullReport.theses.bear.length > 0, 'Report must have bear theses');

    // Verify all 9 sections stitched cleanly into full report markdown
    const body = fullReport.markdownBody;
    assert.ok(body.includes('## Executive Summary & Session Catalyst'), 'Report markdown has Executive Summary');
    assert.ok(body.includes('## 1. Trading Activity & Artificial Inflation Analysis'), 'Report markdown has Section 1');
    assert.ok(body.includes('## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)'), 'Report markdown has Section 2');
    assert.ok(body.includes('## 3. Profitability, Operating Health & Segment Dynamics'), 'Report markdown has Section 3');
    assert.ok(body.includes('## 4. Qualitative Deep Dive: 4 Key Company Questions'), 'Report markdown has Section 4');
    assert.ok(body.includes('## 5. Industry Deep Dive & Sector Dynamics'), 'Report markdown has Section 5');
    assert.ok(body.includes('## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking'), 'Report markdown has Section 6');
    assert.ok(body.includes('## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)'), 'Report markdown has Section 7');
    assert.ok(body.includes('## 8. Macroeconomic Headwinds & Sector Multiples'), 'Report markdown has Section 8');
    assert.ok(body.includes('## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)'), 'Report markdown has Section 9');
    assert.ok(body.includes('Adversarial Bull vs. Bear Dialectical Cross-Examination'), 'Report markdown has Phase 2 Dialectic Debate');
    assert.ok(body.includes('Risk Guardian'), 'Report markdown has Phase 3 Risk Guardian');

    console.log('✓ Pass: Full report seamlessly stitched from all 7 specialized agents + debate + risk guardian.\n');
    console.log('🎉 ALL SPECIALIZED SUB-SECTION AGENTS TESTS PASSED SUCCESSFULLY!');
  } finally {
    (synthesisAgent as any).executeLLMCall = originalExecute;
  }
}

async function main() {
  await runAgentFallbackTests();
  await runEndToEndSynthesisTest();
}

main().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
