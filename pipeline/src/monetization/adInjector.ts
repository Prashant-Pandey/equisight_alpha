import type {
  MarketMover,
  FundamentalMetrics,
  LLMAnalysisOutput,
  FinalReportFrontmatter,
  AffiliateLink,
  SocialSentiment,
  ThesisPoint
} from '../types.js';
import { affiliateEngine } from './affiliateEngine.js';

export function formatPriceTimestamp(date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  };
  const formatted = new Intl.DateTimeFormat('en-US', options).format(date);
  return `Price on ${formatted}`;
}

export function buildTheses(
  mover: MarketMover,
  f: FundamentalMetrics,
  analysis: LLMAnalysisOutput
): { bull: ThesisPoint[]; bear: ThesisPoint[] } {
  const bull = analysis.theses?.bull && analysis.theses.bull.length > 0 ? analysis.theses.bull : [
    {
      point: `Revenue growth trajectory remains supported by ${f.sector} momentum.`,
      sources: ['Fundamental Data', 'SEC Filings'],
      deductionChain: `Operating margins at ${f.operatingMargin}% support ongoing expansion.`
    }
  ];
  const bear = analysis.theses?.bear && analysis.theses.bear.length > 0 ? analysis.theses.bear : [
    {
      point: `Macro volatility and valuation multiples create downside risk.`,
      sources: ['Market Analysis', 'Macro Data'],
      deductionChain: `Beta of ${f.beta || 1.0} indicates heightened sensitivity to broad market selloffs.`
    }
  ];
  return { bull, bear };
}

export class ProgrammaticAdInjector {
  /**
   * Enriches report frontmatter and injects contextual monetization components
   * into the markdown body at optimized conversion coordinates.
   */
  public injectMonetization(
    mover: MarketMover,
    fundamentals: FundamentalMetrics,
    analysis: LLMAnalysisOutput,
    sentiment?: SocialSentiment
  ): { frontmatter: FinalReportFrontmatter; enrichedMarkdown: string } {
    const affiliates = affiliateEngine.getContextualAffiliates(mover, fundamentals);
    const primaryAffiliate = affiliates[0];
    const secondaryAffiliate = affiliates[1] || affiliates[0];

    const todayIso = new Date().toISOString();
    const cleanTicker = mover.ticker.toUpperCase();

    // Calculate deterministic risk score (1-10) based on beta and debt
    const debtRatio = fundamentals.debtToEquity || 0.5;
    const beta = fundamentals.beta || 1.1;
    const calculatedRisk = Math.min(10, Math.max(1, Math.round(beta * 3.5 + Math.min(debtRatio, 2.0) * 1.5)));

    const priceTimestamp = analysis.priceTimestamp || formatPriceTimestamp(new Date());

    const isPennyStock = mover.isPennyStock ?? (mover.price < 5.0 || mover.exchange === 'NYSE American' || (mover.exchange as string)?.includes('Capital Market'));
    const moneyMarketTradingVenue = mover.moneyMarketTradingVenue || (
      mover.exchange === 'NASDAQ' ? 'Nasdaq Capital Market' :
        mover.exchange === 'NYSE' ? 'NYSE American' :
          mover.exchange
    );

    const defaultRiskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' = isPennyStock && mover.category === 'gainer'
      ? 'Severe'
      : isPennyStock
        ? 'High'
        : 'Low';

    // 1. Debt Analysis Breakdown
    const totalDebt = fundamentals.totalDebt ?? null;
    const shortTermDebt = fundamentals.shortTermDebt ?? null;
    const longTermDebt = fundamentals.longTermDebt ?? null;
    const debtToEquityRatio = fundamentals.debtToEquity ?? (fundamentals.marketCap && totalDebt ? +(totalDebt / fundamentals.marketCap).toFixed(2) : null);

    const debtAnalysis = {
      totalDebt: totalDebt ?? 0,
      debtToEquity: debtToEquityRatio ?? 0,
      shortTermDebt: shortTermDebt ?? 0,
      longTermDebt: longTermDebt ?? 0,
      shortVsLongTermRatio: typeof fundamentals.shortVsLongTermRatio === 'string'
        ? fundamentals.shortVsLongTermRatio
        : (shortTermDebt !== null && longTermDebt !== null && totalDebt ? `${((shortTermDebt / Math.max(1, totalDebt)) * 100).toFixed(0)}% Short / ${((longTermDebt / Math.max(1, totalDebt)) * 100).toFixed(0)}% Long` : 'Not Available'),
      recentChanges: fundamentals.recentChangesInDebt || 'Not Available',
      risks: fundamentals.debtRisks || 'Not Available'
    };

    // 2. Price to Book Comparison
    const pbCurrent = typeof fundamentals.priceToBook === 'object' && fundamentals.priceToBook !== null
      ? (fundamentals.priceToBook as any).current
      : typeof fundamentals.priceToBook === 'number'
        ? fundamentals.priceToBook
        : null;

    const priceToBookRatio = {
      current: pbCurrent ?? null,
      industryAverage: (fundamentals as any).priceToBook?.industryAverage ?? (fundamentals as any).priceToBookComparison?.industryAverage ?? null,
      historicalAverage5Y: (fundamentals as any).priceToBook?.historicalAverage5Y ?? (fundamentals as any).priceToBookComparison?.historicalAverage5Y ?? null,
      chart: pbCurrent !== null ? [
        { label: 'Current P/B', value: pbCurrent },
        { label: 'Industry Avg', value: (fundamentals as any).priceToBook?.industryAverage ?? null },
        { label: '5Y Historical Avg', value: (fundamentals as any).priceToBook?.historicalAverage5Y ?? null }
      ] : []
    };

    // 3. Price to Earnings Comparison
    const peCurrent = fundamentals.peRatioTrailing ?? fundamentals.peRatioForward ?? (fundamentals as any).priceToEarnings?.current ?? null;
    const priceToEarningsRatio = {
      current: peCurrent,
      industryAverage: (fundamentals as any).priceToEarnings?.industryAverage ?? (fundamentals as any).priceToEarningsComparison?.industryAverage ?? null,
      historicalAverage5Y: (fundamentals as any).priceToEarnings?.historicalAverage5Y ?? (fundamentals as any).priceToEarningsComparison?.historicalAverage5Y ?? null,
      chart: peCurrent !== null ? [
        { label: 'Current P/E', value: peCurrent },
        { label: 'Industry Avg', value: (fundamentals as any).priceToEarnings?.industryAverage ?? null },
        { label: '5Y Historical Avg', value: (fundamentals as any).priceToEarnings?.historicalAverage5Y ?? null }
      ] : []
    };

    // 4. Artificial Inflation Breakdown
    const volumeRatio = sentiment?.volumeAnomalyRatio ?? (mover.avgVolume > 0 ? +(mover.volume / mover.avgVolume).toFixed(2) : null);
    const isInflated = sentiment?.isArtificiallyInflated ?? (volumeRatio !== null && volumeRatio > 2.5 && Math.abs(mover.changePercent) > 20);
    const riskLevel = sentiment?.artificialInflationRisk ?? (isInflated ? 'Severe' : volumeRatio !== null && volumeRatio > 1.8 ? 'Moderate' : defaultRiskLevel);

    const artificialInflation = {
      isInflated,
      riskLevel,
      volumeAnomalyRatio: volumeRatio ?? 1.0,
      majorPriceDriver: sentiment?.majorPriceDriver ?? 'Not Available',
      sentimentScore: sentiment?.sentimentScore ?? null,
      newsImpact: sentiment?.newsImpact ?? 'Not Available',
      socialMediaImpact: sentiment?.socialMediaImpact ?? 'Not Available'
    };

    // 5. 4 Company Questions & 3 Industry Questions
    const companyDeepDive = {
      howCompanyMakesMoney: fundamentals.companyQuestions?.howCompanyMakesMoney ?? (analysis.companyDeepDive?.howCompanyMakesMoney || 'Not Available'),
      productsDemandAndWhy: fundamentals.companyQuestions?.productsDemandAndWhy ?? (analysis.companyDeepDive?.productsDemandAndWhy || 'Not Available'),
      pastPerformanceSummary: fundamentals.companyQuestions?.pastPerformanceSummary ?? (analysis.companyDeepDive?.pastPerformanceSummary || 'Not Available'),
      growthAndProfitabilityOutlook: fundamentals.companyQuestions?.growthAndProfitabilityOutlook ?? (analysis.companyDeepDive?.growthAndProfitabilityOutlook || 'Not Available')
    };

    const industryDeepDive = {
      industryCondition: fundamentals.industryQuestions?.industryCondition ?? (analysis.industryDeepDive?.industryCondition || 'Not Available'),
      obstaclesAndChallenges: fundamentals.industryQuestions?.obstaclesAndChallenges ?? (analysis.industryDeepDive?.obstaclesAndChallenges || 'Not Available'),
      economicPoliticalCulturalRisks: fundamentals.industryQuestions?.economicPoliticalCulturalRisks ?? (analysis.industryDeepDive?.economicPoliticalCulturalRisks || 'Not Available')
    };

    // 6. Management Quality & Competitive Moat
    const managementQuality = {
      rating: (fundamentals.managementQuality?.rating as any) ?? 'Not Rated',
      trackRecord: fundamentals.managementQuality?.trackRecord ?? 'Not Available'
    };

    const competitiveMoat = {
      rating: (fundamentals.competitiveMoat?.rating as any) ?? 'Not Rated',
      summary: fundamentals.competitiveMoat?.summary ?? 'Not Available'
    };

    // 7. Multi-Model Valuations
    const rawVM: any = analysis.valuationModels || fundamentals.valuationModels || {};
    const valuationModels = {
      dcf: rawVM.dcf ? {
        intrinsicValue: rawVM.dcf.intrinsicValue ?? rawVM.dcf.fairValue ?? null,
        discountRate: rawVM.dcf.discountRate ?? rawVM.dcf.wacc ?? null,
        terminalGrowth: rawVM.dcf.terminalGrowth ?? rawVM.dcf.terminalGrowthRate ?? null,
        upsidePercent: rawVM.dcf.upsidePercent ?? rawVM.dcf.upside ?? null
      } : (rawVM.dcf ?? {}),
      ddm: rawVM.ddm ? {
        intrinsicValue: rawVM.ddm.intrinsicValue ?? rawVM.ddm.fairValue ?? null,
        dividendGrowthRate: rawVM.ddm.dividendGrowthRate ?? rawVM.ddm.expectedDividendGrowth ?? null,
        costOfEquity: rawVM.ddm.costOfEquity ?? rawVM.ddm.requiredReturn ?? null,
        applicable: rawVM.ddm.applicable ?? (fundamentals.dividendYield > 0)
      } : (rawVM.ddm ?? {}),
      relativeValuation: rawVM.relativeValuation ? {
        intrinsicValue: rawVM.relativeValuation.intrinsicValue ?? rawVM.relativeValuation.fairValue ?? null,
        peerMedianPE: rawVM.relativeValuation.peerMedianPE ?? rawVM.relativeValuation.benchmarkMultiple ?? null,
        multipleType: rawVM.relativeValuation.multipleType ?? 'P/E Multiples'
      } : (rawVM.relativeValuation ?? {}),
      rapidStockValuation: rawVM.rapidStockValuation ? {
        intrinsicValue: rawVM.rapidStockValuation.intrinsicValue ?? rawVM.rapidStockValuation.fairValue ?? null,
        methodology: rawVM.rapidStockValuation.methodology ?? 'PEG Multiplier'
      } : (rawVM.rapidStockValuation ?? {}),
      residualIncomeModel: rawVM.residualIncomeModel ? {
        intrinsicValue: rawVM.residualIncomeModel.intrinsicValue ?? rawVM.residualIncomeModel.fairValue ?? null,
        equityCharge: rawVM.residualIncomeModel.equityCharge ?? null
      } : (rawVM.residualIncomeModel ?? {}),
      assetBasedValuation: rawVM.assetBasedValuation ? {
        netAssetValue: rawVM.assetBasedValuation.netAssetValue ?? rawVM.assetBasedValuation.fairValue ?? null,
        liquidationValue: rawVM.assetBasedValuation.liquidationValue ?? null
      } : (rawVM.assetBasedValuation ?? {}),
      excessReturnModel: rawVM.excessReturnModel ? {
        intrinsicValue: rawVM.excessReturnModel.intrinsicValue ?? rawVM.excessReturnModel.fairValue ?? null,
        excessReturnPercent: rawVM.excessReturnModel.excessReturnPercent ?? rawVM.excessReturnModel.returnSpread ?? null
      } : (rawVM.excessReturnModel ?? {}),
      industrySpecificModel: rawVM.industrySpecificModel ? {
        name: rawVM.industrySpecificModel.name ?? 'Sector Model',
        intrinsicValue: rawVM.industrySpecificModel.intrinsicValue ?? rawVM.industrySpecificModel.fairValue ?? null,
        description: rawVM.industrySpecificModel.description ?? rawVM.industrySpecificModel.sectorMetric ?? 'Industry specific valuation'
      } : (rawVM.industrySpecificModel ?? {}),
      consensusFairValue: rawVM.consensusFairValue ?? 0,
      verdict: rawVM.verdict ?? 'Fairly Valued'
    };

    // 8. 8-Quarter EPS History
    const earningsPerShare = {
      currentTTM: fundamentals.earningsPerShare?.currentTTM ?? null,
      quarterlyEPSPast2Years: fundamentals.earningsPerShare?.quarterlyEPSPast2Years?.map((q) => ({
        quarter: q.quarter,
        eps: q.eps
      })) ?? []
    };
    const volatilityIndex = {
      value: fundamentals.volatilityIndex?.value ?? +(fundamentals.beta ?? 1.15).toFixed(2),
      rating: fundamentals.volatilityIndex?.rating ?? ((fundamentals.beta ?? 1.15) > 1.5 ? 'High Volatility' : 'Moderate Volatility')
    };

    const cashFlow = {
      operatingCashFlow: fundamentals.cashFlow?.operatingCashFlow ?? null,
      freeCashFlow: fundamentals.freeCashFlowTTM ?? null,
      status: fundamentals.cashFlow?.status ?? (fundamentals.freeCashFlowTTM !== null && fundamentals.freeCashFlowTTM !== undefined ? (fundamentals.freeCashFlowTTM >= 0 ? 'Positive Operating Generation' : 'Negative Cash Burn') : 'Not Available')
    };

    const classification = (fundamentals.classification as any) ?? (
      isPennyStock ? 'Speculative Penny Stock' :
        fundamentals.dividendYield > 2 ? 'Income Stock' :
          'Growth Stock'
    );

    const fundamentalRating = (fundamentals.fundamentalRating as any) ?? (
      calculatedRisk > 7 ? 'Weak' :
        calculatedRisk > 4 ? 'Fairly Valued' :
          'Strong'
    );

    const theses = buildTheses(mover, fundamentals, analysis);

    const frontmatter: FinalReportFrontmatter = {
      title: analysis.title,
      description: analysis.seoDescription,
      publishDate: todayIso,
      ticker: cleanTicker,
      companyName: fundamentals.companyName,
      exchange: mover.exchange,
      region: mover.region,
      sector: fundamentals.sector,
      industry: fundamentals.industry,
      category: mover.category,
      movePercent: mover.changePercent,
      currentPrice: mover.price,
      currency: mover.currency,
      marketCap: fundamentals.marketCap,
      peRatio: fundamentals.peRatioTrailing || fundamentals.peRatioForward || null,
      forwardPE: fundamentals.peRatioForward || null,
      dividendYield: fundamentals.dividendYield,
      riskScore: calculatedRisk,
      tags: [
        cleanTicker,
        fundamentals.sector,
        mover.region === 'EU' ? 'European Equities' : 'US Equities',
        mover.category === 'gainer' ? 'Top Gainers' : 'Market Pullbacks',
        'Fundamental Analysis',
        isPennyStock ? 'Penny Stocks' : 'Large Cap Equities'
      ],
      keywords: [...analysis.primaryKeywords, ...analysis.secondaryKeywords],
      affiliates,
      adSlots: {
        topBanner: true,
        midArticle: true,
        bottomBanner: true
      },
      socialHooks: {
        twitter: analysis.socialHooks.twitterThread,
        redditTitle: analysis.socialHooks.redditPost.title,
        telegram: analysis.socialHooks.telegramAlert
      },

      // Extended fields: Penny stock & Venue
      isPennyStock,
      moneyMarketTradingVenue,
      priceTimestamp,

      // Debt Breakdown
      debtAnalysis,
      totalDebt,
      debtToEquity: debtToEquityRatio,
      shortTermDebt,
      longTermDebt,
      shortVsLongTermRatio: fundamentals.shortVsLongTermRatio ?? 0.5,
      recentChangesInDebt: fundamentals.recentChangesInDebt ?? debtAnalysis.recentChanges,
      debtRisks: fundamentals.debtRisks ?? debtAnalysis.risks,

      // Valuation comparisons
      priceToBook: priceToBookRatio,
      priceToEarnings: priceToEarningsRatio,
      priceToBookRatio,
      priceToEarningsRatio,

      // Profitability & EPS
      returnOnEquity: fundamentals.returnOnEquity ?? 0,
      earningsPerShare,

      // Volatility & Cash Flow
      volatilityIndex,
      cashFlow,
      freeCashFlow: fundamentals.freeCashFlowTTM,
      operatingCashFlow: cashFlow.operatingCashFlow,

      // Qualitative Analysis
      managementQuality,
      competitiveMoat,
      companyQuestions: companyDeepDive,
      industryQuestions: industryDeepDive,
      companyDeepDive,
      industryDeepDive,

      // Multi-model Valuations
      valuationModels,
      fundamentalRating,
      classification,

      // Sentiment & Artificial Inflation
      isArtificiallyInflated: artificialInflation.isInflated,
      artificialInflationRisk: artificialInflation.riskLevel,
      volumeAnomalyRatio: artificialInflation.volumeAnomalyRatio,
      majorPriceDriver: artificialInflation.majorPriceDriver,
      newsImpact: artificialInflation.newsImpact,
      socialMediaImpact: artificialInflation.socialMediaImpact,
      artificialInflation,

      // Theses
      theses,

      // Two-Tiered News Catalyst & Sentiment Pipeline
      catalystAlignment: sentiment?.catalystAlignment || analysis?.catalystAlignment || 'ALIGNED',
      catalystSynthesis: sentiment?.catalystSynthesis || analysis?.catalystSynthesis,
      filteredHeadlines: sentiment?.filteredHeadlines || analysis?.filteredHeadlines
    };

    // Inject contextual monetization units into Markdown body
    const enrichedMarkdown = this.insertMonetizationUnits(
      analysis.markdownBody,
      primaryAffiliate,
      secondaryAffiliate,
      cleanTicker
    );

    return { frontmatter, enrichedMarkdown };
  }

  /**
   * Programmatic insertion into content sections without breaking markdown syntax.
   */
  private insertMonetizationUnits(
    body: string,
    primaryAffiliate: AffiliateLink,
    secondaryAffiliate: AffiliateLink,
    ticker: string
  ): string {
    let result = body;

    // 1. Insertion Slot A: Inline Contextual Broker/Tool Card after Executive Summary
    const slotAComponent = `\n\n<div class="my-8 p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-sm">
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <span class="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-900/60 px-2.5 py-0.5 rounded-full mb-1.5">${primaryAffiliate.badge || 'Featured Partner'}</span>
      <h4 class="text-base font-bold text-white mb-1">${primaryAffiliate.headline}</h4>
      <p class="text-xs text-slate-400 leading-relaxed">${primaryAffiliate.description}</p>
    </div>
    <a href="${primaryAffiliate.url}" target="_blank" rel="noopener sponsored" class="inline-flex shrink-0 items-center justify-center px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm">
      ${primaryAffiliate.ctaText} &rarr;
    </a>
  </div>
  <div class="flex items-center justify-between text-[10px] text-slate-400 mt-3 border-t border-slate-800/60 pt-2">
    <span>${primaryAffiliate.disclosure}</span>
    <span class="font-mono">FTC Sponsored Disclosure</span>
  </div>
</div>\n\n`;

    // 2. Insertion Slot B: Mid-Article Native Display Ad placeholder
    const slotBComponent = `\n\n<div class="my-10 p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center flex flex-col items-center justify-center min-h-[250px] overflow-hidden">
  <span class="text-[10px] uppercase font-mono text-slate-400 mb-2">Advertisement</span>
  <div id="ad-content-mid" data-ad-slot="report-mid" class="w-full flex items-center justify-center">
    <!-- Automated Programmatic Ad Unit (Google AdSense / Carbon / NitroPay) -->
    <div class="text-xs text-slate-400 py-8">Sponsored Market Analytics & Execution Tools</div>
  </div>
</div>\n\n`;

    // 3. Insertion Slot C: Secondary Research / Screener Callout
    const slotCComponent = `\n\n<div class="my-8 p-4 rounded-xl border border-blue-500/20 bg-blue-950/20">
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <span class="text-xs font-semibold uppercase tracking-wider text-blue-400">${secondaryAffiliate.name}</span>
      <h4 class="text-sm font-bold text-white mt-1">${secondaryAffiliate.headline}</h4>
      <p class="text-xs text-slate-400">${secondaryAffiliate.description}</p>
    </div>
    <a href="${secondaryAffiliate.url}" target="_blank" rel="noopener sponsored" class="shrink-0 text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-300 px-3.5 py-1.5 rounded-lg transition-colors">
      ${secondaryAffiliate.ctaText}
    </a>
  </div>
</div>\n\n`;

    // Insert Slot A after Section 1 (Executive Summary)
    if (result.includes('---')) {
      result = result.replace('---', `---${slotAComponent}`);
    } else {
      result = result + slotAComponent;
    }

    // Insert Slot B before Valuation Multiples section
    if (result.includes('## Multi-Model Valuation Suite')) {
      result = result.replace('## Multi-Model Valuation Suite', `${slotBComponent}## Multi-Model Valuation Suite`);
    } else if (result.includes('## Valuation Multiples')) {
      result = result.replace('## Valuation Multiples', `${slotBComponent}## Valuation Multiples`);
    } else {
      result = result + slotBComponent;
    }

    // Insert Slot C before Risk / Reward section
    if (result.includes('## Evidence-Based Risk / Reward')) {
      result = result.replace('## Evidence-Based Risk / Reward', `${slotCComponent}## Evidence-Based Risk / Reward`);
    }

    return result;
  }
}

export const adInjector = new ProgrammaticAdInjector();
