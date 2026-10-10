import type { FlowMethod } from '../secXbrl.js';

export interface ScrapedNewsArticle {
  title: string;
  description: string;
  source: string;
  pubDate: string;
  link: string;
}

export interface ScrapedRedditPost {
  title: string;
  author?: string;
  pubDate?: string;
  link?: string;
  subreddit?: string;
}

export interface LivePeerData {
  price: number;
  name?: string;
  trailingPE?: number | null;
  forwardPE?: number | null;
  marketCap?: number;
  evToEbitda?: number | null;
  roic?: number | null;
}

export interface SecQuarterlyEPS {
  quarter: string;
  eps: number;
  date: string;
  yoyChangePercent?: number | null;
  derived?: boolean;
}

export interface SecFinancialDisclosures {
  cik: string;
  entityName: string;
  sic?: string;
  sicDescription?: string;
  latestRevenueTTM?: number;
  latestNetIncomeTTM?: number;
  latestOperatingIncomeTTM?: number;
  latestOperatingCashFlowTTM?: number;
  capitalExpendituresTTM?: number;
  grossProfitTTM?: number;
  depreciationAmortizationTTM?: number;
  ttmPeriodEnd?: string;
  ttmMethod?: FlowMethod;
  revenueGrowthYoY?: number;
  balanceSheetDate?: string;
  totalAssets?: number;
  totalLiabilities?: number;
  totalDebt?: number;
  shortTermDebt?: number;
  longTermDebt?: number;
  priorYearTotalDebt?: number;
  cashAndEquivalents?: number;
  stockholdersEquity?: number;
  quarterlyEPS?: SecQuarterlyEPS[];
  latest10KFilingDate?: string;
  fiscalYear?: number;
  fiscalYearEnd?: string;
  businessSummary?: string;
}

export interface CompanyProfile {
  businessSummary?: string;
  sector?: string;
  industry?: string;
  fullTimeEmployees?: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface StockIntelligenceScrapeResult {
  ticker: string;
  news: ScrapedNewsArticle[];
  stockTwits: {
    bullishCount: number;
    bearishCount: number;
    totalMessages: number;
    sampleMessages: string[];
    extractedThemes: string[];
  };
  redditPosts: ScrapedRedditPost[];
  secDisclosures?: SecFinancialDisclosures | null;
  optionChain?: {
    calls: any[];
    puts: any[];
    spotPrice?: number;
    expirationDate?: number;
  } | null;
  shareStats?: {
    floatShares?: number;
    sharesOutstanding?: number;
    heldPercentInsiders?: number;
    heldPercentInstitutions?: number;
    sharesShort?: number;
    shortPercentOfFloat?: number;
  } | null;
  companyProfile?: CompanyProfile | null;
}
