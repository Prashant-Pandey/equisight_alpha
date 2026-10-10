/**
 * Canonical enrichment of raw ingested fundamental metrics into institutional valuation suite.
 */

import { getCashFlowStatus, getManagementQuality, getClassification, getFundamentalRating } from '../../../../src/utils/financialClassification.js';
import { calculateDebtBreakdown } from './debtBreakdown.js';
import { calculateCostOfCapital } from './costOfCapital.js';
import { analyzeEconomicMoat } from './moatEngine.js';
import { calculateIntrinsicModels } from './intrinsicModels.js';
import { calculateMultiplesAndAsset } from './multiplesAndAssetValuation.js';
import { calculateSectorSpecificValuation } from './sectorSpecificValuation.js';
import { calculateConsensusValuation } from './consensusEngine.js';
import { buildCompetitorBenchmarking } from './competitorBenchmarking.js';
import { buildQuestionsAndDynamics } from './questionsAndDynamics.js';
import type { FundamentalMetrics, ValuationMetricComparison, EPSHistory, VolatilityIndex, CashFlowBreakdown, ManagementQuality } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export function enrichFundamentalMetrics(raw: RawFundamentalInput): FundamentalMetrics {
  const isPenny = raw.fiftyTwoWeekHigh < 5.0 || raw.marketCap < 400_000_000;
  const estPrice = raw.price || (raw.fiftyTwoWeekHigh > 0 && raw.fiftyTwoWeekLow > 0
    ? parseFloat(((raw.fiftyTwoWeekHigh + raw.fiftyTwoWeekLow) / 2).toFixed(2)) : 1.0);
  const shares = raw.sharesOutstanding || Math.max(1, Math.round(raw.marketCap / Math.max(0.01, estPrice)));
  const currentTTM_EPS = raw.currentTTM_EPS !== undefined
    ? raw.currentTTM_EPS : (raw.netIncomeTTM ? parseFloat((raw.netIncomeTTM / shares).toFixed(2)) : 0);
  const bookValuePerShare = raw.bookValuePerShare
    ?? (raw.stockholdersEquity && raw.stockholdersEquity > 0 && shares > 0 ? parseFloat((raw.stockholdersEquity / shares).toFixed(2)) : null)
    ?? (raw.rawPB && estPrice > 0 ? parseFloat((estPrice / raw.rawPB).toFixed(2)) : null);
  const bookEquity = raw.stockholdersEquity ?? (bookValuePerShare ? bookValuePerShare * shares : null);

  const debt = calculateDebtBreakdown(raw);
  const cap = calculateCostOfCapital(raw, debt.totalDebt, bookEquity);

  const currentPB = raw.rawPB;
  const sectorBenchPB = parseFloat((cap.bench.pb * cap.rateFactor).toFixed(2));
  const priceToBook: ValuationMetricComparison = { current: currentPB, industryAverage: sectorBenchPB, historicalAverage5Y: null, chartData: [] };

  const currentPE = raw.peRatioTrailing || raw.peRatioForward || null;
  const sectorBenchPE = parseFloat((cap.bench.pe * cap.rateFactor).toFixed(1));
  const priceToEarnings: ValuationMetricComparison = { current: currentPE, industryAverage: sectorBenchPE, historicalAverage5Y: null, chartData: [] };

  const returnOnEquity = bookEquity && bookEquity > 0 && raw.netIncomeTTM
    ? parseFloat(((raw.netIncomeTTM / bookEquity) * 100).toFixed(1))
    : (bookValuePerShare && bookValuePerShare > 0 && currentTTM_EPS ? parseFloat(((currentTTM_EPS / bookValuePerShare) * 100).toFixed(1)) : 0);

  const earningsPerShare: EPSHistory = { currentTTM: currentTTM_EPS, quarterlyEPSPast2Years: raw.quarterlyEPSPast2Years || [] };
  const volValue = isPenny ? 82.5 : (raw.beta ? parseFloat((raw.beta * 22.0).toFixed(1)) : 20.0);
  const volatilityIndex: VolatilityIndex = { value: volValue, rating: isPenny ? 'Extreme' : volValue > 35 ? 'High' : volValue > 20 ? 'Moderate' : 'Low' };

  const operatingCashFlow = raw.operatingCashFlow ?? 0;
  const cashFlow: CashFlowBreakdown = {
    operatingCashFlow, freeCashFlow: raw.freeCashFlowTTM,
    status: getCashFlowStatus({ freeCashFlow: raw.freeCashFlowTTM, operatingCashFlow, isPennyStock: isPenny })
  };

  const managementQuality: ManagementQuality = getManagementQuality({
    isPennyStock: isPenny, roic: cap.computedRoic, roe: returnOnEquity, debtToEquity: raw.debtToEquity, operatingCashFlow
  });

  const moat = analyzeEconomicMoat(raw, cap.computedRoic, isPenny);
  const qAndD = buildQuestionsAndDynamics(raw, moat.wideCount, cap.roic, cap.wacc);

  const baseVal = Math.max(0.01, estPrice);
  const intrinsic = calculateIntrinsicModels({
    baseVal, shares, overallMoatRating: moat.moatResult.rating, wacc: cap.wacc, costOfEquity: cap.costOfEquity,
    terminalGrowth: cap.terminalGrowth, revenueGrowthYoY: raw.revenueGrowthYoY, freeCashFlowTTM: raw.freeCashFlowTTM,
    operatingCashFlow, netIncomeTTM: raw.netIncomeTTM, netDebt: raw.netDebt, dividendYield: raw.dividendYield,
    currentTTM_EPS, bookValuePerShare, roic: cap.roic
  });

  const mult = calculateMultiplesAndAsset({
    baseVal, shares, totalDebt: debt.totalDebt, currentTTM_EPS, sectorBenchPE,
    peRatioTrailing: raw.peRatioTrailing, pegRatio: raw.pegRatio, bookValuePerShare, cashAndEquivalents: raw.cashAndEquivalents
  });

  const sec = calculateSectorSpecificValuation({
    baseVal, shares, netDebt: raw.netDebt, bench: cap.bench, rateFactor: cap.rateFactor, revenueTTM: raw.revenueTTM,
    costOfEquity: cap.costOfEquity, terminalGrowth: cap.terminalGrowth, returnOnEquity, operatingCashFlow,
    netIncomeTTM: raw.netIncomeTTM, depreciationTTM: raw.depreciationTTM, operatingIncomeTTM: raw.operatingIncomeTTM,
    ebitdaTTM: raw.ebitdaTTM, bookValuePerShare
  });

  const consensus = calculateConsensusValuation({
    baseVal, isPenny, sector: raw.sector, beta: raw.beta, debtToEquity: raw.debtToEquity,
    models: {
      ...intrinsic, ...mult, ...sec,
      terminalGrowth: cap.terminalGrowth, costOfEquity: cap.costOfEquity, dividendYield: raw.dividendYield,
      sectorBenchPE, bookValuePerShare, roic: cap.roic, industryMetric: cap.bench.industryMetric,
      industryMultiple: cap.bench.industryMultiple, rateFactor: cap.rateFactor, freeCashFlowTTM: raw.freeCashFlowTTM
    }
  });

  const competitorBenchmarking = buildCompetitorBenchmarking(raw, currentPE, moat.competitiveMoat.rating, cap.roic);
  const classification = getClassification({ isPennyStock: isPenny, dividendYield: raw.dividendYield, operatingMargin: raw.operatingMargin, peRatio: currentPE });
  const fundamentalRating = getFundamentalRating({ isPennyStock: isPenny, verdict: consensus.verdict, debtToEquity: raw.debtToEquity });

  return {
    ticker: raw.ticker, companyName: raw.companyName, sector: raw.sector, industry: raw.industry,
    description: raw.description, businessSummary: raw.businessSummary,
    segmentRevenueBreakdown: raw.segmentRevenueBreakdown, sectorDynamics: qAndD.sectorDynamics,
    competitorBenchmarking, morningstarRating: consensus.morningstarRating,
    starRating: consensus.morningstarRating.starRating, starRatingString: consensus.morningstarRating.starRatingString,
    uncertaintyRating: consensus.morningstarRating.uncertaintyRating, fiveStarPrice: consensus.morningstarRating.fiveStarPrice,
    oneStarPrice: consensus.morningstarRating.oneStarPrice, priceToFairValue: consensus.morningstarRating.priceToFairValue,
    marketCap: raw.marketCap, peRatioTrailing: raw.peRatioTrailing, peRatioForward: raw.peRatioForward,
    pegRatio: raw.pegRatio, evToEbitda: raw.evToEbitda, dividendYield: raw.dividendYield, revenueTTM: raw.revenueTTM,
    netIncomeTTM: raw.netIncomeTTM, grossMargin: raw.grossMargin, operatingMargin: raw.operatingMargin,
    freeCashFlowTTM: raw.freeCashFlowTTM, cashAndEquivalents: raw.cashAndEquivalents, netDebt: raw.netDebt,
    currentRatio: raw.currentRatio, roic: cap.roic, beta: raw.beta, fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: raw.fiftyTwoWeekLow, recentEarningsDate: raw.recentEarningsDate, earningsSurprisePercent: raw.earningsSurprisePercent,
    totalDebt: debt.totalDebt, debtToEquity: raw.debtToEquity, shortTermDebt: debt.shortTermDebt,
    longTermDebt: debt.longTermDebt, shortVsLongTermRatio: debt.shortVsLongTermRatio, recentChangesInDebt: debt.recentChangesInDebt,
    debtRisks: debt.debtRisks, priceToBook, priceToEarnings, returnOnEquity, earningsPerShare,
    volatilityIndex, cashFlow, managementQuality, competitiveMoat: moat.competitiveMoat,
    companyQuestions: qAndD.companyQuestions, industryQuestions: qAndD.industryQuestions,
    valuationModels: consensus.valuationModels, fundamentalRating, classification
  };
}
