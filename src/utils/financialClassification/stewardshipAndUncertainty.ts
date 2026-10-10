/**
 * Management stewardship quality assessment and valuation uncertainty rating.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

export type UncertaintyRating = 'Low' | 'Medium' | 'High' | 'Very High' | 'Extreme';

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
