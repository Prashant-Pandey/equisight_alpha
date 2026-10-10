/**
 * Morningstar 5 Economic Moat Pillars & competitive moat trajectory engine.
 */

import { normalizeSector } from '../valuationBenchmarks.js';
import { getMoatTrend, getEconomicMoat } from '../../../../src/utils/financialClassification.js';
import type { CompetitiveMoat, MoatSources, MoatPillarRating, MoatTrend } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export function analyzeEconomicMoat(raw: RawFundamentalInput, computedRoic: number | null, isPenny: boolean) {
  const normSector = normalizeSector(raw.sector);
  const moatTrend: MoatTrend = getMoatTrend({ revenueGrowthYoY: raw.revenueGrowthYoY, roic: computedRoic });

  let intangiblesRating: MoatPillarRating = 'None';
  let intangiblesDesc = 'No material pricing power derived from proprietary patents or regulatory brand equity.';
  let switchingRating: MoatPillarRating = 'None';
  let switchingDesc = 'Low operational migration friction for customers switching to substitute providers.';
  let networkRating: MoatPillarRating = 'None';
  let networkDesc = 'Product value is not fundamentally augmented by the size of the user network.';
  let costAdvantageRating: MoatPillarRating = 'None';
  let costAdvantageDesc = 'Unit production costs remain in line with industry average competitors.';
  let efficientScaleRating: MoatPillarRating = 'None';
  let efficientScaleDesc = 'Market dynamics allow competitive capacity additions without economic penalty.';

  if (!isPenny) {
    if (['Technology', 'Healthcare', 'Consumer Defensive'].includes(normSector)) {
      if ((raw.grossMargin !== null && raw.grossMargin > 55) || (computedRoic && computedRoic > 15)) {
        intangiblesRating = 'Wide';
        intangiblesDesc = `Proprietary intellectual property, protected clinical pipelines, or brand equity enabling sustained premium pricing${raw.grossMargin !== null ? ` (Gross Margin: ${raw.grossMargin}%)` : ''}.`;
      } else if (raw.grossMargin !== null && raw.grossMargin > 40) {
        intangiblesRating = 'Narrow';
        intangiblesDesc = 'Recognized commercial brand or defensible specialized domain know-how providing steady market share.';
      }
    } else if (normSector === 'Utilities') {
      intangiblesRating = 'Wide';
      intangiblesDesc = 'Exclusive long-term regulatory operating licenses, clean energy generation rights, and multi-decade commercial PPA agreements.';
    } else if (normSector === 'Financial Services') {
      intangiblesRating = 'Narrow';
      intangiblesDesc = 'Chartered institutional licenses, trust brand, and embedded fiduciary customer relationships.';
    }

    if (['Technology', 'Financial Services', 'Healthcare'].includes(normSector)) {
      if (raw.operatingMargin > 20 || (computedRoic && computedRoic > 12)) {
        switchingRating = 'Wide';
        switchingDesc = 'High enterprise integration friction, mission-critical operational workflows, and severe data migration failure risks.';
      } else {
        switchingRating = 'Narrow';
        switchingDesc = 'Contractual commitments and client operational onboarding create moderate frictional switching hurdles.';
      }
    } else if (normSector === 'Industrials' && raw.operatingMargin > 12) {
      switchingRating = 'Narrow';
      switchingDesc = 'Specialized machinery, parts supply contracts, and proprietary servicing ecosystems deter provider switching.';
    }

    if (['Communication Services', 'Technology', 'Financial Services'].includes(normSector)) {
      if (raw.operatingMargin > 25 && raw.marketCap > 50_000_000_000) {
        networkRating = 'Wide';
        networkDesc = 'Robust two-sided market dynamics where aggregate platform utility expands exponentially with user base.';
      } else if (raw.operatingMargin > 15 && raw.marketCap > 10_000_000_000) {
        networkRating = 'Narrow';
        networkDesc = 'Platform connectivity drives measurable user lock-in and localized liquidity advantages.';
      }
    }

    if (['Energy', 'Utilities', 'Basic Materials', 'Consumer Defensive', 'Industrials'].includes(normSector)) {
      if (raw.operatingMargin > 18 || (raw.revenueTTM > 10_000_000_000 && raw.grossMargin !== null && raw.grossMargin > 30)) {
        costAdvantageRating = 'Wide';
        costAdvantageDesc = 'Structural unit cost leadership via favorable baseload asset location, proprietary resource access, or massive scale.';
      } else if (raw.operatingMargin > 10) {
        costAdvantageRating = 'Narrow';
        costAdvantageDesc = 'Scale efficiencies and optimized supply-chain logistics provide baseline unit cost advantages over sub-scale peers.';
      }
    }

    if (['Utilities', 'Energy', 'Real Estate', 'Industrials'].includes(normSector)) {
      if (normSector === 'Utilities' || (normSector === 'Energy' && raw.industry.toLowerCase().includes('pipeline'))) {
        efficientScaleRating = 'Wide';
        efficientScaleDesc = 'Natural regional oligopoly / geographic monopoly where capital intensity renders duplicate competitive infrastructure economically unviable.';
      } else if (raw.marketCap > 15_000_000_000) {
        efficientScaleRating = 'Narrow';
        efficientScaleDesc = 'Capital-intensive asset base and localized capacity limits deter new market entrants from diluting returns.';
      }
    }
  }

  const moatSources: MoatSources = {
    intangibleAssets: { rating: intangiblesRating, substantiation: intangiblesDesc },
    switchingCosts: { rating: switchingRating, substantiation: switchingDesc },
    networkEffect: { rating: networkRating, substantiation: networkDesc },
    costAdvantage: { rating: costAdvantageRating, substantiation: costAdvantageDesc },
    efficientScale: { rating: efficientScaleRating, substantiation: efficientScaleDesc }
  };

  const wideCount = [intangiblesRating, switchingRating, networkRating, costAdvantageRating, efficientScaleRating].filter(r => r === 'Wide').length;
  const narrowCount = [intangiblesRating, switchingRating, networkRating, costAdvantageRating, efficientScaleRating].filter(r => r === 'Narrow').length;

  const moatResult = getEconomicMoat({ isPennyStock: isPenny, widePillarsCount: wideCount, narrowPillarsCount: narrowCount, roic: computedRoic });
  const competitiveMoat: CompetitiveMoat = { rating: moatResult.rating, trend: moatTrend, summary: moatResult.summary, sources: moatSources };

  return { competitiveMoat, wideCount, narrowCount, moatResult, moatTrend };
}
