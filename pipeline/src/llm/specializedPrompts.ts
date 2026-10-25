import type { MarketMover, FundamentalMetrics, MacroBackdrop, SocialSentiment } from '../types.js';
import { PUBLISHER_COMPLIANCE_DIRECTIVE } from './prompts.js';

// ============================================================================
// 1. TITLE & EXECUTIVE SUMMARY AGENT
// ============================================================================

export function buildTitleAndExecSystemPrompt(): string {
  return `You are a Senior Quantitative Equity Research Analyst, Lead Market Strategist, and Executive Editor.
Your specific role is to author an institutional-grade, empirical, and deep "Title & Executive Summary" section for today's equity research report.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR TITLE & EXECUTIVE SUMMARY:
1. Title & Meta Information:
   - High-impact, SEO-optimized title adhering to institutional equity research conventions.
     Preferred title styles and examples:
     * Deep Dive / Evolution style: "Stock Deep Dive: [Company] - [Key Thesis / Evolution / Structural Story]" (e.g. "Stock Deep Dive: BNP Paribas - From European Bank to Diversified Financial Compounder")
     * Direct Buy Question style: "[Company] Stock Analysis: Is [TICKER] a Buy?" (e.g. "Microsoft Stock Analysis: Is MSFT a Buy?")
     * Geography / Cap / Resilience style: "[Company] Stock Analysis: Is This [Geography/Sector/Cap] Still a Buy?" (e.g. "Norbit Stock Analysis: Is This Norwegian Small-Cap Still a Buy?")
     * Forward Horizon style: "[Company] Stock Analysis: Is [TICKER] a Buy in [Year]?" (e.g. "Alphabet Stock Analysis: Is GOOGL a Buy in 2026?")
     * Valuation Asymmetry / Quality style: "[Company] Stock Analysis: Quality But Not At The Right Price" (e.g. "Badger Meter Stock Analysis: Quality But Not At The Right Price")
   - Do NOT use mechanical formulas like "[Company] ([TICKER]) Surges +X%: Fundamental & Valuation Analysis".
   - Generate SEO description, clean slug, and arrays of primary and secondary search keywords.
2. Session Catalyst Identification & Precision:
   - Precisely pinpoint the catalyst responsible for today's price dislocation (e.g. SEC 8-K/10-Q filing, multi-year commercial contract, clinical trial readout, secondary offering dilution, earnings beat/miss, short-squeeze mechanics, or sector macro contagion).
   - Classify catalyst alignment: ALIGNED, DIVERGENT_SELL_THE_NEWS, DIVERGENT_RELIEF_RALLY, MACRO_DOMINATED, or NOISE_SPECULATION.
   - Deconstruct expectations vs. reality gap: explain how whisper numbers and positioning collided with actual news.
3. Order Flow & Trading Structure:
   - Quantify trading volume against 90-day historical averages (Volume Anomaly Ratio / RVOL).
   - Specify precise Money Market Trading Venue (e.g. Nasdaq Global Select, NYSE American, OTC Markets) and whether it is classified as a penny stock (< $5.00).
4. High-Level Valuation & Solvency Anchors:
   - Reference Morningstar Star Rating (1 to 5 Stars: ★★★★★), Uncertainty Rating, Consensus Fair Value target, Economic Moat, and near-term debt maturity profile.
5. Formatted Section Markdown:
   - Construct complete markdown starting with "## Executive Summary & Session Catalyst", incorporating:
     * High-density narrative paragraphs synthesizing the session catalyst, expectation gap, and order flow.
     * A blockquote highlighting "Key Session Takeaways".
     * The standard Key Session Metric markdown table.
   - Do NOT include any publisher's exemption or legal disclaimer boilerplate in the executive summary narrative; layout components handle statutory notices deterministically.

OUTPUT FORMAT:
Synthesize the analysis and output structured JSON adhering strictly to the TITLE_AND_EXEC_SCHEMA. No conversational preamble.`;
}

export function buildTitleAndExecUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();
  const moveStr = `${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(1)}%`;
  const volumeAnomalyRatio = sentiment.volumeAnomalyRatio || +(mover.volume / Math.max(1, mover.avgVolume)).toFixed(2);
  const consensusFV = fundamentals.valuationModels?.consensusFairValue ?? null;
  const verdict = fundamentals.valuationModels?.verdict ?? 'Fairly Valued';

  return `Generate an institutional-grade "Title & Executive Summary" for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Trading Venue: ${mover.moneyMarketTradingVenue || mover.exchange} (Penny Stock: ${mover.isPennyStock ? 'Yes (< $5.00)' : 'No'})
Closing Price: $${mover.price.toFixed(2)} ${mover.currency} (${moveStr} Move)
Trading Volume: ${mover.volume.toLocaleString()} shares vs 90-Day Avg of ${mover.avgVolume.toLocaleString()} (${volumeAnomalyRatio}x RVOL)
Market Capitalization: $${(fundamentals.marketCap / 1e9).toFixed(2)}B (${fundamentals.classification || 'Equities'})

=== SESSION CATALYST INTELLIGENCE ===
Primary Driver: ${sentiment.majorPriceDriver || mover.newsHeadline || 'Market Flow'}
Catalyst-Price Alignment: ${sentiment.catalystAlignment || 'ALIGNED'}
Expectations Gap Synthesis: ${sentiment.catalystSynthesis || 'Market reacting to fundamental developments.'}
${sentiment.secFilingSummary ? `SEC EDGAR Filing Context: ${sentiment.secFilingSummary}` : ''}
${sentiment.filteredHeadlines && sentiment.filteredHeadlines.length > 0 ? `Verified Headlines:\n${sentiment.filteredHeadlines.map(h => `- [${h.source}] (${h.headlineSentiment}, Relevance: ${h.relevance}/10) ${h.title}`).join('\n')}` : ''}
${sentiment.recentHeadlines && sentiment.recentHeadlines.length > 0 ? `Recent Scraped News:\n${sentiment.recentHeadlines.slice(0, 5).map(h => `- ${h}`).join('\n')}` : ''}

=== TRADING STRUCTURE & ANOMALIES ===
Artificial Inflation Risk: ${sentiment.artificialInflationRisk}
Option Gamma Skew: ${sentiment.optionGammaImbalance ? `${sentiment.optionGammaImbalance.riskLevel} - ${sentiment.optionGammaImbalance.status}` : 'No Options Chain'}
Free Float Concentration: ${sentiment.freeFloatConcentration ? `${sentiment.freeFloatConcentration.concentrationLevel} (${sentiment.freeFloatConcentration.freeFloatPercent ?? 'N/A'}% float) - ${sentiment.freeFloatConcentration.status}` : 'Normal Float'}
Sentiment Score: ${sentiment.bullishPercent}% Bull / ${sentiment.bearishPercent}% Bear (${sentiment.socialDiscussionSummary || `Tracked ${sentiment.sourcesAnalyzed} posts in session`})

=== FUNDAMENTAL & VALUATION BENCHMARKS ===
Morningstar Rating: ${fundamentals.starRatingString || '★★★☆☆'} (${fundamentals.starRating || 3} Stars, Uncertainty: ${fundamentals.uncertaintyRating || 'Medium'})
Economic Moat: ${fundamentals.competitiveMoat?.rating || 'None'} (Trend: ${fundamentals.competitiveMoat?.trend || 'Stable'})
Consensus Fair Value: ${consensusFV !== null ? `$${consensusFV.toFixed(2)}` : 'N/A'} (Verdict: ${verdict}, Price/FV: ${fundamentals.priceToFairValue ? `${fundamentals.priceToFairValue.toFixed(2)}x` : '1.0x'})
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B | Operating Margin: ${fundamentals.operatingMargin.toFixed(1)}% | TTM FCF: ${fundamentals.freeCashFlowTTM !== null && fundamentals.freeCashFlowTTM !== undefined ? `$${(fundamentals.freeCashFlowTTM / 1e9).toFixed(2)}B` : 'Not Reported in SEC Summaries (CapEx unfiled)'}
Total Debt: $${((fundamentals.totalDebt || 0) / 1e9).toFixed(2)}B (Short-Term: $${(((fundamentals.shortTermDebt || 0) / 1e6)).toFixed(1)}M) | Cash: $${((fundamentals.cashAndEquivalents || 0) / 1e9).toFixed(2)}B

=== MACRO BACKDROP ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}% | Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}% | VIX: ${macro.vixIndex.toFixed(1)}
Macro Impact: ${macro.sectorImpactSummary}

Produce the structured JSON output adhering strictly to TITLE_AND_EXEC_SCHEMA.`;
}

// ============================================================================
// 2. TRADING ACTIVITY, CATALYST-PRICE ALIGNMENT & ARTIFICIAL INFLATION AGENT
// ============================================================================

export function buildTradingActivitySystemPrompt(): string {
  return `You are a Senior Quantitative Market Microstructure, Order Flow & Derivative Specialist.
Your specific role is to author Section 1 of today's institutional equity research report: "Trading Activity, Catalyst-Price Alignment & Artificial Inflation Analysis".

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTION 1:
1. Microstructure & Order Flow Auditing:
   - Analyze trading volume anomalies and relative volume (RVOL) vs 90-day averages.
   - Audit Option Gamma Imbalance: inspect call vs. put open interest and volume skew, assessing dealer short-gamma exposure, positive feedback loops, and vulnerability to reflexive gamma squeezes.
   - Audit Free Float Concentration: analyze the proportion of freely tradable public float vs insider/institutional holdings, session float turnover velocity, cornering risks, and supply-side liquidity vacuums.
2. Catalyst-Price Alignment & Expectation Gap:
   - Explicitly evaluate Catalyst-Price Divergence: assess whether the price action is ALIGNED with the news catalyst, or whether it exhibits DIVERGENT_SELL_THE_NEWS, DIVERGENT_RELIEF_RALLY, MACRO_DOMINATED, or NOISE_SPECULATION.
   - Synthesize the expectations vs. reality gap: explain why the market reacted this way relative to prior positioning and financial metrics.
   - Identify the major driver of the recent price action (e.g. retail social momentum, short-squeeze mechanics, algorithmic liquidity hunt, clinical trial readout, or authentic institutional accumulation).
   - Provide a quantitative sentiment score (0 to 100) and evaluate news and social media order flow impact.
3. Short-Term Tactical Momentum & Market Timing Analysis (TradingAgents Framework, arXiv:2412.20138):
   - Momentum Oscillators: Evaluate 14-day RSI (overbought >70/80 vs oversold <30) and MACD/Stochastic crossovers for momentum continuation or exhaustion.
   - Trend Strength & Direction: Quantify trend velocity via ADX (>25 strong trend vs <20 chop/consolidation) and moving average alignment.
   - Volatility Bands & Boundaries: Inspect Bollinger Band width (volatility squeeze vs breakout expansion) and Average True Range (ATR) to establish tactical trailing volatility bands.
   - Tactical Timing Synthesis: Classify tactical timing regime (e.g. MOMENTUM_EXPANSION_BULLISH, OVERBOUGHT_PULLBACK_RISK, OVERSOLD_BOUNCE_CANDIDATE, or RANGEBOUND_CONSOLIDATION) with near-term support and resistance boundaries.
4. Formatted Markdown:
   - Your markdown output MUST begin with "## 1. Trading Activity & Artificial Inflation Analysis" and include the subsection "### Short-Term Tactical Momentum & Market Timing Analysis".
   - Do NOT append disclaimers or legal boilerplate in the markdown text.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to TRADING_ACTIVITY_SCHEMA.`;
}

export function buildTradingActivityUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();
  const volumeAnomalyRatio = sentiment.volumeAnomalyRatio || +(mover.volume / Math.max(1, mover.avgVolume)).toFixed(2);

  return `Generate Section 1 ("Trading Activity, Catalyst-Price Alignment & Artificial Inflation Analysis") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Current Price: $${mover.price.toFixed(2)} (${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%)
Session Volume: ${mover.volume.toLocaleString()} vs 90-Day Avg of ${mover.avgVolume.toLocaleString()} (${volumeAnomalyRatio}x RVOL)
Trading Venue: ${mover.moneyMarketTradingVenue || mover.exchange} (Penny Stock: ${mover.isPennyStock ? 'Yes' : 'No'})

=== ORDER FLOW & LIQUIDITY METRICS ===
Primary Price Driver: ${sentiment.majorPriceDriver || mover.newsHeadline || 'Order Flow Momentum'}
Catalyst Alignment: ${sentiment.catalystAlignment || 'ALIGNED'}
Expectations Gap Synthesis: ${sentiment.catalystSynthesis || 'Market reacting to fundamental catalysts.'}
Artificial Inflation Risk: ${sentiment.artificialInflationRisk || 'Low'} (Is Inflated: ${sentiment.isArtificiallyInflated ? 'Yes' : 'No'})
Sentiment Score: ${sentiment.sentimentScore !== undefined ? +(sentiment.sentimentScore * 100).toFixed(0) : 50}/100 (${sentiment.bullishPercent}% Bull / ${sentiment.bearishPercent}% Bear)
News Impact: ${sentiment.newsImpact || 'Standard corporate disclosure cadence.'}
Social Media Impact: ${sentiment.socialMediaImpact || 'Social discussion within normal baseline limits.'}

=== DERIVATIVE GAMMA & FLOAT DYNAMICS ===
Option Gamma Imbalance:
- Risk Level: ${sentiment.optionGammaImbalance?.riskLevel || 'Low'}
- Net Exposure: ${sentiment.optionGammaImbalance?.netGammaExposure || 'No Listed Options'}
- Status: ${sentiment.optionGammaImbalance?.status || 'Options chain within normal parameters.'}
- Call/Put Volume: ${sentiment.optionGammaImbalance?.callVolume ?? 0} Calls / ${sentiment.optionGammaImbalance?.putVolume ?? 0} Puts
- Call/Put Open Interest: ${sentiment.optionGammaImbalance?.callOpenInterest ?? 0} Call OI / ${sentiment.optionGammaImbalance?.putOpenInterest ?? 0} Put OI

Free Float Concentration:
- Concentration Level: ${sentiment.freeFloatConcentration?.concentrationLevel || 'Low'}
- Free Float %: ${sentiment.freeFloatConcentration?.freeFloatPercent ?? 'N/A'}%
- Float Turnover Ratio: ${sentiment.freeFloatConcentration?.floatTurnoverRatio ? (sentiment.freeFloatConcentration.floatTurnoverRatio * 100).toFixed(1) + '%' : 'N/A'}
- Status: ${sentiment.freeFloatConcentration?.status || 'Float concentration within normal parameters.'}

Produce the structured JSON output adhering strictly to TRADING_ACTIVITY_SCHEMA.`;
}

// ============================================================================
// 3. BALANCE SHEET & SOLVENCY STRESS TEST AGENT
// ============================================================================

export function buildBalanceSheetSolvencySystemPrompt(): string {
  return `You are a Senior Credit Risk & Solvency Stress-Test Analyst.
Your specific role is to author Section 2 of today's institutional equity research report: "Balance Sheet & Solvency Stress Test (with Full Debt Breakdown)".

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTION 2:
1. Capital Structure Assessment:
   - Detail total debt obligations, liquid cash and equivalents, and calculate net debt position.
   - Granular debt breakdown: Short-term debt obligations (current liabilities & near-term maturities) vs. Long-term debt obligations (senior notes & credit facilities).
   - Compute and evaluate Short vs. Long-term debt ratio and examine near-term debt maturity liquidity drain.
2. Debt Evolution & Refinancing Audit:
   - Audit recent changes in debt obligations (new debt facilities, convertible notes, ATM dilution offerings, principal repayments).
   - Evaluate credit distress and solvency stress: Altman Z-score, interest coverage ratio, liquidity burn rate, restrictive covenants, and dilution risk.
   - Refinancing exposure: analyze debt service burdens in a high risk-free rate regime (US 10Y / Fed policy rate).
3. Solvency Metrics:
   - Debt-to-Equity ratio and Current ratio (liquid assets vs short-term current liabilities).
4. Formatted Markdown:
   - Your markdown output MUST begin with "## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)".
   - Do NOT append legal disclaimers in markdown text.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to BALANCE_SHEET_SOLVENCY_SCHEMA.`;
}

export function buildBalanceSheetSolvencyUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();

  return `Generate Section 2 ("Balance Sheet & Solvency Stress Test (with Full Debt Breakdown)") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B

=== BALANCE SHEET & DEBT DATA ===
Total Debt: $${((fundamentals.totalDebt || 0) / 1e9).toFixed(2)}B ($${(((fundamentals.totalDebt || 0) / 1e6)).toFixed(1)}M)
Short-Term Debt: $${(((fundamentals.shortTermDebt || 0) / 1e6)).toFixed(1)}M
Long-Term Debt: $${(((fundamentals.longTermDebt || 0) / 1e6)).toFixed(1)}M
Short vs Long Term Ratio: ${fundamentals.shortVsLongTermRatio || 'Standard Term Distribution'}
Cash and Equivalents: $${((fundamentals.cashAndEquivalents || 0) / 1e9).toFixed(2)}B ($${(((fundamentals.cashAndEquivalents || 0) / 1e6)).toFixed(1)}M)
Net Debt: $${((fundamentals.netDebt || 0) / 1e9).toFixed(2)}B ($${(((fundamentals.netDebt || 0) / 1e6)).toFixed(1)}M)
Debt-to-Equity Ratio: ${fundamentals.debtToEquity !== null && fundamentals.debtToEquity !== undefined ? fundamentals.debtToEquity.toFixed(2) : 'Not Disclosed'}
Current Ratio: ${fundamentals.currentRatio !== null && fundamentals.currentRatio !== undefined ? `${fundamentals.currentRatio.toFixed(2)}x` : 'Not Disclosed'}
Recent Changes in Debt: ${fundamentals.recentChangesInDebt || 'Maintained existing capital structure.'}
Specific Debt Risks: ${fundamentals.debtRisks || 'Standard operational liquidity requirements.'}

=== MACRO INTEREST RATE ENVIRONMENT ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}% | Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}% | ECB Policy Rate: ${macro.ecbPolicyRate.toFixed(2)}%

Produce the structured JSON output adhering strictly to BALANCE_SHEET_SOLVENCY_SCHEMA.`;
}

// ============================================================================
// 4. PROFITABILITY, OPERATING HEALTH & SEGMENT DYNAMICS AGENT
// ============================================================================

export function buildProfitabilityOperatingSystemPrompt(): string {
  return `You are a Senior Fundamental Equity Research Analyst specializing in Operating Health, Business Models, and Segment Financials.
Your specific role is to author Section 3 ("Profitability, Operating Health & Segment Dynamics") and Section 4 ("Qualitative Deep Dive: 4 Key Company Questions") of today's institutional equity research report.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTIONS 3 & 4:
1. Section 3: Operating Performance & 10-K Reporting Segments:
   - Provide authentic company business overview and 10-K reporting segment breakdown.
   - Analyze TTM Revenue, Net Income, Gross Profit Margin, Operating Margin (EBIT), Return on Equity (ROE), Operating Cash Flow, TTM Free Cash Flow status, and Return on Invested Capital (ROIC).
   - Trailing 8-Quarter EPS progression: Present a structured markdown table reviewing quarterly EPS over the past 2 years (8 quarters) to evaluate operational consistency and earnings surprise beats/misses.
2. Section 4: Qualitative Deep Dive (4 Key Company Questions):
   - You MUST answer all 4 Key Company Questions grounded in real operational facts:
     * Q1: "How does the company make money?"
       You MUST detail using bullet points across business segments without trimming, abbreviating, or truncating any details, using this exact structure:
       "[Company] makes money through [N] business segments:
       - [Segment 1 Name]:
        * [Specific products/services sold]
        * [Margin profile]
        * [Demand drivers]
       - [Segment 2 Name]:
        * [Products/software sold]
        * [Recurring revenue vs transaction]
        * [Subscriptions, Maintenance revenue, Up-selling, Cross-selling revenue]
        * [Key Revenue Drivers]
       - [Segment 3 Name]:
        * [R&D]
        * [Manufacturing capacity]
        * [Commercial product lines]
       - [Segment 4 Name]:
        * [Target Customer & Buyer]
        * [Market-driven pricing]
        * [Cyclicality in order intake]
        * [Visibility of demand]
       
       [Concluding paragraph]: Most activities are cyclical and depend on contracts with limited visibility. However, because there are [N] different activities the cycles do not always move in perfect synchronisation which helps smooth cyclicality."
     * Q2: "Are its products or services in demand, and why?"
       Show concise introductory sentence(s), structured bullet points with bold key phrases, and a concise conclusive company-specific footer.
     * Q3: "How has the company performed in the past?"
       Show bullet points detailing operational and financial metrics (TTM revenue, operating margin EBIT, ROIC, leverage, cash reserves) and significant events/periods, with a concise conclusive footer.
     * Q4: "Is the company positioned for growth and profitability?"
       Show company-specific introduction sentence, bullet points with key growth drivers (capacity expansion, operating leverage, ROIC vs WACC spread), and a concise conclusive footer.
3. Formatted Markdown:
   - Your markdown output MUST begin with "## 3. Profitability, Operating Health & Segment Dynamics", followed by a horizontal rule ("---"), followed by "## 4. Qualitative Deep Dive: 4 Key Company Questions".
   - Do NOT append legal disclaimers in markdown text.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to PROFITABILITY_OPERATING_SCHEMA.`;
}

export function buildProfitabilityOperatingUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();

  return `Generate Section 3 ("Profitability, Operating Health & Segment Dynamics") and Section 4 ("Qualitative Deep Dive: 4 Key Company Questions") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Sector: ${fundamentals.sector} | Industry: ${fundamentals.industry}
Business Description: ${fundamentals.description || fundamentals.businessSummary || 'Commercial operating enterprise.'}

=== REVENUE & MARGIN METRICS ===
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B
TTM Net Income: $${(fundamentals.netIncomeTTM / 1e9).toFixed(2)}B
Gross Profit Margin: ${fundamentals.grossMargin !== null && fundamentals.grossMargin !== undefined ? `${fundamentals.grossMargin.toFixed(1)}%` : 'Not Reported in SEC Summaries'}
Operating Margin (EBIT): ${fundamentals.operatingMargin.toFixed(1)}%
Return on Equity (ROE): ${(fundamentals.returnOnEquity ?? 0).toFixed(1)}%
Return on Invested Capital (ROIC): ${fundamentals.roic !== null && fundamentals.roic !== undefined ? `${fundamentals.roic.toFixed(1)}%` : 'Not Disclosed'}
Operating Cash Flow: $${((fundamentals.cashFlow?.operatingCashFlow || fundamentals.revenueTTM * 0.15) / 1e9).toFixed(2)}B
TTM Free Cash Flow: ${fundamentals.freeCashFlowTTM !== null && fundamentals.freeCashFlowTTM !== undefined ? `$${(fundamentals.freeCashFlowTTM / 1e9).toFixed(2)}B` : 'Not Reported in SEC Summaries'} (Status: ${fundamentals.cashFlow?.status || 'Positive'})

=== 10-K SEGMENT REPORTING ===
${fundamentals.segmentRevenueBreakdown && fundamentals.segmentRevenueBreakdown.length > 0 ? `Reported Segments:\n${fundamentals.segmentRevenueBreakdown.map(s => `- ${s.segment}: ${s.revenue !== undefined && s.revenue !== null ? `$${(s.revenue / 1e9).toFixed(2)}B` : 'Not Disclosed'}`).join('\n')}` : 'Segments: Commercial core operations and services.'}

=== 8-QUARTER EPS PROGRESSION ===
${fundamentals.earningsPerShare?.quarterlyEPSPast2Years && fundamentals.earningsPerShare.quarterlyEPSPast2Years.length > 0 ? `Quarterly EPS History:\n${fundamentals.earningsPerShare.quarterlyEPSPast2Years.map(q => `- ${q.quarter}: $${q.eps.toFixed(2)} (${q.beat ? 'Beat' : 'Miss/In-Line'})`).join('\n')}` : 'Quarterly EPS: Trailing EPS $' + (fundamentals.earningsPerShare?.currentTTM || 0).toFixed(2)}

=== PRE-INGESTED COMPANY QUESTIONS CONTEXT ===
- How company makes money: ${fundamentals.companyQuestions?.howCompanyMakesMoney || 'Delivers products and services across commercial reporting segments.'}
- Products demand rationale: ${fundamentals.companyQuestions?.productsDemandAndWhy || 'Supported by enterprise and customer mission-critical requirements.'}
- Past performance summary: ${fundamentals.companyQuestions?.pastPerformanceSummary || 'Demonstrated operational execution across historical reporting periods.'}
- Growth & profitability outlook: ${fundamentals.companyQuestions?.growthAndProfitabilityOutlook || 'Focused on margin expansion, operational discipline, and market share.'}

Produce the structured JSON output adhering strictly to PROFITABILITY_OPERATING_SCHEMA.`;
}

// ============================================================================
// 5. MANAGEMENT QUALITY, 5 MOAT PILLARS & COMPETITOR BENCHMARKING AGENT
// ============================================================================

export function buildMoatAndCompetitorSystemPrompt(): string {
  return `You are a Senior Competitive Strategy, Governance & Industry Dynamics Specialist.
Your specific role is to author Section 5 ("Industry Deep Dive & Sector Dynamics") and Section 6 ("Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix") of today's institutional equity research report.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTIONS 5 & 6:
1. Section 5: Industry Dynamics & Retail-Friendly Simplified Summaries:
   - Synthesize industry condition, growth drivers, competitive rivalry, and macro/regulatory headwinds.
   - Non-technical simplified summaries (MANDATORY JSON PROPERTIES):
     * "macroConditionSimplified": Summarize the macro condition of this industry in plain, non-technical language that an everyday retail investor can easily understand, avoiding dense jargon or misleading generic templates.
     * "obstaclesAndChallengesSimplified": Summarize key operational obstacles and challenges in plain, non-technical language for retail investors.
     * "economicPoliticalCulturalRisksSimplified": Summarize key macro, regulatory, and geopolitical risks in plain, non-technical language for retail investors.
2. Section 6: Management Quality & 5 Moat Pillars:
   - Evaluate Management Quality Rating & Executive Track Record (capital allocation discipline, balance sheet stewardship, and execution history).
   - Assign Economic Moat Rating (Wide, Narrow, None) and Moat Trend (Positive, Stable, Negative) with analytical justification.
   - Morningstar 5 Moat Pillars table:
     Deconstruct the moat into the 5 recognized pillars:
     | Moat Pillar | Assessment | Analytical Substantiation |
     Covering Intangible Assets, Switching Costs, Network Effect, Cost Advantage, and Efficient Scale.
   - Competitor Benchmarking Matrix table:
     Benchmark the focal company against 2–3 sector peers across:
     | Company | Ticker | Market Cap | Trailing P/E | EV/EBITDA | Economic Moat | ROIC |
     Followed by institutional commentary explaining relative valuation discounts/premiums and competitive positioning.
3. Formatted Markdown:
   - Your markdown output MUST begin with "## 5. Industry Deep Dive & Sector Dynamics", followed by a horizontal rule ("---"), followed by "## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix".
   - Do NOT append legal disclaimers in markdown text.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to MOAT_AND_COMPETITOR_SCHEMA.`;
}

export function buildMoatAndCompetitorUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();

  return `Generate Section 5 ("Industry Deep Dive & Sector Dynamics") and Section 6 ("Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Sector: ${fundamentals.sector} | Industry: ${fundamentals.industry}
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B

=== SECTOR DYNAMICS & INDUSTRY CONTEXT ===
Technical Macro Condition: ${fundamentals.sectorDynamics?.industryCondition || fundamentals.industryQuestions?.industryCondition || 'Sector operates within broader cyclical demand trends.'}
Key Sector Obstacles: ${fundamentals.sectorDynamics?.obstaclesAndChallenges || fundamentals.industryQuestions?.obstaclesAndChallenges || 'Input costs, technological shifts, and competitive pressures.'}
Regulatory & Macro Risks: ${fundamentals.sectorDynamics?.economicPoliticalCulturalRisks || fundamentals.industryQuestions?.economicPoliticalCulturalRisks || 'Regulatory compliance and interest rate sensitivity.'}

=== MANAGEMENT QUALITY & GOVERNANCE ===
Management Quality Rating: ${fundamentals.managementQuality?.rating || 'Standard'}
Management Track Record: ${fundamentals.managementQuality?.trackRecord || 'Consistent capital allocation and operational execution.'}

=== 5 MOAT PILLARS DECONSTRUCTION ===
Economic Moat Rating: ${fundamentals.competitiveMoat?.rating || 'None'} (Trend: ${fundamentals.competitiveMoat?.trend || 'Stable'})
Moat Summary: ${fundamentals.competitiveMoat?.summary || 'Competitive advantages evaluated across operational capabilities.'}
${fundamentals.competitiveMoat?.sources ? `5 Moat Pillars Assessment:
- Intangible Assets: [${fundamentals.competitiveMoat.sources.intangibleAssets.rating}] ${fundamentals.competitiveMoat.sources.intangibleAssets.substantiation}
- Switching Costs: [${fundamentals.competitiveMoat.sources.switchingCosts.rating}] ${fundamentals.competitiveMoat.sources.switchingCosts.substantiation}
- Network Effect: [${fundamentals.competitiveMoat.sources.networkEffect.rating}] ${fundamentals.competitiveMoat.sources.networkEffect.substantiation}
- Cost Advantage: [${fundamentals.competitiveMoat.sources.costAdvantage.rating}] ${fundamentals.competitiveMoat.sources.costAdvantage.substantiation}
- Efficient Scale: [${fundamentals.competitiveMoat.sources.efficientScale.rating}] ${fundamentals.competitiveMoat.sources.efficientScale.substantiation}` : ''}

=== COMPETITOR BENCHMARKING GROUP ===
${fundamentals.competitorBenchmarking?.peers && fundamentals.competitorBenchmarking.peers.length > 0 ? `Sector Peers:\n${fundamentals.competitorBenchmarking.peers.map(p => `- ${p.ticker} (${p.name}): Market Cap $${(p.marketCap / 1e9).toFixed(1)}B | P/E: ${p.peRatio !== null ? p.peRatio + 'x' : 'N/A'} | EV/EBITDA: ${p.evToEbitda !== null ? p.evToEbitda + 'x' : 'N/A'} | Moat: ${p.moat} | ROIC: ${p.roic !== null ? p.roic + '%' : 'N/A'}`).join('\n')}` : 'Peers: Broader sector benchmark medians.'}
Peer Group Commentary: ${fundamentals.competitorBenchmarking?.commentary || 'Relative valuation multiples and moat differentials benchmarked against sector peers.'}

Produce the structured JSON output adhering strictly to MOAT_AND_COMPETITOR_SCHEMA.`;
}

// ============================================================================
// 6. MULTI-MODEL VALUATION ENGINE AGENT
// ============================================================================

export function buildValuationEngineSystemPrompt(): string {
  return `You are a Senior Quantitative Valuation Architect and Asset Pricing Modeler.
Your specific role is to author Section 7 ("Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)") and Section 8 ("Macroeconomic Headwinds & Sector Multiples") of today's institutional equity research report.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTIONS 7 & 8:
1. Section 7: Multi-Model Valuation Suite:
   - Morningstar Star Rating (1 to 5 Stars: ★★★★★), Uncertainty Rating (Low, Medium, High, Very High, Extreme), Price-to-Fair-Value ratio, 5-Star margin-of-safety buy hurdle, and 1-Star trim hurdle.
   - Synthesize the 8 independent valuation methodologies in a structured markdown table:
     | Valuation Methodology | Calculated Fair Value | Implied Upside | Model Assumptions & Parameters |
     Covering:
     1. 3-Stage DCF (Moat Fade)
     2. Dividend Discount Model (DDM)
     3. Rapid Stock Valuation (PEG)
     4. Relative Peer Multiples
     5. Residual Income Model (RIM)
     6. Asset-Based Valuation (NAV Floor)
     7. Sector Asset Capacity Model
     8. Excess Return Model (EVA)
     and Consensus Fair Value Target with verdict.
   - Refined 3-Stage DCF mechanics:
     * Stage I: 5-year explicit forecast using normalized FCFF.
     * Stage II: Moat-dependent fade period (Wide Moat: 15Y fade, Narrow Moat: 10Y fade, None: 5Y fade).
     * Stage III: Perpetuity terminal value.
     * Enterprise Value to Equity Value bridge deducting net debt.
   - Historical & Industry Benchmark Comparison:
     * Trailing P/E, Price-to-Book (P/B), EV/EBITDA, Dividend Yield.
2. Section 8: Macroeconomic Headwinds & Sector Multiples:
   - Sovereign yield backdrop: US 10-Year sovereign yield and discount rate pressure on equity duration.
   - Central bank policy: Fed funds rate, ECB policy rate, and corporate refinancing hurdle.
   - Volatility regime: Cboe VIX volatility index and institutional risk tolerance.
3. Formatted Markdown:
   - Your markdown output MUST begin with "## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)", followed by a horizontal rule ("---"), followed by "## 8. Macroeconomic Headwinds & Sector Multiples".
   - Do NOT append legal disclaimers in markdown text.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to VALUATION_ENGINE_SCHEMA.`;
}

export function buildValuationEngineUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();
  const currentPB = typeof fundamentals.priceToBook === 'object' ? fundamentals.priceToBook?.current : fundamentals.priceToBook;
  const currentPE = typeof fundamentals.priceToEarnings === 'object' ? fundamentals.priceToEarnings?.current : fundamentals.peRatioTrailing;

  return `Generate Section 7 ("Multi-Model Valuation Suite") and Section 8 ("Macroeconomic Headwinds & Sector Multiples") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Current Price: $${mover.price.toFixed(2)} (${mover.currency})
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B

=== MULTI-MODEL VALUATION OUTPUTS ===
Consensus Fair Value: $${(fundamentals.valuationModels?.consensusFairValue ?? 0).toFixed(2)} (Verdict: ${fundamentals.valuationModels?.verdict || 'Fairly Valued'})
Morningstar Rating: ${fundamentals.starRatingString || '★★★☆☆'} (${fundamentals.starRating || 3} Stars)
Uncertainty Rating: ${fundamentals.uncertaintyRating || 'Medium'} (Price/Fair Value: ${fundamentals.priceToFairValue?.toFixed(2) || '1.00'}x)
5-Star Price (Undervalued / Buy Hurdle): $${fundamentals.fiveStarPrice?.toFixed(2) || 'N/A'}
1-Star Price (Overvalued / Sell Hurdle): $${fundamentals.oneStarPrice?.toFixed(2) || 'N/A'}

Valuation Models Breakdown:
- 3-Stage DCF (Moat Fade: ${fundamentals.valuationModels?.dcf?.fadeYears ?? 10}Y, Stage 1 Growth: ${fundamentals.valuationModels?.dcf?.stage1GrowthRate ?? 5}%, Ke/WACC: ${fundamentals.valuationModels?.dcf?.discountRate ?? 8}%): $${(fundamentals.valuationModels?.dcf?.fairValue ?? fundamentals.valuationModels?.dcf?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.dcf?.upside ?? fundamentals.valuationModels?.dcf?.upsidePercent ?? 0}%)
  [Normalized FCFF: $${fundamentals.valuationModels?.dcf?.normalizedFcf ? (fundamentals.valuationModels.dcf.normalizedFcf / 1e9).toFixed(2) + 'B' : 'N/A'} | Implied EV: $${fundamentals.valuationModels?.dcf?.enterpriseValue ? (fundamentals.valuationModels.dcf.enterpriseValue / 1e9).toFixed(2) + 'B' : 'N/A'} | Implied Equity: $${fundamentals.valuationModels?.dcf?.equityValue ? (fundamentals.valuationModels.dcf.equityValue / 1e9).toFixed(2) + 'B' : 'N/A'}]
- Dividend Discount Model (DDM): $${(fundamentals.valuationModels?.ddm?.fairValue ?? fundamentals.valuationModels?.ddm?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.ddm?.upside ?? fundamentals.valuationModels?.ddm?.upsidePercent ?? 0}%)
- Relative Multiples Valuation: $${(fundamentals.valuationModels?.relativeValuation?.fairValue ?? fundamentals.valuationModels?.relativeValuation?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.relativeValuation?.upside ?? fundamentals.valuationModels?.relativeValuation?.upsidePercent ?? 0}%)
- Rapid PEG Model: $${(fundamentals.valuationModels?.rapidStockValuation?.fairValue ?? fundamentals.valuationModels?.rapidStockValuation?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.rapidStockValuation?.upside ?? fundamentals.valuationModels?.rapidStockValuation?.upsidePercent ?? 0}%)
- Residual Income Model: $${(fundamentals.valuationModels?.residualIncomeModel?.fairValue ?? fundamentals.valuationModels?.residualIncomeModel?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.residualIncomeModel?.upside ?? fundamentals.valuationModels?.residualIncomeModel?.upsidePercent ?? 0}%)
- Asset-Based Liquidation Floor: $${(fundamentals.valuationModels?.assetBasedValuation?.fairValue ?? fundamentals.valuationModels?.assetBasedValuation?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.assetBasedValuation?.upside ?? fundamentals.valuationModels?.assetBasedValuation?.upsidePercent ?? 0}%)
- Excess Return Spread Model: $${(fundamentals.valuationModels?.excessReturnModel?.fairValue ?? fundamentals.valuationModels?.excessReturnModel?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.excessReturnModel?.upside ?? fundamentals.valuationModels?.excessReturnModel?.upsidePercent ?? 0}%)
- Industry Specific Model: $${(fundamentals.valuationModels?.industrySpecificModel?.fairValue ?? fundamentals.valuationModels?.industrySpecificModel?.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels?.industrySpecificModel?.upside ?? fundamentals.valuationModels?.industrySpecificModel?.upsidePercent ?? 0}%)

Historical & Industry Multiples:
- Trailing P/E: ${fundamentals.peRatioTrailing ?? currentPE ?? 'N/A'} (Industry Avg: ${fundamentals.priceToEarnings?.industryAverage ?? 'N/A'}, 5Y Avg: ${fundamentals.priceToEarnings?.historicalAverage5Y ? `${fundamentals.priceToEarnings.historicalAverage5Y}x` : 'N/A'})
- Price / Book: ${currentPB ?? 'N/A'} (Industry Avg: ${fundamentals.priceToBook?.industryAverage ?? 'N/A'}, 5Y Avg: ${fundamentals.priceToBook?.historicalAverage5Y ? `${fundamentals.priceToBook.historicalAverage5Y}x` : 'N/A'})
- EV / EBITDA: ${fundamentals.evToEbitda ?? 'N/A'}
- Dividend Yield: ${fundamentals.dividendYield.toFixed(2)}%

=== MACROECONOMIC CONTEXT ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}%
US 2-Year Yield: ${macro.us2YearYield.toFixed(2)}%
Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}%
ECB Policy Rate: ${macro.ecbPolicyRate.toFixed(2)}%
VIX Volatility Index: ${macro.vixIndex.toFixed(2)}
Macro Sector Impact: ${macro.sectorImpactSummary}

Produce the structured JSON output adhering strictly to VALUATION_ENGINE_SCHEMA.`;
}

// ============================================================================
// 7. OBJECTIVE BULL & BEAR THESES AGENT
// ============================================================================

export function buildBullBearThesesSystemPrompt(): string {
  return `You are a Senior Institutional Investment Committee Lead and Thesis Architect.
Your specific role is to author Section 9 ("Objective Bull & Bear Theses with Cited Sources & Deduction Chains") along with structured theses and social distribution hooks.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR SECTION 9:
1. Balanced Evidence & Equal Analytical Rigor:
   - Present both an evidence-based Bull Case and Bear Case with equal empirical rigor.
   - Core Bullish Thesis points MUST include:
     * Empirical valuation/operating cash flow points (multi-model asymmetry, margin resilience).
     * Vertical integration: The company develops AND manufactures/operates most of what it sells, giving control over product development, quality, supply chain, capacity management, and reducing lead times from R&D to commercialization.
     * Great M&A strategy and execution: Acquires companies/assets complementary to its existing portfolio rather than unrelated assets, strengthening its ecosystem, easing integration, and completing transactions at reasonable, accretive valuations.
     * Capital-efficient growth: Strong organic growth, acquisitions, and disciplined capital return policy while maintaining a clean balance sheet and high returns on capital (ROIC/ROE).
   - Core Bearish Risk Theses MUST include:
     * Empirical macro and balance sheet points (interest rate sensitivity, refinancing exposure).
     * Concentration risks: Key vertical (e.g. defense, primary cloud, enterprise) + customer concentration, where a large share of recent growth comes from this vertical and any slowdown has an outsized impact on the revenue mix.
     * Ambitious targets: Management expects aggressive long-term organic growth targets that outstrip conservative analyst forecasts, creating asymmetric guidance-cut and de-rating risks.
     * Cyclical revenue: A major part of revenue is project-driven and depends on customer investment cycles, creating quarterly volatility and margin fluctuations across capacity utilization cycles.
2. Mandatory Citations & Deductive Chains:
   - For every thesis point in BOTH the Bull Case and Bear Case:
     * Cite specific references and sources (SEC 10-K / 10-Q / 8-K filings, earnings calls, clinical trial data, industry reports, Federal Reserve macro releases) along with direct links to the resources.
     * Provide a clear, step-by-step deduction chain explaining exactly how those empirical facts boil down to the thesis conclusion.
3. Structured Theses & Social Distribution Hooks:
   - Return structured "theses" JSON object ({ bull: [...], bear: [...] }) where each element has: point, sources: [{ name, url }], deductionChain.
   - Return structured "socialHooks" JSON object ({ twitterThread: string[], redditPost: { title, bodyMarkdown, flair }, telegramAlert: string }).
4. Formatted Markdown:
   - Your markdown output MUST begin with "## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)".
   - Do NOT append legal disclaimers, methodology boilerplate, or publisher's exemption notices in the markdown body.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to BULL_BEAR_THESES_SCHEMA.`;
}

export function buildBullBearThesesUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const cleanTicker = mover.ticker.toUpperCase();

  return `Generate Section 9 ("Objective Bull & Bear Theses with Cited Sources & Deduction Chains") for:
Equity: ${fundamentals.companyName} ($${cleanTicker})
Sector: ${fundamentals.sector} | Industry: ${fundamentals.industry}
Current Price: $${mover.price.toFixed(2)} (${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%)
Consensus Fair Value: $${(fundamentals.valuationModels?.consensusFairValue ?? 0).toFixed(2)} (Verdict: ${fundamentals.valuationModels?.verdict || 'Fairly Valued'})

=== KEY FUNDAMENTAL EVIDENCE ===
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B | Operating Margin: ${fundamentals.operatingMargin.toFixed(1)}%
ROIC: ${fundamentals.roic !== null && fundamentals.roic !== undefined ? `${fundamentals.roic.toFixed(1)}%` : 'Not Disclosed'} | ROE: ${(fundamentals.returnOnEquity ?? 0).toFixed(1)}%
Total Debt: $${((fundamentals.totalDebt || 0) / 1e9).toFixed(2)}B | Cash: $${((fundamentals.cashAndEquivalents || 0) / 1e9).toFixed(2)}B
Economic Moat: ${fundamentals.competitiveMoat?.rating || 'None'} (Trend: ${fundamentals.competitiveMoat?.trend || 'Stable'})
Management Quality: ${fundamentals.managementQuality?.rating || 'Standard'} (Track Record: ${fundamentals.managementQuality?.trackRecord || 'Established'})

=== RECENT CATALYSTS & SENTIMENT ===
Session Driver: ${sentiment.majorPriceDriver || mover.newsHeadline || 'Order Flow'}
Catalyst Alignment: ${sentiment.catalystAlignment || 'ALIGNED'}
Expectations Gap: ${sentiment.catalystSynthesis || 'Market reacting to fundamental catalysts.'}
${sentiment.secFilingSummary ? `SEC EDGAR Context: ${sentiment.secFilingSummary}` : ''}

=== MACRO HEADWINDS ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}% | Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}% | VIX: ${macro.vixIndex.toFixed(1)}

Produce the structured JSON output adhering strictly to BULL_BEAR_THESES_SCHEMA.`;
}
