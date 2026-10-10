/**
 * Institutional balance sheet debt structure, maturity distribution, and refinancing risk assessment.
 */

import type { RawFundamentalInput } from './types.js';

export function calculateDebtBreakdown(raw: RawFundamentalInput) {
  const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`;
  const pctOf = (part: number, whole: number): number => Math.round((part / whole) * 100);

  const totalDebt = Math.max(0, raw.totalDebt);
  const shortTermDebt = raw.shortTermDebt ?? null;
  const longTermDebt = raw.longTermDebt ?? null;
  const splitDenominator = (shortTermDebt ?? 0) + (longTermDebt ?? 0);

  const shortVsLongTermRatio = raw.shortVsLongTermRatio || (
    shortTermDebt !== null && longTermDebt !== null && splitDenominator > 0
      ? `${pctOf(shortTermDebt, splitDenominator)}% Short / ${pctOf(longTermDebt, splitDenominator)}% Long`
      : 'Not Disclosed in Public Summaries'
  );

  const priorDebt = raw.priorYearTotalDebt ?? null;
  const recentChangesInDebt = raw.recentChangesInDebt || (
    priorDebt !== null && (priorDebt > 0 || totalDebt > 0)
      ? (() => {
        const delta = totalDebt - priorDebt;
        const pct = priorDebt > 0 ? ` (${delta >= 0 ? '+' : ''}${((delta / priorDebt) * 100).toFixed(1)}% YoY)` : '';
        const verb = Math.abs(delta) < 0.005 * Math.max(totalDebt, priorDebt) ? 'held flat at' : delta > 0 ? 'increased to' : 'decreased to';
        return `Total debt ${verb} ${fmtM(totalDebt)} from ${fmtM(priorDebt)} one year earlier${pct}.`;
      })()
      : totalDebt > 0
        ? `Reports ${fmtM(totalDebt)} in balance sheet debt obligations per latest disclosures.`
        : 'Balance sheet reports zero funded debt obligations.'
  );

  const debtRisks = raw.debtRisks || (
    totalDebt <= 0
      ? 'Zero funded balance sheet debt eliminates near-term debt refinancing risk.'
      : shortTermDebt !== null && shortTermDebt > 0
        ? (shortTermDebt > raw.cashAndEquivalents
          ? `Debt due within 12 months (${fmtM(shortTermDebt)}) exceeds cash on hand (${fmtM(raw.cashAndEquivalents)}), creating dependence on operating cash flow or refinancing to meet near-term maturities.`
          : `Cash on hand (${fmtM(raw.cashAndEquivalents)}) covers debt due within 12 months (${fmtM(shortTermDebt)}) ${(raw.cashAndEquivalents / shortTermDebt).toFixed(1)}x, limiting near-term refinancing risk.`)
        : 'Debt obligations require recurring cash flow generation to service principal maturities and interest.'
  );

  return {
    totalDebt,
    shortTermDebt,
    longTermDebt,
    shortVsLongTermRatio,
    recentChangesInDebt,
    debtRisks
  };
}
