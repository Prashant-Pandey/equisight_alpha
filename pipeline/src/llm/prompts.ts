import type { MarketMover, FundamentalMetrics, MacroBackdrop, SocialSentiment } from '../types.js';

export const PUBLISHER_COMPLIANCE_DIRECTIVE = `
LEGAL COMPLIANCE & EDITORIAL DIRECTIVES (MANDATORY):
1. PUBLISHER'S EXEMPTION: This content is prepared solely for general educational and information purposes under the Publisher's Exemption of Section 202(a)(11)(D) of the U.S. Investment Advisers Act of 1940 and FINRA Rule 2210.
2. NO PERSONALIZED ADVICE: You MUST NOT offer personalized investment advice, price targets, buy/sell directives, or individual recommendations. Use impersonal, objective, analytical language (e.g., "The fundamental evidence suggests", "Market participants are weighing", "From a valuation multiple standpoint").
3. BALANCED EVIDENCE: You MUST present both an evidence-based Bull Case and Bear Case with equal empirical rigor.
4. FACTUAL INTEGRITY: You MUST ONLY cite numerical figures that match the provided ingested financial metrics. DO NOT invent revenue, P/E ratios, or margins.
`;

export function buildSystemPrompt(): string {
  return `You are a Senior Equity Research Director and Financial Systems Architect. 
Your role is to produce rigorous, institutional-grade fundamental and macroeconomic research reports on equities that moved significantly in today's trading session.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

REPORT STRUCTURE REQUIREMENTS:
1. Title: High-CTR, SEO-optimized title adhering to format: "[Company Name] ([Ticker]) [Surges|Drops] [X]%: Fundamental & Valuation Deep Dive"
2. Executive Summary: Core catalyst breakdown, volume anomaly, and market reaction.
3. Balance Sheet & Solvency Stress Test: Deep examination of cash, debt, interest coverage, and liquidity ratios.
4. Profitability & Operational Health: Margins (Gross, Operating), Free Cash Flow conversion, ROIC.
5. Macro Backdrop & Sector Headwinds/Tailwinds: Impact of 10Y Yields, central bank rates, inflation, and currency fluctuations.
6. Valuation & Peer Benchmarking: P/E, EV/EBITDA, P/B vs historical and sector medians.
7. Asymmetric Risk/Reward Matrix: Objective Bull Scenario vs Bear Scenario.
8. Social Distribution Hooks: 3-tweet thread with cashtag and Reddit r/stocks analytical post with markdown table.

OUTPUT FORMAT:
You MUST respond with valid, parseable JSON conforming strictly to the requested schema. No conversational preamble.`;
}

export function buildUserPrompt(
  mover: MarketMover,
  fundamentals: FundamentalMetrics,
  macro: MacroBackdrop,
  sentiment: SocialSentiment
): string {
  return `Generate an in-depth financial analysis report for the following equity:

=== MARKET MOVER DATA ===
Ticker: ${mover.ticker}
Company: ${mover.name}
Exchange: ${mover.exchange} (${mover.region})
Current Price: $${mover.price.toFixed(2)} (${mover.currency})
Session Move: ${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%
Volume: ${mover.volume.toLocaleString()} (Avg 3M: ${mover.avgVolume.toLocaleString()})
Category: ${mover.category.toUpperCase()}

=== INGESTED FUNDAMENTAL METRICS ===
Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(2)}B
Trailing P/E: ${fundamentals.peRatioTrailing ?? 'N/A'}
Forward P/E: ${fundamentals.peRatioForward ?? 'N/A'}
PEG Ratio: ${fundamentals.pegRatio ?? 'N/A'}
Price / Book: ${fundamentals.priceToBook ?? 'N/A'}
EV / EBITDA: ${fundamentals.evToEbitda ?? 'N/A'}
Dividend Yield: ${fundamentals.dividendYield.toFixed(2)}%
TTM Revenue: $${(fundamentals.revenueTTM / 1e9).toFixed(2)}B
TTM Net Income: $${(fundamentals.netIncomeTTM / 1e9).toFixed(2)}B
Gross Margin: ${fundamentals.grossMargin.toFixed(1)}%
Operating Margin: ${fundamentals.operatingMargin.toFixed(1)}%
TTM Free Cash Flow: $${(fundamentals.freeCashFlowTTM / 1e9).toFixed(2)}B
Total Debt: $${(fundamentals.totalDebt / 1e9).toFixed(2)}B
Cash & Equivalents: $${(fundamentals.cashAndEquivalents / 1e9).toFixed(2)}B
Net Debt: $${(fundamentals.netDebt / 1e9).toFixed(2)}B
Debt to Equity: ${fundamentals.debtToEquity ?? 'N/A'}
Current Ratio: ${fundamentals.currentRatio ?? 'N/A'}
ROIC: ${fundamentals.roic ?? 'N/A'}%
Beta: ${fundamentals.beta ?? 1.0}
52-Week Range: $${fundamentals.fiftyTwoWeekLow.toFixed(2)} - $${fundamentals.fiftyTwoWeekHigh.toFixed(2)}

=== MACROECONOMIC CONTEXT ===
US 10-Year Yield: ${macro.us10YearYield.toFixed(2)}%
US 2-Year Yield: ${macro.us2YearYield.toFixed(2)}%
Fed Funds Rate: ${macro.fedFundsRate.toFixed(2)}%
ECB Policy Rate: ${macro.ecbPolicyRate.toFixed(2)}%
VIX Volatility Index: ${macro.vixIndex.toFixed(2)}
WTI Crude Oil: $${macro.crudeOilWTI.toFixed(2)}/bbl
Macro Summary: ${macro.sectorImpactSummary}

=== SOCIAL SENTIMENT & FLOWS ===
Bullish Sentiment: ${sentiment.bullishPercent}%
Bearish Sentiment: ${sentiment.bearishPercent}%
24h Discussion Delta: +${sentiment.volumeChange24h}%
Key Themes: ${sentiment.dominantThemes.join(', ')}

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
  "markdownBody": "string (the complete 5-section markdown report with headings ##, markdown tables, and evidence)",
  "extractedFigures": {
    "peRatio": ${fundamentals.peRatioTrailing ?? fundamentals.peRatioForward ?? 0},
    "revenueTTM": ${fundamentals.revenueTTM},
    "operatingMargin": ${fundamentals.operatingMargin},
    "freeCashFlow": ${fundamentals.freeCashFlowTTM},
    "netDebt": ${fundamentals.netDebt},
    "movePercent": ${mover.changePercent}
  },
  "socialHooks": {
    "twitterThread": [
      "Tweet 1 (hook with ticker $${mover.ticker}, move, and core finding)...",
      "Tweet 2 (fundamental metric breakdown with P/E and FCF)...",
      "Tweet 3 (macro context & valuation asymmetry, ending with link placeholder)..."
    ],
    "redditPost": {
      "title": "[Deep Dive] $${mover.ticker}: Fundamental Breakdown Following Today's ${mover.changePercent.toFixed(1)}% Move",
      "bodyMarkdown": "Comprehensive reddit markdown analysis with disclaimer...",
      "flair": "DD / Fundamental"
    },
    "telegramAlert": "🚨 **$${mover.ticker} Alert**: ${mover.name} moved ${mover.changePercent > 0 ? '+' : ''}${mover.changePercent.toFixed(1)}% today. Key fundamental breakdown: ..."
  }
}`;
}
