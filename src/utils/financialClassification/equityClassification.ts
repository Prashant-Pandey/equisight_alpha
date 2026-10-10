/**
 * Equity classification, penny/micro-cap qualification, and venue resolution.
 * Anchored in SEC Rule 3a51-1 criteria and institutional style taxonomy.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

export type StockClassification =
  | 'Growth Stock'
  | 'Income Stock'
  | 'Value / Turnaround'
  | 'Speculative Penny Stock';

export interface PennyStockOptions {
  price?: number | null;
  exchange?: string | null;
  explicitFlag?: boolean | null;
}

export interface ClassificationParams {
  classification?: StockClassification | string | null;
  isPennyStock?: boolean | null;
  currentPrice?: number | null;
  exchange?: string | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  operatingMargin?: number | null;
}

/**
 * Determines whether an equity qualifies as a penny/micro-cap stock
 * per SEC Rule 3a51-1 criteria and venue standards.
 */
export function isPennyStock(
  price?: number | null,
  exchange?: string | null,
  explicitFlag?: boolean | null
): boolean {
  if (explicitFlag === true) return true;
  if (
    price !== undefined &&
    price !== null &&
    price < FINANCIAL_THRESHOLDS.pennyStock.priceCeilingUSD
  ) {
    return true;
  }
  const ex = (exchange || '').toUpperCase();
  for (const venue of FINANCIAL_THRESHOLDS.pennyStock.pennyVenues) {
    if (ex === venue || ex.includes(venue)) {
      return true;
    }
  }
  return false;
}

/**
 * Derives the canonical stock classification (Growth, Income, Value/Turnaround, Speculative Penny)
 * according to institutional factor taxonomy rules.
 */
export function getClassification(params: ClassificationParams): StockClassification {
  if (
    params.classification === 'Growth Stock' ||
    params.classification === 'Income Stock' ||
    params.classification === 'Value / Turnaround' ||
    params.classification === 'Speculative Penny Stock'
  ) {
    return params.classification;
  }

  const penny = isPennyStock(params.currentPrice, params.exchange, params.isPennyStock);
  if (penny) {
    return 'Speculative Penny Stock';
  }

  const divYield = params.dividendYield ?? 0;
  if (divYield >= FINANCIAL_THRESHOLDS.classification.incomeMinDividendYieldPct) {
    return 'Income Stock';
  }

  const pe = params.peRatio ?? null;
  const margin = params.operatingMargin ?? null;
  if (
    (pe !== null && pe > FINANCIAL_THRESHOLDS.classification.growthMinPeRatio) ||
    (margin !== null && margin > FINANCIAL_THRESHOLDS.classification.growthMinOperatingMarginPct)
  ) {
    return 'Growth Stock';
  }

  return 'Value / Turnaround';
}

/**
 * Resolves standard trading venue and primary listed market.
 */
export function resolveTradingVenue(
  symbol: string = '',
  exchange: string = '',
  isPenny: boolean = false
): string {
  const normEx = (exchange || '').toUpperCase();
  if (isPenny) {
    if (normEx.includes('ASE') || normEx.includes('NYSE')) return 'NYSE American';
    if (normEx.includes('PNK') || normEx.includes('OTC') || normEx === 'OTHER') return 'OTC Markets Pink Sheets';
    return 'Nasdaq Capital Market';
  }

  if (normEx.includes('NASDAQ') || normEx.includes('NMS')) return 'Nasdaq Global Select Market';
  if (normEx.includes('NYSE') || normEx.includes('NYQ')) return 'New York Stock Exchange';
  if (normEx.includes('LSE')) return 'London Stock Exchange';
  if (normEx.includes('EURONEXT') || normEx.includes('PA')) return 'Euronext Paris';
  if (normEx.includes('DAX') || normEx.includes('DE')) return 'XETRA Frankfurt';
  return exchange ? `${exchange} Primary Listed` : 'Nasdaq / NYSE';
}
