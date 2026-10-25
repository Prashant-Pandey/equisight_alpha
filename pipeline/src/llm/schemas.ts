/**
 * Standard JSON schemas and resilient JSON parsing utilities for LLM invocations.
 * Enforces native schema adherence in agy CLI and other structured LLM providers.
 */

export const WEB_BRIEFING_SCHEMA = {
  type: 'object',
  description: 'Plain-English 3-Minute Briefing fields for busy working professionals with low-to-medium market knowledge.',
  properties: {
    plainHeadline: { type: 'string' },
    whatHappenedOneLiner: { type: 'string' },
    noiseVsSignalVerdict: {
      type: 'string',
      enum: ['REAL_FUNDAMENTAL_NEWS', 'OVERREACTION', 'MACRO_DRAG', 'HYPE_OR_SQUEEZE']
    },
    noiseVsSignalExplanation: { type: 'string' },
    bottomLineSummary: { type: 'string' },
    valuationPlain: {
      type: 'object',
      properties: {
        verdictBadge: {
          type: 'string',
          enum: ['On Sale', 'Fairly Priced', 'Priced High', 'Speculative']
        },
        dollarForDollarAnalogy: { type: 'string' },
        whyItTradesHere: { type: 'string' }
      }
    },
    financialSafetyPlain: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Strong Cushion', 'Manageable Debt', 'Tight Cash — Watch Closely']
        },
        cashVsBillsSummary: { type: 'string' },
        cleanAccountingNote: { type: 'string' }
      }
    },
    prosPlain: { type: 'array', items: { type: 'string' } },
    consPlain: { type: 'array', items: { type: 'string' } }
  }
} as const;

export const EXECUTIVE_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    catalystHeadline: {
      type: 'string',
      description: 'Crisp 1-sentence headline of the driver'
    },
    catalystCategory: {
      type: 'string',
      description: 'Classification of the catalyst nature'
    },
    expectationsVsReality: {
      type: 'string',
      description: 'Analytical narrative on expectations vs reality gap'
    },
    sessionDynamics: {
      type: 'string',
      description: 'Narrative explaining price action, volume divergence, and venue characteristics'
    },
    macroeconomicContext: {
      type: 'string',
      description: 'Macro rates, yields, VIX, or sector factors influencing session'
    },
    fundamentalImpact: {
      type: 'string',
      description: 'How the catalyst alters or confirms company fundamental trajectory'
    },
    keyTakeaways: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bulleted institutional takeaways'
    },
    formattedMarkdown: {
      type: 'string',
      description: 'The complete markdown section starting with ## Executive Summary & Session Catalyst'
    }
  },
  required: [
    'catalystHeadline',
    'catalystCategory',
    'expectationsVsReality',
    'sessionDynamics',
    'macroeconomicContext',
    'fundamentalImpact',
    'keyTakeaways',
    'formattedMarkdown'
  ]
} as const;

export const REPORT_PART1_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    seoDescription: { type: 'string' },
    slug: { type: 'string' },
    primaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    secondaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    catalystSummary: { type: 'string' },
    catalystAlignment: {
      type: 'string',
      enum: [
        'ALIGNED',
        'DIVERGENT_SELL_THE_NEWS',
        'DIVERGENT_RELIEF_RALLY',
        'MACRO_DOMINATED',
        'NOISE_SPECULATION'
      ]
    },
    catalystSynthesis: { type: 'string' },
    markdownBody: {
      type: 'string',
      description: 'Markdown containing Section 1 (Trading Activity), Section 2 (Balance Sheet & Solvency), Section 3 (Profitability & Operating Health), and Section 4 (Qualitative Deep Dive: 4 Key Company Questions).'
    },
    extractedFigures: {
      type: 'object',
      properties: {
        peRatio: { type: ['number', 'null'] },
        revenueTTM: { type: 'number' },
        operatingMargin: { type: 'number' },
        freeCashFlow: { type: ['number', 'null'] },
        netDebt: { type: 'number' },
        movePercent: { type: 'number' }
      }
    }
  },
  required: [
    'title',
    'seoDescription',
    'slug',
    'primaryKeywords',
    'secondaryKeywords',
    'catalystSummary',
    'markdownBody',
    'extractedFigures'
  ]
} as const;

export const REPORT_PART2_SCHEMA = {
  type: 'object',
  properties: {
    macroConditionSimplified: {
      type: 'string',
      description: 'Macro Condition for the industry in simplified terms (plain, non-technical language explaining how the industry is doing, avoiding dense financial jargon).'
    },
    obstaclesAndChallengesSimplified: {
      type: 'string',
      description: 'Industry obstacles and challenges in simplified terms (plain, non-technical language explaining operational hurdles for retail investors).'
    },
    economicPoliticalCulturalRisksSimplified: {
      type: 'string',
      description: 'Economic, political, and cultural risks in simplified terms (plain, non-technical language explaining macro and regulatory risks for retail investors).'
    },
    markdownBody: {
      type: 'string',
      description: 'Markdown containing Section 5 (Industry Deep Dive), Section 6 (Management & 5 Moat Pillars & Peer Benchmarking), Section 7 (Multi-Model Valuation Suite), Section 8 (Macro Headwinds), and Section 9 (Evidence-Based Bull & Bear Theses).'
    },
    theses: {
      type: 'object',
      properties: {
        bull: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        },
        bear: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        }
      },
      required: ['bull', 'bear']
    },
    socialHooks: {
      type: 'object',
      properties: {
        twitterThread: {
          type: 'array',
          items: { type: 'string' }
        },
        redditPost: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            bodyMarkdown: { type: 'string' },
            flair: { type: 'string' }
          },
          required: ['title', 'bodyMarkdown']
        },
        telegramAlert: { type: 'string' }
      },
      required: ['twitterThread', 'redditPost', 'telegramAlert']
    }
  },
  required: [
    'markdownBody',
    'theses',
    'socialHooks'
  ]
} as const;

export const MAIN_REPORT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    seoDescription: { type: 'string' },
    slug: { type: 'string' },
    primaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    secondaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    catalystSummary: { type: 'string' },
    catalystAlignment: {
      type: 'string',
      enum: [
        'ALIGNED',
        'DIVERGENT_SELL_THE_NEWS',
        'DIVERGENT_RELIEF_RALLY',
        'MACRO_DOMINATED',
        'NOISE_SPECULATION'
      ]
    },
    catalystSynthesis: { type: 'string' },
    macroConditionSimplified: {
      type: 'string',
      description: 'Macro Condition for the industry in simplified terms (plain, non-technical language explaining how the industry is doing, avoiding dense financial jargon).'
    },
    obstaclesAndChallengesSimplified: {
      type: 'string',
      description: 'Industry obstacles and challenges in simplified terms (plain, non-technical language explaining operational hurdles for retail investors).'
    },
    economicPoliticalCulturalRisksSimplified: {
      type: 'string',
      description: 'Economic, political, and cultural risks in simplified terms (plain, non-technical language explaining macro and regulatory risks for retail investors).'
    },
    webBriefing: WEB_BRIEFING_SCHEMA,
    markdownBody: { type: 'string' },
    extractedFigures: {
      type: 'object',
      properties: {
        peRatio: { type: ['number', 'null'] },
        revenueTTM: { type: 'number' },
        operatingMargin: { type: 'number' },
        freeCashFlow: { type: ['number', 'null'] },
        netDebt: { type: 'number' },
        movePercent: { type: 'number' }
      }
    },
    theses: {
      type: 'object',
      properties: {
        bull: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        },
        bear: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        }
      },
      required: ['bull', 'bear']
    },
    socialHooks: {
      type: 'object',
      properties: {
        twitterThread: {
          type: 'array',
          items: { type: 'string' }
        },
        redditPost: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            bodyMarkdown: { type: 'string' },
            flair: { type: 'string' }
          },
          required: ['title', 'bodyMarkdown']
        },
        telegramAlert: { type: 'string' }
      },
      required: ['twitterThread', 'redditPost', 'telegramAlert']
    }
  },
  required: [
    'title',
    'seoDescription',
    'slug',
    'primaryKeywords',
    'secondaryKeywords',
    'catalystSummary',
    'markdownBody',
    'socialHooks'
  ]
} as const;

export const TIER1_SENTIMENT_SCHEMA = {
  type: 'object',
  properties: {
    majorPriceDriver: { type: 'string' },
    relevantHeadlines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          relevance: { type: 'number' },
          headlineSentiment: {
            type: 'string',
            enum: ['Bullish', 'Bearish', 'Neutral']
          }
        },
        required: ['title', 'source', 'relevance', 'headlineSentiment']
      }
    },
    dominantThemes: {
      type: 'array',
      items: { type: 'string' }
    },
    alignment: {
      type: 'string',
      enum: [
        'ALIGNED',
        'DIVERGENT_SELL_THE_NEWS',
        'DIVERGENT_RELIEF_RALLY',
        'MACRO_DOMINATED',
        'NOISE_SPECULATION'
      ]
    },
    catalystSynthesis: { type: 'string' },
    overallMarketSentimentScore: { type: 'number' }
  },
  required: [
    'majorPriceDriver',
    'dominantThemes',
    'relevantHeadlines',
    'alignment',
    'catalystSynthesis',
    'overallMarketSentimentScore'
  ]
} as const;

// ============================================================================
// SPECIALIZED SUB-SECTION SCHEMAS (7 DEDICATED DOMAIN AGENTS)
// ============================================================================

export const TITLE_AND_EXEC_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    seoDescription: { type: 'string' },
    slug: { type: 'string' },
    primaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    secondaryKeywords: {
      type: 'array',
      items: { type: 'string' }
    },
    catalystSummary: { type: 'string' },
    catalystAlignment: {
      type: 'string',
      enum: [
        'ALIGNED',
        'DIVERGENT_SELL_THE_NEWS',
        'DIVERGENT_RELIEF_RALLY',
        'MACRO_DOMINATED',
        'NOISE_SPECULATION'
      ]
    },
    catalystSynthesis: { type: 'string' },
    extractedFigures: {
      type: 'object',
      properties: {
        peRatio: { type: ['number', 'null'] },
        revenueTTM: { type: 'number' },
        operatingMargin: { type: 'number' },
        freeCashFlow: { type: ['number', 'null'] },
        netDebt: { type: 'number' },
        movePercent: { type: 'number' }
      }
    },
    webBriefing: WEB_BRIEFING_SCHEMA,
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown section starting with ## Executive Summary & Session Catalyst'
    }
  },
  required: [
    'title',
    'seoDescription',
    'slug',
    'primaryKeywords',
    'secondaryKeywords',
    'catalystSummary',
    'sectionMarkdown'
  ]
} as const;

export const TRADING_ACTIVITY_SCHEMA = {
  type: 'object',
  properties: {
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown section starting with ## 1. Trading Activity & Artificial Inflation Analysis'
    },
    sentimentScore: { type: 'number' },
    tacticalTimingRegime: { type: 'string' },
    volumeAnomalyRatio: { type: 'number' },
    majorPriceDriver: { type: 'string' }
  },
  required: ['sectionMarkdown']
} as const;

export const BALANCE_SHEET_SOLVENCY_SCHEMA = {
  type: 'object',
  properties: {
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown section starting with ## 2. Balance Sheet & Solvency Stress Test (Debt Breakdown)'
    },
    totalDebt: { type: 'number' },
    shortTermDebt: { type: ['number', 'null'] },
    longTermDebt: { type: ['number', 'null'] },
    debtToEquity: { type: ['number', 'null'] },
    currentRatio: { type: ['number', 'null'] },
    solvencyVerdict: { type: 'string' }
  },
  required: ['sectionMarkdown']
} as const;

export const PROFITABILITY_OPERATING_SCHEMA = {
  type: 'object',
  properties: {
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown containing ## 3. Profitability, Operating Health & Segment Dynamics and ## 4. Qualitative Deep Dive: 4 Key Company Questions'
    },
    grossMargin: { type: ['number', 'null'] },
    operatingMargin: { type: ['number', 'null'] },
    returnOnEquity: { type: ['number', 'null'] },
    roic: { type: ['number', 'null'] }
  },
  required: ['sectionMarkdown']
} as const;

export const MOAT_AND_COMPETITOR_SCHEMA = {
  type: 'object',
  properties: {
    macroConditionSimplified: {
      type: 'string',
      description: 'Macro Condition for the industry in simplified terms (plain, non-technical language for retail investors).'
    },
    obstaclesAndChallengesSimplified: {
      type: 'string',
      description: 'Industry obstacles and challenges in simplified terms (plain, non-technical language for retail investors).'
    },
    economicPoliticalCulturalRisksSimplified: {
      type: 'string',
      description: 'Economic, political, and cultural risks in simplified terms (plain, non-technical language for retail investors).'
    },
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown containing ## 5. Industry Deep Dive & Sector Dynamics and ## 6. Management Quality, 5 Moat Pillars & Competitor Benchmarking Matrix'
    },
    managementQualityRating: { type: 'string' },
    economicMoatRating: { type: 'string' },
    moatTrend: { type: 'string' }
  },
  required: ['sectionMarkdown']
} as const;

export const VALUATION_ENGINE_SCHEMA = {
  type: 'object',
  properties: {
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown containing ## 7. Multi-Model Valuation Suite (Refined 3-Stage DCF & Morningstar Star Rating) and ## 8. Macroeconomic Headwinds & Sector Multiples'
    },
    consensusFairValue: { type: ['number', 'null'] },
    starRating: { type: 'number' },
    verdict: { type: 'string' },
    uncertaintyRating: { type: 'string' }
  },
  required: ['sectionMarkdown']
} as const;

export const BULL_BEAR_THESES_SCHEMA = {
  type: 'object',
  properties: {
    sectionMarkdown: {
      type: 'string',
      description: 'The complete markdown containing ## 9. Evidence-Based Bull & Bear Theses (with Deductive Chains)'
    },
    theses: {
      type: 'object',
      properties: {
        bull: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        },
        bear: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              point: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                  },
                  required: ['name', 'url']
                }
              },
              deductionChain: { type: 'string' }
            },
            required: ['point', 'sources', 'deductionChain']
          }
        }
      },
      required: ['bull', 'bear']
    },
    socialHooks: {
      type: 'object',
      properties: {
        twitterThread: {
          type: 'array',
          items: { type: 'string' }
        },
        redditPost: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            bodyMarkdown: { type: 'string' },
            flair: { type: 'string' }
          },
          required: ['title', 'bodyMarkdown']
        },
        telegramAlert: { type: 'string' }
      },
      required: ['twitterThread', 'redditPost', 'telegramAlert']
    }
  },
  required: ['sectionMarkdown', 'theses', 'socialHooks']
} as const;

/**
 * Sanitizes malformed escape sequences in JSON string payloads generated by LLMs.
 * Preserves standard JSON escapes (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX) while stripping
 * illegal escapes often emitted by LLMs (e.g. \$, \', \*, \_, \+, \%, \[).
 */
export function sanitizeJson(raw: string): string {
  return raw.replace(/(\\\\)|\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, (match, escapedBackslash) => {
    return escapedBackslash ? escapedBackslash : '';
  });
}

/**
 * Safely parses JSON with automatic fallback to sanitization when bad escape sequences occur.
 */
export function safeParseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err: any) {
    const sanitized = sanitizeJson(raw);
    return JSON.parse(sanitized) as T;
  }
}
