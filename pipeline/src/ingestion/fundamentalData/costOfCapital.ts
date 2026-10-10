/**
 * Capital structure, CAPM cost of equity, WACC, and ROIC calculation.
 */

import {
  SECTOR_BENCHMARKS,
  CAPITAL_MARKET,
  normalizeSector,
  rateAdjustmentFactor
} from '../valuationBenchmarks.js';
import type { RawFundamentalInput } from './types.js';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const pct1 = (v: number): number => parseFloat((v * 100).toFixed(2));

export function calculateCostOfCapital(
  raw: RawFundamentalInput,
  totalDebt: number,
  bookEquity: number | null
) {
  const sectorKey = normalizeSector(raw.sector);
  const bench = SECTOR_BENCHMARKS[sectorKey];
  const riskFree = raw.riskFreeRate !== undefined && raw.riskFreeRate > 0
    ? raw.riskFreeRate / 100
    : CAPITAL_MARKET.defaultRiskFreeRate;

  const betaUsed = clamp(raw.beta ?? 1.0, CAPITAL_MARKET.betaFloor, CAPITAL_MARKET.betaCap);
  const costOfEquity = riskFree + betaUsed * CAPITAL_MARKET.equityRiskPremium;
  const afterTaxCostOfDebt = (riskFree + CAPITAL_MARKET.creditSpread) * (1 - CAPITAL_MARKET.taxRate);

  const equityWeightBase = raw.marketCap > 0 ? raw.marketCap : 0;
  const wacc = equityWeightBase > 0 && totalDebt > 0
    ? (equityWeightBase * costOfEquity + totalDebt * afterTaxCostOfDebt) / (equityWeightBase + totalDebt)
    : costOfEquity;

  const terminalGrowth = clamp(riskFree - 0.015, 0.015, 0.03);
  const rateFactor = rateAdjustmentFactor(riskFree);

  const investedCapital = bookEquity !== null ? totalDebt + bookEquity - raw.cashAndEquivalents : null;
  const computedRoic = raw.operatingIncomeTTM !== undefined && raw.operatingIncomeTTM !== null && investedCapital !== null && investedCapital > 0
    ? parseFloat((((raw.operatingIncomeTTM * (1 - CAPITAL_MARKET.taxRate)) / investedCapital) * 100).toFixed(1))
    : null;
  const roic = raw.roic ?? computedRoic;

  return {
    sectorKey,
    bench,
    riskFree,
    costOfEquity,
    afterTaxCostOfDebt,
    wacc,
    terminalGrowth,
    rateFactor,
    investedCapital,
    computedRoic,
    roic
  };
}
