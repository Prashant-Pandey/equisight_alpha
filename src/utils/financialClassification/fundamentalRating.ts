/**
 * Canonical fundamental health rating and institutional risk category tiering.
 * Evaluates balance sheet leverage and intrinsic margin of safety.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

export type FundamentalRating = 'Strong' | 'Fairly Valued' | 'Weak';

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
