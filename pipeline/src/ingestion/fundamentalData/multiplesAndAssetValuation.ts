/**
 * Relative P/E multiple, Peter Lynch PEG, and Asset-Based NAV valuation models.
 */

export interface MultiplesAndAssetParams {
  baseVal: number;
  shares: number;
  totalDebt: number;
  currentTTM_EPS: number;
  sectorBenchPE: number;
  peRatioTrailing: number | null;
  pegRatio: number | null;
  bookValuePerShare: number | null;
  cashAndEquivalents: number;
}

export function calculateMultiplesAndAsset(params: MultiplesAndAssetParams) {
  const {
    baseVal, shares, totalDebt, currentTTM_EPS, sectorBenchPE,
    peRatioTrailing, pegRatio, bookValuePerShare, cashAndEquivalents
  } = params;

  // 1. Relative Valuation: Sector peer multiple
  let relFair: number | null = null;
  let relUpside: number | null = null;
  if (currentTTM_EPS > 0) {
    const val = parseFloat((currentTTM_EPS * sectorBenchPE).toFixed(2));
    if (val > 0) {
      relFair = val;
      relUpside = parseFloat((((relFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  // 2. Rapid Stock Valuation (Peter Lynch PEG)
  let rapidFair: number | null = null;
  let rapidUpside: number | null = null;
  if (currentTTM_EPS > 0 && pegRatio && pegRatio > 0) {
    const pegPE = Math.max(10, Math.min(40, 1.25 * (peRatioTrailing || sectorBenchPE) / pegRatio));
    const val = parseFloat((currentTTM_EPS * pegPE).toFixed(2));
    if (val > 0) {
      rapidFair = val;
      rapidUpside = parseFloat((((rapidFair - baseVal) / baseVal) * 100).toFixed(1));
    }
  }

  // 3. Asset-Based Valuation (NAV Liquidation Floor)
  let assetFair: number | null = null;
  let assetUpside: number | null = null;
  if (cashAndEquivalents > 0 || (bookValuePerShare && bookValuePerShare > 0)) {
    const netAssets = (cashAndEquivalents || 0) + (bookValuePerShare ? bookValuePerShare * shares * 0.7 : 0) - totalDebt;
    if (netAssets > 0 && shares > 0) {
      const val = parseFloat((netAssets / shares).toFixed(2));
      if (val > 0) {
        assetFair = val;
        assetUpside = parseFloat((((assetFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }
  }

  return { relFair, relUpside, rapidFair, rapidUpside, assetFair, assetUpside };
}
