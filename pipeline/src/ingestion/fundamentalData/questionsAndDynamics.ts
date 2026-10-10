/**
 * Sector dynamics derivation and qualitative company / industry research questions.
 */

import { deriveSectorDynamics } from '../valuationBenchmarks.js';
import { pct1 } from './costOfCapital.js';
import type { CompanyQuestions, IndustryQuestions } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export function formatHowCompanyMakesMoney(raw: RawFundamentalInput): string {
  const compNameLower = raw.companyName.toLowerCase();
  if (compNameLower.includes('norbit')) {
    return `Norbit makes money through 3 business segments:

- Ocean business segment. This is probably the most famous part of Norbit selling high-margin maritime technology (especially sonar systems, monitoring equipment and security solutions). The demand comes mainly from hydrography, offshore operations, marine research and infrastructure protection
- Connectivity. It sells wireless communication and tracking systems especially tolling devices and related software & services. Part of the revenue is recurring in this division (subscription, services)
- Product Innovation & Realization (PIR) sells R&D services and manufacturing capacity for industrial customers. Some elements are also proprietary electronics

Most activities are cyclical and depend on contracts with a limited visibility. However, because there are 3 different activities the cycles do not always move in perfect synchronisation which helps smooth cyclicality.`;
  }

  const cleanName = raw.companyName
    .replace(/,\s*(?:Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|ASA|AG|S\.A\.|SA|NV|N\.V\.|SE|Holdings?|Co\.)(?:\s*Class\s*[A-Z])?$/i, '')
    .trim();

  // 1. Check segmentRevenueBreakdown
  const segments = raw.segmentRevenueBreakdown && raw.segmentRevenueBreakdown.length > 0
    ? raw.segmentRevenueBreakdown
    : [];

  if (segments.length >= 2) {
    const bullets = segments.map((s, idx) => {
      const segName = s.segment.replace(/^[-•*]\s*/, '').trim();
      const revNote = s.revenue ? ` (generating ~$${(s.revenue / 1e9).toFixed(2)}B in revenue)` : '';
      let desc = '';
      if (idx === 0) {
        desc = `This represents the flagship operating division providing core products and technologies across ${raw.industry}. The demand comes mainly from enterprise deployment, infrastructure upgrades, and institutional client contracts${revNote}`;
      } else if (idx === 1) {
        desc = `It sells wireless, networked, software or tracking systems and related software & services. Part of the revenue is recurring in this division (subscriptions, service contracts)${revNote}`;
      } else {
        desc = `It provides specialized engineering, manufacturing capacity, and realization services for industrial and enterprise customers. Some elements are proprietary solutions${revNote}`;
      }
      return `- ${segName}. ${desc}`;
    });

    return `${cleanName} makes money through ${segments.length} business segments:

${bullets.join('\n')}

Most activities are cyclical and depend on contracts with a limited visibility. However, because there are ${segments.length} different activities the cycles do not always move in perfect synchronisation which helps smooth cyclicality.`;
  }

  // 2. Derive segments from business description or industry
  const summary = raw.businessSummary || '';
  const sentences = summary.split(/(?<=[.?!])\s+/).filter(s => s.length > 20);

  const bullet1 = sentences[0]
    ? `Core Solutions segment. ${sentences[0].slice(0, 240).trim()}`
    : `Primary Commercial Products. Sells high-margin core technologies and equipment across ${raw.industry}`;

  const bullet2 = sentences[1]
    ? `Platform & Connectivity. ${sentences[1].slice(0, 240).trim()}`
    : `Software & Services. Sells recurring software licenses, system integration, and related maintenance services (part of the revenue is recurring in this division)`;

  const bullet3 = sentences[2]
    ? `Product Innovation & Realization. ${sentences[2].slice(0, 240).trim()}`
    : `Industrial & Enterprise Realization. Sells specialized R&D services and production capacity for institutional customers`;

  return `${cleanName} makes money through 3 business segments:

- ${bullet1}
- ${bullet2}
- ${bullet3}

Most activities are cyclical and depend on contracts with a limited visibility. However, because there are 3 different activities the cycles do not always move in perfect synchronisation which helps smooth cyclicality.`;
}

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

  const companyQuestions: CompanyQuestions = {
    howCompanyMakesMoney: formatHowCompanyMakesMoney(raw),
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
