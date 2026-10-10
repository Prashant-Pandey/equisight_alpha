/**
 * Industry and sector tailored valuation models: EV/Sales, Justified P/B, P/FFO, and EV/EBITDA.
 */

export interface SectorSpecificValuationParams {
  baseVal: number;
  shares: number;
  netDebt: number;
  bench: { industryMetric: string; industryMultiple: number; pb: number };
  rateFactor: number;
  revenueTTM: number;
  costOfEquity: number;
  terminalGrowth: number;
  returnOnEquity: number;
  operatingCashFlow: number;
  netIncomeTTM: number;
  depreciationTTM?: number | null;
  operatingIncomeTTM?: number | null;
  ebitdaTTM?: number | null;
  bookValuePerShare: number | null;
}

export function calculateSectorSpecificValuation(params: SectorSpecificValuationParams) {
  const {
    baseVal, shares, netDebt, bench, rateFactor, revenueTTM, costOfEquity,
    terminalGrowth, returnOnEquity, operatingCashFlow, netIncomeTTM,
    depreciationTTM, operatingIncomeTTM, ebitdaTTM, bookValuePerShare
  } = params;

  let sectorFair: number | null = null;
  let sectorUpside: number | null = null;
  let sectorModelStatus = 'Calculated';

  if (bench.industryMetric === 'EV/Sales') {
    if (revenueTTM > 0 && shares > 0) {
      const targetEvSales = bench.industryMultiple * rateFactor;
      const fairEV = revenueTTM * targetEvSales;
      const fairEquity = fairEV - netDebt;
      if (fairEquity > 0) {
        const val = parseFloat((fairEquity / shares).toFixed(2));
        if (val > 0) sectorFair = val;
      }
      if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
    } else {
      sectorModelStatus = 'Inapplicable: Zero or unreported revenue';
    }
  } else if (bench.industryMetric === 'Justified P/B') {
    if (bookValuePerShare && bookValuePerShare > 0) {
      const roeDecimal = (returnOnEquity || 10) / 100;
      const justifiedPB = costOfEquity > terminalGrowth && roeDecimal > terminalGrowth
        ? Math.max(0.5, (roeDecimal - terminalGrowth) / (costOfEquity - terminalGrowth))
        : bench.pb * rateFactor;
      const val = parseFloat((bookValuePerShare * justifiedPB).toFixed(2));
      if (val > 0) sectorFair = val;
      if (sectorFair === null) sectorModelStatus = 'Inapplicable: Implied P/B non-positive';
    } else {
      sectorModelStatus = 'Inapplicable: Zero or negative book value per share';
    }
  } else if (bench.industryMetric === 'P/FFO') {
    const ffo = operatingCashFlow > 0 ? operatingCashFlow : (netIncomeTTM + (depreciationTTM ?? 0));
    if (ffo > 0 && shares > 0) {
      const targetPFFO = bench.industryMultiple * rateFactor;
      const val = parseFloat(((ffo / shares) * targetPFFO).toFixed(2));
      if (val > 0) sectorFair = val;
      if (sectorFair === null) sectorModelStatus = 'Inapplicable: Implied P/FFO non-positive';
    } else {
      sectorModelStatus = 'Inapplicable: Zero or negative operating cash flow / FFO';
    }
  } else {
    const ebitda = ebitdaTTM ?? (operatingIncomeTTM !== null && depreciationTTM !== null && operatingIncomeTTM !== undefined && depreciationTTM !== undefined ? operatingIncomeTTM + Math.abs(depreciationTTM) : null);
    if (ebitda !== null && ebitda > 0 && shares > 0) {
      const targetEvEbitda = bench.industryMultiple * rateFactor;
      const fairEV = ebitda * targetEvEbitda;
      const fairEquity = fairEV - netDebt;
      if (fairEquity > 0) {
        const val = parseFloat((fairEquity / shares).toFixed(2));
        if (val > 0) sectorFair = val;
      }
      if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
    } else if (operatingCashFlow > 0 && shares > 0) {
      const targetEvOcf = bench.industryMultiple * 0.9 * rateFactor;
      const fairEV = operatingCashFlow * targetEvOcf;
      const fairEquity = fairEV - netDebt;
      if (fairEquity > 0) {
        const val = parseFloat((fairEquity / shares).toFixed(2));
        if (val > 0) sectorFair = val;
      }
      if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
    } else {
      sectorModelStatus = 'Inapplicable: Operating income / EBITDA deficit';
    }
  }

  if (sectorFair !== null && sectorFair > 0) {
    sectorUpside = parseFloat((((sectorFair - baseVal) / baseVal) * 100).toFixed(1));
  } else {
    sectorFair = null;
    sectorUpside = null;
  }

  return { sectorFair, sectorUpside, sectorModelStatus };
}
