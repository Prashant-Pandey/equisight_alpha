import type { MarketMover, FundamentalMetrics, LLMAnalysisOutput, FinalReportFrontmatter, AffiliateLink } from '../types.js';
import { affiliateEngine } from './affiliateEngine.js';

export class ProgrammaticAdInjector {
  /**
   * Enriches report frontmatter and injects contextual monetization components
   * into the markdown body at optimized conversion coordinates.
   */
  public injectMonetization(
    mover: MarketMover,
    fundamentals: FundamentalMetrics,
    analysis: LLMAnalysisOutput
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
        'Fundamental Analysis'
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
      }
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
    if (result.includes('## Valuation Multiples')) {
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
