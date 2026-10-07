import assert from 'assert';
import {
  isPennyStock,
  getClassification,
  getFundamentalRating,
  getRiskCategory,
  getCashFlowStatus,
  getVolatilityRating,
  getDebtLeverageLabel,
  getStarRatingString,
  getConsensusVerdict,
  getConsensusVerdictColor,
  getConsensusVerdictBadgeClass,
  resolveTradingVenue,
  getManagementQuality,
  getMoatTrend,
  getEconomicMoat,
  determineUncertaintyRating
} from '../src/utils/financialClassification.js';
import {
  formatCurrency,
  formatFCF,
  formatEPS,
  formatPriceTimestamp
} from '../src/utils/formatters.js';

console.log('🧪 Running Centralized Definitions & Formatting Unit Tests...\n');

// 1. isPennyStock
assert.strictEqual(isPennyStock(3.5), true, 'Price < 5 should be penny stock');
assert.strictEqual(isPennyStock(15.0), false, 'Price >= 5 should not be penny stock');
assert.strictEqual(isPennyStock(15.0, 'NYSE American'), true, 'NYSE American is penny/micro-cap venue');
assert.strictEqual(isPennyStock(15.0, 'Nasdaq Capital Market'), true, 'Capital Market is penny/micro-cap venue');
assert.strictEqual(isPennyStock(10.0, 'NASDAQ', true), true, 'explicit flag=true overrides price');
console.log('✓ isPennyStock tests passed');

// 2. getClassification
assert.strictEqual(
  getClassification({ isPennyStock: true, currentPrice: 2.0 }),
  'Speculative Penny Stock'
);
assert.strictEqual(
  getClassification({ dividendYield: 3.5, currentPrice: 50.0 }),
  'Income Stock'
);
assert.strictEqual(
  getClassification({ peRatio: 30.0, currentPrice: 50.0 }),
  'Growth Stock'
);
assert.strictEqual(
  getClassification({ operatingMargin: 20.0, currentPrice: 50.0 }),
  'Growth Stock'
);
assert.strictEqual(
  getClassification({ peRatio: 12.0, dividendYield: 0.5, currentPrice: 50.0 }),
  'Value / Turnaround'
);
assert.strictEqual(
  getClassification({ classification: 'Growth Stock' }),
  'Growth Stock',
  'Preserves pre-assigned valid classification'
);
console.log('✓ getClassification tests passed');

// 3. getFundamentalRating
assert.strictEqual(
  getFundamentalRating({ isPennyStock: true }),
  'Weak',
  'Penny stock gets Weak rating'
);
assert.strictEqual(
  getFundamentalRating({ verdict: 'Significantly Undervalued', debtToEquity: 0.8 }),
  'Strong'
);
assert.strictEqual(
  getFundamentalRating({ verdict: 'Overvalued', debtToEquity: 1.0 }),
  'Weak'
);
assert.strictEqual(
  getFundamentalRating({ consensusUpside: 25.0 }),
  'Strong'
);
assert.strictEqual(
  getFundamentalRating({ consensusUpside: -15.0 }),
  'Weak'
);
assert.strictEqual(
  getFundamentalRating({ riskScore: 2 }),
  'Strong'
);
assert.strictEqual(
  getFundamentalRating({ riskScore: 5 }),
  'Fairly Valued'
);
assert.strictEqual(
  getFundamentalRating({ riskScore: 8 }),
  'Weak'
);
console.log('✓ getFundamentalRating tests passed');

// 4. getRiskCategory
assert.strictEqual(getRiskCategory(2), 'Conservative / Low Risk');
assert.strictEqual(getRiskCategory(5), 'Core / Moderate Risk');
assert.strictEqual(getRiskCategory(8), 'High Risk / Speculative');
console.log('✓ getRiskCategory tests passed');

// 5. getCashFlowStatus
assert.strictEqual(getCashFlowStatus(null, 1500000), 'Positive Free Cash Flow');
assert.strictEqual(getCashFlowStatus(null, -500000), 'Cash Burn / Capital Intensive');
assert.strictEqual(getCashFlowStatus('Custom Status', 100), 'Custom Status');
console.log('✓ getCashFlowStatus tests passed');

// 6. getVolatilityRating
assert.strictEqual(getVolatilityRating(null, 1.8), 'High Volatility');
assert.strictEqual(getVolatilityRating(null, 0.7), 'Low Volatility');
assert.strictEqual(getVolatilityRating(null, 1.1), 'Moderate Volatility');
console.log('✓ getVolatilityRating tests passed');

// 7. getDebtLeverageLabel
assert.strictEqual(getDebtLeverageLabel(1.8), 'Elevated Leverage');
assert.strictEqual(getDebtLeverageLabel(0.6), 'Healthy Leverage');
assert.strictEqual(getDebtLeverageLabel(null), 'N/A');
console.log('✓ getDebtLeverageLabel tests passed');

// 8. getStarRatingString
assert.strictEqual(getStarRatingString(null, 4), '★★★★☆');
assert.strictEqual(getStarRatingString(null, 1), '★☆☆☆☆');
assert.strictEqual(getStarRatingString('★★★☆☆', 5), '★★★☆☆');
console.log('✓ getStarRatingString tests passed');

// 9. getConsensusVerdict
assert.strictEqual(getConsensusVerdict(null, 20), 'Significantly Undervalued / Attractive Risk-Reward');
assert.strictEqual(getConsensusVerdict(null, 8), 'Modestly Undervalued / Accumulate');
assert.strictEqual(getConsensusVerdict(null, 0), 'Fairly Valued / Market Weight');
assert.strictEqual(getConsensusVerdict(null, -15), 'Overvalued / Multiple Vulnerability');
console.log('✓ getConsensusVerdict tests passed');

// 9b. getConsensusVerdictColor (semantic colors for valuation verdicts)
assert.strictEqual(getConsensusVerdictColor('Significantly Overvalued'), 'text-rose-400', 'Significantly Overvalued should be red');
assert.strictEqual(getConsensusVerdictColor('Significantly Overvalued / Multiple Vulnerability'), 'text-rose-400');
assert.strictEqual(getConsensusVerdictColor('Overvalued / Multiple Vulnerability'), 'text-rose-400');
assert.strictEqual(getConsensusVerdictColor('Overvalued'), 'text-rose-400');
assert.strictEqual(getConsensusVerdictColor('Modestly Overvalued'), 'text-amber-400', 'Modestly Overvalued should be amber/caution');
assert.strictEqual(getConsensusVerdictColor('Fairly Valued'), 'text-slate-300', 'Fairly Valued should be neutral slate');
assert.strictEqual(getConsensusVerdictColor('Fairly Valued / Market Weight'), 'text-slate-300');
assert.strictEqual(getConsensusVerdictColor('Modestly Undervalued'), 'text-emerald-400', 'Modestly Undervalued should be green');
assert.strictEqual(getConsensusVerdictColor('Modestly Undervalued / Accumulate'), 'text-emerald-400');
assert.strictEqual(getConsensusVerdictColor('Significantly Undervalued'), 'text-emerald-400', 'Significantly Undervalued should be green');
assert.strictEqual(getConsensusVerdictColor('Significantly Undervalued / Attractive Risk-Reward'), 'text-emerald-400');
assert.strictEqual(getConsensusVerdictColor('Inconclusive / Data Limited'), 'text-slate-400', 'Inconclusive should be muted slate');
assert.strictEqual(getConsensusVerdictColor('Speculative Penny Stock / Fundamentals Inapplicable'), 'text-amber-400');
assert.strictEqual(getConsensusVerdictColor(null), 'text-slate-400');

// 9c. getConsensusVerdictBadgeClass
assert.ok(getConsensusVerdictBadgeClass('Significantly Overvalued').includes('bg-rose-950'));
assert.ok(getConsensusVerdictBadgeClass('Modestly Overvalued').includes('bg-amber-950'));
assert.ok(getConsensusVerdictBadgeClass('Significantly Undervalued').includes('bg-emerald-950'));
assert.ok(getConsensusVerdictBadgeClass('Fairly Valued').includes('bg-slate-800'));
console.log('✓ getConsensusVerdictColor & getConsensusVerdictBadgeClass tests passed');

// 10. resolveTradingVenue
assert.strictEqual(resolveTradingVenue('AAPL', 'NASDAQ', false), 'Nasdaq Global Select Market');
assert.strictEqual(resolveTradingVenue('XOM', 'NYSE', false), 'New York Stock Exchange');
assert.strictEqual(resolveTradingVenue('OFS', 'NASDAQ', true), 'Nasdaq Capital Market');
assert.strictEqual(resolveTradingVenue('ABC', 'NYSE', true), 'NYSE American');
console.log('✓ resolveTradingVenue tests passed');

// 11. Decoupled Management Quality
const pennyMgmt = getManagementQuality({ isPennyStock: true });
assert.strictEqual(pennyMgmt.rating, 'Speculative');
assert.ok(pennyMgmt.trackRecord.includes('micro-cap'));

const exemplaryMgmt = getManagementQuality({ roic: 18.5, roe: 25.0 });
assert.strictEqual(exemplaryMgmt.rating, 'Exemplary');
assert.ok(exemplaryMgmt.trackRecord.includes('value-accretive'));

const customMgmt = getManagementQuality({ existingRating: 'Tier-1', existingTrackRecord: 'Custom record' });
assert.strictEqual(customMgmt.rating, 'Tier-1');
assert.strictEqual(customMgmt.trackRecord, 'Custom record');
console.log('✓ getManagementQuality tests passed');

// 12. Decoupled Moat Trend
assert.strictEqual(getMoatTrend({ revenueGrowthYoY: 12.0, roic: 15.0 }), 'Positive');
assert.strictEqual(getMoatTrend({ revenueGrowthYoY: -8.0, roic: 2.0 }), 'Negative');
assert.strictEqual(getMoatTrend({ revenueGrowthYoY: 3.0, roic: 8.0 }), 'Stable');
assert.strictEqual(getMoatTrend({ existingTrend: 'Positive' }), 'Positive');
console.log('✓ getMoatTrend tests passed');

// 13. Decoupled Economic Moat
assert.strictEqual(getEconomicMoat({ isPennyStock: true }).rating, 'None');
assert.strictEqual(getEconomicMoat({ widePillarsCount: 1 }).rating, 'Wide Moat');
assert.strictEqual(getEconomicMoat({ narrowPillarsCount: 1 }).rating, 'Narrow Moat');
assert.strictEqual(getEconomicMoat({ widePillarsCount: 0, narrowPillarsCount: 0 }).rating, 'None');
assert.strictEqual(getEconomicMoat({ existingRating: 'Wide Moat', existingSummary: 'Custom summary' }).summary, 'Custom summary');
console.log('✓ getEconomicMoat tests passed');

// 14. Decoupled Valuation Uncertainty Tier
assert.strictEqual(determineUncertaintyRating(undefined, undefined, undefined, true), 'Extreme');
assert.strictEqual(determineUncertaintyRating('Utilities', 0.8, 1.2, false), 'Low');
assert.strictEqual(determineUncertaintyRating('Technology', 1.9, 1.0, false), 'Very High');
assert.strictEqual(determineUncertaintyRating('Technology', 1.4, 1.0, false), 'High');
assert.strictEqual(determineUncertaintyRating('Technology', 1.0, 1.0, false), 'Medium');
console.log('✓ determineUncertaintyRating tests passed');

// 15. Enhanced getCashFlowStatus
assert.strictEqual(getCashFlowStatus({ isPennyStock: true }), 'Micro-Cap / Cash Conservation Focus');
assert.strictEqual(getCashFlowStatus({ freeCashFlow: 500000 }), 'Positive Free Cash Flow');
assert.strictEqual(getCashFlowStatus({ freeCashFlow: -200000 }), 'Cash Burn / Capital Intensive');
assert.strictEqual(getCashFlowStatus({ freeCashFlow: 0 }), 'Cash Neutral / Not Reported');
console.log('✓ enhanced getCashFlowStatus tests passed');

// 11. Formatters
assert.strictEqual(formatCurrency(2500000000), '$2.50B');
assert.strictEqual(formatCurrency(45000000), '$45.0M');
assert.strictEqual(formatCurrency(1250), '$1,250');
assert.strictEqual(formatCurrency(null), 'N/A');

assert.strictEqual(formatFCF(1500000000), '+$1.5B');
assert.strictEqual(formatFCF(-250000000), '-$250M');
assert.strictEqual(formatFCF(null), '$0');

assert.strictEqual(formatEPS(2.45), '$2.45');
assert.strictEqual(formatEPS(-0.85), '-$0.85');
assert.strictEqual(formatEPS(null), 'N/A');

const testDate = new Date('2026-10-07T14:30:00Z');
assert.ok(formatPriceTimestamp(testDate).startsWith('Price on'));
assert.strictEqual(formatPriceTimestamp(testDate, 'Price on Oct 7, 2026'), 'Price on Oct 7, 2026');
console.log('✓ formatters tests passed');

// 12. Domain Definitions Registry & Reviewer Helpers
import {
  FINANCIAL_THRESHOLDS,
  FINANCIAL_DEFINITIONS,
  getDefinitionById,
  getDefinitionsByCategory,
  listAllDefinitions
} from '../src/utils/financialDefinitions.js';

assert.strictEqual(FINANCIAL_THRESHOLDS.pennyStock.priceCeilingUSD, 5.0);
assert.strictEqual(FINANCIAL_THRESHOLDS.classification.incomeMinDividendYieldPct, 2.0);
assert.strictEqual(FINANCIAL_THRESHOLDS.volatility.highBetaFloor, 1.3);

const allDefs = listAllDefinitions();
assert.ok(allDefs.length >= 8, 'Must register at least 8 canonical domain definitions');

for (const def of allDefs) {
  assert.ok(def.id, 'Definition must have an id');
  assert.ok(def.term, 'Definition must have a formal domain term');
  assert.ok(def.category, 'Definition must belong to a domain category');
  assert.ok(def.methodologyRationale, 'Definition must provide methodology rationale');
  assert.ok(def.reviewerNotes, 'Definition must include domain reviewer notes');
  assert.ok(def.thresholds, 'Definition must define quantitative thresholds');
}

const pennyDef = getDefinitionById('penny-stock-designation');
assert.ok(pennyDef, 'Lookup by id must succeed');
assert.strictEqual(pennyDef?.term, 'SEC Rule 3a51-1 Penny Stock & Micro-Cap Classification');

const pennyDefByKey = getDefinitionById('pennyStock');
assert.ok(pennyDefByKey, 'Lookup by dictionary key must succeed');

const grouped = getDefinitionsByCategory();
assert.ok(grouped['Asset Class & Regulatory Qualification']?.length > 0);
assert.ok(grouped['Intrinsic Valuation & Margin of Safety']?.length > 0);
assert.ok(grouped['Systematic Risk & Market Sensitivity']?.length > 0);
console.log('✓ Financial Definitions Registry & Reviewer queries passed');

console.log('\n🎉 ALL CENTRALIZED DEFINITION TESTS PASSED!');

