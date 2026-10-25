/**
 * Phase 1: Deterministic Ground Truth Engine
 *
 * Implements Phase 1 of Section 9 ("How the Ideal Stock Analysis System Would Combine Both"):
 *  1. Direct SEC EDGAR XBRL Statutory Snapshot (`secXbrl.ts` / `FundamentalMetrics`)
 *  2. Deterministic 8-Model Valuation Suite & WACC Calculus (`ValuationModels`, `MorningstarStarRatingAnalysis`)
 *  3. 4-Pillar Forensic Accounting Engine (ASC 842, ASC 440, ASC 606, ASC 280, Reg G, Form 4/13F)
 *  4. Option Dealer Gamma Skew & Free-Float Turnover Microstructure (`OptionGammaImbalance`, `FreeFloatConcentration`)
 *
 * Rule 1 Governance: All financial arithmetic, DCF valuation, forensic accounting checks,
 * and SEC XBRL ingestion are strictly deterministic in code. Downstream LLM agents
 * (Phase 2 Bull/Bear Debate & Phase 3 Risk Governance/Synthesis) must treat the
 * `immutableNumericLedger` as read-only ground truth and are forbidden from altering
 * or recalculating any pre-computed figures.
 */

import {
  computeForensicAnalysis,
  calculateForensicAnalysis,
  generateForensicAnalysisFromReport,
  type ForensicAnalysisReport,
  type ForensicAlert,
  type ForensicAlertSeverity
} from '../../../src/utils/forensicsEngine.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  QuarterlyEPS,
  ValuationModels,
  ValuationModelDCF,
  ValuationModelDDM,
  ValuationModelRelative,
  ValuationModelRapid,
  ValuationModelResidualIncome,
  ValuationModelAssetBased,
  ValuationModelExcessReturn,
  ValuationModelIndustrySpecific,
  MorningstarStarRatingAnalysis,
  StarRating,
  UncertaintyRating,
  OptionGammaImbalance,
  FreeFloatConcentration,
  CatalystAlignment
} from '../types.js';

export interface XbrlStatutorySummary {
  revenueTTM: number;
  netIncomeTTM: number;
  operatingCashFlow: number;
  freeCashFlowTTM: number | null;
  totalDebt: number;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  shortVsLongTermRatio: number | string;
  cashAndEquivalents: number;
  netDebt: number;
  currentRatio: number | null;
  roic: number | null;
  returnOnEquity: number;
  grossMargin: number | null;
  operatingMargin: number;
  epsHistory8Quarters: QuarterlyEPS[];
  epsCurrentTTM: number;
  debtToEquity: number | null;
}

export interface ValuationSuiteSummary {
  dcf: ValuationModelDCF;
  ddm: ValuationModelDDM;
  relativeValuation: ValuationModelRelative;
  rapidStockValuation: ValuationModelRapid;
  residualIncomeModel: ValuationModelResidualIncome;
  assetBasedValuation: ValuationModelAssetBased;
  excessReturnModel: ValuationModelExcessReturn;
  industrySpecificModel: ValuationModelIndustrySpecific;
  models: ValuationModels;
  consensusFairValue: number | null;
  priceToFairValue: number;
  upsidePercent: number | null;
  impliedWacc: number | null;
  morningstarStarRating: StarRating;
  starRatingString: string;
  uncertaintyRating: UncertaintyRating;
  fiveStarPrice: number;
  oneStarPrice: number;
  verdict: string;
  morningstarAnalysis?: MorningstarStarRatingAnalysis;
}

export interface ForensicAuditSummary extends ForensicAnalysisReport {
  report: ForensicAnalysisReport;
  weaponizedBearFlags: string[];
  forensicClearances: string[];
}

export interface MicrostructureMechanics {
  netGammaExposure: string;
  imbalanceRatio: number | null;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  squeezeVulnerability: string;
  freeFloatPercent: number | null;
  floatTurnoverRatio: number | null;
  freeFloatShares: number | null;
  concentrationLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  volumeAnomalyRatio: number;
  catalystAlignment: CatalystAlignment;
  catalystSynthesis?: string;
  isArtificiallyInflated: boolean;
  artificialInflationRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  majorPriceDriver: string;
  optionGammaImbalance?: OptionGammaImbalance;
  freeFloatConcentration?: FreeFloatConcentration;
}

export interface DeterministicGroundTruthPacket {
  ticker: string;
  companyName: string;
  generatedAt: string;
  xbrlStatutorySummary: XbrlStatutorySummary;
  valuationSuiteSummary: ValuationSuiteSummary;
  forensicAudit: ForensicAuditSummary;
  microstructureMechanics: MicrostructureMechanics;
  immutableNumericLedger: Record<string, number | string>;
}

/**
 * Formats USD currency values into readable institutional strings ($M / $B).
 */
function formatUsdCompact(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return 'N/A';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Evaluates dealer gamma squeeze vulnerability from option gamma imbalance and float turnover.
 */
function resolveSqueezeVulnerability(
  gamma: OptionGammaImbalance | undefined,
  floatConc: FreeFloatConcentration | undefined,
  volumeAnomalyRatio: number
): string {
  const gammaRisk = gamma?.riskLevel ?? 'Low';
  const floatRisk = floatConc?.concentrationLevel ?? 'Low';
  const netExposure = gamma?.netGammaExposure ?? 'Balanced';

  if (
    gammaRisk === 'Severe' ||
    (gammaRisk === 'High' && (floatRisk === 'High' || floatRisk === 'Extreme' || volumeAnomalyRatio >= 2.5))
  ) {
    return `EXTREME REFLEXIVE SQUEEZE VULNERABILITY: ${netExposure} (Imbalance: ${gamma?.imbalanceRatio ?? 'N/A'}x) colliding with ${floatRisk.toLowerCase()} float lockup (Turnover: ${floatConc?.floatTurnoverRatio ?? 'N/A'}x) and ${volumeAnomalyRatio.toFixed(2)}x RVOL.`;
  }

  if (gammaRisk === 'High' || floatRisk === 'Extreme') {
    return `HIGH SQUEEZE SENSITIVITY: ${netExposure} with elevated dealer delta-hedging convexity and ${volumeAnomalyRatio.toFixed(2)}x relative volume.`;
  }

  if (gammaRisk === 'Moderate' || floatRisk === 'High' || volumeAnomalyRatio >= 1.8) {
    return `MODERATE GAMMA CONVEXITY: Directional options skew (${netExposure}) warrants monitoring for intraday liquidity air-pockets.`;
  }

  return `LOW / DAMPENED: ${netExposure}; deep free-float liquidity absorbs institutional order flow without forced dealer hedging cascades.`;
}

/**
 * Deterministically extracts high-precision statutory Bear red flags (ASC 842, ASC 440,
 * ASC 606, ASC 280, Reg G Item 10(e), FINRA TRACE, Form 4, 13F) with exact figures
 * for the Phase 2 Bear Researcher Agent to weaponize during cross-examination.
 */
export function extractWeaponizedBearFlags(
  forensic: ForensicAnalysisReport,
  fundamentals: FundamentalMetrics,
  mover: MarketMover,
  sentiment: SocialSentiment
): string[] {
  const flags: string[] = [];
  const { hiddenDebt, circularRevenue, unitEconomics, institutionalRetreat } = forensic.pillars;

  // 1. Flagged Active Forensic Alerts with Statutory Citations
  for (const alert of forensic.activeAlerts) {
    if (alert.flagged) {
      flags.push(
        `[${alert.tag} | ${alert.severity}] ${alert.title} (${alert.statutoryStandard}): ${alert.metricLabel} is ${alert.metricValue} vs statutory/institutional threshold of ${alert.thresholdValue}. ${alert.description}`
      );
    }
  }

  // 2. Pillar 1: ASC 842 / ASC 440 Hidden Debt, Refinancing Wall & CapEx Deficit
  if (hiddenDebt.offBalanceSheetRatioPct >= 10) {
    flags.push(
      `[ASC 842 / ASC 440 Off-Balance Sheet Leverage] True adjusted debt is ${formatUsdCompact(hiddenDebt.trueAdjustedDebtUSD)} vs reported GAAP debt of ${formatUsdCompact(hiddenDebt.reportedDebtUSD)} (+${hiddenDebt.offBalanceSheetRatioPct}% hidden debt load from ${formatUsdCompact(hiddenDebt.capitalizedOperatingLeasesUSD)} capitalized leases and ${formatUsdCompact(hiddenDebt.undisclosedPurchaseCommitmentsUSD)} unconditional purchase commitments).`
    );
  }
  if (hiddenDebt.capExFundingRatio < 1.0) {
    flags.push(
      `[Reg S-K Item 303 CapEx Funding Deficit] Operating Cash Flow (${formatUsdCompact(hiddenDebt.operatingCashFlowUSD)}) covers only ${(hiddenDebt.capExFundingRatio * 100).toFixed(0)}% of Gross CapEx (${formatUsdCompact(hiddenDebt.grossCapExUSD)}), forcing external debt issuance or equity dilution.`
    );
  }
  if (hiddenDebt.netDilutionShareCreepPct >= 2.0) {
    flags.push(
      `[Shareholder Dilution Creep] Net diluted share count expanded by +${hiddenDebt.netDilutionShareCreepPct}% YoY, eroding per-share intrinsic value via stock-based compensation and secondary issuance.`
    );
  }
  if (fundamentals.shortTermDebt && fundamentals.totalDebt > 0) {
    const stDebtPct = (fundamentals.shortTermDebt / fundamentals.totalDebt) * 100;
    if (stDebtPct >= 25) {
      flags.push(
        `[Near-Term Debt Maturity Wall] Short-term debt of ${formatUsdCompact(fundamentals.shortTermDebt)} represents ${stDebtPct.toFixed(1)}% of total debt (${formatUsdCompact(fundamentals.totalDebt)}), exposing the balance sheet to refinancing rollover risk at elevated rates.`
      );
    }
  }

  // 3. Pillar 2: ASC 280 Customer Concentration & ASC 606 / SAB 104 Receivables Quality
  if (circularRevenue.hasSingleCustomerOver10Pct || circularRevenue.top3CustomerConcentrationPct >= 35) {
    flags.push(
      `[ASC 280-10-50-42 Customer Concentration Risk] Single largest customer represents ${circularRevenue.topCustomerConcentrationPct.toFixed(1)}% of revenue and top-3 customers represent ${circularRevenue.top3CustomerConcentrationPct.toFixed(1)}% (Customer Altman Z-Score: ${circularRevenue.customerAltmanZScoreAvg} - ${circularRevenue.customerAltmanZStatus}).`
    );
  }
  if (circularRevenue.dsoYoYChangeDays >= 5 || circularRevenue.unbilledReceivablesPct >= 8) {
    flags.push(
      `[ASC 606 / SAB 104 Working Capital & Unbilled Contract Asset Distortion] Days Sales Outstanding (DSO) stands at ${circularRevenue.dsoDays} days (${circularRevenue.dsoYoYChangeDays >= 0 ? '+' : ''}${circularRevenue.dsoYoYChangeDays} days YoY) with unbilled contract receivables at ${circularRevenue.unbilledReceivablesPct}% of revenue (${formatUsdCompact(circularRevenue.unbilledReceivablesUSD)}).`
    );
  }

  // 4. Pillar 3: Reg G / Item 10(e) Earnings Quality Wedge & Moat Erosion
  if (unitEconomics.earningsQualityWedgePct >= 12) {
    flags.push(
      `[SEC Reg G / Item 10(e) Non-GAAP Earnings Wedge] Non-GAAP Adjusted EBITDA (${formatUsdCompact(unitEconomics.nonGaapAdjustedEbitdaUSD)}) diverges from GAAP Operating Income (${formatUsdCompact(unitEconomics.gaapOperatingIncomeUSD)}) by ${unitEconomics.earningsQualityWedgePct}% of total revenue, signaling aggressive add-backs.`
    );
  }
  if (unitEconomics.computeElasticityRatio >= 1.05 || unitEconomics.switchingFrictionScore < 55) {
    flags.push(
      `[Unit Economics & Moat Decay] Infrastructure delivery cost elasticity is ${unitEconomics.computeElasticityRatio}x revenue growth with a Switching Friction Score of ${unitEconomics.switchingFrictionScore}/100 and estimated annual moat decay of ${unitEconomics.moatDecayRatePct}%.`
    );
  }

  // 5. Pillar 4: FINRA TRACE Credit Spreads, Form 4 Insider Selling & 13F Institutional Exit
  if (
    institutionalRetreat.creditSpreadOasBps >= 200 ||
    institutionalRetreat.insiderSellToBuyRatio >= 2.0 ||
    institutionalRetreat.institutional13FNetChangePct < 0
  ) {
    flags.push(
      `[FINRA TRACE / SEC Form 4 / 13F Institutional Flow Warning] Secondary bond market OAS spread is +${institutionalRetreat.creditSpreadOasBps} bps (Synthetic Rating: ${institutionalRetreat.syntheticCreditRating}, Prime Broker Haircut: ${institutionalRetreat.primeBrokerMarginHaircutPct}%), Form 4 insider sell-to-buy ratio is ${institutionalRetreat.insiderSellToBuyRatio}:1, and 13F institutional net position change is ${institutionalRetreat.institutional13FNetChangePct >= 0 ? '+' : ''}${institutionalRetreat.institutional13FNetChangePct}%.`
    );
  }

  // 6. Valuation & Microstructure Overextension Flags
  const consensusFv = fundamentals.valuationModels.consensusFairValue;
  if (consensusFv !== null && mover.price > consensusFv) {
    const overvalPct = (((mover.price - consensusFv) / consensusFv) * 100).toFixed(1);
    flags.push(
      `[Multi-Model Valuation Overextension] Current market price ($${mover.price.toFixed(2)}) trades at a +${overvalPct}% premium above the 8-model deterministic consensus fair value ($${consensusFv.toFixed(2)}; P/FV: ${(mover.price / consensusFv).toFixed(2)}x).`
    );
  }
  if (sentiment.isArtificiallyInflated || sentiment.artificialInflationRisk === 'High' || sentiment.artificialInflationRisk === 'Severe') {
    flags.push(
      `[Microstructure Reflexive Exhaustion Risk] Artificial inflation risk rated ${sentiment.artificialInflationRisk} (RVOL: ${sentiment.volumeAnomalyRatio.toFixed(2)}x, Gamma Exposure: ${sentiment.optionGammaImbalance?.netGammaExposure ?? 'N/A'}, Catalyst Alignment: ${sentiment.catalystAlignment ?? 'ALIGNED'}).`
    );
  }

  // Guarantee at least 3 concrete statutory/quantitative stress points even for pristine balance sheets
  if (flags.length < 3) {
    flags.push(
      `[ASC 842 / Capital Structure Baseline Stress] Total debt of ${formatUsdCompact(fundamentals.totalDebt)} (True Adjusted Debt: ${formatUsdCompact(hiddenDebt.trueAdjustedDebtUSD)}) requires continuous operating cash flow generation (${formatUsdCompact(fundamentals.cashFlow?.operatingCashFlow || 0)}) to preserve coverage ratios.`
    );
    flags.push(
      `[ASC 606 / Working Capital Cycle Vigilance] Collection cycle at ${circularRevenue.dsoDays} DSO days and top-3 customer revenue share of ${circularRevenue.top3CustomerConcentrationPct.toFixed(1)}% represent key margin compression vectors if macro enterprise budgets tighten.`
    );
    flags.push(
      `[Reg G / Valuation Multiple Compression Sensitivity] Trading at Trailing P/E of ${fundamentals.peRatioTrailing ?? 'N/A'}x and EV/EBITDA of ${fundamentals.evToEbitda ?? 'N/A'}x with an Earnings Quality Wedge of ${unitEconomics.earningsQualityWedgePct}%.`
    );
  }

  return flags;
}

/**
 * Deterministically extracts verified forensic clearances where the company passed
 * statutory accounting stress tests, arming the Phase 2 Bull Researcher Agent.
 */
export function extractForensicClearances(
  forensic: ForensicAnalysisReport,
  fundamentals: FundamentalMetrics,
  mover: MarketMover
): string[] {
  const clearances: string[] = [];
  const { hiddenDebt, circularRevenue, unitEconomics, institutionalRetreat } = forensic.pillars;

  if (hiddenDebt.capExFundingRatio >= 1.0) {
    clearances.push(
      `[Reg S-K Item 303 Self-Funded CapEx Clearance] Operating cash flow (${formatUsdCompact(hiddenDebt.operatingCashFlowUSD)}) covers ${(hiddenDebt.capExFundingRatio * 100).toFixed(0)}% of gross capital expenditures (${formatUsdCompact(hiddenDebt.grossCapExUSD)}), confirming internal self-financing capacity.`
    );
  }

  if (hiddenDebt.offBalanceSheetRatioPct < 20) {
    clearances.push(
      `[ASC 842 / ASC 440 Balance Sheet Transparency] Off-balance sheet lease and commitment ratio is contained at ${hiddenDebt.offBalanceSheetRatioPct}% of reported debt, with ${formatUsdCompact(fundamentals.cashAndEquivalents)} in cash & equivalents.`
    );
  }

  if (!circularRevenue.hasSingleCustomerOver10Pct && !circularRevenue.roundTrippingRisk) {
    clearances.push(
      `[ASC 280 & ASC 606 Revenue Quality Clearance] Single-customer concentration (${circularRevenue.topCustomerConcentrationPct.toFixed(1)}%) remains below the 10% statutory dependency trigger, with healthy counterparty Altman Z-Score (${circularRevenue.customerAltmanZScoreAvg} - ${circularRevenue.customerAltmanZStatus}).`
    );
  }

  if (unitEconomics.earningsQualityWedgePct < 25 && fundamentals.operatingMargin > 0) {
    clearances.push(
      `[SEC Reg G Earnings Integrity Clearance] Audited GAAP operating margin of ${fundamentals.operatingMargin.toFixed(2)}% and ROIC of ${fundamentals.roic ?? 'N/A'}% confirm genuine economic value creation (Switching Friction Score: ${unitEconomics.switchingFrictionScore}/100).`
    );
  }

  if (institutionalRetreat.creditSpreadOasBps < 350) {
    clearances.push(
      `[FINRA TRACE Solvency & Institutional Stability] Secondary corporate bond OAS spread of +${institutionalRetreat.creditSpreadOasBps} bps (Synthetic Rating: ${institutionalRetreat.syntheticCreditRating}) signals orderly institutional credit market confidence.`
    );
  }

  const consensusFv = fundamentals.valuationModels.consensusFairValue;
  if (consensusFv !== null && mover.price <= consensusFv) {
    const discountPct = (((consensusFv - mover.price) / consensusFv) * 100).toFixed(1);
    clearances.push(
      `[Graham & Dodd Margin-of-Safety Clearance] Equity trades at $${mover.price.toFixed(2)}, representing a ${discountPct}% discount to the 8-model deterministic consensus fair value of $${consensusFv.toFixed(2)} (${fundamentals.morningstarRating?.starRatingString ?? '★★★'}).`
    );
  }

  if (clearances.length === 0) {
    clearances.push(
      `[Statutory Filing Continuity] SEC EDGAR XBRL periodic reporting verified with ${formatUsdCompact(fundamentals.revenueTTM)} TTM revenue and ${formatUsdCompact(fundamentals.cashAndEquivalents)} liquidity buffer.`
    );
  }

  return clearances;
}

/**
 * Builds the canonical Phase 1 Deterministic Ground Truth Packet.
 */
export function buildPhase1GroundTruthPacket(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): DeterministicGroundTruthPacket {
  const generatedAt = new Date().toISOString();

  // 1. Direct SEC EDGAR XBRL Statutory Snapshot
  const epsHistory8Quarters = fundamentals.earningsPerShare?.quarterlyEPSPast2Years ?? [];
  const xbrlStatutorySummary: XbrlStatutorySummary = {
    revenueTTM: fundamentals.revenueTTM,
    netIncomeTTM: fundamentals.netIncomeTTM,
    operatingCashFlow: fundamentals.cashFlow?.operatingCashFlow ?? 0,
    freeCashFlowTTM: fundamentals.freeCashFlowTTM ?? fundamentals.cashFlow?.freeCashFlow ?? null,
    totalDebt: fundamentals.totalDebt,
    shortTermDebt: fundamentals.shortTermDebt,
    longTermDebt: fundamentals.longTermDebt,
    shortVsLongTermRatio: fundamentals.shortVsLongTermRatio,
    cashAndEquivalents: fundamentals.cashAndEquivalents,
    netDebt: fundamentals.netDebt,
    currentRatio: fundamentals.currentRatio,
    roic: fundamentals.roic,
    returnOnEquity: fundamentals.returnOnEquity,
    grossMargin: fundamentals.grossMargin,
    operatingMargin: fundamentals.operatingMargin,
    epsHistory8Quarters,
    epsCurrentTTM: fundamentals.earningsPerShare?.currentTTM ?? 0,
    debtToEquity: fundamentals.debtToEquity
  };

  // 2. Deterministic 8-Model Valuation Suite & WACC Calculus
  const vm = fundamentals.valuationModels;
  const consensusFairValue = vm.consensusFairValue;
  const priceToFairValue =
    fundamentals.priceToFairValue ??
    fundamentals.morningstarRating?.priceToFairValue ??
    (consensusFairValue && consensusFairValue > 0
      ? parseFloat((mover.price / consensusFairValue).toFixed(2))
      : 1.0);
  const upsidePercent =
    consensusFairValue && mover.price > 0
      ? parseFloat((((consensusFairValue - mover.price) / mover.price) * 100).toFixed(2))
      : null;
  const impliedWacc =
    vm.excessReturnModel?.wacc ??
    vm.dcf?.discountRate ??
    vm.residualIncomeModel?.costOfEquity ??
    null;

  const morningstarStarRating: StarRating =
    fundamentals.starRating ?? fundamentals.morningstarRating?.starRating ?? 3;
  const starRatingString =
    fundamentals.starRatingString ??
    fundamentals.morningstarRating?.starRatingString ??
    '★★★';
  const uncertaintyRating: UncertaintyRating =
    fundamentals.uncertaintyRating ??
    fundamentals.morningstarRating?.uncertaintyRating ??
    'Medium';
  const fiveStarPrice =
    fundamentals.fiveStarPrice ??
    fundamentals.morningstarRating?.fiveStarPrice ??
    parseFloat(((consensusFairValue ?? mover.price) * 0.7).toFixed(2));
  const oneStarPrice =
    fundamentals.oneStarPrice ??
    fundamentals.morningstarRating?.oneStarPrice ??
    parseFloat(((consensusFairValue ?? mover.price) * 1.35).toFixed(2));

  const valuationSuiteSummary: ValuationSuiteSummary = {
    dcf: vm.dcf,
    ddm: vm.ddm,
    relativeValuation: vm.relativeValuation,
    rapidStockValuation: vm.rapidStockValuation,
    residualIncomeModel: vm.residualIncomeModel,
    assetBasedValuation: vm.assetBasedValuation,
    excessReturnModel: vm.excessReturnModel,
    industrySpecificModel: vm.industrySpecificModel,
    models: vm,
    consensusFairValue,
    priceToFairValue,
    upsidePercent,
    impliedWacc,
    morningstarStarRating,
    starRatingString,
    uncertaintyRating,
    fiveStarPrice,
    oneStarPrice,
    verdict: vm.verdict,
    morningstarAnalysis: fundamentals.morningstarRating
  };

  // 3. 4-Pillar Forensic Accounting Engine (ASC 842 / 606 / 280 / Reg G / Form 4 / 13F)
  const forensicReport = computeForensicAnalysis({
    ticker: mover.ticker,
    marketCap: mover.marketCap || fundamentals.marketCap,
    currentPrice: mover.price,
    isPennyStock: mover.isPennyStock,
    category: mover.category,
    totalDebt: fundamentals.totalDebt,
    debtToEquity: fundamentals.debtToEquity,
    operatingCashFlow: fundamentals.cashFlow?.operatingCashFlow ?? null,
    freeCashFlow: fundamentals.freeCashFlowTTM ?? fundamentals.cashFlow?.freeCashFlow ?? null,
    totalRevenueUSD: fundamentals.revenueTTM,
    revenue: fundamentals.revenueTTM,
    isArtificiallyInflated: sentiment.isArtificiallyInflated
  });

  const weaponizedBearFlags = extractWeaponizedBearFlags(
    forensicReport,
    fundamentals,
    mover,
    sentiment
  );
  const forensicClearances = extractForensicClearances(
    forensicReport,
    fundamentals,
    mover
  );

  const forensicAudit: ForensicAuditSummary = {
    ...forensicReport,
    report: forensicReport,
    weaponizedBearFlags,
    forensicClearances
  };

  // 4. Option Dealer Gamma Skew & Float Turnover Microstructure
  const gamma = sentiment.optionGammaImbalance;
  const floatConc = sentiment.freeFloatConcentration;
  const squeezeVulnerability = resolveSqueezeVulnerability(
    gamma,
    floatConc,
    sentiment.volumeAnomalyRatio
  );

  const microstructureMechanics: MicrostructureMechanics = {
    netGammaExposure: gamma?.netGammaExposure ?? 'Balanced',
    imbalanceRatio: gamma?.imbalanceRatio ?? null,
    riskLevel: gamma?.riskLevel ?? sentiment.artificialInflationRisk ?? 'Low',
    squeezeVulnerability,
    freeFloatPercent: floatConc?.freeFloatPercent ?? null,
    floatTurnoverRatio: floatConc?.floatTurnoverRatio ?? null,
    freeFloatShares: floatConc?.freeFloatShares ?? mover.floatShares ?? null,
    concentrationLevel: floatConc?.concentrationLevel ?? 'Low',
    volumeAnomalyRatio: sentiment.volumeAnomalyRatio,
    catalystAlignment: sentiment.catalystAlignment ?? 'ALIGNED',
    catalystSynthesis: sentiment.catalystSynthesis,
    isArtificiallyInflated: sentiment.isArtificiallyInflated,
    artificialInflationRisk: sentiment.artificialInflationRisk,
    majorPriceDriver: sentiment.majorPriceDriver,
    optionGammaImbalance: gamma,
    freeFloatConcentration: floatConc
  };

  // 5. Immutable Numeric Ledger (Read-Only Canonical Figures for Phase 2 & Phase 3)
  const immutableNumericLedger: Record<string, number | string> = {
    ticker: mover.ticker,
    currentPrice: mover.price,
    changePercent: mover.changePercent,
    marketCap: mover.marketCap || fundamentals.marketCap,
    volume: mover.volume,
    avgVolume: mover.avgVolume,
    volumeAnomalyRatio: sentiment.volumeAnomalyRatio,
    revenueTTM: fundamentals.revenueTTM,
    netIncomeTTM: fundamentals.netIncomeTTM,
    operatingCashFlowTTM: fundamentals.cashFlow?.operatingCashFlow ?? 0,
    freeCashFlowTTM: fundamentals.freeCashFlowTTM ?? 'N/A',
    grossMarginPct: fundamentals.grossMargin ?? 'N/A',
    operatingMarginPct: fundamentals.operatingMargin,
    roicPct: fundamentals.roic ?? 'N/A',
    roePct: fundamentals.returnOnEquity,
    peRatioTrailing: fundamentals.peRatioTrailing ?? 'N/A',
    peRatioForward: fundamentals.peRatioForward ?? 'N/A',
    evToEbitda: fundamentals.evToEbitda ?? 'N/A',
    totalDebtUSD: fundamentals.totalDebt,
    shortTermDebtUSD: fundamentals.shortTermDebt ?? 'N/A',
    longTermDebtUSD: fundamentals.longTermDebt ?? 'N/A',
    cashAndEquivalentsUSD: fundamentals.cashAndEquivalents,
    netDebtUSD: fundamentals.netDebt,
    debtToEquityRatio: fundamentals.debtToEquity ?? 'N/A',
    currentRatio: fundamentals.currentRatio ?? 'N/A',
    epsCurrentTTM: fundamentals.earningsPerShare?.currentTTM ?? 0,
    dcfFairValue: vm.dcf.fairValue ?? 'N/A',
    ddmFairValue: vm.ddm.fairValue ?? 'N/A',
    relativeValuationFairValue: vm.relativeValuation.fairValue ?? 'N/A',
    rapidPegFairValue: vm.rapidStockValuation.fairValue ?? 'N/A',
    residualIncomeFairValue: vm.residualIncomeModel.fairValue ?? 'N/A',
    assetBasedNavFairValue: vm.assetBasedValuation.fairValue ?? 'N/A',
    excessReturnEvaFairValue: vm.excessReturnModel.fairValue ?? 'N/A',
    industrySpecificFairValue: vm.industrySpecificModel.fairValue ?? 'N/A',
    consensusFairValue: consensusFairValue ?? 'N/A',
    priceToFairValueRatio: priceToFairValue,
    consensusUpsidePct: upsidePercent ?? 'N/A',
    impliedWaccPct: impliedWacc ?? 'N/A',
    morningstarStarRating,
    morningstarUncertainty: uncertaintyRating,
    fiveStarBuyPrice: fiveStarPrice,
    oneStarSellPrice: oneStarPrice,
    forensicCompositeScore: forensicReport.compositeScore,
    forensicCompositeSeverity: forensicReport.compositeSeverity,
    trueAdjustedDebtUSD: forensicReport.pillars.hiddenDebt.trueAdjustedDebtUSD,
    offBalanceSheetRatioPct: forensicReport.pillars.hiddenDebt.offBalanceSheetRatioPct,
    capExFundingRatio: forensicReport.pillars.hiddenDebt.capExFundingRatio,
    topCustomerConcentrationPct: forensicReport.pillars.circularRevenue.topCustomerConcentrationPct,
    dsoDays: forensicReport.pillars.circularRevenue.dsoDays,
    unbilledReceivablesPct: forensicReport.pillars.circularRevenue.unbilledReceivablesPct,
    earningsQualityWedgePct: forensicReport.pillars.unitEconomics.earningsQualityWedgePct,
    creditSpreadOasBps: forensicReport.pillars.institutionalRetreat.creditSpreadOasBps,
    insiderSellToBuyRatio: forensicReport.pillars.institutionalRetreat.insiderSellToBuyRatio,
    institutional13FNetChangePct: forensicReport.pillars.institutionalRetreat.institutional13FNetChangePct,
    optionGammaImbalanceRatio: gamma?.imbalanceRatio ?? 'N/A',
    netGammaExposure: gamma?.netGammaExposure ?? 'Balanced',
    freeFloatPercent: floatConc?.freeFloatPercent ?? 'N/A',
    floatTurnoverRatio: floatConc?.floatTurnoverRatio ?? 'N/A',
    us10YearYieldPct: macro.us10YearYield,
    fedFundsRatePct: macro.fedFundsRate,
    vixIndex: macro.vixIndex
  };

  return {
    ticker: mover.ticker,
    companyName: fundamentals.companyName || mover.name,
    generatedAt,
    xbrlStatutorySummary,
    valuationSuiteSummary,
    forensicAudit,
    microstructureMechanics,
    immutableNumericLedger
  };
}

/**
 * Formats the Phase 1 Deterministic Ground Truth Packet into a structured,
 * prompt-injectable markdown dossier for Phase 2 (Adversarial Bull/Bear Debate)
 * and Phase 3 (Risk Governance & Synthesis).
 */
export function formatGroundTruthForPrompt(packet: DeterministicGroundTruthPacket): string {
  const {
    ticker,
    companyName,
    xbrlStatutorySummary: xbrl,
    valuationSuiteSummary: val,
    forensicAudit: fa,
    microstructureMechanics: micro,
    immutableNumericLedger: ledger
  } = packet;

  const epsSummary =
    xbrl.epsHistory8Quarters.length > 0
      ? xbrl.epsHistory8Quarters.map((q) => `${q.quarter}: $${q.eps.toFixed(2)}`).join(' | ')
      : 'Unreported';

  return [
    `=== PHASE 1 DETERMINISTIC GROUND TRUTH PACKET ($${ticker} — ${companyName}) ===`,
    `RULE 1 GOVERNANCE MANDATE: Every number below is deterministically computed from SEC EDGAR XBRL filings,`,
    `8-model valuation calculus, 4-pillar forensic accounting rules, and options/float microstructure.`,
    `You are STRICTLY FORBIDDEN from inventing, altering, or recalculating any numeric figure in this ledger.`,
    ``,
    `[1. STATUTORY XBRL FINANCIAL SNAPSHOT]`,
    `- Revenue (TTM): ${formatUsdCompact(xbrl.revenueTTM)} (${xbrl.revenueTTM})`,
    `- Net Income (TTM): ${formatUsdCompact(xbrl.netIncomeTTM)} (${xbrl.netIncomeTTM})`,
    `- Operating Cash Flow (TTM): ${formatUsdCompact(xbrl.operatingCashFlow)} | Free Cash Flow (TTM): ${formatUsdCompact(xbrl.freeCashFlowTTM)}`,
    `- Gross Margin: ${xbrl.grossMargin !== null ? `${xbrl.grossMargin}%` : 'N/A'} | Operating Margin: ${xbrl.operatingMargin}%`,
    `- ROIC: ${xbrl.roic !== null ? `${xbrl.roic}%` : 'N/A'} | ROE: ${xbrl.returnOnEquity}% | Current Ratio: ${xbrl.currentRatio ?? 'N/A'}x`,
    `- Total Debt: ${formatUsdCompact(xbrl.totalDebt)} (Short-Term: ${formatUsdCompact(xbrl.shortTermDebt)} | Long-Term: ${formatUsdCompact(xbrl.longTermDebt)} | ST/LT Mix: ${xbrl.shortVsLongTermRatio})`,
    `- Cash & Equivalents: ${formatUsdCompact(xbrl.cashAndEquivalents)} | Net Debt: ${formatUsdCompact(xbrl.netDebt)} | Debt-to-Equity: ${xbrl.debtToEquity ?? 'N/A'}x`,
    `- 8-Quarter Statutory EPS Trajectory (TTM $${xbrl.epsCurrentTTM.toFixed(2)}): ${epsSummary}`,
    ``,
    `[2. DETERMINISTIC 8-MODEL VALUATION SUITE & WACC CALCULUS]`,
    `- Current Price: $${ledger.currentPrice} | Consensus Fair Value: ${val.consensusFairValue !== null ? `$${val.consensusFairValue.toFixed(2)}` : 'N/A'} | Upside/Downside: ${val.upsidePercent !== null ? `${val.upsidePercent >= 0 ? '+' : ''}${val.upsidePercent}%` : 'N/A'}`,
    `- Price / Fair Value (P/FV): ${val.priceToFairValue}x | Implied WACC / Ke: ${val.impliedWacc !== null ? `${val.impliedWacc}%` : 'N/A'} | Verdict: ${val.verdict}`,
    `- Morningstar Rating: ${val.starRatingString} (${val.morningstarStarRating} Stars) | Uncertainty: ${val.uncertaintyRating} | 5-Star Buy Hurdle: $${val.fiveStarPrice.toFixed(2)} | 1-Star Sell Hurdle: $${val.oneStarPrice.toFixed(2)}`,
    `  1) 3-Stage DCF (Moat Fade ${val.dcf.fadeYears ?? 'N/A'}Y): ${val.dcf.fairValue !== null && val.dcf.fairValue !== undefined ? `$${val.dcf.fairValue.toFixed(2)}` : val.dcf.status}`,
    `  2) Gordon DDM: ${val.ddm.fairValue !== null && val.ddm.fairValue !== undefined ? `$${val.ddm.fairValue.toFixed(2)}` : val.ddm.status}`,
    `  3) Sector Relative P/E Regression: ${val.relativeValuation.fairValue !== null && val.relativeValuation.fairValue !== undefined ? `$${val.relativeValuation.fairValue.toFixed(2)}` : val.relativeValuation.status}`,
    `  4) Rapid PEG Growth Multiplier: ${val.rapidStockValuation.fairValue !== null && val.rapidStockValuation.fairValue !== undefined ? `$${val.rapidStockValuation.fairValue.toFixed(2)}` : val.rapidStockValuation.status}`,
    `  5) Residual Income (Edwards-Bell-Ohlson): ${val.residualIncomeModel.fairValue !== null && val.residualIncomeModel.fairValue !== undefined ? `$${val.residualIncomeModel.fairValue.toFixed(2)}` : val.residualIncomeModel.status}`,
    `  6) Asset-Based Liquidation NAV Floor: ${val.assetBasedValuation.fairValue !== null && val.assetBasedValuation.fairValue !== undefined ? `$${val.assetBasedValuation.fairValue.toFixed(2)}` : val.assetBasedValuation.status}`,
    `  7) Excess Return (EVA Spread): ${val.excessReturnModel.fairValue !== null && val.excessReturnModel.fairValue !== undefined ? `$${val.excessReturnModel.fairValue.toFixed(2)}` : val.excessReturnModel.status}`,
    `  8) Industry-Specific Model (${val.industrySpecificModel.modelName ?? 'Sector'}): ${val.industrySpecificModel.fairValue !== null && val.industrySpecificModel.fairValue !== undefined ? `$${val.industrySpecificModel.fairValue.toFixed(2)}` : val.industrySpecificModel.status}`,
    ``,
    `[3. 4-PILLAR FORENSIC ACCOUNTING ENGINE (ASC 842 / 606 / 280 / REG G / FORM 4)]`,
    `- Composite Forensic Score: ${fa.compositeScore}/100 (${fa.compositeSeverity} — ${fa.compositeLabel})`,
    `- Summary: ${fa.compositeSummary}`,
    `- Weaponized Bear Flags (For Phase 2 Bear Researcher Cross-Examination):`,
    ...fa.weaponizedBearFlags.map((flag, idx) => `  [BEAR-FLAG-${idx + 1}] ${flag}`),
    `- Verified Forensic Clearances (For Phase 2 Bull Researcher Defense):`,
    ...fa.forensicClearances.map((clearance, idx) => `  [BULL-CLEARANCE-${idx + 1}] ${clearance}`),
    ``,
    `[4. MARKET MICROSTRUCTURE, DEALER GAMMA SKEW & FLOAT VELOCITY]`,
    `- Dealer Option Gamma Exposure: ${micro.netGammaExposure} (Call/Put Gamma Imbalance: ${micro.imbalanceRatio ?? 'N/A'}x | Risk: ${micro.riskLevel})`,
    `- Free-Float Concentration: ${micro.concentrationLevel} (Free Float: ${micro.freeFloatPercent !== null ? `${micro.freeFloatPercent}%` : 'N/A'} | Float Turnover Ratio: ${micro.floatTurnoverRatio ?? 'N/A'}x)`,
    `- Volume Anomaly Ratio (RVOL): ${micro.volumeAnomalyRatio.toFixed(2)}x | Catalyst Alignment: ${micro.catalystAlignment}`,
    `- Squeeze / Liquidity Vulnerability Assessment: ${micro.squeezeVulnerability}`,
    `=== END OF PHASE 1 DETERMINISTIC GROUND TRUTH PACKET ===`
  ].join('\n');
}

export {
  computeForensicAnalysis,
  calculateForensicAnalysis,
  generateForensicAnalysisFromReport,
  type ForensicAnalysisReport,
  type ForensicAlert,
  type ForensicAlertSeverity
};
