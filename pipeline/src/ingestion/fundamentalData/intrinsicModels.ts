/**
 * Intrinsic valuation models: 3-Stage DCF with Moat Fade, DDM, Residual Income, and Excess Return.
 */

import { pct1 } from './costOfCapital.js';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export interface IntrinsicModelsParams {
  baseVal: number;
  shares: number;
  overallMoatRating: string;
  wacc: number;
  costOfEquity: number;
  terminalGrowth: number;
  revenueGrowthYoY?: number | null;
  freeCashFlowTTM: number | null;
  operatingCashFlow: number;
  netIncomeTTM: number;
  netDebt: number;
  dividendYield: number;
  currentTTM_EPS: number;
  bookValuePerShare: number | null;
  roic: number | null;
}

export function calculateIntrinsicModels(params: IntrinsicModelsParams) {
  const {
    baseVal, shares, overallMoatRating, wacc, costOfEquity, terminalGrowth,
    revenueGrowthYoY, freeCashFlowTTM, operatingCashFlow, netIncomeTTM, netDebt,
    dividendYield, currentTTM_EPS, bookValuePerShare, roic
  } = params;

  // 1. Refined 3-Stage DCF Model with Morningstar Moat Fade
  let dcfFair: number | null = null;
  let dcfUpside: number | null = null;
  let stage1Pv = 0, stage2Pv = 0, stage3Pv = 0, enterpriseValue = 0, equityValue = 0;

  const fadeYears = overallMoatRating === 'Wide Moat' ? 15 : overallMoatRating === 'Narrow Moat' ? 10 : 5;
  const dcfDiscountRate = Math.max(terminalGrowth + 0.02, wacc);
  const stage1GrowthRate = revenueGrowthYoY !== null && revenueGrowthYoY !== undefined && revenueGrowthYoY > 0
    ? clamp(revenueGrowthYoY / 100, 0.03, 0.14) : 0.05;

  const normalizedFcf = freeCashFlowTTM !== null
    ? (operatingCashFlow > 0
      ? Math.max(freeCashFlowTTM, operatingCashFlow * 0.35, netIncomeTTM > 0 ? netIncomeTTM * 0.75 : 0)
      : (freeCashFlowTTM > 0 ? freeCashFlowTTM : 0))
    : 0;

  if (freeCashFlowTTM !== null && normalizedFcf > 0 && shares > 0 && dcfDiscountRate > terminalGrowth) {
    let currentFcf = normalizedFcf;
    for (let t = 1; t <= 5; t++) {
      currentFcf *= (1 + stage1GrowthRate);
      stage1Pv += currentFcf / Math.pow(1 + dcfDiscountRate, t);
    }
    for (let f = 1; f <= fadeYears; f++) {
      const t = 5 + f;
      const fadeWeight = f / (fadeYears + 1);
      const fadedGrowth = stage1GrowthRate * (1 - fadeWeight) + terminalGrowth * fadeWeight;
      currentFcf *= (1 + fadedGrowth);
      stage2Pv += currentFcf / Math.pow(1 + dcfDiscountRate, t);
    }
    const tv = (currentFcf * (1 + terminalGrowth)) / (dcfDiscountRate - terminalGrowth);
    stage3Pv = tv / Math.pow(1 + dcfDiscountRate, 5 + fadeYears);

    enterpriseValue = stage1Pv + stage2Pv + stage3Pv;
    equityValue = Math.max(shares * 1.0, enterpriseValue - netDebt);
    const val = parseFloat((equityValue / shares).toFixed(2));
    if (val > 0) {
      dcfFair = val;
      dcfUpside = parseFloat((((dcfFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  // 2. Gordon Dividend Discount Model
  let ddmFair: number | null = null, ddmUpside: number | null = null;
  const divGrowthRate = clamp(terminalGrowth, 0.015, 0.035);
  if (dividendYield > 0 && baseVal > 0 && costOfEquity > divGrowthRate) {
    const d0 = baseVal * (dividendYield / 100);
    const val = parseFloat(((d0 * (1 + divGrowthRate)) / (costOfEquity - divGrowthRate)).toFixed(2));
    if (val > 0) {
      ddmFair = val;
      ddmUpside = parseFloat((((ddmFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  // 3. Residual Income Model
  let resIncFair: number | null = null, resIncUpside: number | null = null;
  if (bookValuePerShare && bookValuePerShare > 0 && currentTTM_EPS > 0 && costOfEquity > 0) {
    const eqCharge = bookValuePerShare * costOfEquity;
    const ri = currentTTM_EPS - eqCharge;
    const rawVal = bookValuePerShare + ri / costOfEquity;
    if (rawVal > 0) {
      resIncFair = parseFloat(rawVal.toFixed(2));
      resIncUpside = parseFloat((((resIncFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  // 4. Excess Return Model (EVA)
  let excessFair: number | null = null, excessUpside: number | null = null;
  const waccPct = pct1(wacc);
  if (roic !== null && roic > 0) {
    const returnSpread = parseFloat((roic - waccPct).toFixed(1));
    const rawVal = baseVal * (1 + returnSpread / 100);
    if (rawVal > 0) {
      excessFair = parseFloat(rawVal.toFixed(2));
      excessUpside = parseFloat((((excessFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  return {
    dcfFair, dcfUpside, stage1Pv, stage2Pv, stage3Pv, enterpriseValue, equityValue,
    fadeYears, dcfDiscountRate, stage1GrowthRate, normalizedFcf,
    ddmFair, ddmUpside, divGrowthRate,
    resIncFair, resIncUpside,
    excessFair, excessUpside, waccPct
  };
}
