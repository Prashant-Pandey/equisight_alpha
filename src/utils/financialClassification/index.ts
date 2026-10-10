/**
 * Institutional financial classifications, ratings, and valuation heuristics.
 * Domain-level barrel exporting modules for equity taxonomy, fundamental health,
 * competitive moat, management stewardship, and consensus valuation verdicts.
 */

export * from './equityClassification.js';
export * from './fundamentalRating.js';
export * from './solvencyAndCashFlow.js';
export * from './economicMoat.js';
export * from './stewardshipAndUncertainty.js';
export * from './valuationVerdict.js';

// Re-export core registry items for backward compatibility
export {
  FINANCIAL_THRESHOLDS,
  FINANCIAL_DEFINITIONS,
  getDefinitionById,
  getDefinitionsByCategory,
  listAllDefinitions,
  type FinancialDomainDefinition,
  type DefinitionCategory,
  type DefinitionTier
} from '../financialDefinitions.js';
