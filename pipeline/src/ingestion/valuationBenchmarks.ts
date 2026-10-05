/**
 * Valuation benchmarks: SIC → sector mapping, sector reference multiples and
 * capital-market assumptions used to make the valuation suite macro- and sector-aware.
 *
 * Reference multiples are long-run US sector medians (approximately aligned with
 * Damodaran's January 2025 US industry datasets). They are anchored to a reference
 * risk-free rate and re-scaled at runtime for the prevailing 10Y Treasury yield.
 */

export type SectorKey =
  | 'Technology'
  | 'Communication Services'
  | 'Healthcare'
  | 'Financial Services'
  | 'Real Estate'
  | 'Utilities'
  | 'Energy'
  | 'Industrials'
  | 'Basic Materials'
  | 'Consumer Cyclical'
  | 'Consumer Defensive'
  | 'General Equities';

export type IndustryMetric = 'EV/Sales' | 'EV/EBITDA' | 'Justified P/B' | 'P/FFO';

export interface SectorBenchmark {
  /** Median trailing P/E used by the relative valuation model. */
  pe: number;
  /** Long-run median P/B, reported as the P/B industry average. */
  pb: number;
  /** Industry-specific model the sector is valued on. */
  industryMetric: IndustryMetric;
  /** Reference multiple for `industryMetric` (unused for Justified P/B, which is derived). */
  industryMultiple: number;
}

export const SECTOR_BENCHMARKS: Record<SectorKey, SectorBenchmark> = {
  'Technology':             { pe: 28.0, pb: 7.0, industryMetric: 'EV/Sales',      industryMultiple: 5.5 },
  'Communication Services': { pe: 20.0, pb: 3.0, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 },
  'Healthcare':             { pe: 24.0, pb: 4.0, industryMetric: 'EV/EBITDA',     industryMultiple: 14.0 },
  'Financial Services':     { pe: 13.0, pb: 1.3, industryMetric: 'Justified P/B', industryMultiple: 1.3 },
  'Real Estate':            { pe: 30.0, pb: 1.8, industryMetric: 'P/FFO',         industryMultiple: 15.0 },
  'Utilities':              { pe: 17.0, pb: 1.8, industryMetric: 'EV/EBITDA',     industryMultiple: 11.0 },
  'Energy':                 { pe: 11.0, pb: 1.7, industryMetric: 'EV/EBITDA',     industryMultiple: 6.0 },
  'Industrials':            { pe: 21.0, pb: 3.5, industryMetric: 'EV/EBITDA',     industryMultiple: 12.0 },
  'Basic Materials':        { pe: 16.0, pb: 2.0, industryMetric: 'EV/EBITDA',     industryMultiple: 8.0 },
  'Consumer Cyclical':      { pe: 20.0, pb: 3.5, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 },
  'Consumer Defensive':     { pe: 21.0, pb: 4.0, industryMetric: 'EV/EBITDA',     industryMultiple: 12.0 },
  'General Equities':       { pe: 18.0, pb: 2.8, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 }
};

/** Capital-market assumptions. */
export const CAPITAL_MARKET = {
  /** Equity risk premium over the 10Y Treasury. */
  equityRiskPremium: 0.05,
  /** Fallback 10Y Treasury yield when no macro context is supplied. */
  defaultRiskFreeRate: 0.0425,
  /** Risk-free rate the reference multiples are anchored to. */
  referenceRiskFreeRate: 0.0425,
  /** US federal statutory corporate tax rate. */
  taxRate: 0.21,
  /** Pre-tax credit spread over Treasuries for cost of debt. */
  creditSpread: 0.015,
  /** Bounds on beta to dampen noisy estimates. */
  betaFloor: 0.5,
  betaCap: 2.5
} as const;

const SECTOR_ALIASES: Record<string, SectorKey> = {
  'technology': 'Technology',
  'information technology': 'Technology',
  'communication services': 'Communication Services',
  'communications': 'Communication Services',
  'healthcare': 'Healthcare',
  'health care': 'Healthcare',
  'financial services': 'Financial Services',
  'financials': 'Financial Services',
  'financial': 'Financial Services',
  'real estate': 'Real Estate',
  'utilities': 'Utilities',
  'energy': 'Energy',
  'industrials': 'Industrials',
  'basic materials': 'Basic Materials',
  'materials': 'Basic Materials',
  'consumer cyclical': 'Consumer Cyclical',
  'consumer discretionary': 'Consumer Cyclical',
  'consumer defensive': 'Consumer Defensive',
  'consumer staples': 'Consumer Defensive'
};

/** Normalises free-text sector names (Yahoo / GICS style) to a benchmark key. */
export function normalizeSector(sector?: string | null): SectorKey {
  if (!sector) return 'General Equities';
  return SECTOR_ALIASES[sector.trim().toLowerCase()] ?? 'General Equities';
}

/** Maps an SEC Standard Industrial Classification code to a sector. */
export function sectorFromSic(sicInput?: string | number | null): SectorKey {
  const sic = Number(sicInput);
  if (!Number.isFinite(sic) || sic <= 0) return 'General Equities';
  const inRange = (lo: number, hi: number) => sic >= lo && sic <= hi;

  // Specific overrides first
  if (inRange(1300, 1399) || inRange(2900, 2999) || inRange(5171, 5172)) return 'Energy';
  if (inRange(2830, 2836) || inRange(3840, 3851) || inRange(5120, 5122) || inRange(8000, 8099)) return 'Healthcare';
  if (inRange(2840, 2844) || sic === 5912 || inRange(5400, 5499)) return 'Consumer Defensive';
  if (inRange(3570, 3579) || inRange(3600, 3629) || inRange(3640, 3699) || inRange(7370, 7379)) return 'Technology';
  if (inRange(3630, 3639) || inRange(3710, 3716)) return 'Consumer Cyclical';
  if (inRange(2700, 2799) || inRange(4800, 4899) || inRange(7800, 7999)) return 'Communication Services';
  if (inRange(6500, 6599) || sic === 6798) return 'Real Estate';

  // Broad divisions
  if (inRange(100, 999) || inRange(2000, 2199)) return 'Consumer Defensive';
  if (inRange(1000, 1299) || inRange(1400, 1499)) return 'Basic Materials';
  if (inRange(1500, 1799)) return 'Industrials';
  if (inRange(2200, 2399) || inRange(3900, 3999)) return 'Consumer Cyclical';
  if (inRange(2400, 2699) || inRange(2800, 2899) || inRange(3000, 3399)) return 'Basic Materials';
  if (inRange(3400, 3599) || inRange(3700, 3799)) return 'Industrials';
  if (inRange(3800, 3899)) return 'Technology';
  if (inRange(4000, 4799)) return 'Industrials';
  if (inRange(4900, 4999)) return 'Utilities';
  if (inRange(5000, 5199)) return 'Industrials';
  if (inRange(5200, 5999)) return 'Consumer Cyclical';
  if (inRange(6000, 6799)) return 'Financial Services';
  if (inRange(7000, 7299)) return 'Consumer Cyclical';
  if (inRange(7300, 7399) || inRange(8700, 8799)) return 'Industrials';
  return 'General Equities';
}

/**
 * Rate-sensitivity scalar for reference multiples. Earnings multiples compress when
 * the cost of equity rises above the reference level (and expand when it falls).
 * Bounded to ±20% so a single macro input cannot dominate the valuation.
 */
export function rateAdjustmentFactor(riskFreeRate: number): number {
  const { equityRiskPremium: erp, referenceRiskFreeRate: ref } = CAPITAL_MARKET;
  const factor = (ref + erp) / (riskFreeRate + erp);
  return Math.min(1.2, Math.max(0.8, factor));
}
