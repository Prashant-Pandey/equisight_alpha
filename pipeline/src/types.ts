export interface MarketMover {
  ticker: string;
  symbol: string;
  name: string;
  exchange: 'NYSE' | 'NASDAQ' | 'LSE' | 'EURONEXT' | 'DAX' | 'OTHER' | string;
  region: 'US' | 'EU';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  currency: string;
  category: 'gainer' | 'loser';
  isPennyStock: boolean;
  moneyMarketTradingVenue: string;
}

export interface ValuationMetricComparison {
  current: number | null;
  industryAverage: number;
  historicalAverage5Y: number;
  chartData?: Array<{ year: string; value: number }>;
  chart?: Array<{ label: string; value: number; benchmark?: string }>;
}

export interface QuarterlyEPS {
  quarter: string;
  eps: number;
  date?: string;
  beat?: boolean;
}

export interface EPSHistory {
  currentTTM: number;
  quarterlyEPSPast2Years: QuarterlyEPS[]; // 8 quarters
}

export interface VolatilityIndex {
  value: number;
  rating: string;
}

export interface CashFlowBreakdown {
  operatingCashFlow: number;
  freeCashFlow: number;
  status: string;
}

export interface ManagementQuality {
  rating: string;
  trackRecord: string;
}

export interface CompetitiveMoat {
  rating: string;
  summary: string;
}

export interface CompanyQuestions {
  howCompanyMakesMoney: string;
  productsDemandAndWhy: string;
  pastPerformanceSummary: string;
  growthAndProfitabilityOutlook: string;
}

export interface IndustryQuestions {
  industryCondition: string;
  obstaclesAndChallenges: string;
  economicPoliticalCulturalRisks: string;
}

export interface ValuationModelDCF {
  fairValue?: number;
  intrinsicValue?: number;
  discountRate?: number;
  terminalGrowthRate?: number;
  terminalGrowth?: number;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelDDM {
  fairValue?: number;
  intrinsicValue?: number;
  expectedDividendGrowth?: number;
  dividendGrowthRate?: number;
  requiredReturn?: number;
  costOfEquity?: number;
  applicable?: boolean;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelRelative {
  fairValue?: number;
  intrinsicValue?: number;
  benchmarkMultiple?: number;
  peerMedianPE?: number;
  multipleType?: string;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelRapid {
  fairValue?: number;
  intrinsicValue?: number;
  pegBenchmark?: number;
  methodology?: string;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelResidualIncome {
  fairValue?: number;
  intrinsicValue?: number;
  costOfEquity?: number;
  equityCharge?: number;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelAssetBased {
  fairValue?: number;
  intrinsicValue?: number;
  liquidationValue?: number;
  netAssetValue?: number;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelExcessReturn {
  fairValue?: number;
  intrinsicValue?: number;
  returnSpread?: number;
  excessReturnPercent?: number;
  wacc?: number;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModelIndustrySpecific {
  fairValue?: number;
  intrinsicValue?: number;
  sectorMetric?: string;
  name?: string;
  description?: string;
  upside?: number;
  upsidePercent?: number;
  modelName?: string;
}

export interface ValuationModels {
  dcf: ValuationModelDCF;
  ddm: ValuationModelDDM;
  relativeValuation: ValuationModelRelative;
  rapidStockValuation: ValuationModelRapid;
  residualIncomeModel: ValuationModelResidualIncome;
  assetBasedValuation: ValuationModelAssetBased;
  excessReturnModel: ValuationModelExcessReturn;
  industrySpecificModel: ValuationModelIndustrySpecific;
  consensusFairValue: number;
  verdict: string;
}

export interface DebtBreakdown {
  totalDebt: number;
  debtToEquity: number | null;
  shortTermDebt: number;
  longTermDebt: number;
  shortVsLongTermRatio: number;
  recentChangesInDebt: string;
  debtRisks: string;
}

export interface DebtAnalysis {
  totalDebt: number;
  debtToEquity: number;
  shortTermDebt: number;
  longTermDebt: number;
  shortVsLongTermRatio: string | number;
  recentChanges: string;
  risks: string;
}

export interface ArtificialInflation {
  isInflated: boolean;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  volumeAnomalyRatio: number;
  majorPriceDriver: string;
  sentimentScore: number;
  newsImpact: string;
  socialMediaImpact: string;
}

export interface FundamentalMetrics {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  marketCap: number;
  peRatioTrailing: number | null;
  peRatioForward: number | null;
  pegRatio: number | null;
  evToEbitda: number | null;
  dividendYield: number;
  revenueTTM: number;
  netIncomeTTM: number;
  grossMargin: number;
  operatingMargin: number;
  freeCashFlowTTM: number;
  cashAndEquivalents: number;
  netDebt: number;
  currentRatio: number | null;
  roic: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  recentEarningsDate?: string;
  earningsSurprisePercent?: number | null;

  // Debt breakdown
  totalDebt: number;
  debtToEquity: number | null;
  shortTermDebt: number;
  longTermDebt: number;
  shortVsLongTermRatio: number;
  recentChangesInDebt: string;
  debtRisks: string;

  // Valuation comparisons
  priceToBook: ValuationMetricComparison;
  priceToEarnings: ValuationMetricComparison;
  priceToBookComparison?: ValuationMetricComparison;
  priceToEarningsComparison?: ValuationMetricComparison;

  // Returns & EPS
  returnOnEquity: number;
  earningsPerShare: EPSHistory;

  // Volatility & Cash Flow
  volatilityIndex: VolatilityIndex;
  cashFlow: CashFlowBreakdown;

  // Qualitative Analysis
  managementQuality: ManagementQuality;
  competitiveMoat: CompetitiveMoat;
  companyQuestions: CompanyQuestions;
  industryQuestions: IndustryQuestions;
  companyDeepDive?: CompanyQuestions;
  industryDeepDive?: IndustryQuestions;

  // Multi-model Valuations
  valuationModels: ValuationModels;
  fundamentalRating: 'Strong' | 'Fairly Valued' | 'Weak';
  classification: 'Growth Stock' | 'Income Stock' | 'Value / Turnaround' | 'Speculative Penny Stock';
}

export interface MacroBackdrop {
  us10YearYield: number;
  us2YearYield: number;
  fedFundsRate: number;
  ecbPolicyRate: number;
  vixIndex: number;
  crudeOilWTI: number;
  cpiInflationRate: number;
  dxyDollarIndex: number;
  sectorImpactSummary: string;
}

export interface SocialSentiment {
  ticker: string;
  bullishPercent: number;
  bearishPercent: number;
  sentimentScore: number; // -1.0 to 1.0
  volumeChange24h: number; // percentage delta
  dominantThemes: string[];
  sampleCatalysts: string[];
  sourcesAnalyzed: number;
  recentHeadlines?: string[];
  secFilingSummary?: string;

  // Artificial inflation analysis
  isArtificiallyInflated: boolean;
  artificialInflationRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  volumeAnomalyRatio: number;
  majorPriceDriver: string;
  newsImpact: string;
  socialMediaImpact: string;
}

export interface AffiliateLink {
  id: string;
  name: string;
  category: 'broker' | 'screener' | 'research' | 'security' | 'data';
  headline: string;
  description: string;
  url: string;
  ctaText: string;
  badge?: string;
  disclosure: string;
}

export interface FactCheckViolation {
  field: string;
  claimedValue: string | number;
  actualValue: string | number;
  divergencePercent: number;
  severity: 'warning' | 'critical';
  context: string;
}

export interface FactCheckResult {
  passed: boolean;
  violations: FactCheckViolation[];
  correctedContent?: string;
  auditLog: string[];
}

export interface ThesisPoint {
  point: string;
  sources: string[];
  deductionChain: string;
}

export interface LLMAnalysisOutput {
  title: string;
  seoDescription: string;
  slug: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  catalystSummary: string;
  markdownBody: string;
  extractedFigures: {
    peRatio?: number;
    revenueTTM?: number;
    operatingMargin?: number;
    freeCashFlow?: number;
    netDebt?: number;
    movePercent?: number;
  };
  socialHooks: {
    twitterThread: string[];
    redditPost: {
      title: string;
      bodyMarkdown: string;
      flair?: string;
    };
    telegramAlert: string;
  };
  theses?: {
    bull: ThesisPoint[];
    bear: ThesisPoint[];
  };
  isPennyStock?: boolean;
  moneyMarketTradingVenue?: string;
  priceTimestamp?: string;
  fundamentalRating?: 'Strong' | 'Fairly Valued' | 'Weak';
  classification?: 'Growth Stock' | 'Income Stock' | 'Value / Turnaround' | 'Speculative Penny Stock';
  artificialInflation?: ArtificialInflation;
  debtAnalysis?: DebtAnalysis;
  priceToBookRatio?: ValuationMetricComparison;
  priceToEarningsRatio?: ValuationMetricComparison;
  returnOnEquity?: number;
  earningsPerShare?: EPSHistory;
  volatilityIndex?: VolatilityIndex;
  cashFlow?: CashFlowBreakdown;
  managementQuality?: ManagementQuality;
  competitiveMoat?: CompetitiveMoat;
  companyDeepDive?: CompanyQuestions;
  industryDeepDive?: IndustryQuestions;
  valuationModels?: ValuationModels;
}

export interface CoverageRecord {
  ticker: string;
  companyName: string;
  exchange: string;
  coveredAt: string; // ISO date
  category: 'gainer' | 'loser';
  movePercent: number;
  slug: string;
}

export interface FinalReportFrontmatter {
  title: string;
  description: string;
  publishDate: string;
  ticker: string;
  companyName: string;
  exchange: string;
  region: 'US' | 'EU';
  sector: string;
  industry: string;
  category: 'gainer' | 'loser';
  movePercent: number;
  currentPrice: number;
  currency: string;
  marketCap: number;
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number;
  riskScore: number; // 1-10
  tags: string[];
  keywords: string[];
  affiliates: AffiliateLink[];
  adSlots: {
    topBanner: boolean;
    midArticle: boolean;
    bottomBanner: boolean;
  };
  socialHooks: {
    twitter: string[];
    redditTitle: string;
    telegram: string;
  };

  // Penny Stock & Trading Venue
  isPennyStock: boolean;
  moneyMarketTradingVenue: string;
  priceTimestamp: string;

  // Debt breakdown
  totalDebt: number;
  debtToEquity: number | null;
  shortTermDebt: number;
  longTermDebt: number;
  shortVsLongTermRatio: number;
  recentChangesInDebt: string;
  debtRisks: string;
  debtAnalysis?: DebtAnalysis;

  // Valuation comparisons
  priceToBook: ValuationMetricComparison;
  priceToEarnings: ValuationMetricComparison;
  priceToBookRatio?: ValuationMetricComparison;
  priceToEarningsRatio?: ValuationMetricComparison;

  // Profitability & EPS
  returnOnEquity: number;
  earningsPerShare: EPSHistory;

  // Volatility & Cash Flow
  volatilityIndex: VolatilityIndex;
  cashFlow: CashFlowBreakdown;
  freeCashFlow?: number;
  operatingCashFlow?: number;

  // Qualitative Analysis
  managementQuality: ManagementQuality;
  competitiveMoat: CompetitiveMoat;
  companyQuestions: CompanyQuestions;
  industryQuestions: IndustryQuestions;
  companyDeepDive?: CompanyQuestions;
  industryDeepDive?: IndustryQuestions;

  // Multi-model Valuations
  valuationModels: ValuationModels;
  fundamentalRating: 'Strong' | 'Fairly Valued' | 'Weak';
  classification: 'Growth Stock' | 'Income Stock' | 'Value / Turnaround' | 'Speculative Penny Stock';

  // Sentiment & Artificial Inflation
  isArtificiallyInflated: boolean;
  artificialInflationRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  volumeAnomalyRatio: number;
  majorPriceDriver: string;
  newsImpact: string;
  socialMediaImpact: string;
  artificialInflation?: ArtificialInflation;

  // Thesis breakdown
  theses: {
    bull: ThesisPoint[];
    bear: ThesisPoint[];
  };
}
