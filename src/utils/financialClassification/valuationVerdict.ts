/**
 * Consensus valuation verdicts, visual star ratings, and UI badge/text styling.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

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
 */
export function getConsensusVerdictColor(verdict?: string | null): string {
  if (!verdict) return 'text-slate-400';
  const v = verdict.toLowerCase().trim();

  if (v.includes('significantly overvalued')) return 'text-rose-400';
  if (v.includes('modestly overvalued')) return 'text-amber-400';
  if (v.includes('overvalued')) return 'text-rose-400';
  if (v.includes('undervalued')) return 'text-emerald-400';
  if (v.includes('fairly valued') || v.includes('fair value')) return 'text-slate-300';
  if (v.includes('penny') || v.includes('speculative')) return 'text-amber-400';
  if (v.includes('inconclusive') || v.includes('limited') || v.includes('n/a')) return 'text-slate-400';

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
