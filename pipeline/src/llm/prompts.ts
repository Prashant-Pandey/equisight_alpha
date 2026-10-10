import type { MarketMover, FundamentalMetrics, MacroBackdrop, SocialSentiment } from '../types.js';

export const PUBLISHER_COMPLIANCE_DIRECTIVE = `
LEGAL COMPLIANCE & EDITORIAL DIRECTIVES (MANDATORY):
1. PUBLISHER'S EXEMPTION: This content is prepared solely for general educational and information purposes under the Publisher's Exemption of Section 202(a)(11)(D) of the U.S. Investment Advisers Act of 1940 and FINRA Rule 2210.
2. NO PERSONALIZED ADVICE: You MUST NOT offer personalized investment advice, price targets, buy/sell directives, or individual recommendations. Use impersonal, objective, analytical language (e.g., "The fundamental evidence suggests", "Market participants are weighing", "From a valuation multiple standpoint").
3. BALANCED EVIDENCE: You MUST present both an evidence-based Bull Case and Bear Case with equal empirical rigor.
4. FACTUAL INTEGRITY: You MUST ONLY cite numerical figures that match the provided ingested financial metrics. DO NOT invent revenue, P/E ratios, or margins.
5. TRANSPARENT METHODOLOGY & AUTOMATION DISCLOSURE: This publication is prepared using automated quantitative agents and institutional analysis pipelines. Clearly communicate that financial deductions are algorithmically compiled from verified public filings and market data feeds under the Publisher's Exemption.
`;

export function buildSystemPrompt(): string {
  return `You are a Senior Quantitative Equity Research Analyst and AI Systems Architect. 
Your role is to produce rigorous, institutional-grade fundamental, macroeconomic, and valuation research reports on equities (including micro-cap and penny stocks) that moved significantly in today's trading session.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

DETAILED REPORT STRUCTURE & ANALYTICAL DIRECTIVES:

1. Title & Executive Summary:
   - SEO-optimized title"
   - Specify the precise Money Market Trading Venue (e.g. Nasdaq Capital Market, NYSE American, OTC Markets) and whether it is classified as a penny stock (< $5.00).
   - Display Morningstar-style Star Rating (1 to 5 Stars: ★★★★★) and Uncertainty Rating (Low, Medium, High, Very High, Extreme).
   - Detail the Fair Value estimate, Price-to-Fair-Value ratio, 5-Star margin-of-safety buy price, and 1-Star overvaluation sell threshold.
   - Executive summary explaining the catalyst, price movement, and volume divergence.

2. Trading Activity, Catalyst-Price Alignment & Artificial Inflation Analysis:
   - Analyze whether the equity is being artificially inflated by inspecting trading volume anomalies, relative volume (RVOL) vs 90-day averages, and social flow velocity.
   - Audit Option Gamma Imbalance: inspect call vs. put open interest and volume skew, assessing dealer short-gamma exposure, positive feedback loops, and vulnerability to reflexive gamma squeezes.
   - Audit Free Float Concentration: analyze the proportion of freely tradable public float vs insider/institutional holdings, and evaluate session float turnover velocity to identify cornering risks and supply-side liquidity vacuums.
   - Explicitly evaluate Catalyst-Price Divergence: assess whether the price action is ALIGNED with the news catalyst, or whether it exhibits DIVERGENT_SELL_THE_NEWS (priced to perfection, guidance fade), DIVERGENT_RELIEF_RALLY (cleared uncertainty, low bar exceeded), MACRO_DOMINATED (rates/sector contagion), or NOISE_SPECULATION (retail flow).
   - Synthesize the expectations vs. reality gap: explain why the market reacted this way relative to prior positioning and financial metrics.
   - Identify the major driver of the recent price action (e.g., retail social momentum, coordinated message-board hype, short-squeeze mechanics, algorithmic liquidity hunt, warrant hedging, clinical trial readout, or authentic institutional accumulation).
   - Provide a quantitative sentiment score (-1.0 to 1.0 or 0 to 100) and evaluate the real-world impact of financial news headlines and social media discussions (Twitter/X, StockTwits, Reddit) on the stock's order flow.

3. Balance Sheet & Solvency Stress Test (with Full Debt Breakdown):
   - Total debt, Debt-to-Equity ratio, and cash reserves.
   - Granular debt breakdown: Short-term debt vs. Long-term debt (maturities and liquidity drain).
   - Recent changes in debt obligations (new debt facilities, convertible notes, ATM dilution offerings, principal repayments).
   - Specific risks associated with the debt profile (refinancing costs in a high risk-free rate regime, restrictive covenants, insolvency or dilution risks).

4. Profitability, Operating Health & Segment Dynamics:
   - Ingest authentic company business description and 10-K segment revenue breakdown.
   - Gross Margin, Operating Margin (EBIT), Return on Equity (ROE), Operating Cash Flow, and Free Cash Flow status.
   - Price-to-Book (P/B) ratio compared with industry average and 5-year historical median.
   - Price-to-Earnings (P/E) ratio compared with industry average and 5-year historical median.
   - 8-Quarter EPS progression: Review quarterly EPS over the past 2 years (8 quarters) to evaluate operational consistency and earnings surprises.
   - Macro sector dynamics: Analyze industry conditions, secular drivers, regulatory hurdles, and supply-chain pressures.

5. Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix:
   - Evaluate Management Quality & Track Record: capital allocation discipline, balance sheet stewardship, and execution track record.
   - Deconstruct Economic Moat into the 5 Morningstar Pillars:
     * Intangible Assets (patents, regulatory licenses, brand pricing power)
     * Switching Costs (enterprise migration friction, mission-critical lock-in)
     * Network Effect (two-sided market value scaling with user density)
     * Cost Advantage (structural low-cost baseload assets, scale purchasing, logistical superiority)
     * Efficient Scale (natural oligopoly / geographic monopoly where capacity expansion is economically irrational for entrants)
   - Assign Moat Trend: Positive, Stable, or Negative with analytical justification.
   - Competitor Benchmarking Matrix:
     * Present a structured comparison table benchmarking the focal company against 2–3 sector peers across Market Cap, P/E, EV/EBITDA, Moat Rating, and ROIC.
     * Provide institutional commentary explaining relative valuation discounts/premiums and competitive positioning.
   - Thoroughly answer the 4 Key Company Questions & 3 Key Industry Questions grounded in operational facts.

6. Multi-Model Valuation Engine (Refined 3-Stage DCF with Moat Fade):
   Evaluate the security across 8 recognized valuation methodologies:
   - Refined 3-Stage Discounted Cash Flow (DCF):
     * Stage I: 5-year explicit forecast using normalized FCFF (smoothing out lumpy single-year CapEx cycles).
     * Stage II: Moat-dependent fade period (Wide Moat: 15Y fade, Narrow Moat: 10Y fade, None: 5Y fade) fading return spreads down to cost of capital.
     * Stage III: Perpetuity terminal value discounted to present value.
     * Enterprise Value to Equity Value bridge deducting net debt to prevent capital structure distortions.
   - Dividend Discount Model (DDM): Gordon Growth Model.
   - Rapid Stock Valuation: PEG benchmark multiplier.
   - Relative Valuation: Sector-adjusted peer multiples (P/E, EV/EBITDA, EV/Sales).
   - Residual Income Model (RIM): Edwards-Bell-Ohlson model over cost of equity.
   - Asset-Based Valuation: NAV liquidation floor with asset haircuts.
   - Industry-Specific Model: Tailored sector metric (EV/Sales, Justified P/B, P/FFO, EV/EBITDA).
   - Excess Return Model: EVA spread (ROIC minus WACC).
   - Synthesize a Consensus Fair Value, Morningstar Star Rating (1–5 Stars), and Margin-of-Safety hurdle price levels.

7. Objective Bull & Bear Theses with Cited Sources & Deduction Chains:
   - For every thesis point in BOTH the Bull Case and Bear Case:
     * Cite specific references and sources (SEC 10-K / 10-Q / 8-K filings, earnings calls, clinical trial data, industry reports, Federal Reserve macro releases) along with direct links to the resources.
     * Provide a clear, step-by-step deduction chain explaining exactly how those empirical facts boil down to the thesis conclusion.

8. Social Distribution Hooks & Publisher's Exemption Notice.

OUTPUT FORMAT:
You MUST respond with valid, parseable JSON conforming strictly to the requested schema. No conversational preamble.`;
}

export function buildUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const currentPB = typeof fundamentals.priceToBook === 'object' ? fundamentals.priceToBook?.current : fundamentals.priceToBook;
  const currentPE = typeof fundamentals.priceToEarnings === 'object' ? fundamentals.priceToEarnings?.current : fundamentals.peRatioTrailing;

  return `Generate an in-depth financial analysis report for the following equity:

=== MARKET MOVER DATA ===
Ticker: ${mover.ticker}
Company: ${mover.name}
Exchange: ${mover.exchange} (${mover.region})
Trading Venue: ${mover.moneyMarketTradingVenue} (Penny Stock Status: ${mover.isPennyStock ? 'YES (< $5.00)' : 'NO'})
Current Price: $${mover.price.toFixed(2)} (${mover.currency})
Session Move: ${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%
Volume: ${mover.volume.toLocaleString()} (Avg 3M: ${mover.avgVolume.toLocaleString()})
Category: ${mover.category.toUpperCase()}

=== INGESTED FUNDAMENTAL METRICS ===
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B
Classification: ${fundamentals.classification}
Fundamental Rating: ${fundamentals.fundamentalRating}
Trailing P/E: ${fundamentals.peRatioTrailing ?? currentPE ?? 'N/A'} (Industry Avg: ${fundamentals.priceToEarnings?.industryAverage ?? 'N/A'}, 5Y Avg: ${fundamentals.priceToEarnings?.historicalAverage5Y !== null && fundamentals.priceToEarnings?.historicalAverage5Y !== undefined ? `${fundamentals.priceToEarnings.historicalAverage5Y}x` : 'Not Reported in SEC Summaries'})
Forward P/E: ${fundamentals.peRatioForward ?? 'N/A'}
PEG Ratio: ${fundamentals.pegRatio ?? 'N/A'}
Price / Book: ${currentPB ?? 'N/A'} (Industry Avg: ${fundamentals.priceToBook?.industryAverage ?? 'N/A'}, 5Y Avg: ${fundamentals.priceToBook?.historicalAverage5Y !== null && fundamentals.priceToBook?.historicalAverage5Y !== undefined ? `${fundamentals.priceToBook.historicalAverage5Y}x` : 'Not Reported in SEC Summaries'})
EV / EBITDA: ${fundamentals.evToEbitda ?? 'N/A'}
Dividend Yield: ${fundamentals.dividendYield.toFixed(2)}%
Return on Equity (ROE): ${fundamentals.returnOnEquity.toFixed(1)}%
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B
TTM Net Income: $${(fundamentals.netIncomeTTM / 1e9).toFixed(2)}B
Gross Margin: ${fundamentals.grossMargin !== null && fundamentals.grossMargin !== undefined ? `${fundamentals.grossMargin.toFixed(1)}%` : 'Not Reported in SEC Summaries'}
Operating Margin: ${fundamentals.operatingMargin.toFixed(1)}%
Operating Cash Flow: $${(fundamentals.cashFlow.operatingCashFlow / 1e9).toFixed(2)}B
TTM Free Cash Flow: ${fundamentals.freeCashFlowTTM !== null && fundamentals.freeCashFlowTTM !== undefined ? `$${(fundamentals.freeCashFlowTTM / 1e9).toFixed(2)}B` : 'Not Reported in SEC Summaries (CapEx unfiled)'} (Status: ${fundamentals.cashFlow.status})

=== DEBT STRUCTURE BREAKDOWN ===
Total Debt: $${(fundamentals.totalDebt / 1e9).toFixed(2)}B
Short-Term Debt: ${fundamentals.shortTermDebt !== null && fundamentals.shortTermDebt !== undefined ? `$${(fundamentals.shortTermDebt / 1e9).toFixed(2)}B` : 'Not Disclosed in SEC Filings'}
Long-Term Debt: ${fundamentals.longTermDebt !== null && fundamentals.longTermDebt !== undefined ? `$${(fundamentals.longTermDebt / 1e9).toFixed(2)}B` : 'Not Disclosed in SEC Filings'}
Short vs Long-Term Debt Ratio: ${fundamentals.shortVsLongTermRatio}
Recent Debt Changes: ${fundamentals.recentChangesInDebt}
Debt Risks: ${fundamentals.debtRisks}
Cash & Equivalents: $${(fundamentals.cashAndEquivalents / 1e9).toFixed(2)}B
Net Debt: $${(fundamentals.netDebt / 1e9).toFixed(2)}B
Debt to Equity: ${fundamentals.debtToEquity !== null && fundamentals.debtToEquity !== undefined ? `${fundamentals.debtToEquity.toFixed(2)}x` : 'N/A'}
Current Ratio: ${fundamentals.currentRatio !== null && fundamentals.currentRatio !== undefined ? `${fundamentals.currentRatio.toFixed(2)}x` : 'N/A'}
ROIC: ${fundamentals.roic !== null && fundamentals.roic !== undefined ? `${fundamentals.roic.toFixed(1)}%` : 'N/A'}
Beta: ${fundamentals.beta ?? 1.0}
52-Week Range: $${fundamentals.fiftyTwoWeekLow.toFixed(2)} - $${fundamentals.fiftyTwoWeekHigh.toFixed(2)}

=== 8-QUARTER EPS PROGRESSION ===
Current TTM EPS: $${fundamentals.earningsPerShare.currentTTM.toFixed(2)}
Quarters History:
${fundamentals.earningsPerShare.quarterlyEPSPast2Years && fundamentals.earningsPerShare.quarterlyEPSPast2Years.length > 0
      ? fundamentals.earningsPerShare.quarterlyEPSPast2Years.map((q) => {
        const yoy = q.yoyChangePercent !== null && q.yoyChangePercent !== undefined
          ? ` (${q.yoyChangePercent >= 0 ? '+' : ''}${q.yoyChangePercent.toFixed(1)}% YoY)`
          : '';
        const beat = q.beat !== undefined ? ` [${q.beat ? 'Beat' : 'Miss/In-Line'}]` : '';
        return `- ${q.quarter}: $${q.eps.toFixed(2)}${yoy}${beat}`;
      }).join('\n')
      : '- Historical quarterly EPS not reported in available SEC disclosures'
    }

=== COMPANY PROFILE & SEGMENT BREAKDOWN ===
Description: ${fundamentals.businessSummary || fundamentals.description}
${fundamentals.segmentRevenueBreakdown && fundamentals.segmentRevenueBreakdown.length > 0 ? `Reporting Segments (10-K):\n${fundamentals.segmentRevenueBreakdown.map(s => `- ${s.segment}${s.revenue ? `: $${(s.revenue / 1e9).toFixed(2)}B` : ''}`).join('\n')}` : 'Reporting Segments: Disclosed under consolidated operating entity'}

=== SECTOR DYNAMICS ===
Sector Backdrop: ${fundamentals.sectorDynamics?.industryCondition || fundamentals.industryQuestions.industryCondition}
Key Sector Obstacles: ${fundamentals.sectorDynamics?.obstaclesAndChallenges || fundamentals.industryQuestions.obstaclesAndChallenges}
Macro/Regulatory Risks: ${fundamentals.sectorDynamics?.economicPoliticalCulturalRisks || fundamentals.industryQuestions.economicPoliticalCulturalRisks}

=== QUALITATIVE MOAT (5 MORNINGSTAR PILLARS) & MANAGEMENT ===
Management Quality Rating: ${fundamentals.managementQuality.rating}
Management Track Record: ${fundamentals.managementQuality.trackRecord}
Economic Moat Rating: ${fundamentals.competitiveMoat.rating} (Moat Trend: ${fundamentals.competitiveMoat.trend || 'Stable'})
Moat Summary: ${fundamentals.competitiveMoat.summary}
${fundamentals.competitiveMoat.sources ? `5 Moat Pillars:
- Intangible Assets: [${fundamentals.competitiveMoat.sources.intangibleAssets.rating}] ${fundamentals.competitiveMoat.sources.intangibleAssets.substantiation}
- Switching Costs: [${fundamentals.competitiveMoat.sources.switchingCosts.rating}] ${fundamentals.competitiveMoat.sources.switchingCosts.substantiation}
- Network Effect: [${fundamentals.competitiveMoat.sources.networkEffect.rating}] ${fundamentals.competitiveMoat.sources.networkEffect.substantiation}
- Cost Advantage: [${fundamentals.competitiveMoat.sources.costAdvantage.rating}] ${fundamentals.competitiveMoat.sources.costAdvantage.substantiation}
- Efficient Scale: [${fundamentals.competitiveMoat.sources.efficientScale.rating}] ${fundamentals.competitiveMoat.sources.efficientScale.substantiation}` : ''}

=== COMPETITOR BENCHMARKING MATRIX ===
${fundamentals.competitorBenchmarking && fundamentals.competitorBenchmarking.peers.length > 0 ? `Peer Benchmark Group:
${fundamentals.competitorBenchmarking.peers.map(p => `- ${p.ticker} (${p.name}): Market Cap $${(p.marketCap / 1e9).toFixed(1)}B | P/E: ${p.peRatio !== null ? p.peRatio + 'x' : 'N/A'} | EV/EBITDA: ${p.evToEbitda !== null ? p.evToEbitda + 'x' : 'N/A'} | Moat: ${p.moat} | ROIC: ${p.roic !== null ? p.roic + '%' : 'N/A'}`).join('\n')}
Peer Group Synthesis: ${fundamentals.competitorBenchmarking.commentary || 'Relative valuation and competitive positioning evaluated against sector peers.'}` : 'Peer Benchmarking: Analyzed against broader sector medians'}

Company Revenue Model: ${fundamentals.companyQuestions.howCompanyMakesMoney}
Product Demand Driver: ${fundamentals.companyQuestions.productsDemandAndWhy}
Past Performance: ${fundamentals.companyQuestions.pastPerformanceSummary}
Growth & Profitability Outlook: ${fundamentals.companyQuestions.growthAndProfitabilityOutlook}

=== MULTI-MODEL VALUATIONS & MORNINGSTAR STAR RATING ===
Consensus Fair Value: $${(fundamentals.valuationModels.consensusFairValue ?? 0).toFixed(2)} (Verdict: ${fundamentals.valuationModels.verdict})
Morningstar Rating: ${fundamentals.starRatingString || '★★★☆☆'} (${fundamentals.starRating || 3} Stars)
Uncertainty Rating: ${fundamentals.uncertaintyRating || 'Medium'} (Price/Fair Value: ${fundamentals.priceToFairValue?.toFixed(2) || '1.00'}x)
5-Star Price (Undervalued / Buy Hurdle): $${fundamentals.fiveStarPrice?.toFixed(2) || 'N/A'}
1-Star Price (Overvalued / Sell Hurdle): $${fundamentals.oneStarPrice?.toFixed(2) || 'N/A'}

Valuation Models Breakdown:
- 3-Stage DCF (Moat Fade: ${fundamentals.valuationModels.dcf.fadeYears ?? 10}Y, Stage 1 Growth: ${fundamentals.valuationModels.dcf.stage1GrowthRate ?? 5}%, Ke/WACC: ${fundamentals.valuationModels.dcf.discountRate ?? 8}%): $${(fundamentals.valuationModels.dcf.fairValue ?? fundamentals.valuationModels.dcf.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.dcf.upside ?? fundamentals.valuationModels.dcf.upsidePercent ?? 0}%)
  [Normalized FCFF: $${fundamentals.valuationModels.dcf.normalizedFcf ? (fundamentals.valuationModels.dcf.normalizedFcf / 1e9).toFixed(2) + 'B' : 'N/A'} | Stage 1 PV: $${fundamentals.valuationModels.dcf.stage1Pv ? (fundamentals.valuationModels.dcf.stage1Pv / 1e9).toFixed(2) + 'B' : 'N/A'} | Stage 2 PV: $${fundamentals.valuationModels.dcf.stage2Pv ? (fundamentals.valuationModels.dcf.stage2Pv / 1e9).toFixed(2) + 'B' : 'N/A'} | Stage 3 PV: $${fundamentals.valuationModels.dcf.stage3Pv ? (fundamentals.valuationModels.dcf.stage3Pv / 1e9).toFixed(2) + 'B' : 'N/A'} | Implied EV: $${fundamentals.valuationModels.dcf.enterpriseValue ? (fundamentals.valuationModels.dcf.enterpriseValue / 1e9).toFixed(2) + 'B' : 'N/A'}]
- Dividend Discount Model (DDM): $${(fundamentals.valuationModels.ddm.fairValue ?? fundamentals.valuationModels.ddm.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.ddm.upside ?? fundamentals.valuationModels.ddm.upsidePercent ?? 0}%)
- Relative Multiples Valuation: $${(fundamentals.valuationModels.relativeValuation.fairValue ?? fundamentals.valuationModels.relativeValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.relativeValuation.upside ?? fundamentals.valuationModels.relativeValuation.upsidePercent ?? 0}%)
- Rapid PEG Model: $${(fundamentals.valuationModels.rapidStockValuation.fairValue ?? fundamentals.valuationModels.rapidStockValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.rapidStockValuation.upside ?? fundamentals.valuationModels.rapidStockValuation.upsidePercent ?? 0}%)
- Residual Income Model: $${(fundamentals.valuationModels.residualIncomeModel.fairValue ?? fundamentals.valuationModels.residualIncomeModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.residualIncomeModel.upside ?? fundamentals.valuationModels.residualIncomeModel.upsidePercent ?? 0}%)
- Asset-Based Liquidation Floor: $${(fundamentals.valuationModels.assetBasedValuation.fairValue ?? fundamentals.valuationModels.assetBasedValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.assetBasedValuation.upside ?? fundamentals.valuationModels.assetBasedValuation.upsidePercent ?? 0}%)
- Excess Return Spread Model: $${(fundamentals.valuationModels.excessReturnModel.fairValue ?? fundamentals.valuationModels.excessReturnModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.excessReturnModel.upside ?? fundamentals.valuationModels.excessReturnModel.upsidePercent ?? 0}%)
- Industry Specific Model: $${(fundamentals.valuationModels.industrySpecificModel.fairValue ?? fundamentals.valuationModels.industrySpecificModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.industrySpecificModel.upside ?? fundamentals.valuationModels.industrySpecificModel.upsidePercent ?? 0}%)

=== MACROECONOMIC CONTEXT ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}%
US 2-Year Yield: ${macro.us2YearYield.toFixed(2)}%
Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}%
ECB Policy Rate: ${macro.ecbPolicyRate.toFixed(2)}%
VIX Volatility Index: ${macro.vixIndex.toFixed(2)}
WTI Crude Oil: $${macro.crudeOilWTI.toFixed(2)}/bbl
Macro Summary: ${macro.sectorImpactSummary}

=== SOCIAL SENTIMENT & FLOW ANOMALIES ===
Bullish Sentiment: ${sentiment.bullishPercent}%
Bearish Sentiment: ${sentiment.bearishPercent}%
Volume Anomaly Ratio: ${sentiment.volumeAnomalyRatio}x (vs 90d average)
Artificial Inflation Risk: ${sentiment.artificialInflationRisk} (Artificially Inflated: ${sentiment.isArtificiallyInflated})
Major Price Driver: ${sentiment.majorPriceDriver}
Option Gamma Imbalance: ${sentiment.optionGammaImbalance ? `${sentiment.optionGammaImbalance.riskLevel} (${sentiment.optionGammaImbalance.netGammaExposure}${sentiment.optionGammaImbalance.imbalanceRatio !== null ? `, Ratio: ${sentiment.optionGammaImbalance.imbalanceRatio}x` : ''}) - ${sentiment.optionGammaImbalance.status}` : 'No Listed Options Chain'}
Free Float Concentration: ${sentiment.freeFloatConcentration ? `${sentiment.freeFloatConcentration.concentrationLevel} (${sentiment.freeFloatConcentration.freeFloatPercent !== null ? `${sentiment.freeFloatConcentration.freeFloatPercent}% float` : 'N/A'}${sentiment.freeFloatConcentration.floatTurnoverRatio !== null ? `, ${(sentiment.freeFloatConcentration.floatTurnoverRatio * 100).toFixed(1)}% session float turnover` : ''}) - ${sentiment.freeFloatConcentration.status}` : 'Standard Public Float'}
News Impact: ${sentiment.newsImpact}
Social Discussion Tracking: ${sentiment.socialDiscussionSummary || `Tracked ${sentiment.sourcesAnalyzed} posts in session`}${sentiment.volumeChange24h > 0 ? ` (24h Delta: +${sentiment.volumeChange24h}%)` : ' (No 24h baseline delta)'}
Key Themes: ${sentiment.dominantThemes.join(', ')}

=== CATALYST DYNAMICS & EXPECTATIONS DIVERGENCE (TIER 1 INTELLIGENCE) ===
Catalyst-Price Alignment: ${sentiment.catalystAlignment || 'ALIGNED'}
${sentiment.catalystSynthesis ? `Expectations vs Reality Gap: ${sentiment.catalystSynthesis}` : ''}
${sentiment.filteredHeadlines && sentiment.filteredHeadlines.length > 0 ? `Verified Entity-Relevant Headlines (Relevance >= 6/10):\n${sentiment.filteredHeadlines.map((h) => `- [${h.source}] (${h.headlineSentiment}, Relevance: ${h.relevance}/10) ${h.title}`).join('\n')}` : ''}

=== WEB & COMMUNITY SCRAPED CATALYSTS ===
${sentiment.recentHeadlines && sentiment.recentHeadlines.length > 0 ? `Latest Financial News Headlines:\n${sentiment.recentHeadlines.map((h) => `- ${h}`).join('\n')}` : 'Latest Financial News: Standard market flow'}
${sentiment.sampleCatalysts && sentiment.sampleCatalysts.length > 0 ? `Community Discussion Samples:\n${sentiment.sampleCatalysts.map((c) => `- ${c}`).join('\n')}` : ''}
${sentiment.secFilingSummary ? `SEC EDGAR Regulatory Filing: ${sentiment.secFilingSummary}` : ''}

Please format your response strictly as JSON with this schema:
{
  "title": "string",
  "seoDescription": "string (150-160 chars)",
  "slug": "string (lowercase url slug, e.g. 'nvda-earnings-surge-valuation-analysis')",
  "primaryKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "secondaryKeywords": ["keyword 4", "keyword 5"],
  "catalystSummary": "string (concise 2-sentence summary of why it moved)",
  "catalystAlignment": "${sentiment.catalystAlignment || 'ALIGNED'}",
  "catalystSynthesis": "string (explicitly discuss market expectations vs. reality and catalyst divergence)",
  "markdownBody": "string (the complete markdown report with headings ##, markdown tables, and evidence)",
  "extractedFigures": {
    "peRatio": ${fundamentals.peRatioTrailing ?? fundamentals.peRatioForward ?? 0},
    "revenueTTM": ${fundamentals.revenueTTM},
    "operatingMargin": ${fundamentals.operatingMargin},
    "freeCashFlow": ${fundamentals.freeCashFlowTTM !== null ? fundamentals.freeCashFlowTTM : 'null'},
    "netDebt": ${fundamentals.netDebt},
    "movePercent": ${mover.changePercent}
  },
  "theses": {
    "bull": [
      { "point": "string", "sources": [{ "name": "string", "url": "https://..." }], "deductionChain": "string" }
    ],
    "bear": [
      { "point": "string", "sources": [{ "name": "string", "url": "https://..." }], "deductionChain": "string" }
    ]
  },
  "socialHooks": {
    "twitterThread": [
      "Tweet 1 (hook with ticker $${mover.ticker}, move, venue, and core finding)...",
      "Tweet 2 (fundamental metric breakdown with P/E and FCF)...",
      "Tweet 3 (macro context & valuation asymmetry, ending with link placeholder)..."
    ],
    "redditPost": {
      "title": "[Deep Dive] $${mover.ticker}: Fundamental Breakdown Following Today's ${mover.changePercent.toFixed(1)}% Move",
      "bodyMarkdown": "Comprehensive reddit markdown analysis with disclaimer...",
      "flair": "DD / Fundamental"
    },
    "telegramAlert": "🚨 **$${mover.ticker} Alert**: ${mover.name} moved ${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(1)}% today on ${mover.moneyMarketTradingVenue}. Key fundamental breakdown: ..."
  }
}`;
}

export function buildExecutiveSummarySystemPrompt(): string {
  return `You are a Senior Quantitative Equity Research Analyst and Lead Market Strategist.
Your specific role is to author an institutional-grade, empirical, and deep "Executive Summary & Session Catalyst" section for today's equity research report.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

CORE OBJECTIVES FOR THIS EXECUTIVE SUMMARY & SESSION CATALYST:
1. Session Catalyst Identification & Precision:
   - Precisely pinpoint the catalyst responsible for today's price dislocation (e.g. SEC 8-K/10-Q filing, multi-year commercial contract, clinical trial readout, secondary offering dilution, earnings beat/miss, short-squeeze mechanics, or sector macro contagion).
   - Classify the catalyst nature (e.g., Commercial Contract, Regulatory Filing, Capital Structure / Dilution, Earnings Surprise, Macro / Sector Momentum, Retail Hype).
2. Catalyst-Price Alignment & Expectations vs. Reality Gap:
   - Critically evaluate whether the magnitude of the move aligns with empirical evidence, or exhibits divergence (e.g. DIVERGENT_SELL_THE_NEWS, DIVERGENT_RELIEF_RALLY, MACRO_DOMINATED, NOISE_SPECULATION).
   - Deconstruct the expectations gap: Explain how pre-session market positioning, whisper numbers, and existing valuation multiples collided with the actual news revelation.
3. Order Flow & Volume Anomaly Breakdown:
   - Quantify trading volume against 90-day historical averages (Volume Anomaly Ratio).
   - Evaluate whether order flow represents authentic institutional accumulation/distribution or transient retail momentum.
   - Note the trading venue (e.g. Nasdaq Global Select, NYSE American, OTC Markets) and whether the asset trades under penny stock parameters (< $5.00).
4. Macro Backdrop Interplay:
   - Synthesize how prevailing benchmark yields (US 10Y), Fed/ECB monetary policies, and broad market volatility (VIX) interact with this stock's duration and valuation multiples.
5. High-Level Valuation & Solvency Anchor:
   - Anchor the session move against the multi-model Consensus Fair Value target, Morningstar Star Rating, Economic Moat, and near-term debt maturity profile.
6. Institutional Key Takeaways:
   - Distill 3 to 4 analytical takeaways in clear, bulleted institutional style.
7. Formatted Section Markdown:
   - Construct the complete markdown starting with "## Executive Summary & Session Catalyst", incorporating:
     * High-density narrative paragraphs synthesizing the session catalyst, expectation gap, and order flow.
     * A blockquote highlighting "Key Session Takeaways".
     * The standard Key Session Metric markdown table.

OUTPUT FORMAT:
You MUST respond with valid, parseable JSON conforming strictly to this schema:
{
  "catalystHeadline": "string (crisp 1-sentence headline of the driver)",
  "catalystCategory": "string",
  "expectationsVsReality": "string (2-3 paragraphs analyzing the expectations vs reality gap)",
  "sessionDynamics": "string (narrative explaining price action, volume divergence, and venue characteristics)",
  "macroeconomicContext": "string (how macro rates, VIX, or sector factors influenced the session)",
  "fundamentalImpact": "string (how the catalyst alters or confirms the company's fundamental trajectory)",
  "keyTakeaways": [
    "Takeaway 1...",
    "Takeaway 2...",
    "Takeaway 3..."
  ],
  "formattedMarkdown": "string (The complete markdown section starting with '## Executive Summary & Session Catalyst')"
}`;
}

export function buildExecutiveSummaryUserPrompt(
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

  return `Generate an institutional-grade "Executive Summary & Session Catalyst" section for:
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

Produce the comprehensive JSON output strictly according to the specified schema.`;
}
