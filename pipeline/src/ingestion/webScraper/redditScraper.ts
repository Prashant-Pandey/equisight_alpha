/**
 * Reddit public RSS search feed scraper for community discussions and investor sentiment.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import type { ScrapedRedditPost } from './types.js';

const redditCache = new Map<string, { timestamp: number; posts: ScrapedRedditPost[] }>();
const REDDIT_CACHE_TTL_MS = 10 * 60 * 1000;

function isPostRelevant(title: string, cleanTicker: string, cleanCompany: string, isMultiWordCompany: boolean): boolean {
  const tickerRegex = new RegExp(`(^|[^a-zA-Z0-9])\\$?${cleanTicker}([^a-zA-Z0-9]|$)`, 'i');
  if (tickerRegex.test(title)) return true;
  if (isMultiWordCompany && cleanCompany.length >= 4) {
    const escaped = cleanCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(title);
  }
  return false;
}

function parseRedditXml(xml: string, cleanTicker: string, cleanCompany: string, isMultiWord: boolean): ScrapedRedditPost[] {
  const posts: ScrapedRedditPost[] = [];
  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const seen = new Set<string>();

  for (const entry of entryMatches) {
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const authorMatch = entry.match(/<name>([\s\S]*?)<\/name>/);
    const linkMatch = entry.match(/<link[^>]*href="([\s\S]*?)"/);
    const pubMatch = entry.match(/<published>([\s\S]*?)<\/published>/) || entry.match(/<updated>([\s\S]*?)<\/updated>/);
    const catMatch = entry.match(/<category[^>]*term="([\s\S]*?)"/);

    if (titleMatch) {
      const rawTitle = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (!isPostRelevant(rawTitle, cleanTicker, cleanCompany, isMultiWord)) continue;
      const link = linkMatch ? linkMatch[1].trim() : undefined;
      const dedupKey = link || rawTitle.toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      let subreddit: string | undefined;
      if (catMatch) {
        const rawCat = catMatch[1].trim();
        subreddit = rawCat.startsWith('r/') ? rawCat : `r/${rawCat}`;
      } else if (link) {
        const subMatch = link.match(/\/r\/([a-zA-Z0-9_]+)\//);
        if (subMatch) subreddit = `r/${subMatch[1]}`;
      }
      posts.push({
        title: rawTitle,
        author: authorMatch ? authorMatch[1].trim() : undefined,
        link,
        pubDate: pubMatch ? pubMatch[1].trim() : undefined,
        subreddit
      });
    }
  }
  return posts;
}

export async function fetchRedditDiscussions(ticker: string, companyName?: string): Promise<ScrapedRedditPost[]> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  const cleanCompany = (companyName || '').replace(/,\s*(Inc\.|Corp\.|Ltd\.|LLC|Co\.|PLC|SA|NV)\.?$/i, '').replace(/\s+(Inc\.|Corp\.|Corporation|Holdings|Limited|Ltd\.|LLC|Co\.|PLC)\.?$/i, '').trim();
  const isMultiWord = cleanCompany.split(/\s+/).length > 1;
  const query = isMultiWord && cleanCompany.toLowerCase() !== cleanTicker.toLowerCase() ? `${cleanTicker} OR "${cleanCompany}"` : cleanTicker;
  const cacheKey = `${cleanTicker}::${cleanCompany.toLowerCase()}`;
  const now = Date.now();
  const cached = redditCache.get(cacheKey) || redditCache.get(`${cleanTicker}::`);
  if (cached && now - cached.timestamp < REDDIT_CACHE_TTL_MS && cached.posts.length > 0) return cached.posts;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  let isRateLimited = false;
  try {
    const res = await fetchWithRetry(`https://www.reddit.com/search.rss?q=${encodeURIComponent(query)}`, { retries: 0, timeoutMs: 7000, headers });
    if (res.status === 429) isRateLimited = true;
    else if (res.ok) {
      const posts = parseRedditXml(await res.text(), cleanTicker, cleanCompany, isMultiWord);
      if (posts.length > 0) {
        const sliced = posts.slice(0, 15);
        redditCache.set(cacheKey, { timestamp: now, posts: sliced });
        return sliced;
      }
    }
  } catch (err: any) {
    console.warn(`[WebScraper] Primary Reddit search failed for ${ticker}: ${err.message}`);
  }

  if (!isRateLimited) {
    try {
      const fallbackUrl = `https://www.reddit.com/r/stocks+investing+ValueInvesting+wallstreetbets+SecurityAnalysis+options+SmallCaps/search.rss?q=${encodeURIComponent(cleanTicker)}&restrict_sr=1`;
      const res = await fetchWithRetry(fallbackUrl, { retries: 0, timeoutMs: 6000, headers });
      if (res.ok) {
        const posts = parseRedditXml(await res.text(), cleanTicker, cleanCompany, isMultiWord);
        if (posts.length > 0) {
          const sliced = posts.slice(0, 15);
          redditCache.set(cacheKey, { timestamp: now, posts: sliced });
          return sliced;
        }
      }
    } catch (err: any) {
      console.warn(`[WebScraper] Fallback Reddit multi-sub search failed for ${ticker}: ${err.message}`);
    }
  }

  return (cached && cached.posts.length > 0) ? cached.posts : [];
}
