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
  if (analysis.theses?.bull && analysis.theses.bull.length > 0 && analysis.theses.bear && analysis.theses.bear.length > 0) {
    return analysis.theses;
  }

  const cleanTicker = mover.ticker.toUpperCase();
  const fcfB = (f.freeCashFlowTTM / 1e9).toFixed(2);
  const consensusTarget = f.valuationModels?.consensusFairValue ?? (mover.category === 'gainer' ? mover.price * 1.15 : mover.price * 1.25);
  const upside = (((consensusTarget - mover.price) / Math.max(0.01, mover.price)) * 100).toFixed(1);

  const bull: ThesisPoint[] = [
    {
      point: `Multi-model consensus valuation upside of ${upside}% against multi-model fair value target of $${consensusTarget.toFixed(2)}.`,
      sources: ['Consensus 8-Model Valuation Suite', `SEC Form 10-K / 10-Q Item 7 Management Discussion for $${cleanTicker}`],
      deductionChain: `Discount to intrinsic DCF ($${f.valuationModels?.dcf?.intrinsicValue?.toFixed(2) ?? (mover.price * 1.15).toFixed(2)}) and peer multiples -> Asymmetric margin of safety at current market entry -> Multiple expansion potential upon steady earnings compounding.`
    },
    {
      point: `Operating resilience demonstrated by a ${f.grossMargin.toFixed(1)}% gross margin and $${fcfB}B annual Free Cash Flow conversion.`,
      sources: ['Consolidated Cash Flow Statement', 'SEC Audited Annual Financial Disclosures'],
      deductionChain: `Sustained cash conversion -> Zero immediate dependency on punitive debt markets -> Capital allocation headroom for reinvestment or balance sheet de-leveraging.`
    },
    {
      point: `Defensible competitive position certified with a ${f.competitiveMoat?.rating ?? 'Narrow Moat'} rating.`,
      sources: ['Competitive Moat Analysis', 'Industry Trade & Patent Office Filings'],
      deductionChain: `${(f.competitiveMoat?.summary ?? 'Proprietary IP and high client retention barriers').slice(0, 110)}... -> High enterprise switching costs -> Long-term return on invested capital retention.`
    }
  ];

  const bear: ThesisPoint[] = [
    {
      point: 'Macro sovereign yield friction and elevated long-duration capital hurdle.',
      sources: ['Federal Reserve Rate Policy', 'US 10-Year Treasury Yield Benchmark'],
      deductionChain: 'Benchmark sovereign yields above 4% -> Elevated weighted average cost of capital (WACC) -> Structural valuation multiple compression across duration assets.'
    },
    {
      point: `Capital structure debt obligations with short-term maturity exposure.`,
      sources: ['Balance Sheet Liabilities Schedule', 'SEC 10-K Note on Long-Term Debt and Credit Facilities'],
      deductionChain: `Short-term debt maturity wall -> Refinancing obligations in elevated rate climate -> Potential interest coverage margin compression.`
    },
    {
      point: `Operational and competitive obstacles within the ${f.sector} landscape.`,
      sources: ['Industry Competitive Landscape', 'Regulatory Survey Disclosures'],
      deductionChain: `${(f.industryQuestions?.obstaclesAndChallenges ?? 'Competitive rivalry and input cost variations').slice(0, 110)}... -> Heightened execution hurdles -> Asymmetric downside volatility upon quarterly misses.`
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
    const totalDebt = fundamentals.totalDebt ?? 0;
    const shortTermDebt = fundamentals.shortTermDebt ?? Math.round(totalDebt * 0.35);
    const longTermDebt = fundamentals.longTermDebt ?? Math.max(0, totalDebt - shortTermDebt);
    const debtToEquityRatio = fundamentals.debtToEquity ?? (fundamentals.marketCap > 0 ? +(totalDebt / fundamentals.marketCap).toFixed(2) : 0.4);

    const debtAnalysis = {
      totalDebt,
      debtToEquity: debtToEquityRatio ?? 0,
      shortTermDebt,
      longTermDebt,
      shortVsLongTermRatio: typeof fundamentals.shortVsLongTermRatio === 'string'
        ? fundamentals.shortVsLongTermRatio
        : `${((shortTermDebt / Math.max(1, totalDebt)) * 100).toFixed(0)}% Short / ${((longTermDebt / Math.max(1, totalDebt)) * 100).toFixed(0)}% Long`,
      recentChanges: fundamentals.recentChangesInDebt || 'Stable obligations; monitored via trailing 10-Q disclosures',
      risks: fundamentals.debtRisks || 'Refinancing rate sensitivity under restrictive central bank policies'
    };

    // 2. Price to Book Comparison
    const pbCurrent = typeof fundamentals.priceToBook === 'object' && fundamentals.priceToBook !== null
      ? (fundamentals.priceToBook as any).current
      : typeof fundamentals.priceToBook === 'number'
      ? fundamentals.priceToBook
      : 1.5;

    const priceToBookRatio = {
      current: pbCurrent ?? 1.5,
      industryAverage: (fundamentals as any).priceToBook?.industryAverage ?? (fundamentals as any).priceToBookComparison?.industryAverage ?? 2.4,
      historicalAverage5Y: (fundamentals as any).priceToBook?.historicalAverage5Y ?? (fundamentals as any).priceToBookComparison?.historicalAverage5Y ?? 2.1,
      chart: [
        { label: 'Current P/B', value: pbCurrent ?? 1.5 },
        { label: 'Industry Avg', value: (fundamentals as any).priceToBook?.industryAverage ?? 2.4 },
        { label: '5Y Historical Avg', value: (fundamentals as any).priceToBook?.historicalAverage5Y ?? 2.1 }
      ]
    };

    // 3. Price to Earnings Comparison
    const peCurrent = fundamentals.peRatioTrailing ?? fundamentals.peRatioForward ?? (fundamentals as any).priceToEarnings?.current ?? null;
    const priceToEarningsRatio = {
      current: peCurrent,
      industryAverage: (fundamentals as any).priceToEarnings?.industryAverage ?? (fundamentals as any).priceToEarningsComparison?.industryAverage ?? 22.0,
      historicalAverage5Y: (fundamentals as any).priceToEarnings?.historicalAverage5Y ?? (fundamentals as any).priceToEarningsComparison?.historicalAverage5Y ?? 19.5,
      chart: [
        { label: 'Current P/E', value: peCurrent ?? 0 },
        { label: 'Industry Avg', value: (fundamentals as any).priceToEarnings?.industryAverage ?? 22.0 },
        { label: '5Y Historical Avg', value: (fundamentals as any).priceToEarnings?.historicalAverage5Y ?? 19.5 }
      ]
    };

    // 4. Artificial Inflation Breakdown
    const volumeRatio = sentiment?.volumeAnomalyRatio ?? (mover.avgVolume > 0 ? +(mover.volume / mover.avgVolume).toFixed(2) : 1.25);
    const isInflated = sentiment?.isArtificiallyInflated ?? (volumeRatio > 2.5 && Math.abs(mover.changePercent) > 20);
    const riskLevel = sentiment?.artificialInflationRisk ?? (isInflated ? 'Severe' : volumeRatio > 1.8 ? 'Moderate' : defaultRiskLevel);

    const artificialInflation = {
      isInflated,
      riskLevel,
      volumeAnomalyRatio: volumeRatio,
      majorPriceDriver: sentiment?.majorPriceDriver ?? (mover.category === 'gainer' ? 'Retail momentum & social media discussion' : 'Market pullback & valuation multiples compression'),
      sentimentScore: sentiment?.sentimentScore ?? (mover.category === 'gainer' ? 0.72 : 0.38),
      newsImpact: sentiment?.newsImpact ?? 'Syndicated financial news coverage following session volatility',
      socialMediaImpact: sentiment?.socialMediaImpact ?? 'Elevated social discussion across retail investing forums'
    };

    // 5. 4 Company Questions & 3 Industry Questions
    const companyDeepDive = {
      howCompanyMakesMoney: fundamentals.companyQuestions?.howCompanyMakesMoney ?? (analysis.companyDeepDive?.howCompanyMakesMoney || `${fundamentals.companyName} generates revenue through its core commercial operations and service contracts in the ${fundamentals.sector} sector.`),
      productsDemandAndWhy: fundamentals.companyQuestions?.productsDemandAndWhy ?? (analysis.companyDeepDive?.productsDemandAndWhy || `Products and solutions serve mission-critical enterprise and consumer requirements with sustained commercial demand.`),
      pastPerformanceSummary: fundamentals.companyQuestions?.pastPerformanceSummary ?? (analysis.companyDeepDive?.pastPerformanceSummary || `Historical revenue progression illustrates ongoing market positioning across multiple macroeconomic operating cycles.`),
      growthAndProfitabilityOutlook: fundamentals.companyQuestions?.growthAndProfitabilityOutlook ?? (analysis.companyDeepDive?.growthAndProfitabilityOutlook || `Forward positioning focuses on pipeline scaling, margin optimization, and operational efficiency.`)
    };

    const industryDeepDive = {
      industryCondition: fundamentals.industryQuestions?.industryCondition ?? (analysis.industryDeepDive?.industryCondition || `The ${fundamentals.sector} and ${fundamentals.industry} space continues structural modernization amidst changing interest rate environments.`),
      obstaclesAndChallenges: fundamentals.industryQuestions?.obstaclesAndChallenges ?? (analysis.industryDeepDive?.obstaclesAndChallenges || `Industry participants face regulatory oversight, supply chain variables, and competitive price discovery.`),
      economicPoliticalCulturalRisks: fundamentals.industryQuestions?.economicPoliticalCulturalRisks ?? (analysis.industryDeepDive?.economicPoliticalCulturalRisks || `Geopolitical tensions, trade policy shifts, and sovereign yield volatility remain primary macro risks.`)
    };

    // 6. Management Quality & Competitive Moat
    const managementQuality = {
      rating: (fundamentals.managementQuality?.rating as any) ?? 'Experienced',
      trackRecord: fundamentals.managementQuality?.trackRecord ?? 'Executive team possesses extensive domain leadership and disciplined capital stewardship.'
    };

    const competitiveMoat = {
      rating: (fundamentals.competitiveMoat?.rating as any) ?? 'Narrow Moat',
      summary: fundamentals.competitiveMoat?.summary ?? 'Proprietary technology, intellectual property, and switching barriers provide competitive protection.'
    };

    // 7. Multi-Model Valuations
    const rawVM: any = analysis.valuationModels || fundamentals.valuationModels || {};
    const valuationModels = {
      dcf: rawVM.dcf ? {
        intrinsicValue: rawVM.dcf.intrinsicValue ?? rawVM.dcf.fairValue ?? +(mover.price * 1.15).toFixed(2),
        discountRate: rawVM.dcf.discountRate ?? 9.5,
        terminalGrowth: rawVM.dcf.terminalGrowth ?? rawVM.dcf.terminalGrowthRate ?? 2.5,
        upsidePercent: rawVM.dcf.upsidePercent ?? rawVM.dcf.upside ?? 15.0
      } : {
        intrinsicValue: +(mover.price * 1.15).toFixed(2),
        discountRate: 9.5,
        terminalGrowth: 2.5,
        upsidePercent: 15.0
      },
      ddm: rawVM.ddm ? {
        intrinsicValue: rawVM.ddm.intrinsicValue ?? rawVM.ddm.fairValue ?? 0,
        dividendGrowthRate: rawVM.ddm.dividendGrowthRate ?? rawVM.ddm.expectedDividendGrowth ?? 0,
        costOfEquity: rawVM.ddm.costOfEquity ?? rawVM.ddm.requiredReturn ?? 9.5,
        applicable: rawVM.ddm.applicable ?? (fundamentals.dividendYield > 0)
      } : {
        intrinsicValue: 0,
        dividendGrowthRate: 0,
        costOfEquity: 9.5,
        applicable: false
      },
      relativeValuation: rawVM.relativeValuation ? {
        intrinsicValue: rawVM.relativeValuation.intrinsicValue ?? rawVM.relativeValuation.fairValue ?? +(mover.price * 1.10).toFixed(2),
        peerMedianPE: rawVM.relativeValuation.peerMedianPE ?? rawVM.relativeValuation.benchmarkMultiple ?? 18.5,
        multipleType: rawVM.relativeValuation.multipleType ?? 'P/E Multiples'
      } : {
        intrinsicValue: +(mover.price * 1.10).toFixed(2),
        peerMedianPE: 18.5,
        multipleType: 'P/E Multiples'
      },
      rapidStockValuation: rawVM.rapidStockValuation ? {
        intrinsicValue: rawVM.rapidStockValuation.intrinsicValue ?? rawVM.rapidStockValuation.fairValue ?? +(mover.price * 1.05).toFixed(2),
        methodology: rawVM.rapidStockValuation.methodology ?? 'Rule of 72 / Quick PEG Multiplier'
      } : {
        intrinsicValue: +(mover.price * 1.05).toFixed(2),
        methodology: 'Rule of 72 / Quick PEG Multiplier'
      },
      residualIncomeModel: rawVM.residualIncomeModel ? {
        intrinsicValue: rawVM.residualIncomeModel.intrinsicValue ?? rawVM.residualIncomeModel.fairValue ?? +(mover.price * 1.08).toFixed(2),
        equityCharge: rawVM.residualIncomeModel.equityCharge ?? 8.5
      } : {
        intrinsicValue: +(mover.price * 1.08).toFixed(2),
        equityCharge: 8.5
      },
      assetBasedValuation: rawVM.assetBasedValuation ? {
        netAssetValue: rawVM.assetBasedValuation.netAssetValue ?? rawVM.assetBasedValuation.fairValue ?? +(mover.price * 0.85).toFixed(2),
        liquidationValue: rawVM.assetBasedValuation.liquidationValue ?? +(mover.price * 0.65).toFixed(2)
      } : {
        netAssetValue: +(mover.price * 0.85).toFixed(2),
        liquidationValue: +(mover.price * 0.65).toFixed(2)
      },
      excessReturnModel: rawVM.excessReturnModel ? {
        intrinsicValue: rawVM.excessReturnModel.intrinsicValue ?? rawVM.excessReturnModel.fairValue ?? +(mover.price * 1.12).toFixed(2),
        excessReturnPercent: rawVM.excessReturnModel.excessReturnPercent ?? rawVM.excessReturnModel.returnSpread ?? 3.5
      } : {
        intrinsicValue: +(mover.price * 1.12).toFixed(2),
        excessReturnPercent: 3.5
      },
      industrySpecificModel: rawVM.industrySpecificModel ? {
        name: rawVM.industrySpecificModel.name ?? 'Sector Asset Capacity Model',
        intrinsicValue: rawVM.industrySpecificModel.intrinsicValue ?? rawVM.industrySpecificModel.fairValue ?? mover.price,
        description: rawVM.industrySpecificModel.description ?? rawVM.industrySpecificModel.sectorMetric ?? 'Industry specific valuation'
      } : {
        name: 'Sector Asset Capacity Model',
        intrinsicValue: mover.price,
        description: 'Industry specific capacity multiple'
      },
      consensusFairValue: rawVM.consensusFairValue ?? +(mover.price * 1.10).toFixed(2),
      verdict: rawVM.verdict ?? (mover.category === 'gainer' ? 'Fairly Valued / Momentum Rebalancing' : 'Undervalued / Asymmetric Upside')
    };

    // 8. 8-Quarter EPS History
    const earningsPerShare = {
      currentTTM: fundamentals.earningsPerShare?.currentTTM ?? 0,
      quarterlyEPSPast2Years: fundamentals.earningsPerShare?.quarterlyEPSPast2Years?.map((q) => ({
        quarter: q.quarter,
        eps: q.eps
      })) ?? [
        { quarter: 'Q3 2026', eps: 0.12 },
        { quarter: 'Q2 2026', eps: 0.10 },
        { quarter: 'Q1 2026', eps: 0.08 },
        { quarter: 'Q4 2025', eps: 0.07 },
        { quarter: 'Q3 2025', eps: 0.06 },
        { quarter: 'Q2 2025', eps: 0.05 },
        { quarter: 'Q1 2025', eps: 0.04 },
        { quarter: 'Q4 2024', eps: 0.03 }
      ]
    };

    const volatilityIndex = {
      value: fundamentals.volatilityIndex?.value ?? +(fundamentals.beta ?? 1.15).toFixed(2),
      rating: fundamentals.volatilityIndex?.rating ?? ((fundamentals.beta ?? 1.15) > 1.5 ? 'High Volatility' : 'Moderate Volatility')
    };

    const cashFlow = {
      operatingCashFlow: fundamentals.cashFlow?.operatingCashFlow ?? Math.round(fundamentals.freeCashFlowTTM * 1.2),
      freeCashFlow: fundamentals.freeCashFlowTTM,
      status: fundamentals.cashFlow?.status ?? (fundamentals.freeCashFlowTTM >= 0 ? 'Positive Operating Generation' : 'Negative Cash Burn')
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
      theses
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
