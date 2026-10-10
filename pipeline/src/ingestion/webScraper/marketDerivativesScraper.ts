/**
 * Derivatives and share ownership scraper (options chains, float, short interest, institutional holdings).
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { getYahooAuth } from './yahooAuth.js';
import { companyProfileCache } from './companyProfileScraper.js';

export async function fetchOptionsChain(ticker: string): Promise<{ calls: any[]; puts: any[]; spotPrice?: number; expirationDate?: number } | null> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  try {
    const auth = await getYahooAuth();
    if (!auth) return null;

    const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(cleanTicker)}?crumb=${encodeURIComponent(auth.crumb)}`;
    const res = await fetchWithRetry(url, {
      timeoutMs: 5000,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': auth.cookie
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.optionChain?.result?.[0];
    if (!result) return null;

    const spotPrice = result.quote?.regularMarketPrice;
    const opt = result.options?.[0];
    return {
      calls: opt?.calls || [],
      puts: opt?.puts || [],
      spotPrice: typeof spotPrice === 'number' ? spotPrice : undefined,
      expirationDate: opt?.expirationDate
    };
  } catch {
    return null;
  }
}

export async function fetchShareStatistics(ticker: string): Promise<{
  floatShares?: number;
  sharesOutstanding?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  sharesShort?: number;
  shortPercentOfFloat?: number;
} | null> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  try {
    const auth = await getYahooAuth();
    if (!auth) return null;

    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(cleanTicker)}?crumb=${encodeURIComponent(auth.crumb)}&modules=defaultKeyStatistics,majorHoldersBreakdown,assetProfile`;
    const res = await fetchWithRetry(url, {
      timeoutMs: 5000,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': auth.cookie
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
    const holders = data?.quoteSummary?.result?.[0]?.majorHoldersBreakdown;
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile;

    if (profile?.longBusinessSummary) {
      companyProfileCache.set(cleanTicker, {
        businessSummary: profile.longBusinessSummary,
        sector: profile.sector,
        industry: profile.industry,
        fullTimeEmployees: profile.fullTimeEmployees,
        city: profile.city,
        state: profile.state,
        country: profile.country
      });
    }

    const floatShares = stats?.floatShares?.raw || stats?.floatShares;
    const sharesOutstanding = stats?.sharesOutstanding?.raw || stats?.sharesOutstanding;
    const heldPercentInsiders = stats?.heldPercentInsiders?.raw ?? stats?.heldPercentInsiders ?? holders?.insidersPercentHeld?.raw;
    const heldPercentInstitutions = stats?.heldPercentInstitutions?.raw ?? stats?.heldPercentInstitutions ?? holders?.institutionsPercentHeld?.raw;
    const sharesShort = stats?.sharesShort?.raw || stats?.sharesShort;
    const shortPercentOfFloat = stats?.shortPercentOfFloat?.raw || stats?.shortPercentOfFloat;

    return {
      floatShares: typeof floatShares === 'number' ? floatShares : undefined,
      sharesOutstanding: typeof sharesOutstanding === 'number' ? sharesOutstanding : undefined,
      heldPercentInsiders: typeof heldPercentInsiders === 'number' ? heldPercentInsiders : undefined,
      heldPercentInstitutions: typeof heldPercentInstitutions === 'number' ? heldPercentInstitutions : undefined,
      sharesShort: typeof sharesShort === 'number' ? sharesShort : undefined,
      shortPercentOfFloat: typeof shortPercentOfFloat === 'number' ? shortPercentOfFloat : undefined
    };
  } catch {
    return null;
  }
}
