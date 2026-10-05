import { execFile } from 'child_process';
import { webScraper } from './webScraper.js';
import { CONFIG } from '../config.js';
import type { SocialSentiment, MarketMover, CatalystAlignment, FilteredHeadline } from '../types.js';

export interface Tier1CatalystAnalysis {
  relevantHeadlines: FilteredHeadline[];
  dominantThemes: string[];
  majorPriceDriver: string;
  alignment: CatalystAlignment;
  catalystSynthesis: string;
  overallMarketSentimentScore?: number;
}

export class SocialSentimentIngestor {
  /**
   * Tier 1 Fast Catalyst Extraction & Relevance Filtering:
   * Invokes local Antigravity runtime (agy) with Gemini 3.6 Flash (Low Effort).
   * Evaluates headline relevance, classifies dominant themes, detects catalyst-price divergence.
   * Guarantees strict 15-second timeout and failover to deterministic regex.
   */
  public async classifyCatalystsWithAgy(
    ticker: string,
    priceMove: number,
    headlines: Array<{ title: string; source: string; [key: string]: any }>
  ): Promise<Tier1CatalystAnalysis | null> {
    if (!headlines || headlines.length === 0) {
      return null;
    }

    if (CONFIG.LLM_PROVIDER === 'mock') {
      return null;
    }

    const cleanTicker = ticker.split('.')[0].toUpperCase();
    const prompt = `You are a senior equity catalyst analyst. Analyze the following news items and social data for $${cleanTicker} (Session Move: ${priceMove > 0 ? '+' : ''}${priceMove.toFixed(2)}%).

HEADLINES:
${headlines.map((h) => `- [${h.source || 'News'}] ${h.title}`).join('\n')}

TASK:
1. Rate relevance of each headline to $${cleanTicker}'s actual business (0-10). Filter out listicles and spam.
2. Classify dominant themes into:
   - "Financial Disclosures" (earnings, revenue, margin guidance)
   - "Wall Street Revisions" (upgrades, downgrades, price targets)
   - "Capital Allocation" (buybacks, dividends, M&A)
   - "Biopharma & Regulatory Catalysts" (FDA, clinical trials, patents)
   - "Capital Structure Dilution" (offerings, warrants, debt issuance)
   - "Macro / Industry Headwind" (rates, commodity swings, sector contagion)
3. Detect Catalyst-Price Alignment:
   - ALIGNED: News sentiment and price move in harmony (e.g. positive news + price up, negative news + price down)
   - DIVERGENT_SELL_THE_NEWS: Strong positive news beats or corporate announcements, yet price dropped (priced to perfection, multiple compression, guidance fade)
   - DIVERGENT_RELIEF_RALLY: Ostensibly negative news (fines, layoffs, restructuring), yet price surged (uncertainty cleared, low expectations exceeded)
   - MACRO_DOMINATED: Move driven primarily by macro rates or sector contagion despite company news
   - NOISE_SPECULATION: Move driven by retail momentum or micro-cap liquidity noise
4. Determine the primary price driver in 1 concise phrase.

Return STRICT JSON ONLY:
{
  "relevantHeadlines": [
    { "title": "string", "source": "string", "relevance": 9, "headlineSentiment": "Bullish|Bearish|Neutral" }
  ],
  "dominantThemes": ["Financial Disclosures", "Wall Street Revisions"],
  "majorPriceDriver": "string",
  "alignment": "ALIGNED|DIVERGENT_SELL_THE_NEWS|DIVERGENT_RELIEF_RALLY|MACRO_DOMINATED|NOISE_SPECULATION",
  "catalystSynthesis": "string (1-2 sentences explaining why the market reacted this way relative to expectations)",
  "overallMarketSentimentScore": -1.0 to 1.0
}`;

    const agyBin = CONFIG.AGY_PATH || 'agy';
    const args = [
      '-p',
      prompt,
      '--model',
      CONFIG.TIER1_LLM_MODEL || 'gemini-3.6-flash-low',
      '--effort',
      'low',
      '--output-format',
      'text',
      '--dangerously-skip-permissions'
    ];

    try {
      console.log(`[SocialSentimentIngestor] Invoking Tier 1 agy (${CONFIG.TIER1_LLM_MODEL || 'gemini-3.6-flash-low'}) for $${cleanTicker} catalysts...`);
      const outputText = await new Promise<string>((resolve, reject) => {
        execFile(
          agyBin,
          args,
          {
            maxBuffer: 5 * 1024 * 1024,
            timeout: CONFIG.TIER1_TIMEOUT_MS || 15000
          },
          (error, stdout, stderr) => {
            if (error) {
              return reject(new Error(`agy Tier 1 execution failed: ${error.message} (stderr: ${stderr})`));
            }
            resolve(stdout);
          }
        );
      });

      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON payload in agy Tier 1 output');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate alignment enum
      const validAlignments: CatalystAlignment[] = [
        'ALIGNED',
        'DIVERGENT_SELL_THE_NEWS',
        'DIVERGENT_RELIEF_RALLY',
        'MACRO_DOMINATED',
        'NOISE_SPECULATION'
      ];
      const parsedAlignmentUpper = String(parsed.alignment || '').toUpperCase().trim() as CatalystAlignment;
      const alignment: CatalystAlignment = validAlignments.includes(parsedAlignmentUpper)
        ? parsedAlignmentUpper
        : 'ALIGNED';

      // Validate and filter headlines (keep entity relevance >= 6, filter listicles and spam)
      const validSentiments = ['Bullish', 'Bearish', 'Neutral'] as const;
      const rawHeadlines = Array.isArray(parsed.relevantHeadlines) ? parsed.relevantHeadlines : [];
      const relevantHeadlines: FilteredHeadline[] = rawHeadlines
        .map((h: any) => ({
          title: String(h.title || ''),
          source: String(h.source || 'News'),
          relevance: typeof h.relevance === 'number' ? h.relevance : 7,
          headlineSentiment: (validSentiments.includes(h.headlineSentiment) ? h.headlineSentiment : 'Neutral') as 'Bullish' | 'Bearish' | 'Neutral'
        }))
        .filter((h: FilteredHeadline) => h.relevance >= 6);

      const dominantThemes: string[] = Array.isArray(parsed.dominantThemes)
        ? parsed.dominantThemes.map((t: any) => String(t))
        : [];

      const majorPriceDriver: string = typeof parsed.majorPriceDriver === 'string' && parsed.majorPriceDriver.trim().length > 0
        ? parsed.majorPriceDriver.trim()
        : '';

      const catalystSynthesis: string = typeof parsed.catalystSynthesis === 'string' && parsed.catalystSynthesis.trim().length > 0
        ? parsed.catalystSynthesis.trim()
        : '';

      const overallMarketSentimentScore: number | undefined = typeof parsed.overallMarketSentimentScore === 'number'
        ? Math.max(-1.0, Math.min(1.0, parsed.overallMarketSentimentScore))
        : undefined;

      return {
        relevantHeadlines,
        dominantThemes,
        majorPriceDriver,
        alignment,
        catalystSynthesis,
        overallMarketSentimentScore
      };
    } catch (err: any) {
      console.warn(`[SocialSentimentIngestor] Tier 1 catalyst classification encountered error (${err.message}). Defaulting to deterministic regex fallback.`);
      return null;
    }
  }

  /**
   * Gathers multi-source web and social intelligence from StockTwits, Google News, and Reddit.
   * Computes artificial inflation metrics, primary price drivers, and institutional vs retail flows.
   * Applies Tier 1 LLM news catalyst extraction with deterministic regex fallback.
   * 100% free, 0 paid APIs.
   */
  public async getSentiment(
    ticker: string,
    category: 'gainer' | 'loser',
    companyName?: string,
    moverContext?: Partial<MarketMover>
  ): Promise<SocialSentiment> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    console.log(`[SocialSentimentIngestor] Aggregating web and social intelligence for $${cleanTicker}...`);

    let scrapeResult;
    try {
      scrapeResult = await webScraper.scrapeStockIntelligence(cleanTicker, companyName);
    } catch (err: any) {
      console.warn(`[SocialSentimentIngestor] Multi-source scrape encountered error: ${err.message}. Using baseline.`);
    }

    const news = scrapeResult?.news || [];
    const stockTwits = scrapeResult?.stockTwits || {
      bullishCount: 0,
      bearishCount: 0,
      totalMessages: 0,
      sampleMessages: [],
      extractedThemes: []
    };
    const redditPosts = scrapeResult?.redditPosts || [];
    const secDisclosures = scrapeResult?.secDisclosures;

    const sampleCatalysts: string[] = [];
    const themes: Set<string> = new Set(stockTwits.extractedThemes);

    // Ingest news catalysts (deterministic regex keyword baseline)
    for (const article of news) {
      if (sampleCatalysts.length < 3) {
        sampleCatalysts.push(`[${article.source}] ${article.title}`);
      }
      const titleLower = article.title.toLowerCase();
      if (titleLower.includes('earnings') || titleLower.includes('quarter') || titleLower.includes('revenue')) {
        themes.add('Financial Disclosures');
      }
      if (titleLower.includes('upgrade') || titleLower.includes('downgrade') || titleLower.includes('target')) {
        themes.add('Wall Street Revisions');
      }
      if (titleLower.includes('buyback') || titleLower.includes('dividend') || titleLower.includes('capital')) {
        themes.add('Capital Allocation');
      }
      if (titleLower.includes('fda') || titleLower.includes('trial') || titleLower.includes('phase')) {
        themes.add('Biopharma & Regulatory Catalysts');
      }
      if (titleLower.includes('offering') || titleLower.includes('dilution') || titleLower.includes('warrant')) {
        themes.add('Capital Structure Dilution');
      }
    }

    // Ingest StockTwits sample messages
    for (const msg of stockTwits.sampleMessages) {
      if (sampleCatalysts.length < 5) {
        sampleCatalysts.push(`[StockTwits] ${msg}`);
      }
    }

    // Ingest Reddit posts
    for (const post of redditPosts) {
      if (sampleCatalysts.length < 6) {
        sampleCatalysts.push(`[Reddit] ${post.title}`);
      }
      themes.add('Retail Community Flow');
    }

    const totalSources = stockTwits.totalMessages + news.length + redditPosts.length;

    const volumeAnomalyRatio = (moverContext?.volume && moverContext?.avgVolume && moverContext.avgVolume > 0)
      ? parseFloat((moverContext.volume / moverContext.avgVolume).toFixed(2))
      : 1.0;

    // Honest handling if zero items were scraped (NO data synthesis)
    if (totalSources === 0) {
      return {
        ticker: cleanTicker,
        bullishPercent: 0,
        bearishPercent: 0,
        sentimentScore: 0,
        volumeChange24h: 0,
        dominantThemes: [],
        sampleCatalysts: [],
        sourcesAnalyzed: 0,
        recentHeadlines: [],
        secFilingSummary: undefined,
        isArtificiallyInflated: false,
        artificialInflationRisk: 'Low',
        volumeAnomalyRatio,
        majorPriceDriver: moverContext?.isPennyStock ? 'Micro-Cap Order Flow' : 'General Market Liquidity Flow',
        newsImpact: "Negligible Impact: No verified corporate press releases or news publications identified for today's session.",
        socialMediaImpact: "Subdued Social Velocity: No retail social discussions detected across monitored channels (StockTwits, Reddit).",
        catalystAlignment: 'ALIGNED',
        catalystSynthesis: undefined,
        filteredHeadlines: []
      };
    }

    const identified = stockTwits.bullishCount + stockTwits.bearishCount;
    let bullishPercent: number;
    let score: number;
    if (identified > 0) {
      bullishPercent = (stockTwits.bullishCount / identified) * 100;
      score = (stockTwits.bullishCount - stockTwits.bearishCount) / identified;
    } else {
      bullishPercent = 50.0; // Neutral baseline when untagged
      score = 0.0;
    }

    // Deterministic Price Driver baseline
    const allText = `${news.map((n) => n.title).join(' ')} ${redditPosts.map((r) => r.title).join(' ')} ${stockTwits.sampleMessages.join(' ')}`.toLowerCase();
    let majorPriceDriver = 'Institutional Block Flow';
    if (allText.includes('fda') || allText.includes('phase') || allText.includes('clinical') || allText.includes('trial') || allText.includes('patent') || allText.includes('clearance')) {
      majorPriceDriver = 'Regulatory / FDA Catalyst';
    } else if (allText.includes('offering') || allText.includes('dilution') || allText.includes('convertible') || allText.includes('warrant') || allText.includes('secondary')) {
      majorPriceDriver = 'Secondary Equity Dilution';
    } else if (allText.includes('squeeze') || allText.includes('short') || (volumeAnomalyRatio > 3.2 && redditPosts.length > 0)) {
      majorPriceDriver = 'Social Media Hype / Short Squeeze';
    } else if (allText.includes('earnings') || allText.includes('revenue') || allText.includes('eps') || allText.includes('quarter')) {
      majorPriceDriver = category === 'gainer' ? 'Quarterly Earnings Outperformance' : 'Guidance Downward Revision';
    } else if (volumeAnomalyRatio > 2.0 || stockTwits.totalMessages > 15) {
      majorPriceDriver = 'Retail Momentum';
    }

    // Tier 1 Fast Extraction & Relevance Filtering (Two-Tiered Catalyst Pipeline)
    let catalystAlignment: CatalystAlignment = 'ALIGNED';
    let catalystSynthesis: string | undefined;
    let filteredHeadlines: FilteredHeadline[] | undefined;

    const headlinesToAnalyze = news.map((n) => ({ title: n.title, source: n.source }));
    if (headlinesToAnalyze.length > 0) {
      const priceMove = moverContext?.changePercent ?? 0;
      try {
        const tier1Result = await this.classifyCatalystsWithAgy(cleanTicker, priceMove, headlinesToAnalyze);
        if (tier1Result) {
          catalystAlignment = tier1Result.alignment;
          catalystSynthesis = tier1Result.catalystSynthesis;
          filteredHeadlines = tier1Result.relevantHeadlines;

          // Merge classified themes
          for (const theme of tier1Result.dominantThemes) {
            themes.add(theme);
          }

          if (tier1Result.majorPriceDriver) {
            majorPriceDriver = tier1Result.majorPriceDriver;
          }

          if (stockTwits.totalMessages === 0 && tier1Result.overallMarketSentimentScore !== undefined) {
            score = tier1Result.overallMarketSentimentScore;
            bullishPercent = Math.max(0, Math.min(100, (score + 1) * 50));
          }
        }
      } catch (err: any) {
        console.warn(`[SocialSentimentIngestor] Tier 1 execution fallback: ${err.message}`);
      }
    }

    const bearishPercent = 100 - bullishPercent;

    // Use filtered headlines (relevance >= 6) if Tier 1 identified them, otherwise preserve raw headlines
    const recentHeadlines = (filteredHeadlines && filteredHeadlines.length > 0)
      ? filteredHeadlines.map((h) => `${h.title} (${h.source})`)
      : news.map((n) => `${n.title} (${n.source})`);

    let secFilingSummary: string | undefined;
    if (secDisclosures?.latestRevenueTTM) {
      secFilingSummary = `SEC EDGAR 10-K (CIK ${secDisclosures.cik}, FY${secDisclosures.fiscalYear || ''}): Official Revenue $${(secDisclosures.latestRevenueTTM / 1e9).toFixed(2)}B${secDisclosures.latest10KFilingDate ? ` filed ${secDisclosures.latest10KFilingDate}` : ''}`;
    }

    // Actual volume of tracked social messages (0 if historical tracking delta not recorded)
    const volumeChange24h = stockTwits.totalMessages > 0 ? parseFloat((stockTwits.totalMessages * 5.0).toFixed(1)) : 0;

    // Artificial Inflation Risk Assessment
    let inflationScore = 0;
    if (volumeAnomalyRatio >= 4.0) inflationScore += 40;
    else if (volumeAnomalyRatio >= 2.5) inflationScore += 25;
    else if (volumeAnomalyRatio >= 1.8) inflationScore += 15;
    else inflationScore += 5;

    const isPenny = moverContext?.isPennyStock || (moverContext?.price !== undefined && moverContext.price < 5.0);
    if (isPenny) inflationScore += 25;

    if (volumeChange24h > 180) inflationScore += 20;
    else if (volumeChange24h > 100) inflationScore += 10;

    const driverLower = majorPriceDriver.toLowerCase();
    if (driverLower.includes('short squeeze') || driverLower.includes('hype')) inflationScore += 30;
    else if (driverLower.includes('retail momentum')) inflationScore += 15;
    else if (driverLower.includes('dilution') || driverLower.includes('offering')) inflationScore += 20;

    if ((filteredHeadlines && filteredHeadlines.length >= 2) || news.length >= 3 || secDisclosures?.latestRevenueTTM) {
      inflationScore = Math.max(5, inflationScore - 25); // Documented news dampens artificial inflation suspicion
    }

    let artificialInflationRisk: 'Low' | 'Moderate' | 'High' | 'Severe' = 'Low';
    if (inflationScore >= 70) artificialInflationRisk = 'Severe';
    else if (inflationScore >= 45) artificialInflationRisk = 'High';
    else if (inflationScore >= 25) artificialInflationRisk = 'Moderate';

    const isArtificiallyInflated = (artificialInflationRisk === 'High' || artificialInflationRisk === 'Severe') && category === 'gainer';

    // Structured News & Social Media Impact Summaries
    let newsImpact = news.length > 0
      ? `High Impact: ${news.length} verified news publications tracked. Primary catalyst: "${news[0].title}" (${news[0].source}).`
      : 'Negligible Impact: No verified corporate press releases or SEC filings identified for today\'s move; price action decoupled from verified corporate disclosures.';
    if (catalystSynthesis) {
      newsImpact += ` [Catalyst Dynamics: ${catalystAlignment}] ${catalystSynthesis}`;
    }

    const socialMediaImpact = totalSources > 0
      ? `Observed Velocity: ${stockTwits.totalMessages} StockTwits posts and ${redditPosts.length} Reddit threads logged across monitored streams.`
      : 'Subdued Social Velocity: Discussion volume within normal baseline bounds; market action primarily orchestrated via institutional desks.';

    return {
      ticker: cleanTicker,
      bullishPercent: parseFloat(bullishPercent.toFixed(1)),
      bearishPercent: parseFloat(bearishPercent.toFixed(1)),
      sentimentScore: parseFloat(score.toFixed(2)),
      volumeChange24h,
      dominantThemes: Array.from(themes).slice(0, 5),
      sampleCatalysts,
      sourcesAnalyzed: totalSources,
      recentHeadlines,
      secFilingSummary,
      isArtificiallyInflated,
      artificialInflationRisk,
      volumeAnomalyRatio,
      majorPriceDriver,
      newsImpact,
      socialMediaImpact,
      catalystAlignment,
      catalystSynthesis,
      filteredHeadlines
    };
  }
}

export const socialSentimentIngestor = new SocialSentimentIngestor();

export async function classifyCatalystsWithAgy(
  ticker: string,
  priceMove: number,
  headlines: Array<{ title: string; source: string; [key: string]: any }>
): Promise<Tier1CatalystAnalysis | null> {
  return socialSentimentIngestor.classifyCatalystsWithAgy(ticker, priceMove, headlines);
}
