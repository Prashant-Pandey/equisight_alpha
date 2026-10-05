import { defineCollection, z } from 'astro:content';

const reportsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string().or(z.date()),
    ticker: z.string(),
    companyName: z.string(),
    exchange: z.string(),
    region: z.enum(['US', 'EU']).default('US'),
    sector: z.string(),
    industry: z.string(),
    category: z.enum(['gainer', 'loser']),
    movePercent: z.number(),
    currentPrice: z.number(),
    currency: z.string().default('USD'),
    marketCap: z.number(),
    peRatio: z.number().nullable().optional(),
    forwardPE: z.number().nullable().optional(),
    dividendYield: z.number().default(0),
    riskScore: z.number().min(1).max(10).default(5),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),

    // Penny Stock & Money Market Trading Venue
    isPennyStock: z.boolean().default(false),
    moneyMarketTradingVenue: z.string().default('Nasdaq / NYSE'),
    priceTimestamp: z.string().optional(),

    // Debt Breakdown
    totalDebt: z.number().optional().default(0),
    debtToEquity: z.number().nullable().optional().default(0),
    shortTermDebt: z.number().optional().default(0),
    longTermDebt: z.number().optional().default(0),
    shortVsLongTermRatio: z.number().or(z.string()).optional().default(0),
    recentChangesInDebt: z.string().optional().default(''),
    debtRisks: z.string().optional().default(''),

    // Valuation Metric Comparisons
    priceToBook: z.any().optional(),
    priceToEarnings: z.any().optional(),
    priceToBookRatio: z.any().optional(),
    priceToEarningsRatio: z.any().optional(),

    // Profitability & EPS
    returnOnEquity: z.number().optional().default(0),
    earningsPerShare: z.any().optional(),

    // Volatility & Cash Flow
    volatilityIndex: z.any().optional(),
    cashFlow: z.any().optional(),
    freeCashFlow: z.number().optional(),
    operatingCashFlow: z.number().optional(),

    // Qualitative Analysis
    managementQuality: z.any().optional(),
    competitiveMoat: z.any().optional(),
    companyQuestions: z.any().optional(),
    industryQuestions: z.any().optional(),

    // Valuation Models & Ratings
    valuationModels: z.any().optional(),
    fundamentalRating: z.string().optional().default('Fairly Valued'),
    classification: z.string().optional().default('Growth Stock'),

    // Sentiment & Artificial Inflation Analysis
    isArtificiallyInflated: z.boolean().optional().default(false),
    artificialInflationRisk: z.string().optional().default('Low'),
    volumeAnomalyRatio: z.number().optional().default(1.0),
    majorPriceDriver: z.string().optional().default('Market Flow'),
    newsImpact: z.string().optional().default(''),
    socialMediaImpact: z.string().optional().default(''),

    // Two-Tiered News Catalyst & Sentiment Pipeline
    catalystAlignment: z.enum(['ALIGNED', 'DIVERGENT_SELL_THE_NEWS', 'DIVERGENT_RELIEF_RALLY', 'MACRO_DOMINATED', 'NOISE_SPECULATION']).optional(),
    catalystSynthesis: z.string().optional(),
    filteredHeadlines: z.array(z.object({
      title: z.string(),
      source: z.string(),
      relevance: z.number(),
      headlineSentiment: z.enum(['Bullish', 'Bearish', 'Neutral'])
    })).optional(),

    // Theses
    theses: z.object({
      bull: z.array(z.object({
        point: z.string(),
        sources: z.array(
          z.union([
            z.string(),
            z.object({
              name: z.string().optional(),
              title: z.string().optional(),
              url: z.string(),
              domain: z.string().optional()
            })
          ])
        ).default([]),
        deductionChain: z.string()
      })).default([]),
      bear: z.array(z.object({
        point: z.string(),
        sources: z.array(
          z.union([
            z.string(),
            z.object({
              name: z.string().optional(),
              title: z.string().optional(),
              url: z.string(),
              domain: z.string().optional()
            })
          ])
        ).default([]),
        deductionChain: z.string()
      })).default([])
    }).optional().default({ bull: [], bear: [] }),

    affiliates: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        headline: z.string(),
        description: z.string(),
        url: z.string(),
        ctaText: z.string(),
        badge: z.string().optional(),
        disclosure: z.string()
      })
    ).default([]),
    adSlots: z.object({
      topBanner: z.boolean().default(true),
      midArticle: z.boolean().default(true),
      bottomBanner: z.boolean().default(true)
    }).default({}),
    socialHooks: z.object({
      twitter: z.array(z.string()).default([]),
      redditTitle: z.string().default(''),
      telegram: z.string().default('')
    }).default({})
  }).passthrough()
});

export const collections = {
  reports: reportsCollection
};
