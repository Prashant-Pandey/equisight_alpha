/**
 * Multi-source financial statement alignment and raw metrics assembly.
 * Reconciles live screener quotes, SEC EDGAR XBRL filings, and asset profiles.
 */

import { sectorFromSic } from '../valuationBenchmarks.js';
import { extractSegmentBreakdown } from './segmentBreakdown.js';
import type { QuarterlyEPS, MacroBackdrop } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export interface AssembleInput {
  ticker: string;
  cleanTicker: string;
  companyName?: string;
  screenerQuote: any;
  secData: any;
  chartMeta: any;
  profile?: any;
  peerTickers: string[];
  peerData: Record<string, any>;
  etfData?: { price?: number; trailingPE?: number; forwardPE?: number };
  macro?: MacroBackdrop;
}

export function assembleRawFundamentals(input: AssembleInput): RawFundamentalInput {
  const { ticker, cleanTicker, companyName, screenerQuote, secData, chartMeta, profile, peerTickers, peerData, etfData, macro } = input;

  const name = companyName || screenerQuote?.longName || screenerQuote?.shortName || secData?.entityName || chartMeta?.longName || chartMeta?.shortName || cleanTicker;
  const price = screenerQuote?.regularMarketPrice ?? chartMeta?.regularMarketPrice ?? 0;
  const marketCap = screenerQuote?.marketCap ?? (secData?.totalAssets ?? 0);
  const sharesOutstanding = screenerQuote?.sharesOutstanding ?? (price > 0 && marketCap > 0 ? Math.round(marketCap / price) : 0);
  const revenueTTM = secData?.latestRevenueTTM ?? 0;
  const netIncomeTTM = secData?.latestNetIncomeTTM ?? 0;
  const operatingCashFlow = secData?.latestOperatingCashFlowTTM ?? 0;
  const capexTTM: number | undefined = secData?.capitalExpendituresTTM;
  const freeCashFlowTTM: number | null = (operatingCashFlow !== 0 && capexTTM !== undefined && capexTTM !== null)
    ? operatingCashFlow - Math.abs(capexTTM) : null;
  const totalDebt = secData?.totalDebt ?? 0;
  const cashAndEquivalents = secData?.cashAndEquivalents ?? 0;
  const netDebt = totalDebt - cashAndEquivalents;
  const operatingIncomeTTM: number | null = secData?.latestOperatingIncomeTTM ?? null;
  const operatingMargin = (revenueTTM > 0 && operatingIncomeTTM !== null)
    ? parseFloat(((operatingIncomeTTM / revenueTTM) * 100).toFixed(1)) : 0;
  const depreciationTTM: number | null = secData?.depreciationAmortizationTTM ?? null;
  const ebitdaTTM = operatingIncomeTTM !== null && depreciationTTM !== null
    ? operatingIncomeTTM + Math.abs(depreciationTTM) : null;
  const grossProfitTTM: number | undefined = secData?.grossProfitTTM;
  const grossMargin: number | null = (revenueTTM > 0 && grossProfitTTM !== undefined && grossProfitTTM !== null)
    ? parseFloat(((grossProfitTTM / revenueTTM) * 100).toFixed(1)) : null;

  const quarterlyEPSPast2Years: QuarterlyEPS[] = (secData?.quarterlyEPS ?? []).map((q: any) => ({
    quarter: q.quarter, eps: q.eps, date: q.date, yoyChangePercent: q.yoyChangePercent ?? null, derived: q.derived ?? false
  }));
  const lastFourQuarterEPS = quarterlyEPSPast2Years.length >= 4
    ? parseFloat(quarterlyEPSPast2Years.slice(-4).reduce((s, q) => s + q.eps, 0).toFixed(2)) : null;

  const peRatioTrailing = screenerQuote?.trailingPE ?? null;
  const peRatioForward = screenerQuote?.forwardPE ?? null;
  const rawPB = screenerQuote?.priceToBook ?? (screenerQuote?.bookValue && price ? parseFloat((price / screenerQuote.bookValue).toFixed(2)) : null);
  const dividendYield = (screenerQuote?.trailingAnnualDividendYield ?? 0) * 100;
  const currentTTM_EPS = screenerQuote?.epsTrailingTwelveMonths ?? lastFourQuarterEPS
    ?? (sharesOutstanding > 0 ? parseFloat((netIncomeTTM / sharesOutstanding).toFixed(2)) : 0);
  const fiftyTwoWeekHigh = screenerQuote?.fiftyTwoWeekHigh ?? chartMeta?.fiftyTwoWeekHigh ?? price;
  const fiftyTwoWeekLow = screenerQuote?.fiftyTwoWeekLow ?? chartMeta?.fiftyTwoWeekLow ?? price;
  const currentRatio = (secData?.totalAssets && secData?.totalLiabilities && secData.totalLiabilities > 0)
    ? parseFloat((secData.totalAssets / secData.totalLiabilities).toFixed(2)) : null;

  const sector = screenerQuote?.sector || (secData?.sic ? sectorFromSic(secData.sic) : 'General Equities');
  const industry = screenerQuote?.industry || secData?.sicDescription || 'Public Equities';
  const businessSummary = profile?.businessSummary || secData?.businessSummary;
  const description = businessSummary || `${name} is an equity security publicly traded on major financial markets operating in the ${sector} sector (${industry}).`;
  const segmentRevenueBreakdown = extractSegmentBreakdown(businessSummary, revenueTTM);

  return {
    ticker: cleanTicker, companyName: name, sector, industry, description, businessSummary,
    segmentRevenueBreakdown, peerTickers, peerData, etfData, marketCap, peRatioTrailing, peRatioForward,
    pegRatio: screenerQuote?.pegRatio ?? null, rawPB,
    evToEbitda: screenerQuote?.lastCloseTevEbitLtm ? parseFloat(screenerQuote.lastCloseTevEbitLtm.toFixed(2)) : null,
    dividendYield, revenueTTM, netIncomeTTM, grossMargin, operatingMargin, freeCashFlowTTM, operatingCashFlow,
    totalDebt, cashAndEquivalents, netDebt,
    debtToEquity: (marketCap > 0 && totalDebt > 0) ? parseFloat((totalDebt / marketCap).toFixed(2)) : null,
    currentRatio, roic: null, beta: screenerQuote?.beta ?? null, fiftyTwoWeekHigh, fiftyTwoWeekLow, price,
    sharesOutstanding, currentTTM_EPS, bookValuePerShare: screenerQuote?.bookValue ?? null,
    shortTermDebt: secData?.shortTermDebt ?? null, longTermDebt: secData?.longTermDebt ?? null,
    priorYearTotalDebt: secData?.priorYearTotalDebt ?? null, quarterlyEPSPast2Years, operatingIncomeTTM,
    ebitdaTTM, depreciationTTM, stockholdersEquity: secData?.stockholdersEquity ?? null,
    revenueGrowthYoY: secData?.revenueGrowthYoY ?? null, riskFreeRate: macro?.us10YearYield
  };
}
