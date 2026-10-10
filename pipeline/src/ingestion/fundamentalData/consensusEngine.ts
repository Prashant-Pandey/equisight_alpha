/**
 * Consensus fair value aggregation, margin of safety, and Morningstar star ratings.
 */

import { determineUncertaintyRating, calculateMorningstarRating } from '../valuationBenchmarks.js';
import { pct1 } from './costOfCapital.js';
import type { ValuationModels } from '../../types.js';

export interface ConsensusEngineParams {
  baseVal: number;
  isPenny: boolean;
  sector: string;
  beta: number | null;
  debtToEquity: number | null;
  models: {
    dcfFair: number | null; dcfUpside: number | null; fadeYears: number; dcfDiscountRate: number;
    terminalGrowth: number; normalizedFcf: number; stage1Pv: number; stage2Pv: number; stage3Pv: number;
    enterpriseValue: number; equityValue: number; stage1GrowthRate: number; freeCashFlowTTM: number | null;
    ddmFair: number | null; ddmUpside: number | null; divGrowthRate: number; costOfEquity: number; dividendYield: number;
    relFair: number | null; relUpside: number | null; sectorBenchPE: number;
    rapidFair: number | null; rapidUpside: number | null;
    resIncFair: number | null; resIncUpside: number | null; bookValuePerShare: number | null;
    assetFair: number | null; assetUpside: number | null;
    excessFair: number | null; excessUpside: number | null; roic: number | null; waccPct: number;
    sectorFair: number | null; sectorUpside: number | null; sectorModelStatus: string;
    industryMetric: string; industryMultiple: number; rateFactor: number;
  };
}

export function calculateConsensusValuation(params: ConsensusEngineParams) {
  const { baseVal, isPenny, sector, beta, debtToEquity, models: m } = params;

  const validModels = [m.dcfFair, m.ddmFair, m.relFair, m.rapidFair, m.resIncFair, m.assetFair, m.excessFair, m.sectorFair].filter(
    (v): v is number => v !== null && v > 0
  );

  let consensusFairValue: number | null = null;
  let verdict = 'Fairly Valued';
  if (validModels.length > 0) {
    consensusFairValue = parseFloat((validModels.reduce((a, b) => a + b, 0) / validModels.length).toFixed(2));
    const overallUpside = parseFloat((((consensusFairValue - baseVal) / baseVal) * 100).toFixed(1));
    if (overallUpside >= 20) verdict = 'Significantly Undervalued';
    else if (overallUpside >= 5) verdict = 'Modestly Undervalued';
    else if (overallUpside <= -20) verdict = 'Significantly Overvalued';
    else if (overallUpside <= -5) verdict = 'Modestly Overvalued';
  } else {
    verdict = isPenny ? 'Speculative Penny Stock / Fundamentals Inapplicable' : 'Inconclusive / Data Limited';
  }

  const uncertaintyRating = determineUncertaintyRating(sector, beta, debtToEquity, isPenny);
  const morningstarRating = calculateMorningstarRating(baseVal, consensusFairValue ?? baseVal, uncertaintyRating);

  const valuationModels: ValuationModels = {
    dcf: {
      fairValue: m.dcfFair, intrinsicValue: m.dcfFair, discountRate: pct1(m.dcfDiscountRate),
      terminalGrowthRate: pct1(m.terminalGrowth), terminalGrowth: pct1(m.terminalGrowth),
      upside: m.dcfUpside, upsidePercent: m.dcfUpside,
      modelName: `3-Stage Discounted Cash Flow (Moat Fade: ${m.fadeYears}Y, Ke/WACC: ${pct1(m.dcfDiscountRate)}%)`,
      status: m.dcfFair !== null ? 'Calculated' : (m.freeCashFlowTTM === null ? 'Inapplicable: CapEx unfiled' : 'Inapplicable: Non-positive normalized free cash flow'),
      normalizedFcf: m.normalizedFcf > 0 ? parseFloat(m.normalizedFcf.toFixed(2)) : undefined,
      stage1Pv: m.stage1Pv > 0 ? parseFloat(m.stage1Pv.toFixed(2)) : undefined,
      stage2Pv: m.stage2Pv > 0 ? parseFloat(m.stage2Pv.toFixed(2)) : undefined,
      stage3Pv: m.stage3Pv > 0 ? parseFloat(m.stage3Pv.toFixed(2)) : undefined,
      enterpriseValue: m.enterpriseValue > 0 ? parseFloat(m.enterpriseValue.toFixed(2)) : undefined,
      equityValue: m.equityValue > 0 ? parseFloat(m.equityValue.toFixed(2)) : undefined,
      fadeYears: m.fadeYears, stage1GrowthRate: parseFloat((m.stage1GrowthRate * 100).toFixed(1))
    },
    ddm: {
      fairValue: m.ddmFair, intrinsicValue: m.ddmFair, expectedDividendGrowth: pct1(m.divGrowthRate),
      dividendGrowthRate: pct1(m.divGrowthRate), costOfEquity: pct1(m.costOfEquity), requiredReturn: pct1(m.costOfEquity),
      applicable: m.dividendYield > 0, upside: m.ddmUpside, upsidePercent: m.ddmUpside,
      modelName: 'Gordon Dividend Discount Model', status: m.ddmFair !== null ? 'Calculated' : 'Inapplicable: Zero dividend yield'
    },
    relativeValuation: {
      fairValue: m.relFair, intrinsicValue: m.relFair, benchmarkMultiple: m.sectorBenchPE, peerMedianPE: m.sectorBenchPE,
      multipleType: `${sector} Sector Adjusted P/E (${m.sectorBenchPE}x)`, upside: m.relUpside, upsidePercent: m.relUpside,
      modelName: `${sector} Peer Multiple Regression`, status: m.relFair !== null ? 'Calculated' : 'Inapplicable: Negative or unreported EPS'
    },
    rapidStockValuation: {
      fairValue: m.rapidFair, intrinsicValue: m.rapidFair, pegBenchmark: 1.25, upside: m.rapidUpside, upsidePercent: m.rapidUpside,
      modelName: 'Rapid PEG Growth Multiplier', status: m.rapidFair !== null ? 'Calculated' : 'Inapplicable: Missing PEG or negative earnings'
    },
    residualIncomeModel: {
      fairValue: m.resIncFair, intrinsicValue: m.resIncFair, costOfEquity: pct1(m.costOfEquity),
      equityCharge: m.bookValuePerShare ? parseFloat((m.bookValuePerShare * m.costOfEquity).toFixed(2)) : null,
      upside: m.resIncUpside, upsidePercent: m.resIncUpside,
      modelName: 'Edwards-Bell-Ohlson Residual Income', status: m.resIncFair !== null ? 'Calculated' : 'Inapplicable: Negative earnings or book value'
    },
    assetBasedValuation: {
      fairValue: m.assetFair, intrinsicValue: m.assetFair, netAssetValue: m.assetFair, liquidationValue: m.assetFair,
      upside: m.assetUpside, upsidePercent: m.assetUpside,
      modelName: 'Net Asset Value Liquidation Floor', status: m.assetFair !== null ? 'Calculated' : 'Inapplicable: Insufficient balance sheet asset reporting'
    },
    excessReturnModel: {
      fairValue: m.excessFair, intrinsicValue: m.excessFair,
      returnSpread: m.roic !== null ? parseFloat((m.roic - m.waccPct).toFixed(1)) : null,
      excessReturnPercent: m.roic !== null ? parseFloat((m.roic - m.waccPct).toFixed(1)) : null,
      wacc: m.waccPct, upside: m.excessUpside, upsidePercent: m.excessUpside,
      modelName: `Economic Value Added (EVA) Spread (WACC: ${m.waccPct}%)`, status: m.excessFair !== null ? 'Calculated' : 'Inapplicable: ROIC not available or non-positive'
    },
    industrySpecificModel: {
      fairValue: m.sectorFair, intrinsicValue: m.sectorFair, sectorMetric: `${sector} Metric (${m.industryMetric})`,
      name: `${sector} ${m.industryMetric} Model`, description: `Sector-tailored ${m.industryMetric} benchmark (${(m.industryMultiple * m.rateFactor).toFixed(1)}x)`,
      upside: m.sectorUpside, upsidePercent: m.sectorUpside, modelName: `${sector} ${m.industryMetric} Model`,
      status: m.sectorFair !== null ? 'Calculated' : m.sectorModelStatus
    },
    consensusFairValue,
    verdict
  };

  return { valuationModels, consensusFairValue, verdict, uncertaintyRating, morningstarRating };
}
