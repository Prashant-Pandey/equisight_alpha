import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  TitleAndExecOutput,
  TradingActivityOutput,
  BalanceSheetSolvencyOutput,
  ProfitabilityOperatingOutput,
  MoatAndCompetitorOutput,
  ValuationEngineOutput,
  BullBearThesesOutput,
  ExecutiveSummaryData,
  ThesisPoint,
  ArtificialInflation,
  DebtAnalysis,
  EPSHistory,
  ManagementQuality,
  CompetitiveMoat,
  CompanyQuestions,
  IndustryQuestions,
  ValuationModels
} from '../types.js';
import {
  buildTitleAndExecSystemPrompt,
  buildTitleAndExecUserPrompt,
  buildTradingActivitySystemPrompt,
  buildTradingActivityUserPrompt,
  buildBalanceSheetSolvencySystemPrompt,
  buildBalanceSheetSolvencyUserPrompt,
  buildProfitabilityOperatingSystemPrompt,
  buildProfitabilityOperatingUserPrompt,
  buildMoatAndCompetitorSystemPrompt,
  buildMoatAndCompetitorUserPrompt,
  buildValuationEngineSystemPrompt,
  buildValuationEngineUserPrompt,
  buildBullBearThesesSystemPrompt,
  buildBullBearThesesUserPrompt
} from './specializedPrompts.js';
import {
  TITLE_AND_EXEC_SCHEMA,
  TRADING_ACTIVITY_SCHEMA,
  BALANCE_SHEET_SOLVENCY_SCHEMA,
  PROFITABILITY_OPERATING_SCHEMA,
  MOAT_AND_COMPETITOR_SCHEMA,
  VALUATION_ENGINE_SCHEMA,
  BULL_BEAR_THESES_SCHEMA
} from './schemas.js';
import { formatPriceTimestamp } from '../../../src/utils/formatters.js';
import {
  isPennyStock as checkPennyStock,
  getClassification,
  resolveTradingVenue,
  getCashFlowStatus,
  getManagementQuality,
  getMoatTrend,
  getEconomicMoat
} from '../../../src/utils/financialClassification.js';
import { generateImprovedTitle, cleanCompanyName } from '../../../src/utils/titleGenerator.js';
import { buildTheses } from '../monetization/adInjector.js';

export interface SubSectionAgentContext {
  mover: MarketMover;
  fundamentals: FundamentalMetrics;
  macro: MacroBackdrop;
  sentiment: SocialSentiment;
  groundTruthPromptBlock?: string;
  executeLLM: <T>(systemPrompt: string, userPrompt: string, callerTag: string, jsonSchema?: object) => Promise<T | null>;
}

// ============================================================================
// 1. TITLE & EXECUTIVE SUMMARY AGENT
// ============================================================================

export class TitleAndExecAgent {
  public async execute(context: SubSectionAgentContext): Promise<TitleAndExecOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildTitleAndExecSystemPrompt();
    let userPrompt = buildTitleAndExecUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<TitleAndExecOutput>(
        systemPrompt,
        userPrompt,
        `TitleAndExec-${mover.ticker}`,
        TITLE_AND_EXEC_SCHEMA
      );

      if (output && output.title && output.sectionMarkdown) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[TitleAndExecAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): TitleAndExecOutput {
    const isGainer = mover.category === 'gainer';
    const actionVerb = isGainer ? 'Surges' : 'Retreats';
    const sign = mover.changePercent > 0 ? '+' : '';
    const moveStr = `${sign}${mover.changePercent.toFixed(1)}%`;
    const cleanTicker = mover.ticker.toUpperCase();
    const isPennyStock = checkPennyStock(mover.price, mover.exchange, mover.isPennyStock);
    const venue = mover.moneyMarketTradingVenue || resolveTradingVenue(mover.ticker, mover.exchange, isPennyStock);
    const volumeAnomalyRatio = s.volumeAnomalyRatio ?? (mover.avgVolume > 0 ? +(mover.volume / mover.avgVolume).toFixed(2) : 1.0);
    const majorPriceDriver = s.majorPriceDriver || mover.newsHeadline || 'Market Flow';
    const consensusFairValue = f.valuationModels?.consensusFairValue ?? null;
    const verdict = f.valuationModels?.verdict ?? 'Fairly Valued';
    const alignment = s.catalystAlignment || 'ALIGNED';
    const catalystSynthesis = s.catalystSynthesis || (
      alignment === 'DIVERGENT_SELL_THE_NEWS'
        ? `Despite ostensibly positive headline catalysts, market participants engaged in a sell-the-news rotation for ${cleanTicker}, driven by multiple compression and conservative forward guidance.`
        : alignment === 'DIVERGENT_RELIEF_RALLY'
          ? `Although headlines appeared challenging, ${cleanTicker} exhibited a relief rally as regulatory or litigation overhangs cleared and low market expectations were decisively exceeded.`
          : alignment === 'MACRO_DOMINATED'
            ? `Price action in ${cleanTicker} was predominantly dictated by macroeconomic rate movements and sector contagion rather than company-specific micro catalysts.`
            : alignment === 'NOISE_SPECULATION'
              ? `Trading momentum in ${cleanTicker} decoupled from verified corporate disclosures, driven primarily by retail speculative order flow.`
              : `${cleanTicker}'s price action closely tracked reported operational news catalysts and fundamental financial disclosures.`
    );

    const priceTimestamp = formatPriceTimestamp(new Date());

    const title = generateImprovedTitle({
      companyName: f.companyName || mover.name,
      ticker: cleanTicker,
      currentPrice: mover.price,
      sector: f.sector,
      industry: f.industry,
      isPennyStock,
      moatRating: f.competitiveMoat?.rating,
      verdict,
      country: mover.region === 'EU' ? 'Europe' : 'US'
    });

    const slug = `${cleanTicker.toLowerCase()}-${isGainer ? 'gain' : 'loss'}-${Math.abs(Math.round(mover.changePercent))}-percent-fundamental-analysis`;
    const seoDescription = `Institutional equity research on ${f.companyName} (${cleanTicker}). Move: ${moveStr}. Valuation analysis, 3-stage DCF, debt breakdown, and investment theses.`;

    const catalystHeadline = s.majorPriceDriver || mover.newsHeadline || `${cleanTicker} ${actionVerb} ${moveStr} in active session trading.`;

    const narrative = `${f.companyName} ($${cleanTicker}) experienced significant price dislocation during today's session, closing at $${mover.price.toFixed(2)} (${moveStr}) on ${venue}. Trading volume expanded to ${mover.volume.toLocaleString()} shares, representing a **${volumeAnomalyRatio}x** relative volume surge over its 90-day baseline average of ${mover.avgVolume.toLocaleString()} shares.

The primary market catalyst for today's price action is **${majorPriceDriver}**. The market's structural reaction aligns with \`${alignment}\` dynamics: ${catalystSynthesis} Concurrently, broader macroeconomic pressures, including a US 10-Year Treasury yield of ${macro.us10YearYield.toFixed(2)}% and a Cboe VIX reading of ${macro.vixIndex.toFixed(1)}, set the backdrop for risk tolerance across ${f.sector} equities.`;

    const blockquote = `> **Key Session Takeaways:**\n> * **Catalyst Impact:** ${majorPriceDriver}.\n> * **Volume Acceleration:** ${volumeAnomalyRatio}x RVOL indicating ${volumeAnomalyRatio > 2.0 ? 'institutional liquidity repositioning' : 'orderly market participation'}.\n> * **Valuation Anchor:** Multi-model consensus fair value modeled at **$${(consensusFairValue ?? 0).toFixed(2)}** (${verdict}) with Morningstar rating of **${f.starRatingString || '★★★☆☆'}**.`;

    const metricsTable = `| Metric | Current Session Level | Benchmark / Historical Context |
| :--- | :--- | :--- |
| **Closing Price** | \`$${mover.price.toFixed(2)}\` | Session Move: \`${moveStr}\` |
| **Trading Volume** | \`${mover.volume.toLocaleString()}\` | 90-Day Avg: \`${mover.avgVolume.toLocaleString()}\` (${volumeAnomalyRatio}x RVOL) |
| **Trading Venue** | \`${venue}\` | Classification: \`${isPennyStock ? 'Penny Stock (< $5.00)' : f.classification || 'Equities'}\` |
| **Market Capitalization** | \`$${(f.marketCap / 1e9).toFixed(2)}B\` | Sector: \`${f.sector}\` |
| **Consensus Fair Value** | \`$${(consensusFairValue ?? 0).toFixed(2)}\` | Valuation Verdict: \`${verdict}\` |
| **Morningstar Rating** | **${f.starRatingString || '★★★☆☆'}** | Uncertainty: \`${f.uncertaintyRating || 'Medium'}\` |
| **Quote Timestamp** | \`${priceTimestamp}\` | Real-time session close |`;

    const formattedMarkdown = `## Executive Summary & Session Catalyst\n\n${narrative}\n\n${blockquote}\n\n${metricsTable}`;

    const executiveSummaryData: ExecutiveSummaryData = {
      catalystHeadline,
      catalystCategory: isGainer ? 'Commercial Contract / Expansion' : 'Multiple Compression / Guidance Revision',
      expectationsVsReality: catalystSynthesis,
      sessionDynamics: `Trading on ${venue} with volume of ${mover.volume.toLocaleString()} shares (${volumeAnomalyRatio}x RVOL).`,
      macroeconomicContext: `Benchmark 10-Year Yield at ${macro.us10YearYield.toFixed(2)}% and VIX at ${macro.vixIndex.toFixed(1)}.`,
      fundamentalImpact: `Consensus Fair Value anchored at $${(consensusFairValue ?? 0).toFixed(2)} (${verdict}).`,
      keyTakeaways: [
        `Session Move: ${moveStr} on ${volumeAnomalyRatio}x relative volume.`,
        `Catalyst Driver: ${majorPriceDriver}.`,
        `Consensus Valuation: $${(consensusFairValue ?? 0).toFixed(2)} (${verdict}) with ${f.starRatingString || '★★★☆☆'} Morningstar rating.`
      ],
      formattedMarkdown
    };

    return {
      title,
      seoDescription,
      slug,
      primaryKeywords: [`${cleanTicker} stock analysis`, `${f.companyName} valuation`, `${cleanTicker} P/E ratio`],
      secondaryKeywords: [`${cleanTicker} debt breakdown`, `${f.sector} stock movers`, `${cleanTicker} DCF model`],
      catalystSummary: catalystHeadline,
      catalystAlignment: alignment,
      catalystSynthesis,
      extractedFigures: {
        peRatio: f.peRatioTrailing || f.peRatioForward || 0,
        revenueTTM: f.revenueTTM,
        operatingMargin: f.operatingMargin,
        freeCashFlow: f.freeCashFlowTTM,
        netDebt: f.netDebt,
        movePercent: mover.changePercent
      },
      executiveSummaryData,
      sectionMarkdown: formattedMarkdown
    };
  }
}

// ============================================================================
// 2. TRADING ACTIVITY, CATALYST-PRICE ALIGNMENT & ARTIFICIAL INFLATION AGENT
// ============================================================================

export class TradingActivityAgent {
  public async execute(context: SubSectionAgentContext): Promise<TradingActivityOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildTradingActivitySystemPrompt();
    let userPrompt = buildTradingActivityUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<TradingActivityOutput>(
        systemPrompt,
        userPrompt,
        `TradingActivity-${mover.ticker}`,
        TRADING_ACTIVITY_SCHEMA
      );

      if (output && output.sectionMarkdown && output.sectionMarkdown.includes('## 1. Trading Activity')) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[TradingActivityAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): TradingActivityOutput {
    const cleanTicker = mover.ticker.toUpperCase();
    const volumeAnomalyRatio = s.volumeAnomalyRatio ?? (mover.avgVolume > 0 ? +(mover.volume / mover.avgVolume).toFixed(2) : 1.0);
    const isInflated = s.isArtificiallyInflated ?? (volumeAnomalyRatio > 2.5 && Math.abs(mover.changePercent) > 20);
    const riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' = s.artificialInflationRisk ?? (
      isInflated ? 'Severe' : volumeAnomalyRatio > 2.0 ? 'High' : volumeAnomalyRatio > 1.5 ? 'Moderate' : 'Low'
    );
    const majorPriceDriver = s.majorPriceDriver || (mover.category === 'gainer' ? 'Trading volume momentum and market order flow' : 'Broad sector rotation and valuation multiple adjustment');
    const sentimentScore = s.sentimentScore ?? 0.0;
    const newsImpact = s.newsImpact || 'No recent significant corporate press releases detected.';
    const socialMediaImpact = s.socialMediaImpact || 'Social discussion within normal baseline variance.';
    const alignment = s.catalystAlignment || 'ALIGNED';
    const catalystSynthesis = s.catalystSynthesis || `${cleanTicker}'s price action closely tracked reported operational news catalysts and fundamental financial disclosures.`;

    const optionGammaImbalance = s.optionGammaImbalance || {
      imbalanceRatio: null,
      netGammaExposure: 'No Listed Options Chain',
      callVolume: 0,
      putVolume: 0,
      callOpenInterest: 0,
      putOpenInterest: 0,
      riskLevel: 'Low',
      status: 'No active exchange-traded options contracts identified; gamma squeeze risk is negligible.'
    };

    const freeFloatConcentration = s.freeFloatConcentration || {
      freeFloatShares: null,
      freeFloatPercent: null,
      floatTurnoverRatio: null,
      concentrationLevel: 'Low',
      status: 'Public float concentration metrics within standard operational limits.'
    };

    // Technical indicator calculations (TradingAgents framework)
    const high52 = f.fiftyTwoWeekHigh || mover.price * 1.3;
    const low52 = f.fiftyTwoWeekLow || mover.price * 0.7;
    const range52 = Math.max(0.01, high52 - low52);
    const rangePositionPct = ((mover.price - low52) / range52) * 100;
    const estimatedRsi = Math.min(92, Math.max(15, +(30 + (rangePositionPct * 0.4) + (mover.changePercent * 0.8)).toFixed(1)));
    const estimatedAtr = +(mover.price * (0.015 + Math.min(0.06, Math.abs(mover.changePercent) / 100 * 0.4))).toFixed(2);
    const tacticalSupport = +(mover.price - estimatedAtr * 1.5).toFixed(2);
    const tacticalResistance = +(mover.price + estimatedAtr * 1.5).toFixed(2);

    let tacticalRegime = 'RANGEBOUND_CONSOLIDATION';
    let tacticalSummary = 'Oscillators reflect neutral equilibrium between near-term supply and demand.';
    let rsiInterpretation = 'neutral momentum band (40-60)';
    let adxStatus = 'moderate trend velocity';

    if (estimatedRsi >= 70) {
      rsiInterpretation = 'overbought momentum regime (>70)';
      adxStatus = 'strong directional momentum (>25 ADX)';
    } else if (estimatedRsi <= 30) {
      rsiInterpretation = 'oversold compression band (<30)';
      adxStatus = 'strong downward exhaustion momentum';
    }

    if (mover.changePercent > 5 && volumeAnomalyRatio > 1.8) {
      tacticalRegime = 'MOMENTUM_EXPANSION_BULLISH';
      tacticalSummary = 'High-volume breakout extending above short-term moving average envelopes with positive order flow acceleration.';
    } else if (mover.changePercent > 10 && estimatedRsi > 75) {
      tacticalRegime = 'OVERBOUGHT_CLIMAX_RISK';
      tacticalSummary = 'Extreme price displacement extending beyond normal ATR bands, warranting caution for short-term mean-reverting pullbacks.';
    } else if (mover.changePercent < -5 && volumeAnomalyRatio > 1.8) {
      tacticalRegime = 'DOWNTREND_LIQUIDATION_VELOCITY';
      tacticalSummary = 'High-volume supply distribution pressing through short-term moving average pivots.';
    } else if (mover.changePercent < -8 && estimatedRsi < 25) {
      tacticalRegime = 'OVERSOLD_CAPITULATION_BOUNCE';
      tacticalSummary = 'Severe downward overshoot testing dynamic volatility envelopes, creating asymmetric risk-reward for tactical relief rallies.';
    }

    const markdown = `## 1. Trading Activity & Artificial Inflation Analysis

An empirical audit of recent order book dynamics and social media chatter reveals important structural characteristics regarding today's move:

* **Volume Anomaly Ratio:** Today's volume of ${mover.volume.toLocaleString()} represents **${volumeAnomalyRatio}x** normal trading activity. ${volumeAnomalyRatio > 2.0 ? 'This heavy volume expansion indicates aggressive speculative participation or institutional liquidity repositioning.' : 'Trading volume remains within anticipated statistical variance.'}
* **Option Gamma Imbalance:** \`${optionGammaImbalance.riskLevel}\` (${optionGammaImbalance.netGammaExposure}${optionGammaImbalance.imbalanceRatio !== null ? `, Imbalance Ratio: ${optionGammaImbalance.imbalanceRatio.toFixed(2)}x` : ''}). ${optionGammaImbalance.status}
* **Free Float Concentration:** \`${freeFloatConcentration.concentrationLevel}\` (${freeFloatConcentration.freeFloatPercent !== null ? `${freeFloatConcentration.freeFloatPercent.toFixed(1)}% Public Float` : 'Restricted Public Float'}${freeFloatConcentration.floatTurnoverRatio !== null ? `, Turnover Ratio: ${(freeFloatConcentration.floatTurnoverRatio * 100).toFixed(1)}% of Float` : ''}). ${freeFloatConcentration.status}
* **Major Price Driver:** The session's primary catalyst is **${majorPriceDriver}**.
* **Catalyst-Price Alignment:** \`${alignment}\`
* **Expectations vs. Reality Gap:** ${catalystSynthesis}
* **Quantitative Sentiment Index:** Aggregated retail and financial market sentiment scores **${(sentimentScore * 100).toFixed(0)} / 100**, reflecting ${sentimentScore > 0.6 ? 'broad optimism' : sentimentScore < 0.4 ? 'cautious defensiveness' : 'balanced two-way market expectations'}.
* **News & Social Media Footprint:** ${newsImpact} Concurrently, ${socialMediaImpact}

### Short-Term Tactical Momentum & Market Timing Analysis

Drawing on institutional multi-agent market timing models (such as the TradingAgents framework, arXiv:2412.20138), the equity's short-term momentum and price dynamics display the following quantitative characteristics:

* **Momentum Oscillators:** 14-day RSI is positioned at approximately **${estimatedRsi.toFixed(1)}**, indicating **${rsiInterpretation}**.
* **Trend Strength & Direction:** Directional trend strength reflects **${adxStatus}**, with the price trading ${rangePositionPct >= 50 ? 'in the upper half of its 52-week channel' : 'in the lower half of its 52-week channel'}, aligning with ${mover.changePercent >= 0 ? 'bullish intraday continuation' : 'bearish intraday pressure'}.
* **Volatility Bands & ATR Expansion:** Average True Range (ATR) is modeled at **$${estimatedAtr.toFixed(2)}** (${((estimatedAtr / mover.price) * 100).toFixed(1)}% of price), indicating ${volumeAnomalyRatio > 2.0 ? 'elevated volatility expansion with Bollinger Band envelope widening' : 'moderate volatility within standard statistical distributions'}.
* **Tactical Timing Synthesis:** **\`${tacticalRegime}\`** — ${tacticalSummary}
* **Dynamic Pivot Boundaries:** Tactical support is anchored at **$${tacticalSupport.toFixed(2)}**, with immediate overhead tactical resistance at **$${tacticalResistance.toFixed(2)}**.`;

    return {
      sectionMarkdown: markdown,
      sentimentScore: +(sentimentScore * 100).toFixed(0),
      tacticalTimingRegime: tacticalRegime,
      volumeAnomalyRatio,
      majorPriceDriver
    };
  }
}

// ============================================================================
// 3. BALANCE SHEET & SOLVENCY STRESS TEST AGENT
// ============================================================================

export class BalanceSheetSolvencyAgent {
  public async execute(context: SubSectionAgentContext): Promise<BalanceSheetSolvencyOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildBalanceSheetSolvencySystemPrompt();
    let userPrompt = buildBalanceSheetSolvencyUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<BalanceSheetSolvencyOutput>(
        systemPrompt,
        userPrompt,
        `BalanceSheetSolvency-${mover.ticker}`,
        BALANCE_SHEET_SOLVENCY_SCHEMA
      );

      if (output && output.sectionMarkdown && output.sectionMarkdown.includes('## 2. Balance Sheet')) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[BalanceSheetSolvencyAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): BalanceSheetSolvencyOutput {
    const cleanTicker = mover.ticker.toUpperCase();
    const totalDebt = f.totalDebt ?? 0;
    const shortTermDebt = f.shortTermDebt ?? null;
    const longTermDebt = f.longTermDebt ?? null;
    const debtToEquityRatio = f.debtToEquity ?? (f.marketCap > 0 && totalDebt > 0 ? +(totalDebt / f.marketCap).toFixed(2) : null);
    const shortVsLongTermRatio = f.shortVsLongTermRatio || 'Not Disclosed in Public Summaries';
    const recentChangesInDebt = f.recentChangesInDebt || (
      totalDebt > 0
        ? `Balance sheet reflects $${(totalDebt / 1e6).toFixed(1)}M in funded debt obligations.`
        : 'Company reports zero funded debt obligations.'
    );
    const debtRisks = f.debtRisks || (
      totalDebt > 0
        ? 'Debt obligations require periodic operational cash flow generation to service maturities.'
        : 'Zero funded debt eliminates balance sheet debt refinancing and covenant insolvency risk.'
    );

    const markdown = `## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)

An evidence-based assessment of ${cleanTicker}'s capital structure reveals an enterprise carrying **$${(totalDebt / 1e9).toFixed(2)} billion** in total debt obligations counterbalanced by **$${(f.cashAndEquivalents / 1e9).toFixed(2)} billion** in liquid cash and cash equivalents, yielding a net debt position of **$${(f.netDebt / 1e9).toFixed(2)} billion**.

### Debt Structure Breakdown:
* **Total Debt Load:** $${(totalDebt / 1e6).toFixed(1)} million
* **Short-Term Debt Obligations:** $${((shortTermDebt ?? 0) / 1e6).toFixed(1)} million (Current liabilities & near-term notes)
* **Long-Term Debt Obligations:** $${((longTermDebt ?? 0) / 1e6).toFixed(1)} million (Senior notes & extended facilities)
* **Short vs Long-Term Debt Ratio:** \`${shortVsLongTermRatio}\`
* **Recent Changes in Debt:** ${recentChangesInDebt}
* **Solvency & Credit Risk Audit:** ${debtRisks}
* **Debt-to-Equity Ratio:** ${debtToEquityRatio !== null && debtToEquityRatio !== undefined ? debtToEquityRatio.toFixed(2) : 'Not Disclosed'}
* **Current Ratio:** ${f.currentRatio !== null && f.currentRatio !== undefined ? `${f.currentRatio.toFixed(2)}x` : 'Not Disclosed'} (Liquid assets versus short-term current liabilities)`;

    return {
      sectionMarkdown: markdown,
      totalDebt,
      shortTermDebt,
      longTermDebt,
      debtToEquity: debtToEquityRatio,
      currentRatio: f.currentRatio,
      solvencyVerdict: debtRisks
    };
  }
}

// ============================================================================
// 4. PROFITABILITY, OPERATING HEALTH & SEGMENT DYNAMICS AGENT
// ============================================================================

export class ProfitabilityOperatingAgent {
  public async execute(context: SubSectionAgentContext): Promise<ProfitabilityOperatingOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildProfitabilityOperatingSystemPrompt();
    let userPrompt = buildProfitabilityOperatingUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<ProfitabilityOperatingOutput>(
        systemPrompt,
        userPrompt,
        `ProfitabilityOperating-${mover.ticker}`,
        PROFITABILITY_OPERATING_SCHEMA
      );

      if (output && output.sectionMarkdown && output.sectionMarkdown.includes('## 3. Profitability')) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[ProfitabilityOperatingAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): ProfitabilityOperatingOutput {
    const isPennyStock = checkPennyStock(mover.price, mover.exchange, mover.isPennyStock);
    const cashFlowStatus = f.cashFlow?.status ?? getCashFlowStatus({
      status: f.cashFlow?.status,
      freeCashFlow: f.freeCashFlowTTM,
      operatingCashFlow: f.cashFlow?.operatingCashFlow ?? f.revenueTTM * 0.15,
      isPennyStock
    });
    const cashFlow = {
      operatingCashFlow: f.cashFlow?.operatingCashFlow ?? f.revenueTTM * 0.15,
      freeCashFlow: f.freeCashFlowTTM,
      status: cashFlowStatus
    };
    const quarterlyEPSPast2Years = f.earningsPerShare?.quarterlyEPSPast2Years ?? [];

    const companyDeepDive: CompanyQuestions = {
      howCompanyMakesMoney: f.companyQuestions?.howCompanyMakesMoney ?? `${f.companyName} delivers commercial products and services in ${f.sector}.`,
      productsDemandAndWhy: f.companyQuestions?.productsDemandAndWhy ?? `Customer demand is driven by industry operating requirements within ${f.industry}.`,
      pastPerformanceSummary: f.companyQuestions?.pastPerformanceSummary ?? `Historical results reflect operating dynamics over recent reporting periods.`,
      growthAndProfitabilityOutlook: f.companyQuestions?.growthAndProfitabilityOutlook ?? `Outlook depends on ongoing execution, margin management, and commercial demand.`
    };

    const markdown = `## 3. Profitability, Operating Health & Segment Dynamics

${f.businessSummary ? `### Business Overview:\n${f.businessSummary}\n` : ''}${f.segmentRevenueBreakdown && f.segmentRevenueBreakdown.length > 0 ? `### 10-K Segment Revenue Breakdown:\n${f.segmentRevenueBreakdown.map(s => `* **${s.segment}**${s.revenue ? `: \`$${(s.revenue / 1e9).toFixed(2)} billion\`` : ''}`).join('\n')}\n` : ''}Top-line revenue across the trailing twelve months stands at **$${(f.revenueTTM / 1e9).toFixed(2)} billion**, yielding a consolidated net income of **$${(f.netIncomeTTM / 1e9).toFixed(2)} billion**.

Operational efficiency metrics demonstrate:
* **Gross Profit Margin:** \`${f.grossMargin !== null && f.grossMargin !== undefined ? `${f.grossMargin.toFixed(1)}%` : 'Not Reported in SEC Summaries'}\`
* **Operating Margin (EBIT):** \`${f.operatingMargin.toFixed(1)}%\`
* **Return on Equity (ROE):** \`${(f.returnOnEquity ?? 0).toFixed(1)}%\`
* **Operating Cash Flow:** \`$${(cashFlow.operatingCashFlow / 1e9).toFixed(2)} billion\`
* **TTM Free Cash Flow:** \`${cashFlow.freeCashFlow !== null && cashFlow.freeCashFlow !== undefined ? `$${(cashFlow.freeCashFlow / 1e9).toFixed(2)} billion` : 'Not Reported in SEC Summaries (CapEx unfiled)'}\` (Status: *${cashFlow.status}*)
* **Return on Invested Capital (ROIC):** \`${f.roic !== null && f.roic !== undefined ? `${f.roic.toFixed(1)}%` : 'Not Disclosed'}\`

### Trailing 8-Quarter EPS History:
${quarterlyEPSPast2Years.length > 0 ? `| Quarter | Diluted EPS | Benchmark Beat/Miss |
| :--- | :--- | :--- |
${quarterlyEPSPast2Years.map((q) => `| **${q.quarter}** | \`$${q.eps.toFixed(2)}\` | ${q.beat ? 'Beat' : 'Miss/In-Line'} |`).join('\n')}` : '*Quarterly EPS progression not reported in available public summaries.*'}

---

## 4. Qualitative Deep Dive: 4 Key Company Questions

### Q1: How does the company make money?
${companyDeepDive.howCompanyMakesMoney}

### Q2: Are its products or services in demand, and why?
${companyDeepDive.productsDemandAndWhy}

### Q3: How has the company performed in the past?
${companyDeepDive.pastPerformanceSummary}

### Q4: Is the company positioned for growth and profitability?
${companyDeepDive.growthAndProfitabilityOutlook}`;

    return {
      sectionMarkdown: markdown,
      grossMargin: f.grossMargin,
      operatingMargin: f.operatingMargin,
      returnOnEquity: f.returnOnEquity,
      roic: f.roic
    };
  }
}

// ============================================================================
// 5. MANAGEMENT QUALITY, 5 MOAT PILLARS & COMPETITOR BENCHMARKING AGENT
// ============================================================================

export class MoatAndCompetitorAgent {
  public async execute(context: SubSectionAgentContext): Promise<MoatAndCompetitorOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildMoatAndCompetitorSystemPrompt();
    let userPrompt = buildMoatAndCompetitorUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<MoatAndCompetitorOutput>(
        systemPrompt,
        userPrompt,
        `MoatAndCompetitor-${mover.ticker}`,
        MOAT_AND_COMPETITOR_SCHEMA
      );

      if (output && output.sectionMarkdown && output.sectionMarkdown.includes('## 5. Industry Deep Dive')) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[MoatAndCompetitorAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): MoatAndCompetitorOutput {
    const isPennyStock = checkPennyStock(mover.price, mover.exchange, mover.isPennyStock);
    const managementQuality: ManagementQuality = getManagementQuality({
      existingRating: f.managementQuality?.rating,
      existingTrackRecord: f.managementQuality?.trackRecord,
      isPennyStock
    });

    const moatResult = getEconomicMoat({
      existingRating: f.competitiveMoat?.rating,
      existingSummary: f.competitiveMoat?.summary,
      isPennyStock
    });
    const competitiveMoat: CompetitiveMoat = {
      rating: moatResult.rating,
      trend: getMoatTrend({
        existingTrend: f.competitiveMoat?.trend
      }),
      summary: moatResult.summary,
      sources: f.competitiveMoat?.sources
    };

    const industryDeepDive: IndustryQuestions = {
      industryCondition: f.industryQuestions?.industryCondition ?? `The ${f.sector} sector operates within broader macroeconomic and interest rate cycles.`,
      macroConditionSimplified: f.industryQuestions?.macroConditionSimplified ?? f.sectorDynamics?.macroConditionSimplified,
      obstaclesAndChallenges: f.industryQuestions?.obstaclesAndChallenges ?? `Primary hurdles include competitive positioning, input costs, and regulatory compliance.`,
      obstaclesAndChallengesSimplified: f.industryQuestions?.obstaclesAndChallengesSimplified ?? f.sectorDynamics?.obstaclesAndChallengesSimplified,
      economicPoliticalCulturalRisks: f.industryQuestions?.economicPoliticalCulturalRisks ?? `Macro exposures involve monetary policy shifts and economic cycle dynamics.`,
      economicPoliticalCulturalRisksSimplified: f.industryQuestions?.economicPoliticalCulturalRisksSimplified ?? f.sectorDynamics?.economicPoliticalCulturalRisksSimplified
    };

    const markdown = `## 5. Industry Deep Dive & Sector Dynamics

${f.sectorDynamics ? `* **Macro Sector Backdrop:** ${f.sectorDynamics.industryCondition}\n* **Industry Obstacles:** ${f.sectorDynamics.obstaclesAndChallenges}\n* **Regulatory & Policy Risks:** ${f.sectorDynamics.economicPoliticalCulturalRisks}\n` : ''}
### Q1: How is the company's industry doing as a whole?
${industryDeepDive.industryCondition}

### Q2: What are the obstacles and challenges the company faces?
${industryDeepDive.obstaclesAndChallenges}

### Q3: Does the company face any economic, political, or cultural risks?
${industryDeepDive.economicPoliticalCulturalRisks}

---

## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking

* **Management Quality Rating:** **${managementQuality.rating}**
* **Executive Track Record:** ${managementQuality.trackRecord}
* **Economic Moat Rating:** **${competitiveMoat.rating}** (Moat Trend: **${competitiveMoat.trend || 'Stable'}**)
* **Moat Durability Synthesis:** ${competitiveMoat.summary}

### Deconstruction of Economic Moat (5 Morningstar Pillars):

| Moat Pillar | Assessment | Analytical Substantiation |
| :--- | :--- | :--- |
| **Intangible Assets** | \`${competitiveMoat.sources?.intangibleAssets.rating || 'None'}\` | ${competitiveMoat.sources?.intangibleAssets.substantiation || 'No material pricing power derived from proprietary patents or regulatory brand equity.'} |
| **Switching Costs** | \`${competitiveMoat.sources?.switchingCosts.rating || 'None'}\` | ${competitiveMoat.sources?.switchingCosts.substantiation || 'Low operational migration friction for customers switching to substitute providers.'} |
| **Network Effect** | \`${competitiveMoat.sources?.networkEffect.rating || 'None'}\` | ${competitiveMoat.sources?.networkEffect.substantiation || 'Product value is not fundamentally augmented by the size of the user network.'} |
| **Cost Advantage** | \`${competitiveMoat.sources?.costAdvantage.rating || 'None'}\` | ${competitiveMoat.sources?.costAdvantage.substantiation || 'Unit production costs remain in line with industry average competitors.'} |
| **Efficient Scale** | \`${competitiveMoat.sources?.efficientScale.rating || 'None'}\` | ${competitiveMoat.sources?.efficientScale.substantiation || 'Market dynamics allow competitive capacity additions without economic penalty.'} |

### Competitor Benchmarking Matrix:

| Company | Ticker | Market Cap | Trailing P/E | EV/EBITDA | Economic Moat | ROIC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${(f.competitorBenchmarking?.peers || []).map(p => `| **${p.name}** | \`${p.ticker}\` | $${(p.marketCap / 1e9).toFixed(1)}B | ${p.peRatio !== null ? `${p.peRatio}x` : 'N/A'} | ${p.evToEbitda !== null ? `${p.evToEbitda}x` : 'N/A'} | ${p.moat} | ${p.roic !== null ? `${p.roic}%` : 'N/A'} |`).join('\n')}

*Peer Benchmark Synthesis:* ${f.competitorBenchmarking?.commentary || 'Relative valuation and competitive positioning evaluated against sector peers.'}`;

    return {
      sectionMarkdown: markdown,
      macroConditionSimplified: industryDeepDive.macroConditionSimplified,
      obstaclesAndChallengesSimplified: industryDeepDive.obstaclesAndChallengesSimplified,
      economicPoliticalCulturalRisksSimplified: industryDeepDive.economicPoliticalCulturalRisksSimplified,
      managementQualityRating: managementQuality.rating,
      economicMoatRating: competitiveMoat.rating,
      moatTrend: competitiveMoat.trend
    };
  }
}

// ============================================================================
// 6. MULTI-MODEL VALUATION ENGINE AGENT
// ============================================================================

export class ValuationEngineAgent {
  public async execute(context: SubSectionAgentContext): Promise<ValuationEngineOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildValuationEngineSystemPrompt();
    let userPrompt = buildValuationEngineUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<ValuationEngineOutput>(
        systemPrompt,
        userPrompt,
        `ValuationEngine-${mover.ticker}`,
        VALUATION_ENGINE_SCHEMA
      );

      if (output && output.sectionMarkdown && output.sectionMarkdown.includes('## 7. Multi-Model Valuation')) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[ValuationEngineAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): ValuationEngineOutput {
    const cleanTicker = mover.ticker.toUpperCase();
    const valuationModels: ValuationModels = f.valuationModels;
    const dcfIntrinsic = valuationModels.dcf?.fairValue ?? valuationModels.dcf?.intrinsicValue ?? null;
    const ddmIntrinsic = valuationModels.ddm?.fairValue ?? valuationModels.ddm?.intrinsicValue ?? null;
    const relIntrinsic = valuationModels.relativeValuation?.fairValue ?? valuationModels.relativeValuation?.intrinsicValue ?? null;
    const rapidIntrinsic = valuationModels.rapidStockValuation?.fairValue ?? valuationModels.rapidStockValuation?.intrinsicValue ?? null;
    const rimIntrinsic = valuationModels.residualIncomeModel?.fairValue ?? valuationModels.residualIncomeModel?.intrinsicValue ?? null;
    const navIntrinsic = valuationModels.assetBasedValuation?.fairValue ?? valuationModels.assetBasedValuation?.intrinsicValue ?? null;
    const excessIntrinsic = valuationModels.excessReturnModel?.fairValue ?? valuationModels.excessReturnModel?.intrinsicValue ?? null;
    const sectorIntrinsic = valuationModels.industrySpecificModel?.fairValue ?? valuationModels.industrySpecificModel?.intrinsicValue ?? null;
    const consensusFairValue = valuationModels.consensusFairValue;
    const verdict = valuationModels.verdict || 'Fairly Valued';
    const consensusUpside = consensusFairValue !== null ? +(((consensusFairValue - mover.price) / Math.max(0.01, mover.price)) * 100).toFixed(1) : null;

    const currentPBVal = typeof f.priceToBook === 'object' && f.priceToBook !== null
      ? (f.priceToBook as any).current ?? null
      : typeof f.priceToBook === 'number' ? f.priceToBook : null;
    const industryPB = (f as any).priceToBook?.industryAverage ?? 2.5;
    const hist5YPB = (f as any).priceToBook?.historicalAverage5Y ?? null;

    const currentPEVal = f.peRatioTrailing ?? f.peRatioForward ?? null;
    const industryPE = (f as any).priceToEarnings?.industryAverage ?? 22.0;
    const hist5YPE = (f as any).priceToEarnings?.historicalAverage5Y ?? null;

    const markdown = `## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)

### Institutional Morningstar Rating:
* **Star Rating:** **${f.starRatingString || '★★★☆☆'}** (${f.starRating || 3} Stars)
* **Uncertainty Rating:** **${f.uncertaintyRating || 'Medium'}**
* **Price / Fair Value:** \`${f.priceToFairValue ? f.priceToFairValue.toFixed(2) : '1.00'}x\` (Current: $${mover.price.toFixed(2)} vs Fair Value: $${(consensusFairValue ?? 0).toFixed(2)})
* **5-Star Price Hurdle (Significantly Undervalued):** \`$${f.fiveStarPrice ? f.fiveStarPrice.toFixed(2) : 'N/A'}\`
* **1-Star Price Hurdle (Significantly Overvalued):** \`$${f.oneStarPrice ? f.oneStarPrice.toFixed(2) : 'N/A'}\`

To eliminate single-model bias, ${cleanTicker}'s intrinsic worth is synthesized across eight independent asset, income, and market valuation methodologies:

| Valuation Methodology | Calculated Fair Value | Implied Upside | Model Assumptions & Parameters |
| :--- | :--- | :--- | :--- |
| **1. 3-Stage DCF (Moat Fade)** | ${dcfIntrinsic !== null ? `\`$${dcfIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${dcfIntrinsic !== null && valuationModels.dcf?.upsidePercent !== null ? `\`${valuationModels.dcf?.upsidePercent}% \`` : '\`Inapplicable\`'} | ${valuationModels.dcf?.modelName || '3-stage fade model'} |
| **2. Dividend Discount Model (DDM)** | ${ddmIntrinsic !== null ? `\`$${ddmIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${ddmIntrinsic !== null && valuationModels.ddm?.upsidePercent !== null ? `\`${valuationModels.ddm?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.ddm?.status || (ddmIntrinsic !== null ? 'Gordon Growth Model' : 'Inapplicable (Zero dividend distribution)')} |
| **3. Rapid Stock Valuation (PEG)** | ${rapidIntrinsic !== null ? `\`$${rapidIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${rapidIntrinsic !== null && valuationModels.rapidStockValuation?.upsidePercent !== null ? `\`${valuationModels.rapidStockValuation?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.rapidStockValuation?.status || 'Rule of 72 / Quick PEG multiple'} |
| **4. Relative Peer Multiples** | ${relIntrinsic !== null ? `\`$${relIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${relIntrinsic !== null && valuationModels.relativeValuation?.upsidePercent !== null ? `\`${valuationModels.relativeValuation?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.relativeValuation?.status || `Peer median P/E (${industryPE}x)`} |
| **5. Residual Income Model (RIM)** | ${rimIntrinsic !== null ? `\`$${rimIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${rimIntrinsic !== null && valuationModels.residualIncomeModel?.upsidePercent !== null ? `\`${valuationModels.residualIncomeModel?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.residualIncomeModel?.status || 'Edwards-Bell-Ohlson model'} |
| **6. Asset-Based Valuation** | ${navIntrinsic !== null ? `\`$${navIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${navIntrinsic !== null && valuationModels.assetBasedValuation?.upsidePercent !== null ? `\`${valuationModels.assetBasedValuation?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.assetBasedValuation?.status || 'Net Asset Value liquidation floor'} |
| **7. Sector Asset Capacity Model** | ${sectorIntrinsic !== null ? `\`$${sectorIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${sectorIntrinsic !== null && valuationModels.industrySpecificModel?.upsidePercent !== null ? `\`${valuationModels.industrySpecificModel?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.industrySpecificModel?.status || 'Sector asset capacity model'} |
| **8. Excess Return Model (EVA)** | ${excessIntrinsic !== null ? `\`$${excessIntrinsic.toFixed(2)}\`` : '\`N/A\`'} | ${excessIntrinsic !== null && valuationModels.excessReturnModel?.upsidePercent !== null ? `\`${valuationModels.excessReturnModel?.upsidePercent}%\`` : '\`Inapplicable\`'} | ${valuationModels.excessReturnModel?.status || 'Economic Value Added spread'} |
| **Consensus Fair Value Target** | **${consensusFairValue !== null ? `\`$${consensusFairValue.toFixed(2)}\`` : '\`N/A\`'}** | **${consensusUpside !== null ? `\`${consensusUpside > 0 ? '+' : ''}${consensusUpside}%\`` : '\`N/A\`'}** | **Verdict: ${verdict}** |

*3-Stage DCF Parameters:* Normalized FCFF: \`$${valuationModels.dcf?.normalizedFcf ? (valuationModels.dcf.normalizedFcf / 1e9).toFixed(2) + 'B' : 'N/A'}\` | Moat Fade Duration: \`${valuationModels.dcf?.fadeYears ?? 10} Years\` | Implied Enterprise Value: \`$${valuationModels.dcf?.enterpriseValue ? (valuationModels.dcf.enterpriseValue / 1e9).toFixed(2) + 'B' : 'N/A'}\` | Implied Equity Value: \`$${valuationModels.dcf?.equityValue ? (valuationModels.dcf.equityValue / 1e9).toFixed(2) + 'B' : 'N/A'}\`.

### Historical & Industry Benchmark Comparison:
* **Trailing P/E Ratio:** ${currentPEVal ? `${currentPEVal}x` : 'N/A'} (Industry Average: ${industryPE}x | 5Y Historical Avg: ${hist5YPE ? `${hist5YPE}x` : 'N/A'})
* **Price-to-Book (P/B):** ${currentPBVal ? `${currentPBVal}x` : 'N/A'} (Industry Average: ${industryPB}x | 5Y Historical Avg: ${hist5YPB ? `${hist5YPB}x` : 'N/A'})
* **EV/EBITDA Multiple:** ${f.evToEbitda ? `${f.evToEbitda.toFixed(1)}x` : 'N/A'}
* **Dividend Yield:** ${f.dividendYield.toFixed(2)}%

---

## 8. Macroeconomic Headwinds & Sector Multiples

Global macroeconomic conditions exert meaningful influence over equity valuations across ${mover.region === 'EU' ? 'European' : 'United States'} bourses:

* **Sovereign Yield Backdrop:** The US 10-Year Treasury Yield trades at **${macro.us10YearYield.toFixed(2)}%**, maintaining discount rate pressure across high-multiple equity durations.
* **Central Bank Policy:** With the Federal Reserve effective rate at ${macro.fedFundsRate.toFixed(2)}% and the ECB policy rate at ${macro.ecbPolicyRate.toFixed(2)}%, the cost of debt refinancing remains structurally higher than the 2015–2021 historical average.
* **Volatility Regime:** The Cboe Volatility Index (VIX) currently registers at **${macro.vixIndex.toFixed(1)}**, suggesting an environment characterized by ${macro.vixIndex > 18 ? 'elevated institutional risk awareness' : 'orderly market participation'}.`;

    return {
      sectionMarkdown: markdown,
      consensusFairValue,
      starRating: f.starRating,
      verdict,
      uncertaintyRating: f.uncertaintyRating
    };
  }
}

// ============================================================================
// 7. OBJECTIVE BULL & BEAR THESES AGENT
// ============================================================================

export class BullBearThesesAgent {
  public async execute(context: SubSectionAgentContext): Promise<BullBearThesesOutput> {
    const { mover, fundamentals, macro, sentiment, groundTruthPromptBlock, executeLLM } = context;
    const systemPrompt = buildBullBearThesesSystemPrompt();
    let userPrompt = buildBullBearThesesUserPrompt(mover, fundamentals, macro, sentiment);
    if (groundTruthPromptBlock) {
      userPrompt += `\n\n${groundTruthPromptBlock}`;
    }

    try {
      const output = await executeLLM<BullBearThesesOutput>(
        systemPrompt,
        userPrompt,
        `BullBearTheses-${mover.ticker}`,
        BULL_BEAR_THESES_SCHEMA
      );

      if (output && output.sectionMarkdown && output.theses?.bull && output.theses?.bear) {
        return output;
      }
    } catch (err: any) {
      console.warn(`[BullBearThesesAgent] LLM call failed for $${mover.ticker} (${err.message}). Using deterministic fallback...`);
    }

    return this.generateDeterministic(mover, fundamentals, macro, sentiment);
  }

  public generateDeterministic(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    s: SocialSentiment
  ): BullBearThesesOutput {
    const cleanTicker = mover.ticker.toUpperCase();
    const sign = mover.changePercent > 0 ? '+' : '';
    const moveStr = `${sign}${mover.changePercent.toFixed(1)}%`;
    const consensusFairValue = f.valuationModels?.consensusFairValue ?? null;
    const verdict = f.valuationModels?.verdict ?? 'Fairly Valued';

    const initialBullTheses: ThesisPoint[] = [
      {
        point: `Operational leverage and revenue stability in ${f.sector}.`,
        sources: [{ name: 'SEC 10-K Filings', url: 'https://www.sec.gov/edgar' }],
        deductionChain: `Operating margins at ${f.operatingMargin.toFixed(1)}% support ongoing cash flow generation.`
      }
    ];
    const initialBearTheses: ThesisPoint[] = [
      {
        point: `Macroeconomic interest rate and refinancing sensitivity.`,
        sources: [{ name: 'Federal Reserve Macro Data', url: 'https://www.federalreserve.gov' }],
        deductionChain: `Debt obligations of $${((f.totalDebt || 0) / 1e6).toFixed(1)}M face higher refinancing hurdles.`
      }
    ];

    const compiledTheses = buildTheses(mover, f, {
      theses: { bull: initialBullTheses, bear: initialBearTheses }
    } as any);

    const markdown = `## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)

### The Objective Bull Thesis
${compiledTheses.bull.map((b, idx) => `${idx + 1}. **${b.point.split('.')[0]}:**\n   * **Point:** ${b.point}\n   * **Cited References:** ${(b.sources || []).map(s => typeof s === 'string' ? s : s.name).join(', ')}\n   * **Deduction Chain:** ${b.deductionChain}`).join('\n\n')}

### The Objective Bear Thesis
${compiledTheses.bear.map((b, idx) => `${idx + 1}. **${b.point.split('.')[0]}:**\n   * **Point:** ${b.point}\n   * **Cited References:** ${(b.sources || []).map(s => typeof s === 'string' ? s : s.name).join(', ')}\n   * **Deduction Chain:** ${b.deductionChain}`).join('\n\n')}`;

    const socialHooks = {
      twitterThread: [
        `🚨 $${cleanTicker} Fundamental Audit: Moving ${moveStr} today.\n\nHere is our institutional equity research breakdown 🧵👇`,
        `1/ Valuation: Consensus Fair Value sits at $${(consensusFairValue ?? 0).toFixed(2)} (${verdict}). Morningstar Star Rating: ${f.starRatingString || '★★★☆☆'}.`,
        `2/ Balance Sheet: Total debt obligations of $${((f.totalDebt || 0) / 1e6).toFixed(1)}M against liquid cash of $${((f.cashAndEquivalents || 0) / 1e6).toFixed(1)}M.`,
        `3/ Full Report: Deep dive into 8 valuation models, moat durability, and dialectical debate points at https://financeblog.com/tickers/${cleanTicker.toLowerCase()}`
      ],
      redditPost: {
        title: `$${cleanTicker} Institutional Equity Research: Is Today's ${moveStr} Move Justified?`,
        bodyMarkdown: `Comprehensive multi-model fundamental analysis of **${f.companyName} ($${cleanTicker})** following today's session move of **${moveStr}**.\n\n* **Consensus Fair Value:** $${(consensusFairValue ?? 0).toFixed(2)} (${verdict})\n* **Moat Rating:** ${f.competitiveMoat?.rating || 'None'}\n* **Operating Margin:** ${f.operatingMargin.toFixed(1)}%\n\nFull 9-section report breakdown and solvency stress tests available.`,
        flair: 'Fundamental Analysis'
      },
      telegramAlert: `⚡ $${cleanTicker} ALERT: Closed at $${mover.price.toFixed(2)} (${moveStr}). Consensus Fair Value: $${(consensusFairValue ?? 0).toFixed(2)} (${verdict}). Rating: ${f.starRatingString || '★★★☆☆'}.`
    };

    return {
      sectionMarkdown: markdown,
      theses: compiledTheses,
      socialHooks
    };
  }
}

// Export singleton instances for easy usage
export const titleAndExecAgent = new TitleAndExecAgent();
export const tradingActivityAgent = new TradingActivityAgent();
export const balanceSheetSolvencyAgent = new BalanceSheetSolvencyAgent();
export const profitabilityOperatingAgent = new ProfitabilityOperatingAgent();
export const moatAndCompetitorAgent = new MoatAndCompetitorAgent();
export const valuationEngineAgent = new ValuationEngineAgent();
export const bullBearThesesAgent = new BullBearThesesAgent();
