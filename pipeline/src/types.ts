export interface MarketMover {
  ticker: string;
  symbol: string;
  name: string;
  exchange: 'NYSE' | 'NASDAQ' | 'LSE' | 'EURONEXT' | 'DAX' | 'OTHER';
  region: 'US' | 'EU';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  currency: string;
  category: 'gainer' | 'loser';
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
  priceToBook: number | null;
  evToEbitda: number | null;
  dividendYield: number;
  revenueTTM: number;
  netIncomeTTM: number;
  grossMargin: number;
  operatingMargin: number;
  freeCashFlowTTM: number;
  totalDebt: number;
  cashAndEquivalents: number;
  netDebt: number;
  debtToEquity: number | null;
  currentRatio: number | null;
  roic: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  recentEarningsDate?: string;
  earningsSurprisePercent?: number | null;
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
}
