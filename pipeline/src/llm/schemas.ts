/**
 * Standard JSON schemas and resilient JSON parsing utilities for LLM invocations.
 * Enforces native schema adherence in agy CLI and other structured LLM providers.
 */

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
