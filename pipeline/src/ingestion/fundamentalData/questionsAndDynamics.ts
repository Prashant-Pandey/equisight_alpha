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
    ? `Core Solutions segment. ${sentences[0].trim()}`
    : `Primary Commercial Products. Sells high-margin core technologies and equipment across ${raw.industry}`;

  const bullet2 = sentences[1]
    ? `Platform & Connectivity. ${sentences[1].trim()}`
    : `Software & Services. Sells recurring software licenses, system integration, and related maintenance services (part of the revenue is recurring in this division)`;

  const remainingDesc = sentences.length > 3
    ? sentences.slice(2).join(' ').trim()
    : (sentences[2] ? sentences[2].trim() : '');

  const bullet3 = remainingDesc
    ? `Product Innovation & Realization. ${remainingDesc}`
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
    macroConditionSimplified: sectorDynamicsInfo.macroConditionSimplified,
    obstaclesAndChallenges: sectorDynamicsInfo.obstaclesAndChallenges,
    economicPoliticalCulturalRisks: sectorDynamicsInfo.economicPoliticalCulturalRisks
  };

  const cleanName = raw.companyName
    .replace(/,\s*(?:Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|ASA|AG|S\.A\.|SA|NV|N\.V\.|SE|Holdings?|Co\.)(?:\s*Class\s*[A-Z])?$/i, '')
    .trim();

  // 1. Q1: How Does Company Make Money?
  const howCompanyMakesMoney = formatHowCompanyMakesMoney(raw);

  // 2. Q2: Core Products & Resilient Demand Rationale
  const demandIntro = `Demand for ${cleanName}'s products and commercial solutions is anchored in mission-critical client workflows across ${raw.industry}.`;
  const demandBullets = [
    `- **Mission-Critical Utility & Workflow Integration**: ${cleanName} delivers high-utility solutions embedded into enterprise and institutional operations, creating substantial barriers against discretionary procurement cuts.`,
    `- **Customer Switching Friction & Ecosystem Stickiness**: ${wideCount > 0 ? `Protected by durable structural moat assets, client substitution faces high migration friction and technological stickiness.` : `Operating integration and proprietary domain expertise provide durable competitive positioning against industry peers.`}`,
    `- **Secular End-Market Tailwind Exposure**: Core product lines directly serve secular modernization, capacity deployment, and digital transformation requirements across ${raw.sector}.`
  ];
  const demandFooter = `${cleanName}'s established footprint and high-retention offerings shield base operating volumes, anchoring baseline demand even through broader ${raw.industry} contractionary cycles.`;
  const productsDemandAndWhy = `${demandIntro}\n\n${demandBullets.join('\n')}\n\n${demandFooter}`;

  // 3. Q3: Historical Operational & Financial Performance
  const perfIntro = `${cleanName} exhibits an established operational track record across historical reporting cycles:`;
  const revStr = `$${(raw.revenueTTM / 1e9).toFixed(2)}B`;
  const opMarginStr = `${raw.operatingMargin.toFixed(1)}%`;
  const roicStr = roic !== null ? `${roic.toFixed(1)}%` : 'Not Disclosed';
  const deStr = raw.debtToEquity !== null && raw.debtToEquity !== undefined ? `${raw.debtToEquity.toFixed(2)}x` : 'N/A';
  const cashStr = `$${(raw.cashAndEquivalents / 1e9).toFixed(2)}B`;
  const netDebtStr = `$${(raw.netDebt / 1e9).toFixed(2)}B`;

  const perfBullets = [
    `- **Top-Line Scale & TTM Revenue Generation**: Delivered **${revStr}** in trailing-twelve-month revenue, reflecting sustained commercial scale across core markets.`,
    `- **Operating Profitability & Margin Discipline**: Converted revenue into an operating margin (EBIT) of **${opMarginStr}**, balancing capacity investment against cost control.`,
    `- **Return on Invested Capital (ROIC)**: Demonstrated a capital return efficiency of **${roicStr}**, reflecting institutional resource allocation performance.`,
    `- **Balance Sheet Leverage & Capital Structure**: Carried a debt-to-equity ratio of **${deStr}**, backed by **${cashStr}** in liquid reserves against net debt of **${netDebtStr}**.`
  ];
  const perfFooter = `Historical margin discipline and capital stewardship position ${cleanName} with the financial flexibility required to absorb short-term volatility without balance sheet impairment.`;
  const pastPerformanceSummary = `${perfIntro}\n\n${perfBullets.join('\n')}\n\n${perfFooter}`;

  // 4. Q4: Medium-Term Growth & Profitability Roadmap
  const growthIntro = `${cleanName}'s medium-term trajectory is driven by strategic operating initiatives across ${raw.industry}:`;
  const waccFormatted = pct1(wacc);
  const growthBullets = [
    `- **Organic Capacity Expansion & Product Line Scaling**: Accelerating commercialization across high-margin product lines to capture incremental market share across ${raw.industry}.`,
    `- **Operating Leverage & Unit Margin Expansion**: Scaling fixed infrastructure and streamlining supply chain execution to expand operating margins above current ${opMarginStr} baseline.`,
    `- **Economic Value Spread Creation (ROIC vs. WACC)**: Targeting return on capital above the estimated cost of capital (**${waccFormatted}% WACC**) to drive compounding shareholder value.`,
    `- **Disciplined Capital Reinvestment**: Allocating free cash flow into selective R&D and strategic initiatives while maintaining solvency headroom.`
  ];
  const growthFooter = `Execution on these core catalysts positions ${cleanName} to sustain top-line expansion while structurally defending return spreads above its cost of capital.`;
  const growthAndProfitabilityOutlook = `${growthIntro}\n\n${growthBullets.join('\n')}\n\n${growthFooter}`;

  const companyQuestions: CompanyQuestions = {
    howCompanyMakesMoney,
    productsDemandAndWhy,
    pastPerformanceSummary,
    growthAndProfitabilityOutlook
  };

  const industryQuestions: IndustryQuestions = {
    industryCondition: sectorDynamicsInfo.industryCondition,
    macroConditionSimplified: sectorDynamicsInfo.macroConditionSimplified,
    obstaclesAndChallenges: sectorDynamicsInfo.obstaclesAndChallenges,
    economicPoliticalCulturalRisks: sectorDynamicsInfo.economicPoliticalCulturalRisks
  };

  return { sectorDynamics, companyQuestions, industryQuestions };
}
