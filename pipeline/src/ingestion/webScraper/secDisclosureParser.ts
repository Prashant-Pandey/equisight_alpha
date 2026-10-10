/**
 * Institutional parsing of SEC EDGAR XBRL company facts into flow, balance sheet, and EPS disclosures.
 */

import {
  pickDurationFacts, instantAt, latestInstantDate, trailingTwelveMonths,
  discreteQuarters, lastTwoAnnuals, fiscalQuarterLabel, toMs, DAY_MS
} from '../secXbrl.js';
import type { SecFinancialDisclosures, SecQuarterlyEPS } from './types.js';

export function parseSecXbrlDisclosures(
  cik: string,
  entityName: string,
  usGaap: any,
  sic?: string,
  sicDescription?: string,
  businessSummary?: string
): SecFinancialDisclosures {
  const revenueFacts = pickDurationFacts(usGaap, [
    'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'SalesRevenueGoodsNet'
  ]);
  const ttm = (concepts: string[]) => trailingTwelveMonths(pickDurationFacts(usGaap, concepts));

  const revenueTTM = trailingTwelveMonths(revenueFacts);
  const netIncomeTTM = ttm(['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic']);
  const operatingIncomeTTM = ttm(['OperatingIncomeLoss']);
  const operatingCashFlowTTM = ttm(['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations']);
  const capexTTM = ttm(['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets', 'PaymentsForCapitalImprovements']);
  const grossProfitTTM = ttm(['GrossProfit', 'GrossMargin']);
  const depreciationTTM = ttm(['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'Depreciation']);

  const { latest: latestAnnualRevenue, prior: priorAnnualRevenue } = lastTwoAnnuals(revenueFacts);
  const revenueGrowthYoY = latestAnnualRevenue && priorAnnualRevenue && priorAnnualRevenue.val > 0
    ? parseFloat((((latestAnnualRevenue.val - priorAnnualRevenue.val) / priorAnnualRevenue.val) * 100).toFixed(1))
    : undefined;

  const balanceSheetDate = latestInstantDate(usGaap, ['Assets']) ?? latestInstantDate(usGaap, ['StockholdersEquity', 'Liabilities']);
  const bs = (concepts: string[], asOf = balanceSheetDate) => instantAt(usGaap, concepts, asOf)?.value;

  const debtAt = (asOf?: string) => {
    const debtCurrent = bs(['DebtCurrent'], asOf);
    const currentMaturities = bs(['LongTermDebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent'], asOf);
    const shortTermBorrowings = bs(['ShortTermBorrowings', 'CommercialPaper', 'OtherShortTermBorrowings'], asOf);
    const shortTerm = debtCurrent ?? ((currentMaturities !== undefined || shortTermBorrowings !== undefined) ? (currentMaturities ?? 0) + (shortTermBorrowings ?? 0) : undefined);
    const longTotalInclCurrent = bs(['LongTermDebt'], asOf);
    const longTerm = bs(['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'], asOf) ?? (longTotalInclCurrent !== undefined ? Math.max(0, longTotalInclCurrent - (currentMaturities ?? 0)) : undefined);
    const total = shortTerm !== undefined || longTerm !== undefined ? (shortTerm ?? 0) + (longTerm ?? 0) : longTotalInclCurrent;
    return { shortTerm, longTerm, total };
  };

  const debtNow = debtAt(balanceSheetDate);
  const priorYearDate = balanceSheetDate ? new Date(toMs(balanceSheetDate) - 365 * DAY_MS).toISOString().slice(0, 10) : undefined;
  const debtPriorYear = priorYearDate ? debtAt(priorYearDate) : undefined;

  const totalAssets = bs(['Assets']);
  const stockholdersEquity = bs(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'CommonStockholdersEquity']);
  let totalLiabilities = bs(['Liabilities']);
  if (totalLiabilities === undefined) {
    const liabAndEquity = bs(['LiabilitiesAndStockholdersEquity']);
    const equityInclNci = bs(['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'StockholdersEquity']);
    if (liabAndEquity !== undefined && equityInclNci !== undefined) totalLiabilities = liabAndEquity - equityInclNci;
  }
  const cashAndEquivalents = bs(['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash']);

  const epsFacts = pickDurationFacts(usGaap, ['EarningsPerShareDiluted', 'EarningsPerShareBasicAndDiluted', 'EarningsPerShareBasic'], 'USD/shares');
  const fiscalYearEnd = latestAnnualRevenue?.end ?? lastTwoAnnuals(epsFacts).latest?.end;
  const recentQuarters = discreteQuarters(epsFacts).slice(-12);
  const quarterlyEPS: SecQuarterlyEPS[] = recentQuarters
    .map((q) => {
      const yearAgoMs = toMs(q.end) - 365 * DAY_MS;
      const yearAgo = recentQuarters.find((p) => Math.abs(toMs(p.end) - yearAgoMs) <= 10 * DAY_MS);
      const yoyChangePercent = yearAgo && yearAgo.val !== 0
        ? parseFloat((((q.val - yearAgo.val) / Math.abs(yearAgo.val)) * 100).toFixed(1))
        : null;
      return {
        quarter: fiscalQuarterLabel(q.end, fiscalYearEnd),
        eps: parseFloat(q.val.toFixed(2)),
        date: q.end,
        yoyChangePercent,
        derived: q.derived
      };
    })
    .slice(-8);

  const latest10K = latestAnnualRevenue ?? lastTwoAnnuals(pickDurationFacts(usGaap, ['NetIncomeLoss', 'ProfitLoss'])).latest;

  return {
    cik, entityName, sic, sicDescription,
    latestRevenueTTM: revenueTTM?.value,
    latestNetIncomeTTM: netIncomeTTM?.value,
    latestOperatingIncomeTTM: operatingIncomeTTM?.value,
    latestOperatingCashFlowTTM: operatingCashFlowTTM?.value,
    capitalExpendituresTTM: capexTTM?.value,
    grossProfitTTM: grossProfitTTM?.value,
    depreciationAmortizationTTM: depreciationTTM?.value,
    ttmPeriodEnd: revenueTTM?.periodEnd ?? netIncomeTTM?.periodEnd,
    ttmMethod: revenueTTM?.method ?? netIncomeTTM?.method,
    revenueGrowthYoY, balanceSheetDate, totalAssets, totalLiabilities,
    totalDebt: debtNow.total,
    shortTermDebt: debtNow.shortTerm,
    longTermDebt: debtNow.longTerm,
    priorYearTotalDebt: debtPriorYear?.total,
    cashAndEquivalents, stockholdersEquity, quarterlyEPS,
    latest10KFilingDate: latest10K?.filed,
    fiscalYear: latest10K?.fy,
    fiscalYearEnd, businessSummary
  };
}
