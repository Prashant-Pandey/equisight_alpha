/**
 * Solvency indicators, cash flow profiling, debt leverage assessment, and volatility rating.
 */

import { FINANCIAL_THRESHOLDS } from '../financialDefinitions.js';

export interface CashFlowStatusParams {
  status?: string | null;
  freeCashFlow?: number | null;
  operatingCashFlow?: number | null;
  isPennyStock?: boolean | null;
}

/**
 * Returns Cash Flow Profile descriptor based on Free Cash Flow, operating cash flow, and asset tier.
 * Supports both options object or (status, freeCashFlow, isPennyStock) positional arguments.
 */
export function getCashFlowStatus(
  statusOrParams?: string | CashFlowStatusParams | null,
  freeCashFlowArg?: number | null,
  isPennyStockArg?: boolean | null
): string {
  let status: string | null | undefined;
  let freeCashFlow: number | null | undefined;
  let isPenny = false;

  if (typeof statusOrParams === 'object' && statusOrParams !== null) {
    status = statusOrParams.status;
    freeCashFlow = statusOrParams.freeCashFlow;
    isPenny = Boolean(statusOrParams.isPennyStock);
  } else {
    status = statusOrParams;
    freeCashFlow = freeCashFlowArg;
    isPenny = Boolean(isPennyStockArg);
  }

  if (status && status !== 'Not Available' && status !== 'Not Reported') {
    return status;
  }

  if (isPenny) {
    return FINANCIAL_THRESHOLDS.cashFlow.labels.pennyFocus;
  }

  if (freeCashFlow !== null && freeCashFlow !== undefined) {
    if (freeCashFlow > FINANCIAL_THRESHOLDS.cashFlow.positiveFcfFloorUSD) {
      return FINANCIAL_THRESHOLDS.cashFlow.labels.positiveFcf;
    }
    if (freeCashFlow < FINANCIAL_THRESHOLDS.cashFlow.positiveFcfFloorUSD) {
      return FINANCIAL_THRESHOLDS.cashFlow.labels.cashBurn;
    }
    return FINANCIAL_THRESHOLDS.cashFlow.labels.neutral;
  }

  return FINANCIAL_THRESHOLDS.cashFlow.labels.notAvailable;
}

/**
 * Returns Volatility / Beta descriptor.
 */
export function getVolatilityRating(
  rating?: string | null,
  betaOrValue?: number | null
): string {
  if (rating && rating !== 'Not Rated') return rating;
  if (betaOrValue !== null && betaOrValue !== undefined) {
    if (betaOrValue > FINANCIAL_THRESHOLDS.volatility.highBetaFloor) {
      return 'High Volatility';
    }
    if (betaOrValue < FINANCIAL_THRESHOLDS.volatility.lowBetaCeiling) {
      return 'Low Volatility';
    }
    return 'Moderate Volatility';
  }
  return 'Not Rated';
}

/**
 * Returns Debt-to-Equity leverage assessment label.
 */
export function getDebtLeverageLabel(debtToEquity?: number | null): string {
  if (debtToEquity === null || debtToEquity === undefined) return 'N/A';
  return debtToEquity > FINANCIAL_THRESHOLDS.debtLeverage.healthyDebtToEquityCeiling
    ? 'Elevated Leverage'
    : 'Healthy Leverage';
}
