import assert from 'assert';
import {
  REPORT_PART1_SCHEMA,
  REPORT_PART2_SCHEMA,
  MAIN_REPORT_SCHEMA,
  EXECUTIVE_SUMMARY_SCHEMA
} from '../pipeline/src/llm/schemas.js';
import {
  buildReportPart1SystemPrompt,
  buildReportPart1UserPrompt,
  buildReportPart2SystemPrompt,
  buildReportPart2UserPrompt,
  buildExecutiveSummarySystemPrompt,
  buildExecutiveSummaryUserPrompt
} from '../pipeline/src/llm/prompts.js';
import { synthesisAgent } from '../pipeline/src/llm/synthesisAgent.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  ReportPart1Output,
  ReportPart2Output,
  ExecutiveSummaryData
} from '../pipeline/src/types.js';

console.log('🧪 Running Two-Part Report Architecture & Anti-Hallucination Tests...\n');

// Mock data fixtures
const mockMover: MarketMover = {
  ticker: 'ACME',
  symbol: 'ACME',
  name: 'Acme Technologies Inc.',
  exchange: 'NASDAQ',
  region: 'US',
  price: 45.50,
  change: 4.50,
  changePercent: 10.98,
  volume: 12_500_000,
  avgVolume: 5_000_000,
  marketCap: 4_500_000_000,
  currency: 'USD',
  category: 'gainer',
  isPennyStock: false,
  moneyMarketTradingVenue: 'Nasdaq Global Select Market'
};

const mockFundamentals: FundamentalMetrics = {
  ticker: 'ACME',
  companyName: 'Acme Technologies Inc.',
  sector: 'Technology',
  industry: 'Software - Infrastructure',
  description: 'Acme Technologies provides enterprise infrastructure software.',
  marketCap: 4.5e9,
  peRatioTrailing: 28.5,
  peRatioForward: 22.0,
  pegRatio: 1.4,
  evToEbitda: 18.0,
  dividendYield: 0.0,
  revenueTTM: 850e6,
  netIncomeTTM: 120e6,
  grossMargin: 72.0,
  operatingMargin: 18.5,
  freeCashFlowTTM: 95e6,
  cashAndEquivalents: 320e6,
  netDebt: -120e6,
  currentRatio: 2.8,
  roic: 14.2,
  beta: 1.15,
  fiftyTwoWeekHigh: 55.0,
  fiftyTwoWeekLow: 30.0,
  totalDebt: 200e6,
  debtToEquity: 0.12,
  shortTermDebt: 20e6,
  longTermDebt: 180e6,
  shortVsLongTermRatio: '10% Short / 90% Long',
  recentChangesInDebt: 'Maintained conservative leverage structure.',
  debtRisks: 'Liquid cash reserves exceed total debt obligations.',
  priceToBook: {
    current: 4.2,
    industryAverage: 5.0,
    historicalAverage5Y: 3.8,
    chartData: []
  },
  priceToEarnings: {
    current: 28.5,
    industryAverage: 25.0,
    historicalAverage5Y: 26.0,
    chartData: []
  },
  returnOnEquity: 18.0,
  earningsPerShare: {
    currentTTM: 1.60,
    quarterlyEPSPast2Years: [
      { quarter: 'Q1-25', eps: 0.35, beat: true },
      { quarter: 'Q2-25', eps: 0.38, beat: true },
      { quarter: 'Q3-25', eps: 0.42, beat: true },
      { quarter: 'Q4-25', eps: 0.45, beat: true }
    ]
  },
  volatilityIndex: { value: 24.5, rating: 'Moderate' },
  cashFlow: { operatingCashFlow: 140e6, freeCashFlow: 95e6, status: 'Positive Operating Free Cash Flow' },
  managementQuality: { rating: 'Exemplary', trackRecord: 'Proven enterprise execution.' },
  competitiveMoat: {
    rating: 'Narrow Moat',
    summary: 'High customer switching costs in enterprise infrastructure software.',
    trend: 'Stable',
    sources: {
      intangibleAssets: { rating: 'None', substantiation: 'No core patents providing standalone pricing power.' },
      switchingCosts: { rating: 'Narrow', substantiation: 'Deeply integrated enterprise workflows create switching friction.' },
      networkEffect: { rating: 'None', substantiation: 'Product value is independent of user network density.' },
      costAdvantage: { rating: 'None', substantiation: 'Cost structure is in line with peer software operators.' },
      efficientScale: { rating: 'None', substantiation: 'Market dynamics allow capacity expansion without economic penalty.' }
    }
  },
  companyQuestions: {
    howCompanyMakesMoney: 'Acme generates revenue through SaaS subscriptions and professional services.',
    productsDemandAndWhy: 'Enterprise customers require continuous infrastructure monitoring.',
    pastPerformanceSummary: 'Consistently compounded subscription revenue over recent operating periods.',
    growthAndProfitabilityOutlook: 'Expanding platform modules to increase annual contract value.'
  },
  industryQuestions: {
    industryCondition: 'Infrastructure software demand remains resilient across IT budgets.',
    macroConditionSimplified: 'Companies continue modernizing cloud systems while carefully monitoring overall tech budgets.',
    obstaclesAndChallenges: 'Navigating lengthening corporate procurement cycles.',
    economicPoliticalCulturalRisks: 'Interest rate volatility impacting enterprise capital expenditure.'
  },
  sectorDynamics: {
    industryCondition: 'Infrastructure software demand remains resilient across IT budgets.',
    macroConditionSimplified: 'Companies continue modernizing cloud systems while carefully monitoring overall tech budgets.',
    obstaclesAndChallenges: 'Navigating lengthening corporate procurement cycles.',
    economicPoliticalCulturalRisks: 'Interest rate volatility impacting enterprise capital expenditure.'
  },
  competitorBenchmarking: {
    peers: [
      { ticker: 'ACME', name: 'Acme Technologies Inc.', marketCap: 4.5e9, peRatio: 28.5, evToEbitda: 18.0, moat: 'Narrow Moat', roic: 14.2 },
      { ticker: 'PEER1', name: 'Peer One Corp', marketCap: 6.0e9, peRatio: 32.0, evToEbitda: 20.5, moat: 'Wide Moat', roic: 16.5 }
    ],
    commentary: 'Acme trades at a modest discount to peers with solid ROIC.'
  },
  valuationModels: {
    consensusFairValue: 52.00,
    verdict: 'Undervalued',
    dcf: { fairValue: 54.00, intrinsicValue: 54.00, upsidePercent: 18.7, fadeYears: 10, normalizedFcf: 100e6, enterpriseValue: 5.2e9, equityValue: 5.32e9 },
    ddm: { fairValue: null, intrinsicValue: null, status: 'Inapplicable: Zero dividend yield' },
    relativeValuation: { fairValue: 50.00, intrinsicValue: 50.00, upsidePercent: 9.9 },
    rapidStockValuation: { fairValue: 51.00, intrinsicValue: 51.00, upsidePercent: 12.1 },
    residualIncomeModel: { fairValue: 53.00, intrinsicValue: 53.00, upsidePercent: 16.5 },
    assetBasedValuation: { fairValue: 35.00, intrinsicValue: 35.00, upsidePercent: -23.1 },
    excessReturnModel: { fairValue: 52.50, intrinsicValue: 52.50, upsidePercent: 15.4 },
    industrySpecificModel: { fairValue: 53.50, intrinsicValue: 53.50, upsidePercent: 17.6 }
  },
  fundamentalRating: 'Strong',
  classification: 'Growth Stock',
  starRating: 4,
  starRatingString: '★★★★☆',
  uncertaintyRating: 'Medium',
  fiveStarPrice: 38.00,
  oneStarPrice: 65.00,
  priceToFairValue: 0.88
};

const mockMacro: MacroBackdrop = {
  us10YearYield: 4.25,
  us2YearYield: 3.95,
  fedFundsRate: 4.50,
  ecbPolicyRate: 3.25,
  vixIndex: 16.5,
  crudeOilWTI: 74.00,
  cpiInflationRate: 2.8,
  dxyDollarIndex: 103.5,
  sectorImpactSummary: 'Benign interest rate backdrop supporting technology valuations.'
};

const mockSentiment: SocialSentiment = {
  ticker: 'ACME',
  bullishPercent: 80,
  bearishPercent: 20,
  sentimentScore: 0.65,
  volumeChange24h: 45,
  dominantThemes: ['Cloud Infrastructure', 'Enterprise Contracts'],
  sampleCatalysts: ['Major Tier-1 cloud partnership expansion'],
  sourcesAnalyzed: 25,
  isArtificiallyInflated: false,
  artificialInflationRisk: 'Low',
  volumeAnomalyRatio: 2.5,
  majorPriceDriver: 'Announced strategic expansion of enterprise cloud distribution agreement',
  newsImpact: 'High Impact: Multiple financial outlets reported the distribution contract.',
  socialMediaImpact: 'Healthy organic investor engagement across verified platforms.',
  catalystAlignment: 'ALIGNED',
  catalystSynthesis: 'Session rally is fully supported by long-term contract visibility.'
};

// ============================================================================
// TEST 1: Schema Structure & Property Verification
// ============================================================================
console.log('--- Test 1: Two-Part JSON Schema Structure ---');
assert.strictEqual(REPORT_PART1_SCHEMA.type, 'object');
assert.ok(Array.isArray(REPORT_PART1_SCHEMA.required));
assert.ok(REPORT_PART1_SCHEMA.required.includes('title'), 'Part 1 must require title');
assert.ok(REPORT_PART1_SCHEMA.required.includes('seoDescription'), 'Part 1 must require seoDescription');
assert.ok(REPORT_PART1_SCHEMA.required.includes('slug'), 'Part 1 must require slug');
assert.ok(REPORT_PART1_SCHEMA.required.includes('catalystSummary'), 'Part 1 must require catalystSummary');
assert.ok(REPORT_PART1_SCHEMA.required.includes('extractedFigures'), 'Part 1 must require extractedFigures');
assert.ok(REPORT_PART1_SCHEMA.required.includes('markdownBody'), 'Part 1 must require markdownBody');

assert.strictEqual(REPORT_PART2_SCHEMA.type, 'object');
assert.ok(Array.isArray(REPORT_PART2_SCHEMA.required));
assert.ok(REPORT_PART2_SCHEMA.required.includes('markdownBody'), 'Part 2 must require markdownBody');
assert.ok(REPORT_PART2_SCHEMA.required.includes('theses'), 'Part 2 must require theses');
assert.ok(REPORT_PART2_SCHEMA.required.includes('socialHooks'), 'Part 2 must require socialHooks');
assert.ok('macroConditionSimplified' in REPORT_PART2_SCHEMA.properties, 'Part 2 must define macroConditionSimplified');
assert.ok('obstaclesAndChallengesSimplified' in REPORT_PART2_SCHEMA.properties, 'Part 2 must define obstaclesAndChallengesSimplified');
assert.ok('economicPoliticalCulturalRisksSimplified' in REPORT_PART2_SCHEMA.properties, 'Part 2 must define economicPoliticalCulturalRisksSimplified');

console.log('✓ Pass: Both REPORT_PART1_SCHEMA and REPORT_PART2_SCHEMA are strictly configured.\n');

// ============================================================================
// TEST 2: Prompt Directives for Part 1 & Part 2
// ============================================================================
console.log('--- Test 2: System and User Prompt Directives ---');
const part1Sys = buildReportPart1SystemPrompt();
const part1User = buildReportPart1UserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);

assert.ok(part1Sys.includes('Part 1 focuses specifically on Market Dynamics'), 'Part 1 system prompt specifies role');
assert.ok(part1Sys.includes('## 1. Trading Activity & Artificial Inflation Analysis'), 'Part 1 instructs Section 1');
assert.ok(part1Sys.includes('## 2. Balance Sheet & Solvency Stress Test'), 'Part 1 instructs Section 2');
assert.ok(part1Sys.includes('## 3. Profitability, Operating Health & Segment Dynamics'), 'Part 1 instructs Section 3');
assert.ok(part1Sys.includes('## 4. Qualitative Deep Dive: 4 Key Company Questions'), 'Part 1 instructs Section 4');
assert.ok(part1Sys.includes('REPORT_PART1_SCHEMA'), 'Part 1 enforces Part 1 schema');

assert.ok(part1User.includes('=== MARKET MOVER DATA ==='), 'Part 1 user prompt contains mover data');
assert.ok(part1User.includes('=== INGESTED FUNDAMENTAL METRICS ==='), 'Part 1 user prompt contains fundamentals');
assert.ok(part1User.includes('=== DEBT STRUCTURE BREAKDOWN ==='), 'Part 1 user prompt contains debt breakdown');
assert.ok(part1User.includes('=== 8-QUARTER EPS PROGRESSION ==='), 'Part 1 user prompt contains EPS progression');

const part2Sys = buildReportPart2SystemPrompt();
const part2User = buildReportPart2UserPrompt(mockMover, mockFundamentals, mockMacro, mockSentiment);

assert.ok(part2Sys.includes('Part 2 focuses specifically on Industry Dynamics'), 'Part 2 system prompt specifies role');
assert.ok(part2Sys.includes('macroConditionSimplified'), 'Part 2 instructs simplified macro condition');
assert.ok(part2Sys.includes('obstaclesAndChallengesSimplified'), 'Part 2 instructs simplified obstacles and challenges');
assert.ok(part2Sys.includes('economicPoliticalCulturalRisksSimplified'), 'Part 2 instructs simplified economic political cultural risks');
assert.ok(part2Sys.includes('## 5. Industry Deep Dive & Sector Dynamics'), 'Part 2 instructs Section 5');
assert.ok(part2Sys.includes('## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix'), 'Part 2 instructs Section 6');
assert.ok(part2Sys.includes('## 7. Multi-Model Valuation Suite'), 'Part 2 instructs Section 7');
assert.ok(part2Sys.includes('## 8. Macroeconomic Headwinds & Sector Multiples'), 'Part 2 instructs Section 8');
assert.ok(part2Sys.includes('## 9. Evidence-Based Bull & Bear Theses'), 'Part 2 instructs Section 9');
assert.ok(part2Sys.includes('REPORT_PART2_SCHEMA'), 'Part 2 enforces Part 2 schema');

assert.ok(part2User.includes('=== SECTOR DYNAMICS ==='), 'Part 2 user prompt contains sector dynamics');
assert.ok(part2User.includes('=== QUALITATIVE MOAT (5 MORNINGSTAR PILLARS) & MANAGEMENT ==='), 'Part 2 user prompt contains moat');
assert.ok(part2User.includes('=== COMPETITOR BENCHMARKING MATRIX ==='), 'Part 2 user prompt contains peer matrix');
assert.ok(part2User.includes('=== MULTI-MODEL VALUATIONS & MORNINGSTAR STAR RATING ==='), 'Part 2 user prompt contains valuation models');

console.log('✓ Pass: Prompt generators enforce clean separation between Part 1 and Part 2.\n');

// ============================================================================
// TEST 3: Markdown Section Extraction Helpers
// ============================================================================
console.log('--- Test 3: Markdown Section Extraction Helpers ---');
const sampleFullMarkdown = `## Executive Summary & Session Catalyst
Executive summary narrative text.

---

## 1. Trading Activity & Artificial Inflation Analysis
Order flow and volume anomaly details.

---

## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)
Debt obligations and cash reserves.

---

## 3. Profitability, Operating Health & Segment Dynamics
TTM Revenue and segment breakdowns.

---

## 4. Qualitative Deep Dive: 4 Key Company Questions
How the company makes money and products in demand.

---

## 5. Industry Deep Dive & Sector Dynamics
Industry conditions and obstacles.

---

## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking
Management track record and moat matrix.

---

## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)
8 valuation models and consensus target.

---

## 8. Macroeconomic Headwinds & Sector Multiples
Macro sovereign yields and VIX.

---

## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)
Bull and bear thesis chains.`;

const extractedPart1 = synthesisAgent.extractReportPart1FromMarkdown(sampleFullMarkdown);
assert.ok(extractedPart1.includes('## 1. Trading Activity & Artificial Inflation Analysis'), 'Extracted Part 1 contains Section 1');
assert.ok(extractedPart1.includes('## 4. Qualitative Deep Dive: 4 Key Company Questions'), 'Extracted Part 1 contains Section 4');
assert.ok(!extractedPart1.includes('## 5. Industry Deep Dive'), 'Extracted Part 1 must not contain Section 5');

const extractedPart2 = synthesisAgent.extractReportPart2FromMarkdown(sampleFullMarkdown);
assert.ok(extractedPart2.includes('## 5. Industry Deep Dive & Sector Dynamics'), 'Extracted Part 2 contains Section 5');
assert.ok(extractedPart2.includes('## 9. Evidence-Based Bull & Bear Theses'), 'Extracted Part 2 contains Section 9');
assert.ok(!extractedPart2.includes('## 1. Trading Activity'), 'Extracted Part 2 must not contain Section 1');

console.log('✓ Pass: Markdown extraction helpers cleanly divide full report markdown into Sections 1-4 and Sections 5-9.\n');

// ============================================================================
// TEST 4: Report Stitching & Fallback Integration
// ============================================================================
console.log('--- Test 4: Report Stitching & Fallback Integration ---');

// 4.1 Test deterministic report generation generates complete 9-section report
const detReport = synthesisAgent.generateDeterministicReport(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(detReport.markdownBody.includes('## Executive Summary & Session Catalyst'), 'Deterministic report has Executive Summary');
assert.ok(detReport.markdownBody.includes('## 1. Trading Activity'), 'Deterministic report has Section 1');
assert.ok(detReport.markdownBody.includes('## 2. Balance Sheet'), 'Deterministic report has Section 2');
assert.ok(detReport.markdownBody.includes('## 3. Profitability'), 'Deterministic report has Section 3');
assert.ok(detReport.markdownBody.includes('## 4. Qualitative Deep Dive'), 'Deterministic report has Section 4');
assert.ok(detReport.markdownBody.includes('## 5. Industry Deep Dive'), 'Deterministic report has Section 5');
assert.ok(detReport.markdownBody.includes('## 6. Management Quality'), 'Deterministic report has Section 6');
assert.ok(detReport.markdownBody.includes('## 7. Multi-Model Valuation Suite'), 'Deterministic report has Section 7');
assert.ok(detReport.markdownBody.includes('## 8. Macroeconomic Headwinds'), 'Deterministic report has Section 8');
assert.ok(detReport.markdownBody.includes('## 9. Evidence-Based Bull & Bear Theses'), 'Deterministic report has Section 9');

// 4.2 Test replaceExecutiveSummarySection seamlessly replaces or prepends section
const newExec = `## Executive Summary & Session Catalyst\n\nFresh specialized executive summary content.\n\n| Metric | Level |\n| :--- | :--- |\n| Volume | 12.5M |`;
const replacedMarkdown = synthesisAgent.replaceExecutiveSummarySection(detReport.markdownBody, newExec);
assert.ok(replacedMarkdown.includes('Fresh specialized executive summary content.'), 'Replaced markdown contains fresh content');
assert.ok(replacedMarkdown.includes('## 1. Trading Activity'), 'Replaced markdown retains Section 1');

// 4.3 Test generateReport returns complete LLMAnalysisOutput with all properties
const generated = await synthesisAgent.generateReport(mockMover, mockFundamentals, mockMacro, mockSentiment);
assert.ok(generated.title && generated.title.length > 0, 'Report must have title');
assert.ok(generated.slug && generated.slug.length > 0, 'Report must have slug');
assert.ok(generated.seoDescription && generated.seoDescription.length > 0, 'Report must have seoDescription');
assert.ok(generated.theses && generated.theses.bull.length > 0, 'Report must have bull theses');
assert.ok(generated.theses && generated.theses.bear.length > 0, 'Report must have bear theses');
assert.ok(generated.markdownBody.includes('## 1. Trading Activity'), 'Report markdown has Section 1');
assert.ok(generated.markdownBody.includes('## 5. Industry Deep Dive'), 'Report markdown has Section 5');
assert.ok(generated.markdownBody.includes('## 9. Evidence-Based Bull & Bear Theses'), 'Report markdown has Section 9');

console.log('✓ Pass: Full report generation, stitching, and fallbacks verified.\n');

console.log('🎉 ALL TWO-PART REPORT ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
