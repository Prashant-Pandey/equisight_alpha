/**
 * Morningstar Economic Moat rating and structural competitive advantage analysis.
 * Analyzes intangible assets, switching costs, network effect, cost advantage, and efficient scale.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

export type MoatTrend = 'Positive' | 'Stable' | 'Negative';
export type EconomicMoatRating = 'Wide Moat' | 'Narrow Moat' | 'None';

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
      return { rating: cfg.ratings.wide, summary: summary || (isPenny ? cfg.summaries.penny : cfg.summaries.wide) };
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
