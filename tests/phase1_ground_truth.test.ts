import assert from 'node:assert/strict';
import {
  buildPhase1GroundTruthPacket,
  formatGroundTruthForPrompt
} from '../pipeline/src/ingestion/phase1GroundTruth.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment
} from '../pipeline/src/types.js';

const sampleMover: MarketMover = {
  ticker: 'NVDA',
  symbol: 'NVDA',
  name: 'NVIDIA Corporation',
  exchange: 'NASDAQ',
  region: 'US',
  price: 120.5,
  change: 4.5,
  changePercent: 3.88,
  volume: 65_000_000,
  avgVolume: 45_000_000,
  marketCap: 2_950_000_000_000,
  currency: 'USD',
  category: 'gainer',
  isPennyStock: false,
  moneyMarketTradingVenue: 'NASDAQ Global Select Market',
  sharesOutstanding: 24_500_000_000,
  floatShares: 23_500_000_000
};

const sampleFundamentals: FundamentalMetrics = {
  ticker: 'NVDA',
  companyName: 'NVIDIA Corporation',
  sector: 'Technology',
  industry: 'Semiconductors',
  description: 'Accelerated computing leader',
  marketCap: 2_950_000_000_000,
  peRatioTrailing: 45.2,
  peRatioForward: 31.4,
  pegRatio: 1.15,
  evToEbitda: 36.8,
  dividendYield: 0.03,
  revenueTTM: 115_000_000_000,
  netIncomeTTM: 63_000_000_000,
  grossMargin: 75.2,
  operatingMargin: 62.1,
  freeCashFlowTTM: 58_000_000_000,
  cashAndEquivalents: 38_500_000_000,
  netDebt: -28_000_000_000,
  currentRatio: 4.1,
  roic: 72.5,
  beta: 1.65,
  fiftyTwoWeekHigh: 149.76,
  fiftyTwoWeekLow: 75.6,
  totalDebt: 10_500_000_000,
  debtToEquity: 0.18,
  shortTermDebt: 1_250_000_000,
  longTermDebt: 9_250_000_000,
  shortVsLongTermRatio: '12% / 88%',
  recentChangesInDebt: 'Stable long-term notes',
  debtRisks: 'Low refinancing risk',
  priceToBook: { current: 44.0, industryAverage: 8.5, historicalAverage5Y: 28.0 },
  priceToEarnings: { current: 45.2, industryAverage: 28.0, historicalAverage5Y: 52.0 },
  returnOnEquity: 91.5,
  earningsPerShare: {
    currentTTM: 2.66,
    quarterlyEPSPast2Years: [
      { quarter: 'Q1 FY24', eps: 0.25 },
      { quarter: 'Q2 FY24', eps: 0.42 },
      { quarter: 'Q3 FY24', eps: 0.55 },
      { quarter: 'Q4 FY24', eps: 0.61 },
      { quarter: 'Q1 FY25', eps: 0.65 },
      { quarter: 'Q2 FY25', eps: 0.68 },
      { quarter: 'Q3 FY25', eps: 0.78 },
      { quarter: 'Q4 FY25', eps: 0.89 }
    ]
  },
  volatilityIndex: { value: 1.65, rating: 'High' },
  cashFlow: {
    operatingCashFlow: 64_000_000_000,
    freeCashFlow: 58_000_000_000,
    status: 'Strong Cash Generation'
  },
  managementQuality: { rating: 'Exemplary', trackRecord: 'High ROIC capital allocation' },
  competitiveMoat: { rating: 'Wide', trend: 'Positive', summary: 'CUDA ecosystem lock-in' },
  companyQuestions: {
    howCompanyMakesMoney: 'Data center GPUs and networking',
    productsDemandAndWhy: 'AI training and inference clusters',
    pastPerformanceSummary: 'Hyper-scale revenue expansion',
    growthAndProfitabilityOutlook: 'Next-gen architecture ramp'
  },
  industryQuestions: {
    industryCondition: 'Secular AI infrastructure buildout',
    obstaclesAndChallenges: 'Export controls and foundry capacity',
    economicPoliticalCulturalRisks: 'Geopolitical supply chain concentration'
  },
  morningstarRating: {
    starRating: 4,
    starRatingString: '★★★★',
    uncertaintyRating: 'High',
    fairValueEstimate: 142.0,
    currentPrice: 120.5,
    priceToFairValue: 0.85,
    fiveStarPrice: 85.2,
    oneStarPrice: 213.0,
    requiredMarginOfSafety: 40,
    overvaluationHurdle: 50
  },
  starRating: 4,
  starRatingString: '★★★★',
  uncertaintyRating: 'High',
  fiveStarPrice: 85.2,
  oneStarPrice: 213.0,
  priceToFairValue: 0.85,
  valuationModels: {
    dcf: { fairValue: 145.0, discountRate: 10.4, terminalGrowthRate: 2.8, fadeYears: 15, status: 'Calculated' },
    ddm: { fairValue: null, applicable: false, status: 'Inapplicable: Low dividend yield' },
    relativeValuation: { fairValue: 132.0, status: 'Calculated' },
    rapidStockValuation: { fairValue: 148.0, status: 'Calculated' },
    residualIncomeModel: { fairValue: 139.0, costOfEquity: 10.6, status: 'Calculated' },
    assetBasedValuation: { fairValue: 28.0, status: 'Calculated' },
    excessReturnModel: { fairValue: 152.0, wacc: 10.4, returnSpread: 62.1, status: 'Calculated' },
    industrySpecificModel: { fairValue: 146.0, modelName: 'Semiconductor EV/FCF Model', status: 'Calculated' },
    consensusFairValue: 142.0,
    verdict: 'Modestly Undervalued'
  },
  fundamentalRating: 'Strong',
  classification: 'Growth Stock'
};

const sampleMacro: MacroBackdrop = {
  us10YearYield: 4.25,
  us2YearYield: 4.1,
  fedFundsRate: 4.75,
  ecbPolicyRate: 3.25,
  vixIndex: 16.5,
  crudeOilWTI: 71.2,
  cpiInflationRate: 2.6,
  dxyDollarIndex: 103.8,
  sectorImpactSummary: 'Stable yields support growth multiples.'
};

const sampleSentiment: SocialSentiment = {
  ticker: 'NVDA',
  bullishPercent: 74,
  bearishPercent: 26,
  sentimentScore: 0.48,
  volumeChange24h: 44.4,
  dominantThemes: ['AI CapEx', 'Blackwell ramp'],
  sampleCatalysts: ['Hyperscaler capex guidance'],
  sourcesAnalyzed: 24,
  isArtificiallyInflated: false,
  artificialInflationRisk: 'Moderate',
  volumeAnomalyRatio: 1.44,
  majorPriceDriver: 'Fundamental Institutional Accumulation',
  newsImpact: 'Positive',
  socialMediaImpact: 'Moderate',
  catalystAlignment: 'ALIGNED',
  optionGammaImbalance: {
    imbalanceRatio: 1.85,
    netGammaExposure: 'Moderate Call Gamma Skew',
    riskLevel: 'Moderate',
    status: 'Verified'
  },
  freeFloatConcentration: {
    freeFloatShares: 23_500_000_000,
    freeFloatPercent: 95.9,
    floatTurnoverRatio: 0.0028,
    concentrationLevel: 'Low',
    status: 'Liquid Float'
  }
};

console.log('Running Phase 1 Ground Truth Engine verification tests...');

const packet = buildPhase1GroundTruthPacket(
  sampleMover,
  sampleFundamentals,
  sampleMacro,
  sampleSentiment
);

assert.equal(packet.ticker, 'NVDA');
assert.equal(packet.companyName, 'NVIDIA Corporation');
assert.equal(packet.xbrlStatutorySummary.revenueTTM, 115_000_000_000);
assert.equal(packet.xbrlStatutorySummary.epsHistory8Quarters.length, 8);
assert.equal(packet.valuationSuiteSummary.consensusFairValue, 142.0);
assert.equal(packet.valuationSuiteSummary.impliedWacc, 10.4);
assert.equal(packet.valuationSuiteSummary.morningstarStarRating, 4);
assert.ok(packet.forensicAudit.compositeScore >= 0);
assert.ok(packet.forensicAudit.weaponizedBearFlags.length > 0);
assert.ok(packet.forensicAudit.forensicClearances.length > 0);
assert.equal(packet.microstructureMechanics.netGammaExposure, 'Moderate Call Gamma Skew');
assert.equal(packet.immutableNumericLedger.ticker, 'NVDA');
assert.equal(packet.immutableNumericLedger.consensusFairValue, 142.0);

const formatted = formatGroundTruthForPrompt(packet);
assert.ok(formatted.includes('PHASE 1 DETERMINISTIC GROUND TRUTH PACKET'));
assert.ok(formatted.includes('[BEAR-FLAG-1]'));
assert.ok(formatted.includes('[BULL-CLEARANCE-1]'));

console.log('✓ Phase 1 Ground Truth Engine verification tests passed!');
