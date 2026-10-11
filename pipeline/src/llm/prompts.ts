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
   - High-impact, SEO-optimized title adhering to institutional equity research conventions.
     Preferred title styles and examples:
     * Deep Dive / Evolution style: "Stock Deep Dive: [Company] - [Key Thesis / Evolution / Structural Story]" (e.g. "Stock Deep Dive: BNP Paribas - From European Bank to Diversified Financial Compounder")
     * Direct Buy Question style: "[Company] Stock Analysis: Is [TICKER] a Buy?" (e.g. "Microsoft Stock Analysis: Is MSFT a Buy?")
     * Geography / Cap / Resilience style: "[Company] Stock Analysis: Is This [Geography/Sector/Cap] Still a Buy?" (e.g. "Norbit Stock Analysis: Is This Norwegian Small-Cap Still a Buy?")
     * Forward Horizon style: "[Company] Stock Analysis: Is [TICKER] a Buy in [Year]?" (e.g. "Alphabet Stock Analysis: Is GOOGL a Buy in 2026?")
     * Valuation Asymmetry / Quality style: "[Company] Stock Analysis: Quality But Not At The Right Price" (e.g. "Badger Meter Stock Analysis: Quality But Not At The Right Price")
   - Do NOT use generic or mechanical formulas like "[Company] ([TICKER]) Surges +X%: Fundamental & Valuation Analysis". Pick the most analytically appropriate title style based on valuation verdict, moat quality, and capitalization.
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
   - Thoroughly answer the 4 Key Company Questions & 3 Key Industry Questions grounded in operational facts:
     * For "How Does <company> Make Money?", you MUST demonstrate using bullet points across business segments without trimming, abbreviating, or truncating any details, using this exact structure:
       "[Company] makes money through [N] business segments:
       - [Segment 1 Name]. [Specific products/maritime/technology/services sold, margin profile, and demand drivers/target customer base]
       - [Segment 2 Name]. [Products/software sold, recurring revenue vs transaction, subscriptions/services]
       - [Segment 3 Name]. [R&D, manufacturing capacity, or commercial product lines]
       
       [Concluding paragraph]: Most activities are cyclical and depend on contracts with limited visibility. However, because there are [N] different activities the cycles do not always move in perfect synchronisation which helps smooth cyclicality."
     * For "Core Products & Resilient Demand Rationale":
       - Show concise introductory sentence(s).
       - Show structured bullet points, using bolding to highlight key phrases (e.g. mission-critical utility, customer switching friction, secular tailwinds).
       - Footer must be concise, conclusive, and specific to the company.
     * For "Historical Operational & Financial Performance":
       - Show bullet points detailing key operational and financial metrics (TTM revenue, operating margin EBIT, ROIC, debt-to-equity leverage, cash reserves) and significant events/periods for the company.
       - Footer must be concise, conclusive, and specific to the company.
     * For "Medium-Term Growth & Profitability Roadmap":
       - Show company-specific introduction sentence.
       - Show bullet points with key drivers of growth and profitability (capacity expansion, operating leverage, ROIC vs WACC value spread creation, disciplined reinvestment).
       - Footer must be concise, conclusive, and specific to the company.
     * In "Industry Research Deep-Dive: Sector Dynamics & Headwinds":
       - For all sections, present pills, badges, and highlight key phrases/metrics using bolding.
       - For "Macro Condition in Simplified Terms":
         * Generate a "Macro Condition" in simplified terms (in plain, non-technical language that an everyday retail investor can easily understand).
         * Clearly explain how the overall industry is performing, current customer demand, and secular trends without using confusing financial jargon, discount-rate formulas, or benchmark ETF multiples.
         * Ground this directly in the company's real industry context, rather than using generic, misleading platitudes.
         * Populate the "macroConditionSimplified" JSON property with this non-technical summary.
       - For "Obstacles and Challenges in Simplified Terms":
         * Generate simplified key operational obstacles and challenges (in plain, non-technical language for retail investors).
         * Populate the "obstaclesAndChallengesSimplified" JSON property with this summary.
       - For "Economic, Political, and Cultural Risks in Simplified Terms":
         * Generate simplified key macro, regulatory, and policy risks (in plain, non-technical language for retail investors).
         * Populate the "economicPoliticalCulturalRisksSimplified" JSON property with this summary.
       - For the technical institutional breakdown, synthesize the full macroeconomic backdrop.

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
   - For BOTH Bull Case and Bear Case, retain quantitative/valuation points AND include the core quality thesis points:
     Core Bullish Thesis MUST include:
     * Empirical valuation/operating cash flow points (multi-model asymmetry, margin resilience).
     * Vertical integration: The company develops AND manufactures/operates most of what it sells, giving control over product development, quality, supply chain, capacity management, and reducing lead times from R&D to commercialization.
     * Great M&A strategy and execution: Acquires companies/assets complementary to its existing portfolio rather than unrelated assets, strengthening its ecosystem, easing integration, and completing transactions at reasonable, accretive valuations.
     * Capital-efficient growth: Strong organic growth, acquisitions, and disciplined capital return policy while maintaining a clean balance sheet and high returns on capital (ROIC/ROE).
     Core Bearish Risk Theses MUST include:
     * Empirical macro and balance sheet points (interest rate sensitivity, refinancing exposure).
     * Concentration risks: Key vertical (e.g. defense, primary cloud, enterprise) + customer concentration, where a large share of recent growth comes from this vertical and any slowdown has an outsized impact on the revenue mix.
     * Ambitious targets: Management expects aggressive long-term organic growth targets that outstrip conservative analyst forecasts, creating asymmetric guidance-cut and de-rating risks.
     * Cyclical revenue: A major part of revenue is project-driven and depends on customer investment cycles, creating quarterly volatility and margin fluctuations across capacity utilization cycles.
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
Technical Macro Condition: ${fundamentals.sectorDynamics?.industryCondition || fundamentals.industryQuestions.industryCondition}
Key Sector Obstacles: ${fundamentals.sectorDynamics?.obstaclesAndChallenges || fundamentals.industryQuestions.obstaclesAndChallenges}
Macro/Regulatory Risks: ${fundamentals.sectorDynamics?.economicPoliticalCulturalRisks || fundamentals.industryQuestions.economicPoliticalCulturalRisks}
Macro Condition Directive: Provide "macroConditionSimplified" summarizing this industry's macro condition in clear, simplified terms (plain, non-technical language for retail investors, avoiding complex jargon or misleading generic templates).
Obstacles Directive: Provide "obstaclesAndChallengesSimplified" summarizing this industry's key operational obstacles in clear, simplified terms (plain, non-technical language for retail investors, avoiding generic templates).
Risks Directive: Provide "economicPoliticalCulturalRisksSimplified" summarizing this industry's macro/political/cultural risks in clear, simplified terms (plain, non-technical language for retail investors, avoiding generic templates).

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

Synthesize all fundamental, valuation, macro, and catalyst intelligence into the structured research report schema.`;
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
Synthesize the analysis and output structured JSON adhering strictly to the enforced schema.`;
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

export function buildReportPart1SystemPrompt(): string {
  return `You are a Senior Quantitative Equity Research Analyst and Financial Systems Architect.
Your role is to author Part 1 of an institutional-grade fundamental and solvency equity research report for an equity that moved significantly in today's trading session.
Part 1 focuses specifically on Market Dynamics, Balance Sheet Solvency, Operating Health, and Core Company Profile (Sections 1 through 4).

${PUBLISHER_COMPLIANCE_DIRECTIVE}

DETAILED REPORT STRUCTURE & DIRECTIVES FOR PART 1:

1. Title & Meta Information:
   - High-impact, SEO-optimized title adhering to institutional equity research conventions.
     Preferred title styles:
     * Deep Dive / Evolution style: "Stock Deep Dive: [Company] - [Key Thesis / Evolution / Structural Story]"
     * Direct Buy Question style: "[Company] Stock Analysis: Is [TICKER] a Buy?"
     * Geography / Cap / Resilience style: "[Company] Stock Analysis: Is This [Geography/Sector/Cap] Still a Buy?"
     * Forward Horizon style: "[Company] Stock Analysis: Is [TICKER] a Buy in [Year]?"
     * Valuation Asymmetry / Quality style: "[Company] Stock Analysis: Quality But Not At The Right Price"
   - Do NOT use mechanical formulas like "[Company] ([TICKER]) Surges +X%: Fundamental & Valuation Analysis".
   - Generate SEO description, clean slug, and arrays of primary and secondary search keywords.
   - Specify catalyst summary, catalyst alignment (ALIGNED, DIVERGENT_SELL_THE_NEWS, DIVERGENT_RELIEF_RALLY, MACRO_DOMINATED, NOISE_SPECULATION), and analytical catalyst synthesis (expectations vs reality gap).

2. Extracted Figures:
   - Provide extractedFigures (peRatio, revenueTTM, operatingMargin, freeCashFlow, netDebt, movePercent) strictly matching provided numbers.

3. Markdown Body (Sections 1 through 4):
   Your markdown body must begin with "## 1. Trading Activity & Artificial Inflation Analysis" and include Sections 1, 2, 3, and 4 separated by markdown horizontal rules (---):

   ## 1. Trading Activity & Artificial Inflation Analysis
   - Volume Anomaly Ratio vs 90-day average.
   - Option Gamma Imbalance: risk level, net gamma exposure, call/put open interest and volume skew, dealer short gamma sensitivity.
   - Free Float Concentration: float turnover, percentage of freely tradable float, liquidity vacuum risk.
   - Major price driver and catalyst-price alignment.
   - Analytical synthesis of expectations vs. reality.
   - Quantitative sentiment index (0-100) and verified news / social media footprint.

   ---

   ## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)
   - Total debt obligations, liquid cash and equivalents, net debt position.
   - Granular debt breakdown: Short-term debt vs. Long-term debt.
   - Short vs. Long-term debt ratio.
   - Recent changes in debt obligations (facilities, notes, dilution, repayments).
   - Solvency & credit risk audit.
   - Debt-to-Equity ratio and Current ratio.

   ---

   ## 3. Profitability, Operating Health & Segment Dynamics
   - Business overview and 10-K reporting segment breakdown.
   - TTM Revenue, Net Income, Gross Profit Margin, Operating Margin (EBIT), Return on Equity (ROE), Operating Cash Flow, TTM Free Cash Flow status, and ROIC.
   - Trailing 8-Quarter EPS History table (Quarter, Diluted EPS, Benchmark Beat/Miss).

   ---

   ## 4. Qualitative Deep Dive: 4 Key Company Questions
   - Q1: How does the company make money?
     You MUST demonstrate using bullet points across business segments without trimming or truncating:
     "[Company] makes money through [N] business segments:
     - [Segment 1 Name]: 
      * [Specific products/services sold]
      * [Margin profile]
      * [Demand drivers]
     - [Segment 2 Name]: 
      * [Products/software sold]
      * [Recurring revenue vs transaction]
      * [Subscriptions, Maintenance revenue, Up-selling, Cross-selling revenue, Other revenue streams]
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
   - Q2: Are its products or services in demand, and why?
     Concise intro sentence, structured bullet points with bold key phrases, concise conclusive company-specific footer.
   - Q3: How has the company performed in the past?
     Bullet points detailing operational/financial metrics and significant milestones, concise conclusive footer.
   - Q4: Is the company positioned for growth and profitability?
     Company-specific intro, bullet points on growth drivers and disciplined reinvestment, concise conclusive footer.

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to the REPORT_PART1_SCHEMA. No conversational preamble.`;
}

export function buildReportPart1UserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const currentPB = typeof fundamentals.priceToBook === 'object' ? fundamentals.priceToBook?.current : fundamentals.priceToBook;
  const currentPE = typeof fundamentals.priceToEarnings === 'object' ? fundamentals.priceToEarnings?.current : fundamentals.peRatioTrailing;

  return `Generate Part 1 (Market Microstructure, Solvency, Operating Health & Company Profile - Sections 1 through 4) for:

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
Price / Book: ${currentPB ?? 'N/A'}
Gross Margin: ${fundamentals.grossMargin !== null && fundamentals.grossMargin !== undefined ? `${fundamentals.grossMargin.toFixed(1)}%` : 'Not Reported in SEC Summaries'}
Operating Margin: ${fundamentals.operatingMargin.toFixed(1)}%
Return on Equity (ROE): ${fundamentals.returnOnEquity.toFixed(1)}%
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B
TTM Net Income: $${(fundamentals.netIncomeTTM / 1e9).toFixed(2)}B
Operating Cash Flow: $${(fundamentals.cashFlow.operatingCashFlow / 1e9).toFixed(2)}B
TTM Free Cash Flow: ${fundamentals.freeCashFlowTTM !== null && fundamentals.freeCashFlowTTM !== undefined ? `$${(fundamentals.freeCashFlowTTM / 1e9).toFixed(2)}B` : 'Not Reported in SEC Summaries (CapEx unfiled)'} (Status: ${fundamentals.cashFlow.status})
ROIC: ${fundamentals.roic !== null && fundamentals.roic !== undefined ? `${fundamentals.roic.toFixed(1)}%` : 'N/A'}
Beta: ${fundamentals.beta ?? 1.0}
52-Week Range: $${fundamentals.fiftyTwoWeekLow.toFixed(2)} - $${fundamentals.fiftyTwoWeekHigh.toFixed(2)}

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
Company Revenue Model: ${fundamentals.companyQuestions.howCompanyMakesMoney}
Product Demand Driver: ${fundamentals.companyQuestions.productsDemandAndWhy}
Past Performance: ${fundamentals.companyQuestions.pastPerformanceSummary}
Growth & Profitability Outlook: ${fundamentals.companyQuestions.growthAndProfitabilityOutlook}

=== SOCIAL SENTIMENT & FLOW ANOMALIES ===
Bullish Sentiment: ${sentiment.bullishPercent}% | Bearish: ${sentiment.bearishPercent}%
Volume Anomaly Ratio: ${sentiment.volumeAnomalyRatio}x (vs 90d average)
Artificial Inflation Risk: ${sentiment.artificialInflationRisk} (Artificially Inflated: ${sentiment.isArtificiallyInflated})
Major Price Driver: ${sentiment.majorPriceDriver}
Option Gamma Imbalance: ${sentiment.optionGammaImbalance ? `${sentiment.optionGammaImbalance.riskLevel} (${sentiment.optionGammaImbalance.netGammaExposure}${sentiment.optionGammaImbalance.imbalanceRatio !== null ? `, Ratio: ${sentiment.optionGammaImbalance.imbalanceRatio}x` : ''}) - ${sentiment.optionGammaImbalance.status}` : 'No Listed Options Chain'}
Free Float Concentration: ${sentiment.freeFloatConcentration ? `${sentiment.freeFloatConcentration.concentrationLevel} (${sentiment.freeFloatConcentration.freeFloatPercent !== null ? `${sentiment.freeFloatConcentration.freeFloatPercent}% float` : 'N/A'}${sentiment.freeFloatConcentration.floatTurnoverRatio !== null ? `, ${(sentiment.freeFloatConcentration.floatTurnoverRatio * 100).toFixed(1)}% session float turnover` : ''}) - ${sentiment.freeFloatConcentration.status}` : 'Standard Public Float'}
News Impact: ${sentiment.newsImpact}
Social Discussion Tracking: ${sentiment.socialDiscussionSummary || `Tracked ${sentiment.sourcesAnalyzed} posts in session`}${sentiment.volumeChange24h > 0 ? ` (24h Delta: +${sentiment.volumeChange24h}%)` : ''}

=== CATALYST DYNAMICS & EXPECTATIONS DIVERGENCE ===
Catalyst-Price Alignment: ${sentiment.catalystAlignment || 'ALIGNED'}
${sentiment.catalystSynthesis ? `Expectations vs Reality Gap: ${sentiment.catalystSynthesis}` : ''}
${sentiment.filteredHeadlines && sentiment.filteredHeadlines.length > 0 ? `Verified Headlines:\n${sentiment.filteredHeadlines.map((h) => `- [${h.source}] (${h.headlineSentiment}, Relevance: ${h.relevance}/10) ${h.title}`).join('\n')}` : ''}
${sentiment.secFilingSummary ? `SEC EDGAR Filing Context: ${sentiment.secFilingSummary}` : ''}

Synthesize Part 1 (Sections 1 through 4) strictly according to the REPORT_PART1_SCHEMA.`;
}

export function buildReportPart2SystemPrompt(): string {
  return `You are a Senior Quantitative Equity Research Analyst and Valuation Architect.
Your role is to author Part 2 of an institutional-grade fundamental and valuation equity research report for an equity that moved significantly in today's trading session.
Part 2 focuses specifically on Industry Dynamics, Competitive Moat, Multi-Model Valuation Suite, Macro Headwinds, and Evidence-Based Bull/Bear Theses (Sections 5 through 9).

${PUBLISHER_COMPLIANCE_DIRECTIVE}

DETAILED REPORT STRUCTURE & DIRECTIVES FOR PART 2:

1. Industry Dynamics in Simplified Terms:
   - Macro Condition in Simplified Terms (macroConditionSimplified):
     * Generate a "Macro Condition" in simplified terms (in plain, non-technical language that an everyday retail investor can easily understand).
     * Clearly explain how the overall industry is performing, current customer demand, and secular trends without using confusing financial jargon, discount-rate formulas, or benchmark ETF multiples.
     * Ground this directly in the company's real industry context, avoiding generic templates.
     * Populate the "macroConditionSimplified" JSON property with this summary.
   - Obstacles and Challenges in Simplified Terms (obstaclesAndChallengesSimplified):
     * Generate simplified key operational obstacles and challenges (in plain, non-technical language for retail investors).
     * Ground this directly in the company's real industry context, avoiding generic templates.
     * Populate the "obstaclesAndChallengesSimplified" JSON property with this summary.
   - Economic, Political, and Cultural Risks in Simplified Terms (economicPoliticalCulturalRisksSimplified):
     * Generate simplified key macro, regulatory, and policy risks (in plain, non-technical language for retail investors).
     * Ground this directly in the company's real industry context, avoiding generic templates.
     * Populate the "economicPoliticalCulturalRisksSimplified" JSON property with this summary.

2. Markdown Body (Sections 5 through 9):
   Your markdown body must begin with "## 5. Industry Deep Dive & Sector Dynamics" and include Sections 5, 6, 7, 8, and 9 separated by markdown horizontal rules (---):

   ## 5. Industry Deep Dive & Sector Dynamics
   - Present pills, badges, and bold key phrases.
   - Q1: How is the company's industry doing as a whole? (synthesize industry health, growth drivers, and include the non-technical simplified macro summary).
   - Q2: What are the obstacles and challenges the company faces?
   - Q3: Does the company face any economic, political, or cultural risks?

   ---

   ## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix
   - Management Quality Rating & Executive Track Record.
   - Economic Moat Rating & Moat Trend (Positive, Stable, Negative) with analytical substantiation.
   - Deconstruct Economic Moat into the 5 Morningstar Pillars in a markdown table:
     | Moat Pillar | Assessment | Analytical Substantiation |
     Covering Intangible Assets, Switching Costs, Network Effect, Cost Advantage, and Efficient Scale.
   - Competitor Benchmarking Matrix table:
     | Company | Ticker | Market Cap | Trailing P/E | EV/EBITDA | Economic Moat | ROIC |
     Benchmarking against sector peers, followed by peer benchmark commentary.

   ---

   ## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating)
   - Morningstar Star Rating (1 to 5 Stars: ★★★★★), Uncertainty Rating (Low, Medium, High, Very High, Extreme), Price/Fair Value, 5-Star buy hurdle, 1-Star trim hurdle.
   - Synthesize the 8 independent valuation methodologies in a markdown table:
     | Valuation Methodology | Calculated Fair Value | Implied Upside | Model Assumptions & Parameters |
     Covering: 1. 3-Stage DCF (Moat Fade), 2. Dividend Discount Model (DDM), 3. Rapid Stock Valuation (PEG), 4. Relative Peer Multiples, 5. Residual Income Model (RIM), 6. Asset-Based Valuation, 7. Sector Asset Capacity Model, 8. Excess Return Model (EVA), and Consensus Fair Value Target.
   - 3-Stage DCF parameters: Normalized FCFF, Moat Fade Duration, Enterprise Value, Equity Value.
   - Historical & Industry Benchmark Comparison: Trailing P/E, Price-to-Book (P/B), EV/EBITDA, Dividend Yield.

   ---

   ## 8. Macroeconomic Headwinds & Sector Multiples
   - Sovereign yield backdrop (US 10-Year sovereign yield and discount rate pressure).
   - Central bank policy (Fed funds rate, ECB policy rate, cost of debt refinancing).
   - Volatility regime (Cboe VIX index and market risk tolerance).

   ---

   ## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)
   - Objective Bull Thesis (numbered points with Point, Cited References, and Deduction Chain):
     * Multi-model valuation asymmetry and operating resilience
     * Vertical integration: develops AND manufactures/operates most of what it sells, giving control over product development, quality, supply chain, capacity management
     * Great M&A strategy and execution: acquires complementary companies/assets, strengthening its ecosystem at reasonable, accretive valuations
     * Capital-efficient growth: strong organic growth, disciplined capital return, clean balance sheet, high ROIC/ROE
   - Objective Bear Thesis (numbered points with Point, Cited References, and Deduction Chain):
     * Macro and multiple friction (rates, yield curve, discount rate hurdle)
     * Short-term debt maturity and refinancing exposure
     * Concentration risks: key vertical + customer concentration, where slowdown would have outsized revenue mix impact
     * Ambitious targets: management organic growth targets outstripping conservative consensus forecasts
     * Cyclical revenue: project-driven demand, customer CapEx cycles, quarterly margin volatility
   - For every thesis point in BOTH cases, cite specific references/sources with URLs and provide step-by-step deduction chains.

3. Structured Theses & Social Hooks:
   - Provide structured "theses" object ({ bull: [...], bear: [...] }) matching the thesis points with name, url, and deductionChain.
   - Provide "socialHooks" object ({ twitterThread: [...], redditPost: { title, bodyMarkdown, flair }, telegramAlert }).

OUTPUT FORMAT:
Respond ONLY with valid, parseable JSON conforming strictly to the REPORT_PART2_SCHEMA. No conversational preamble.`;
}

export function buildReportPart2UserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  const currentPB = typeof fundamentals.priceToBook === 'object' ? fundamentals.priceToBook?.current : fundamentals.priceToBook;
  const currentPE = typeof fundamentals.priceToEarnings === 'object' ? fundamentals.priceToEarnings?.current : fundamentals.peRatioTrailing;

  return `Generate Part 2 (Industry Dynamics, Moat, 8 Valuation Models, Macro & Investment Theses - Sections 5 through 9) for:

=== EQUITY OVERVIEW ===
Ticker: ${mover.ticker}
Company: ${mover.name}
Exchange: ${mover.exchange} (${mover.region})
Current Price: $${mover.price.toFixed(2)} (${mover.currency})
Session Move: ${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B
Classification: ${fundamentals.classification}
Sector: ${fundamentals.sector} | Industry: ${fundamentals.industry}

=== SECTOR DYNAMICS ===
Technical Macro Condition: ${fundamentals.sectorDynamics?.industryCondition || fundamentals.industryQuestions.industryCondition}
Key Sector Obstacles: ${fundamentals.sectorDynamics?.obstaclesAndChallenges || fundamentals.industryQuestions.obstaclesAndChallenges}
Macro/Regulatory Risks: ${fundamentals.sectorDynamics?.economicPoliticalCulturalRisks || fundamentals.industryQuestions.economicPoliticalCulturalRisks}
Macro Condition Directive: Provide "macroConditionSimplified" summarizing this industry's macro condition in clear, simplified terms (plain, non-technical language for retail investors, avoiding complex jargon or misleading generic templates).
Obstacles Directive: Provide "obstaclesAndChallengesSimplified" summarizing this industry's key operational obstacles in clear, simplified terms (plain, non-technical language for retail investors, avoiding generic templates).
Risks Directive: Provide "economicPoliticalCulturalRisksSimplified" summarizing this industry's macro/political/cultural risks in clear, simplified terms (plain, non-technical language for retail investors, avoiding generic templates).

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

=== MULTI-MODEL VALUATIONS & MORNINGSTAR STAR RATING ===
Consensus Fair Value: $${(fundamentals.valuationModels.consensusFairValue ?? 0).toFixed(2)} (Verdict: ${fundamentals.valuationModels.verdict})
Morningstar Rating: ${fundamentals.starRatingString || '★★★☆☆'} (${fundamentals.starRating || 3} Stars)
Uncertainty Rating: ${fundamentals.uncertaintyRating || 'Medium'} (Price/Fair Value: ${fundamentals.priceToFairValue?.toFixed(2) || '1.00'}x)
5-Star Price (Undervalued / Buy Hurdle): $${fundamentals.fiveStarPrice?.toFixed(2) || 'N/A'}
1-Star Price (Overvalued / Sell Hurdle): $${fundamentals.oneStarPrice?.toFixed(2) || 'N/A'}

Valuation Models Breakdown:
- 3-Stage DCF (Moat Fade: ${fundamentals.valuationModels.dcf.fadeYears ?? 10}Y, Stage 1 Growth: ${fundamentals.valuationModels.dcf.stage1GrowthRate ?? 5}%, Ke/WACC: ${fundamentals.valuationModels.dcf.discountRate ?? 8}%): $${(fundamentals.valuationModels.dcf.fairValue ?? fundamentals.valuationModels.dcf.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.dcf.upside ?? fundamentals.valuationModels.dcf.upsidePercent ?? 0}%)
  [Normalized FCFF: $${fundamentals.valuationModels.dcf.normalizedFcf ? (fundamentals.valuationModels.dcf.normalizedFcf / 1e9).toFixed(2) + 'B' : 'N/A'} | Implied EV: $${fundamentals.valuationModels.dcf.enterpriseValue ? (fundamentals.valuationModels.dcf.enterpriseValue / 1e9).toFixed(2) + 'B' : 'N/A'} | Implied Equity: $${fundamentals.valuationModels.dcf.equityValue ? (fundamentals.valuationModels.dcf.equityValue / 1e9).toFixed(2) + 'B' : 'N/A'}]
- Dividend Discount Model (DDM): $${(fundamentals.valuationModels.ddm.fairValue ?? fundamentals.valuationModels.ddm.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.ddm.upside ?? fundamentals.valuationModels.ddm.upsidePercent ?? 0}%)
- Relative Multiples Valuation: $${(fundamentals.valuationModels.relativeValuation.fairValue ?? fundamentals.valuationModels.relativeValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.relativeValuation.upside ?? fundamentals.valuationModels.relativeValuation.upsidePercent ?? 0}%)
- Rapid PEG Model: $${(fundamentals.valuationModels.rapidStockValuation.fairValue ?? fundamentals.valuationModels.rapidStockValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.rapidStockValuation.upside ?? fundamentals.valuationModels.rapidStockValuation.upsidePercent ?? 0}%)
- Residual Income Model: $${(fundamentals.valuationModels.residualIncomeModel.fairValue ?? fundamentals.valuationModels.residualIncomeModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.residualIncomeModel.upside ?? fundamentals.valuationModels.residualIncomeModel.upsidePercent ?? 0}%)
- Asset-Based Liquidation Floor: $${(fundamentals.valuationModels.assetBasedValuation.fairValue ?? fundamentals.valuationModels.assetBasedValuation.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.assetBasedValuation.upside ?? fundamentals.valuationModels.assetBasedValuation.upsidePercent ?? 0}%)
- Excess Return Spread Model: $${(fundamentals.valuationModels.excessReturnModel.fairValue ?? fundamentals.valuationModels.excessReturnModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.excessReturnModel.upside ?? fundamentals.valuationModels.excessReturnModel.upsidePercent ?? 0}%)
- Industry Specific Model: $${(fundamentals.valuationModels.industrySpecificModel.fairValue ?? fundamentals.valuationModels.industrySpecificModel.intrinsicValue ?? 0).toFixed(2)} (${fundamentals.valuationModels.industrySpecificModel.upside ?? fundamentals.valuationModels.industrySpecificModel.upsidePercent ?? 0}%)

Historical Multiples:
- Trailing P/E: ${fundamentals.peRatioTrailing ?? currentPE ?? 'N/A'} (Industry Avg: ${fundamentals.priceToEarnings?.industryAverage ?? 'N/A'}, 5Y Avg: ${fundamentals.priceToEarnings?.historicalAverage5Y !== null && fundamentals.priceToEarnings?.historicalAverage5Y !== undefined ? `${fundamentals.priceToEarnings.historicalAverage5Y}x` : 'N/A'})
- Price / Book: ${currentPB ?? 'N/A'} (Industry Avg: ${fundamentals.priceToBook?.industryAverage ?? 'N/A'})
- EV / EBITDA: ${fundamentals.evToEbitda ?? 'N/A'}
- Dividend Yield: ${fundamentals.dividendYield.toFixed(2)}%

=== MACROECONOMIC CONTEXT ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}%
US 2-Year Yield: ${macro.us2YearYield.toFixed(2)}%
Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}%
ECB Policy Rate: ${macro.ecbPolicyRate.toFixed(2)}%
VIX Volatility Index: ${macro.vixIndex.toFixed(2)}
Macro Summary: ${macro.sectorImpactSummary}

Synthesize Part 2 (Sections 5 through 9) strictly according to the REPORT_PART2_SCHEMA.`;
}

