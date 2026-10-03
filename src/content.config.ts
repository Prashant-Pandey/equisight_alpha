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
    peRatio: z.number().nullable(),
    forwardPE: z.number().nullable(),
    dividendYield: z.number().default(0),
    riskScore: z.number().min(1).max(10).default(5),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
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
  })
});

export const collections = {
  reports: reportsCollection
};
