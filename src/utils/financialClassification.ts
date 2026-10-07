/**
 * Canonical financial metrics classifications, ratings, and valuation heuristics.
 * Centralized domain logic shared across Astro components and pipeline agents.
 * 
 * Powered by the institutional Financial Definitions & Thresholds Registry (financialDefinitions.ts).
 */

import {
  FINANCIAL_THRESHOLDS,
  FINANCIAL_DEFINITIONS,
  getDefinitionById,
  getDefinitionsByCategory,
  listAllDefinitions,
  type FinancialDomainDefinition,
  type DefinitionCategory,
  type DefinitionTier
} from './financialDefinitions.js';

export {
  FINANCIAL_THRESHOLDS,
  FINANCIAL_DEFINITIONS,
  getDefinitionById,
  getDefinitionsByCategory,
  listAllDefinitions,
  type FinancialDomainDefinition,
  type DefinitionCategory,
  type DefinitionTier
};

export type StockClassification =
  | 'Growth Stock'
  | 'Income Stock'
  | 'Value / Turnaround'
  | 'Speculative Penny Stock';

export type FundamentalRating = 'Strong' | 'Fairly Valued' | 'Weak';
export type MoatTrend = 'Positive' | 'Stable' | 'Negative';
export type EconomicMoatRating = 'Wide Moat' | 'Narrow Moat' | 'None';
export type UncertaintyRating = 'Low' | 'Medium' | 'High' | 'Very High' | 'Extreme';

export interface PennyStockOptions {
  price?: number | null;
  exchange?: string | null;
  explicitFlag?: boolean | null;
}

/**
 * Determines whether an equity qualifies as a penny/micro-cap stock
 * per SEC Rule 3a51-1 criteria and venue standards.
 */
export function isPennyStock(
  price?: number | null,
  exchange?: string | null,
  explicitFlag?: boolean | null
): boolean {
  if (explicitFlag === true) return true;
  if (
    price !== undefined &&
    price !== null &&
    price < FINANCIAL_THRESHOLDS.pennyStock.priceCeilingUSD
  ) {
    return true;
  }
  const ex = (exchange || '').toUpperCase();
  for (const venue of FINANCIAL_THRESHOLDS.pennyStock.pennyVenues) {
    if (ex === venue || ex.includes(venue)) {
      return true;
    }
  }
  return false;
}

export interface ClassificationParams {
  classification?: StockClassification | string | null;
  isPennyStock?: boolean | null;
  currentPrice?: number | null;
  exchange?: string | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  operatingMargin?: number | null;
}

/**
 * Derives the canonical stock classification (Growth, Income, Value/Turnaround, Speculative Penny)
 * according to institutional factor taxonomy rules.
 */
export function getClassification(params: ClassificationParams): StockClassification {
  if (
    params.classification === 'Growth Stock' ||
    params.classification === 'Income Stock' ||
    params.classification === 'Value / Turnaround' ||
    params.classification === 'Speculative Penny Stock'
  ) {
    return params.classification;
  }

  const penny = isPennyStock(params.currentPrice, params.exchange, params.isPennyStock);
  if (penny) {
    return 'Speculative Penny Stock';
  }

  const divYield = params.dividendYield ?? 0;
  if (divYield >= FINANCIAL_THRESHOLDS.classification.incomeMinDividendYieldPct) {
    return 'Income Stock';
  }

  const pe = params.peRatio ?? null;
  const margin = params.operatingMargin ?? null;
  if (
    (pe !== null && pe > FINANCIAL_THRESHOLDS.classification.growthMinPeRatio) ||
    (margin !== null && margin > FINANCIAL_THRESHOLDS.classification.growthMinOperatingMarginPct)
  ) {
    return 'Growth Stock';
  }

  return 'Value / Turnaround';
}

export interface FundamentalRatingParams {
  fundamentalRating?: FundamentalRating | string | null;
  isPennyStock?: boolean | null;
  riskScore?: number | null;
  verdict?: string | null;
  debtToEquity?: number | null;
  consensusUpside?: number | null;
}

/**
 * Derives the canonical fundamental rating (Strong, Fairly Valued, Weak)
 * based on balance sheet leverage and intrinsic margin of safety.
 */
export function getFundamentalRating(params: FundamentalRatingParams): FundamentalRating {
  if (
    params.fundamentalRating === 'Strong' ||
    params.fundamentalRating === 'Fairly Valued' ||
    params.fundamentalRating === 'Weak'
  ) {
    return params.fundamentalRating;
  }

  if (params.isPennyStock) {
    return 'Weak';
  }

  if (params.verdict) {
    const v = params.verdict;
    const de = params.debtToEquity ?? 0.5;
    if (
      v.includes('Undervalued') &&
      de < FINANCIAL_THRESHOLDS.fundamentalRating.strongDebtToEquityCeiling
    ) {
      return 'Strong';
    }
    if (
      v.includes('Overvalued') ||
      de > FINANCIAL_THRESHOLDS.fundamentalRating.weakDebtToEquityFloor
    ) {
      return 'Weak';
    }
    return 'Fairly Valued';
  }

  if (params.consensusUpside !== undefined && params.consensusUpside !== null) {
    if (params.consensusUpside > FINANCIAL_THRESHOLDS.fundamentalRating.strongConsensusUpsidePct) {
      return 'Strong';
    }
    if (params.consensusUpside < FINANCIAL_THRESHOLDS.fundamentalRating.weakConsensusUpsidePct) {
      return 'Weak';
    }
    return 'Fairly Valued';
  }

  if (params.riskScore !== undefined && params.riskScore !== null) {
    if (params.riskScore <= FINANCIAL_THRESHOLDS.fundamentalRating.strongRiskScoreCeiling) {
      return 'Strong';
    }
    if (params.riskScore <= FINANCIAL_THRESHOLDS.fundamentalRating.fairRiskScoreCeiling) {
      return 'Fairly Valued';
    }
    return 'Weak';
  }

  return 'Fairly Valued';
}

/**
 * Returns user-facing Risk Category label based on a 1-10 fundamental risk score.
 */
export function getRiskCategory(riskScore: number): string {
  return riskScore <= FINANCIAL_THRESHOLDS.riskCategory.conservativeMaxScore
    ? 'Conservative / Low Risk'
    : riskScore <= FINANCIAL_THRESHOLDS.riskCategory.coreMaxScore
      ? 'Core / Moderate Risk'
      : 'High Risk / Speculative';
}

export interface CashFlowStatusParams {
  status?: string | null;
  freeCashFlow?: number | null;
  operatingCashFlow?: number | null;
  isPennyStock?: boolean | null;
}

/**
 * Returns Cash Flow Profile descriptor based on Free Cash Flow, operating cash flow, and asset tier.
 * Supports both options object or (status, freeCashFlow, isPennyStock) positional arguments.
 */
export function getCashFlowStatus(
  statusOrParams?: string | CashFlowStatusParams | null,
  freeCashFlowArg?: number | null,
  isPennyStockArg?: boolean | null
): string {
  let status: string | null | undefined;
  let freeCashFlow: number | null | undefined;
  let isPenny: boolean = false;

  if (typeof statusOrParams === 'object' && statusOrParams !== null) {
    status = statusOrParams.status;
    freeCashFlow = statusOrParams.freeCashFlow;
    isPenny = Boolean(statusOrParams.isPennyStock);
  } else {
    status = statusOrParams;
    freeCashFlow = freeCashFlowArg;
    isPenny = Boolean(isPennyStockArg);
  }

  if (status && status !== 'Not Available' && status !== 'Not Reported') {
    return status;
  }

  if (isPenny) {
    return FINANCIAL_THRESHOLDS.cashFlow.labels.pennyFocus;
  }

  if (freeCashFlow !== null && freeCashFlow !== undefined) {
    if (freeCashFlow > FINANCIAL_THRESHOLDS.cashFlow.positiveFcfFloorUSD) {
      return FINANCIAL_THRESHOLDS.cashFlow.labels.positiveFcf;
    }
    if (freeCashFlow < FINANCIAL_THRESHOLDS.cashFlow.positiveFcfFloorUSD) {
      return FINANCIAL_THRESHOLDS.cashFlow.labels.cashBurn;
    }
    return FINANCIAL_THRESHOLDS.cashFlow.labels.neutral;
  }

  return FINANCIAL_THRESHOLDS.cashFlow.labels.notAvailable;
}

export interface ManagementQualityParams {
  existingRating?: string | null;
  existingTrackRecord?: string | null;
  isPennyStock?: boolean | null;
  roic?: number | null;
  roe?: number | null;
  debtToEquity?: number | null;
  operatingCashFlow?: number | null;
}

/**
 * Derives institutional Management Quality rating and executive track record description.
 */
export function getManagementQuality(params: ManagementQualityParams = {}): {
  rating: string;
  trackRecord: string;
} {
  const isPenny = Boolean(params.isPennyStock);
  const cfg = FINANCIAL_THRESHOLDS.managementQuality;

  let rating = params.existingRating || '';
  let trackRecord = params.existingTrackRecord || '';

  if (!rating || rating === 'Not Rated') {
    if (isPenny) {
      rating = cfg.ratings.speculative;
    } else if (
      (params.roic !== null && params.roic !== undefined && params.roic > cfg.exemplaryRoicFloorPct) ||
      (params.roe !== null && params.roe !== undefined && params.roe > cfg.exemplaryRoeFloorPct)
    ) {
      rating = cfg.ratings.exemplary;
    } else {
      rating = cfg.ratings.established;
    }
  }

  if (!trackRecord || trackRecord === 'Not Available') {
    if (isPenny) {
      trackRecord = cfg.trackRecordNarratives.penny;
    } else if (rating === cfg.ratings.exemplary) {
      trackRecord = cfg.trackRecordNarratives.exemplary;
    } else if (
      (params.debtToEquity !== null && params.debtToEquity !== undefined && params.debtToEquity > cfg.headwindsDebtToEquityFloor) ||
      (params.operatingCashFlow !== null && params.operatingCashFlow !== undefined && params.operatingCashFlow < 0)
    ) {
      trackRecord = cfg.trackRecordNarratives.headwinds;
    } else {
      trackRecord = cfg.trackRecordNarratives.established;
    }
  }

  return { rating, trackRecord };
}

export interface MoatTrendParams {
  existingTrend?: MoatTrend | string | null;
  revenueGrowthYoY?: number | null;
  roic?: number | null;
}

/**
 * Derives Morningstar Moat Trend trajectory (Positive, Stable, Negative).
 */
export function getMoatTrend(params: MoatTrendParams = {}): MoatTrend {
  if (
    params.existingTrend === 'Positive' ||
    params.existingTrend === 'Stable' ||
    params.existingTrend === 'Negative'
  ) {
    return params.existingTrend;
  }

  const cfg = FINANCIAL_THRESHOLDS.moatTrend;
  const revGrowth = params.revenueGrowthYoY;
  const roic = params.roic;

  if (revGrowth !== null && revGrowth !== undefined) {
    if (
      revGrowth > cfg.positiveRevenueGrowthFloorPct &&
      (roic === null || roic === undefined || roic > cfg.positiveRoicFloorPct)
    ) {
      return 'Positive';
    }
    if (
      revGrowth < cfg.negativeRevenueGrowthCeilingPct ||
      (roic !== null && roic !== undefined && roic < cfg.negativeRoicCeilingPct)
    ) {
      return 'Negative';
    }
  }

  return 'Stable';
}

export interface EconomicMoatParams {
  existingRating?: string | null;
  existingSummary?: string | null;
  isPennyStock?: boolean | null;
  widePillarsCount?: number | null;
  narrowPillarsCount?: number | null;
  roic?: number | null;
}

/**
 * Derives institutional Economic Moat rating and structural advantage summary.
 */
export function getEconomicMoat(params: EconomicMoatParams = {}): {
  rating: string;
  summary: string;
} {
  const isPenny = Boolean(params.isPennyStock);
  const cfg = FINANCIAL_THRESHOLDS.economicMoat;

  let rating = params.existingRating || '';
  let summary = params.existingSummary || '';

  const wideCount = params.widePillarsCount ?? 0;
  const narrowCount = params.narrowPillarsCount ?? 0;
  const roic = params.roic ?? null;

  if (!rating || rating === 'Not Rated') {
    if (isPenny) {
      rating = cfg.ratings.none;
    } else if (
      wideCount >= cfg.wideMinPillars ||
      (narrowCount >= cfg.narrowToWideMinNarrowPillars && (roic === null || roic > cfg.narrowToWideRoicHurdlePct))
    ) {
      rating = cfg.ratings.wide;
    } else if (narrowCount >= 1 || (roic !== null && roic > cfg.narrowRoicHurdlePct)) {
      rating = cfg.ratings.narrow;
    } else {
      rating = cfg.ratings.none;
    }
  }

  if (!summary || summary === 'Not Available') {
    if (isPenny) {
      summary = cfg.summaries.penny;
    } else if (rating === cfg.ratings.wide) {
      summary = cfg.summaries.wide;
    } else if (rating === cfg.ratings.narrow) {
      summary = cfg.summaries.narrow;
    } else {
      summary = cfg.summaries.none;
    }
  }

  return { rating, summary };
}

/**
 * Derives institutional Valuation Uncertainty Tier based on beta, sector, and balance sheet leverage.
 */
export function determineUncertaintyRating(
  arg1?: any,
  arg2?: any,
  arg3?: any,
  arg4?: any
): UncertaintyRating {
  let sector: string | undefined;
  let beta: number | null | undefined;
  let debtToEquity: number | null | undefined;
  let isPenny = false;

  if (typeof arg1 === 'object' && arg1 !== null) {
    sector = arg1.sector;
    beta = arg1.beta;
    debtToEquity = arg1.debtToEquity;
    isPenny = Boolean(arg1.isPennyStock);
  } else if (typeof arg1 === 'string' || typeof arg4 === 'boolean') {
    sector = typeof arg1 === 'string' ? arg1 : undefined;
    beta = typeof arg2 === 'number' ? arg2 : null;
    debtToEquity = typeof arg3 === 'number' ? arg3 : null;
    isPenny = Boolean(arg4);
  } else {
    beta = typeof arg1 === 'number' ? arg1 : null;
    isPenny = Boolean(arg2);
    debtToEquity = typeof arg3 === 'number' ? arg3 : null;
    sector = typeof arg4 === 'string' ? arg4 : undefined;
  }

  if (isPenny) return 'Extreme';

  const cfg = FINANCIAL_THRESHOLDS.uncertaintyRating;
  const b = beta ?? 1.1;
  const de = debtToEquity ?? 0.5;
  const s = (sector || '').toLowerCase();

  if (s.includes('utilities') && b < cfg.utilityBetaCeiling && de < cfg.utilityDebtCeiling) return 'Low';
  if ((s.includes('consumer defensive') || s.includes('staples')) && b < cfg.consumerDefensiveBetaCeiling) return 'Low';

  if (b > cfg.veryHighBetaFloor || de > cfg.veryHighDebtFloor) return 'Very High';
  if (b > cfg.highBetaFloor || de > cfg.highDebtFloor) return 'High';
  if (b >= cfg.mediumBetaFloor) return 'Medium';
  return 'Low';
}

/**
 * Returns Volatility / Beta descriptor.
 */
export function getVolatilityRating(
  rating?: string | null,
  betaOrValue?: number | null
): string {
  if (rating && rating !== 'Not Rated') return rating;
  if (betaOrValue !== null && betaOrValue !== undefined) {
    if (betaOrValue > FINANCIAL_THRESHOLDS.volatility.highBetaFloor) {
      return 'High Volatility';
    }
    if (betaOrValue < FINANCIAL_THRESHOLDS.volatility.lowBetaCeiling) {
      return 'Low Volatility';
    }
    return 'Moderate Volatility';
  }
  return 'Not Rated';
}

/**
 * Returns Debt-to-Equity leverage assessment label.
 */
export function getDebtLeverageLabel(debtToEquity?: number | null): string {
  if (debtToEquity === null || debtToEquity === undefined) return 'N/A';
  return debtToEquity > FINANCIAL_THRESHOLDS.debtLeverage.healthyDebtToEquityCeiling
    ? 'Elevated Leverage'
    : 'Healthy Leverage';
}

/**
 * Returns a 5-star visual representation string (e.g. "★★★★☆").
 */
export function getStarRatingString(
  starRatingString?: string | null,
  starRating?: number | null
): string | null {
  if (starRatingString) return starRatingString;
  if (
    starRating &&
    starRating >= FINANCIAL_THRESHOLDS.starRating.minStars &&
    starRating <= FINANCIAL_THRESHOLDS.starRating.maxStars
  ) {
    return '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
  }
  return null;
}

/**
 * Derives consensus valuation verdict label from upside percentage.
 */
export function getConsensusVerdict(
  existingVerdict?: string | null,
  consensusUpside?: number | null
): string {
  if (existingVerdict && existingVerdict !== 'Fairly Valued') return existingVerdict;
  if (consensusUpside !== null && consensusUpside !== undefined) {
    if (consensusUpside >= FINANCIAL_THRESHOLDS.valuationVerdict.significantlyUndervaluedFloorPct) {
      return 'Significantly Undervalued / Attractive Risk-Reward';
    }
    if (consensusUpside >= FINANCIAL_THRESHOLDS.valuationVerdict.modestlyUndervaluedFloorPct) {
      return 'Modestly Undervalued / Accumulate';
    }
    if (consensusUpside >= FINANCIAL_THRESHOLDS.valuationVerdict.fairlyValuedFloorPct) {
      return 'Fairly Valued / Market Weight';
    }
    return 'Overvalued / Multiple Vulnerability';
  }
  return existingVerdict || 'Fairly Valued';
}

/**
 * Returns the Tailwind text color class for a consensus valuation verdict.
 *
 * Color semantics:
 * - Significantly Overvalued / Overvalued: Red (text-rose-400) - indicates negative margin of safety / downside valuation risk.
 * - Modestly Overvalued: Amber (text-amber-400) - caution / mild multiple vulnerability.
 * - Fairly Valued: Slate (text-slate-300) - neutral / market weight.
 * - Modestly Undervalued: Green (text-emerald-400) - favorable entry / positive margin of safety.
 * - Significantly Undervalued: Green (text-emerald-400) - attractive risk-reward / substantial margin of safety.
 * - Inconclusive / Data Limited: Muted Slate (text-slate-400).
 * - Speculative Penny Stock: Amber (text-amber-400).
 */
export function getConsensusVerdictColor(verdict?: string | null): string {
  if (!verdict) return 'text-slate-400';
  const v = verdict.toLowerCase().trim();

  // Overvalued cases (Overvalued is unfavorable / downside risk)
  if (v.includes('significantly overvalued')) {
    return 'text-rose-400';
  }
  if (v.includes('modestly overvalued')) {
    return 'text-amber-400';
  }
  if (v.includes('overvalued')) {
    return 'text-rose-400';
  }

  // Undervalued cases (Positive margin of safety)
  if (v.includes('undervalued')) {
    return 'text-emerald-400';
  }

  // Fair value / Neutral cases
  if (v.includes('fairly valued') || v.includes('fair value')) {
    return 'text-slate-300';
  }

  // Speculative penny stock
  if (v.includes('penny') || v.includes('speculative')) {
    return 'text-amber-400';
  }

  // Inconclusive / Data Limited
  if (v.includes('inconclusive') || v.includes('limited') || v.includes('n/a')) {
    return 'text-slate-400';
  }

  return 'text-slate-300';
}

/**
 * Returns the Tailwind badge/pill background, text, and border styling for a consensus valuation verdict.
 */
export function getConsensusVerdictBadgeClass(verdict?: string | null): string {
  if (!verdict) return 'bg-slate-800 text-slate-400 border border-slate-700';
  const v = verdict.toLowerCase().trim();

  if (v.includes('significantly overvalued')) {
    return 'bg-rose-950 text-rose-400 border border-rose-800/60';
  }
  if (v.includes('modestly overvalued')) {
    return 'bg-amber-950 text-amber-400 border border-amber-800/60';
  }
  if (v.includes('overvalued')) {
    return 'bg-rose-950 text-rose-400 border border-rose-800/60';
  }
  if (v.includes('undervalued')) {
    return 'bg-emerald-950 text-emerald-400 border border-emerald-800/60';
  }
  if (v.includes('fairly valued') || v.includes('fair value')) {
    return 'bg-slate-800 text-slate-300 border border-slate-700';
  }
  if (v.includes('penny') || v.includes('speculative')) {
    return 'bg-amber-950 text-amber-400 border border-amber-800/60';
  }
  if (v.includes('inconclusive') || v.includes('limited') || v.includes('n/a')) {
    return 'bg-slate-900 text-slate-400 border border-slate-800';
  }
  return 'bg-slate-800 text-slate-300 border border-slate-700';
}

/**
 * Resolves standard trading venue and primary listed market.
 */
export function resolveTradingVenue(
  symbol: string = '',
  exchange: string = '',
  isPenny: boolean = false
): string {
  const normEx = (exchange || '').toUpperCase();
  if (isPenny) {
    if (normEx.includes('ASE') || normEx.includes('NYSE')) return 'NYSE American';
    if (normEx.includes('PNK') || normEx.includes('OTC') || normEx === 'OTHER') return 'OTC Markets Pink Sheets';
    return 'Nasdaq Capital Market';
  }

  if (normEx.includes('NASDAQ') || normEx.includes('NMS')) return 'Nasdaq Global Select Market';
  if (normEx.includes('NYSE') || normEx.includes('NYQ')) return 'New York Stock Exchange';
  if (normEx.includes('LSE')) return 'London Stock Exchange';
  if (normEx.includes('EURONEXT') || normEx.includes('PA')) return 'Euronext Paris';
  if (normEx.includes('DAX') || normEx.includes('DE')) return 'XETRA Frankfurt';
  return exchange ? `${exchange} Primary Listed` : 'Nasdaq / NYSE';
}
