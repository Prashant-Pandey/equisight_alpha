/**
 * Company profile scraper: business summary, sector, industry, employees, HQ.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { getYahooAuth } from './yahooAuth.js';
import type { CompanyProfile } from './types.js';

export const companyProfileCache = new Map<string, CompanyProfile>();

export function getCachedCompanyProfile(ticker: string): CompanyProfile | undefined {
  return companyProfileCache.get(ticker.split('.')[0].toUpperCase());
}

export async function fetchCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  if (companyProfileCache.has(cleanTicker)) {
    return companyProfileCache.get(cleanTicker)!;
  }

  try {
    const auth = await getYahooAuth();
    if (!auth) return null;
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(cleanTicker)}?crumb=${encodeURIComponent(auth.crumb)}&modules=assetProfile`;
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
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile;
    if (profile?.longBusinessSummary) {
      const compProf: CompanyProfile = {
        businessSummary: profile.longBusinessSummary,
        sector: profile.sector,
        industry: profile.industry,
        fullTimeEmployees: profile.fullTimeEmployees,
        city: profile.city,
        state: profile.state,
        country: profile.country
      };
      companyProfileCache.set(cleanTicker, compProf);
      return compProf;
    }
  } catch {}

  return null;
}
