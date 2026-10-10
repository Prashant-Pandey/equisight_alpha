/**
 * Google News RSS scraper for live financial news headlines and company catalysts.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { extractTextFromHtml } from './htmlUtils.js';
import type { ScrapedNewsArticle } from './types.js';

export async function fetchGoogleNews(ticker: string, companyName?: string): Promise<ScrapedNewsArticle[]> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  const cleanCompany = companyName
    ? companyName
        .replace(/,\s*(Inc\.|Corp\.|Ltd\.|LLC|Co\.|PLC|SA|NV)\.?$/i, '')
        .replace(/\s+(Inc\.|Corp\.|Corporation|Holdings|Limited|Ltd\.|LLC|Co\.|PLC)\.?$/i, '')
        .trim()
    : '';
  const query = cleanCompany && cleanCompany.toLowerCase() !== cleanTicker.toLowerCase()
    ? `${cleanCompany} ${cleanTicker} stock`
    : `${cleanTicker} stock`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  const parseArticles = (xml: string): ScrapedNewsArticle[] => {
    const articles: ScrapedNewsArticle[] = [];
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const seenTitles = new Set<string>();

    for (const block of itemBlocks) {
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      if (titleMatch) {
        const rawTitle = titleMatch[1]
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();

        const normalizedKey = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenTitles.has(normalizedKey)) continue;
        seenTitles.add(normalizedKey);

        const rawDesc = descMatch ? descMatch[1] : '';
        const cleanDesc = extractTextFromHtml(rawDesc);

        articles.push({
          title: rawTitle,
          description: cleanDesc,
          source: sourceMatch ? sourceMatch[1].trim() : 'Financial Press',
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
          link: linkMatch ? linkMatch[1].trim() : ''
        });
      }
    }
    return articles;
  };

  try {
    const res = await fetchWithRetry(url, {
      retries: 1,
      timeoutMs: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, text/xml, */*'
      }
    });

    if (!res.ok) return [];

    const xml = await res.text();
    let articles = parseArticles(xml);

    // If fewer than 20 articles found and cleanCompany was provided, supplement with pure ticker search
    if (articles.length < 20 && cleanCompany) {
      try {
        const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${cleanTicker} stock`)}&hl=en-US&gl=US&ceid=US:en`;
        const fbRes = await fetchWithRetry(fallbackUrl, {
          retries: 1,
          timeoutMs: 6000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, text/xml, */*'
          }
        });
        if (fbRes.ok) {
          const fbXml = await fbRes.text();
          const existingKeys = new Set(articles.map((a) => a.title.toLowerCase().replace(/[^a-z0-9]/g, '')));
          for (const item of parseArticles(fbXml)) {
            const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              articles.push(item);
            }
          }
        }
      } catch {
        // Non-critical fallback
      }
    }

    // Sort strictly descending by publication date to return the most recent news articles
    articles.sort((a, b) => {
      const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    return articles.slice(0, 20);
  } catch (err: any) {
    console.warn(`[WebScraper] Google News scraping failed for ${ticker}: ${err.message}`);
    return [];
  }
}
