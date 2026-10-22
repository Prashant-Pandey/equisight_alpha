import assert from 'node:assert/strict';
import {
  FINANCIAL_THRESHOLDS,
  FINANCIAL_DEFINITIONS,
  type FinancialDomainDefinition
} from '../src/utils/financialDefinitions';
import {
  calculateForensicAnalysis,
  generateForensicAnalysisFromReport,
  getSeverityFromScore,
  getSeverityLabel,
  type ForensicAnalysisReport,
  type ForensicAlertSeverity
} from '../src/utils/forensicsEngine';

console.log('🧪 Running Forensic Detection & Structural Risk Unit & Integration Tests...\n');

// ==========================================
// Test 1: Registry Thresholds & Definitions
// ==========================================
console.log('--- Test 1: Centralized Thresholds & Governance Registry ---');

assert.ok(FINANCIAL_THRESHOLDS.forensicRisk, 'forensicRisk thresholds must exist in FINANCIAL_THRESHOLDS');
const ft = FINANCIAL_THRESHOLDS.forensicRisk;

// Hidden Debt
assert.strictEqual(ft.hiddenDebt.offBalanceSheetWarningThresholdPct, 20.0);
assert.strictEqual(ft.hiddenDebt.minCapExFundingRatio, 0.8);
assert.strictEqual(ft.hiddenDebt.maxNetDilutionShareCreepPct, 3.0);
assert.strictEqual(ft.hiddenDebt.spvLiabilityToEquityWarningRatio, 0.15);

// Circular Revenue
assert.strictEqual(ft.circularRevenue.singleCustomerConcentrationThresholdPct, 10.0);
assert.strictEqual(ft.circularRevenue.top3CustomerConcentrationThresholdPct, 30.0);
assert.strictEqual(ft.circularRevenue.dsoSpikeYoYDaysThreshold, 15.0);
assert.strictEqual(ft.circularRevenue.unbilledReceivablesMaxPct, 12.0);
assert.strictEqual(ft.circularRevenue.customerAltmanZStressFloor, 1.81);

// Unit Economics
assert.strictEqual(ft.unitEconomics.earningsQualityWedgeMaxPct, 25.0);
assert.strictEqual(ft.unitEconomics.computeElasticityRatioMax, 1.25);
assert.strictEqual(ft.unitEconomics.switchingFrictionMinScore, 40.0);

// Institutional Retreat
assert.strictEqual(ft.institutionalRetreat.creditSpreadBlowoutBps, 350.0);
assert.strictEqual(ft.institutionalRetreat.primeBrokerMarginHaircutFloorPct, 35.0);
assert.strictEqual(ft.institutionalRetreat.institutionalNetSellingPct, 15.0);
assert.strictEqual(ft.institutionalRetreat.insiderSellToBuyRatioFloor, 4.0);

// Verify domain definitions
assert.ok(FINANCIAL_DEFINITIONS.forensicHiddenDebt, 'forensicHiddenDebt definition must exist');
assert.ok(FINANCIAL_DEFINITIONS.forensicCircularRevenue, 'forensicCircularRevenue definition must exist');
assert.ok(FINANCIAL_DEFINITIONS.forensicUnitEconomics, 'forensicUnitEconomics definition must exist');
assert.ok(FINANCIAL_DEFINITIONS.forensicInstitutionalRetreat, 'forensicInstitutionalRetreat definition must exist');

assert.strictEqual(FINANCIAL_DEFINITIONS.forensicHiddenDebt.category, 'Forensic Accounting & Structural Risk');
assert.ok(FINANCIAL_DEFINITIONS.forensicHiddenDebt.regulatoryStandard?.includes('ASC 842'));
assert.ok(FINANCIAL_DEFINITIONS.forensicCircularRevenue.regulatoryStandard?.includes('ASC 280'));
assert.ok(FINANCIAL_DEFINITIONS.forensicUnitEconomics.regulatoryStandard?.includes('Regulation G'));
assert.ok(FINANCIAL_DEFINITIONS.forensicInstitutionalRetreat.regulatoryStandard?.includes('TRACE'));

console.log('✓ Pass: Centralized thresholds and definitions validated.');

// ==========================================
// Test 2: Severity Score Mapping
// ==========================================
console.log('\n--- Test 2: Severity Score Mapping ---');
assert.strictEqual(getSeverityFromScore(10), 'LOW');
assert.strictEqual(getSeverityFromScore(24.9), 'LOW');
assert.strictEqual(getSeverityFromScore(25), 'MODERATE');
assert.strictEqual(getSeverityFromScore(49.9), 'MODERATE');
assert.strictEqual(getSeverityFromScore(50), 'HIGH');
assert.strictEqual(getSeverityFromScore(74.9), 'HIGH');
assert.strictEqual(getSeverityFromScore(75), 'CRITICAL');
assert.strictEqual(getSeverityFromScore(100), 'CRITICAL');

assert.strictEqual(getSeverityLabel('LOW'), 'Clean Forensic Profile');
assert.strictEqual(getSeverityLabel('CRITICAL'), 'Critical / Red Flag Alert');
console.log('✓ Pass: Score to severity classification functions properly.');

// ==========================================
// Test 3: Pillar 1 - Hidden Debt Calculations
// ==========================================
console.log('\n--- Test 3: Pillar 1 - Hidden Debt & Capitalization ---');

const lowDebtAnalysis = calculateForensicAnalysis({
  reportedDebtUSD: 100_000_000,
  capitalizedOperatingLeasesUSD: 5_000_000,
  unconsolidatedSpvLiabilitiesUSD: 0,
  undisclosedPurchaseCommitmentsUSD: 2_000_000,
  operatingCashFlowUSD: 50_000_000,
  grossCapExUSD: 30_000_000,
  netDilutionShareCreepPct: 0.5
});

const hdLow = lowDebtAnalysis.pillars.hiddenDebt;
assert.strictEqual(hdLow.trueAdjustedDebtUSD, 107_000_000);
assert.strictEqual(hdLow.capExFundingRatio, Number((50 / 30).toFixed(2)));
assert.strictEqual(hdLow.severity, 'LOW');

const highDebtAnalysis = calculateForensicAnalysis({
  reportedDebtUSD: 100_000_000,
  capitalizedOperatingLeasesUSD: 25_000_000,
  unconsolidatedSpvLiabilitiesUSD: 10_000_000,
  undisclosedPurchaseCommitmentsUSD: 15_000_000,
  operatingCashFlowUSD: 10_000_000,
  grossCapExUSD: 40_000_000,
  netDilutionShareCreepPct: 5.5
});

const hdHigh = highDebtAnalysis.pillars.hiddenDebt;
assert.strictEqual(hdHigh.trueAdjustedDebtUSD, 150_000_000);
assert.strictEqual(hdHigh.offBalanceSheetRatioPct, 50);
assert.ok(hdHigh.capExFundingRatio < 0.8, 'CapEx funding ratio must be below threshold');
assert.ok(hdHigh.score >= 50, 'Score must be in high/critical tier');

// Verify flags triggered
const p1Flags = highDebtAnalysis.activeAlerts.filter(a => a.pillar === 'hiddenDebt' && a.flagged);
assert.ok(p1Flags.some(a => a.id === 'alert-asc-842-hidden-debt'));
assert.ok(p1Flags.some(a => a.id === 'alert-capex-divergence'));
console.log('✓ Pass: Hidden debt capitalization and alert flag triggers verified.');

// ==========================================
// Test 4: Pillar 2 - Circular Revenue & Concentration
// ==========================================
console.log('\n--- Test 4: Pillar 2 - Circular Revenue & Customer Concentration ---');

const highConcAnalysis = calculateForensicAnalysis({
  totalRevenueUSD: 200_000_000,
  topCustomerConcentrationPct: 18.5,
  top3CustomerConcentrationPct: 42.0,
  dsoDays: 85,
  dsoYoYChangeDays: 22,
  unbilledReceivablesUSD: 35_000_000, // 17.5% of revenue
  customerAltmanZScoreAvg: 1.45
});

const crPillar = highConcAnalysis.pillars.circularRevenue;
assert.strictEqual(crPillar.hasSingleCustomerOver10Pct, true);
assert.strictEqual(crPillar.roundTrippingRisk, true);
assert.ok(crPillar.score >= 50, 'Circular revenue risk score must reflect high risk');

const p2Flags = highConcAnalysis.activeAlerts.filter(a => a.pillar === 'circularRevenue' && a.flagged);
assert.ok(p2Flags.some(a => a.id === 'alert-asc-280-customer-concentration'));
assert.ok(p2Flags.some(a => a.id === 'alert-dso-receivables-spike'));
console.log('✓ Pass: Customer concentration & circular revenue alert triggers verified.');

// ==========================================
// Test 5: Pillar 3 - Flawed Unit Economics & Zero Moat
// ==========================================
console.log('\n--- Test 5: Pillar 3 - Flawed Unit Economics & Zero Moat ---');

const flawedUnitEconAnalysis = calculateForensicAnalysis({
  totalRevenueUSD: 100_000_000,
  gaapOperatingIncomeUSD: -15_000_000,
  nonGaapAdjustedEbitdaUSD: 18_000_000, // Large wedge
  computeElasticityRatio: 1.45,
  cacPaybackMonths: 24,
  switchingFrictionScore: 28,
  moatDecayRatePct: 20.0
});

const uePillar = flawedUnitEconAnalysis.pillars.unitEconomics;
assert.ok(uePillar.earningsQualityWedgePct > 25.0);
assert.strictEqual(uePillar.switchingFrictionScore, 28);
assert.ok(uePillar.score >= 50);

const p3Flags = flawedUnitEconAnalysis.activeAlerts.filter(a => a.pillar === 'unitEconomics' && a.flagged);
assert.ok(p3Flags.some(a => a.id === 'alert-sec-reg-g-earnings-wedge'));
assert.ok(p3Flags.some(a => a.id === 'alert-compute-delivery-elasticity'));
console.log('✓ Pass: Unit economics, non-GAAP wedge, and zero-moat fragility verified.');

// ==========================================
// Test 6: Pillar 4 - Institutional Retreat & Valuation Disconnect
// ==========================================
console.log('\n--- Test 6: Pillar 4 - Institutional Retreat & Valuation Disconnect ---');

const instRetreatAnalysis = calculateForensicAnalysis({
  creditSpreadOasBps: 520,
  primeBrokerMarginHaircutPct: 55.0,
  institutional13FNetChangePct: -18.0,
  insiderSellToBuyRatio: 6.5,
  multipleDivergenceScore: 78
});

const irPillar = instRetreatAnalysis.pillars.institutionalRetreat;
assert.strictEqual(irPillar.syntheticCreditRating, 'CCC');
assert.ok(irPillar.score >= 60);

const p4Flags = instRetreatAnalysis.activeAlerts.filter(a => a.pillar === 'institutionalRetreat' && a.flagged);
assert.ok(p4Flags.some(a => a.id === 'alert-finra-trace-credit-spread'));
assert.ok(p4Flags.some(a => a.id === 'alert-form-4-insider-exit'));
console.log('✓ Pass: Credit distress, PB collateral restrictions, and insider exit flags verified.');

// ==========================================
// Test 7: Deterministic Report Generator Fallback
// ==========================================
console.log('\n--- Test 7: Deterministic Fallback Generator ---');

// Clean / Large Cap Profile
const cleanReport = generateForensicAnalysisFromReport({
  ticker: 'MSFT',
  companyName: 'Microsoft Corporation',
  marketCap: 3_000_000_000_000,
  operatingCashFlow: 110_000_000_000,
  freeCashFlow: 75_000_000_000,
  debtToEquity: 0.35,
  isPennyStock: false,
  riskScore: 2
});

assert.ok(cleanReport.compositeScore <= 35, `Clean stock score should be low/moderate, got ${cleanReport.compositeScore}`);
assert.ok(cleanReport.pillars.hiddenDebt.trueAdjustedDebtUSD > 0);
assert.ok(cleanReport.auditNotes.length > 0);

// Speculative Penny Stock Profile
const speculativePennyReport = generateForensicAnalysisFromReport({
  ticker: 'PNNY',
  companyName: 'Speculative Microcap Inc.',
  marketCap: 25_000_000,
  currentPrice: 1.25,
  isPennyStock: true,
  riskScore: 9,
  isArtificiallyInflated: true
});

assert.ok(speculativePennyReport.compositeScore >= 50, `Penny stock should register elevated forensic score, got ${speculativePennyReport.compositeScore}`);
assert.ok(speculativePennyReport.activeAlerts.length >= 3, 'Speculative stock should trigger multiple forensic alerts');

// Null / Empty Report Object
const emptyReport = generateForensicAnalysisFromReport({});
assert.ok(emptyReport.compositeScore !== undefined);
assert.ok(emptyReport.pillars.hiddenDebt !== undefined);
console.log('✓ Pass: Deterministic fallback engine gracefully handles all stock archetypes and edge cases.');

console.log('\n🎉 ALL FORENSIC DETECTION UNIT & INTEGRATION TESTS PASSED!');
