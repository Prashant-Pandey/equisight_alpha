/**
 * Sector dynamics derivation and qualitative company / industry research questions.
 */

import { deriveSectorDynamics } from '../valuationBenchmarks.js';
import { pct1 } from './costOfCapital.js';
import type { CompanyQuestions, IndustryQuestions } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export function buildQuestionsAndDynamics(
  raw: RawFundamentalInput,
  wideCount: number,
  roic: number | null,
  wacc: number
) {
  const sectorDynamicsInfo = deriveSectorDynamics(
    raw.sector,
    raw.industry,
    { us10YearYield: raw.riskFreeRate },
    raw.etfData
  );

  const sectorDynamics = {
    industryCondition: sectorDynamicsInfo.industryCondition,
    obstaclesAndChallenges: sectorDynamicsInfo.obstaclesAndChallenges,
    economicPoliticalCulturalRisks: sectorDynamicsInfo.economicPoliticalCulturalRisks
  };

  const segmentText = (raw.segmentRevenueBreakdown && raw.segmentRevenueBreakdown.length > 0)
    ? ` Core reporting segments include: ${raw.segmentRevenueBreakdown.map(s => s.segment).join(', ')}.`
    : '';

  const companyQuestions: CompanyQuestions = {
    howCompanyMakesMoney: raw.businessSummary
      ? `${raw.businessSummary.slice(0, 320)}...${segmentText}`
      : `${raw.companyName} generates commercial revenue within the ${raw.sector} sector (${raw.industry}).${segmentText}`,
    productsDemandAndWhy: `Demand for ${raw.companyName}'s offerings is anchored in enterprise and consumer utilization across ${raw.industry}. Sustainable demand relies on ${wideCount > 0 ? 'durable structural moat advantages' : 'operational execution and competitive market positioning'}.`,
    pastPerformanceSummary: `Reported TTM Revenue of $${(raw.revenueTTM / 1e9).toFixed(2)}B with Operating Margin of ${raw.operatingMargin}% and ROIC of ${roic !== null ? roic + '%' : 'N/A'}. Debt-to-Equity stands at ${raw.debtToEquity ?? 'N/A'}x.`,
    growthAndProfitabilityOutlook: `Forward performance hinges on sector tailwinds in ${raw.industry}, management capital allocation discipline, and maintaining return spreads above the estimated WACC of ${pct1(wacc)}%.`
  };

  const industryQuestions: IndustryQuestions = {
    industryCondition: sectorDynamicsInfo.industryCondition,
    obstaclesAndChallenges: sectorDynamicsInfo.obstaclesAndChallenges,
    economicPoliticalCulturalRisks: sectorDynamicsInfo.economicPoliticalCulturalRisks
  };

  return { sectorDynamics, companyQuestions, industryQuestions };
}
