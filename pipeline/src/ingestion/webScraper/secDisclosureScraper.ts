/**
 * SEC EDGAR company disclosures fetcher with in-flight promise caching.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { CONFIG } from '../../config.js';
import { resolveSecCik } from './secCikResolver.js';
import { parseSecXbrlDisclosures } from './secDisclosureParser.js';
import { companyProfileCache } from './companyProfileScraper.js';
import type { SecFinancialDisclosures } from './types.js';

const secDisclosureCache = new Map<string, Promise<SecFinancialDisclosures | null>>();

async function loadSecDisclosures(cleanTicker: string): Promise<SecFinancialDisclosures | null> {
  const userAgent = CONFIG.SEC_EDGAR_USER_AGENT || 'EquiSightResearch admin@equisight-alpha.com';

  try {
    const cik = await resolveSecCik(cleanTicker);
    if (!cik) return null;

    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;

    const [factsResult, submissionsResult] = await Promise.allSettled([
      fetchWithRetry(factsUrl, { retries: 1, timeoutMs: 8000, headers: { 'User-Agent': userAgent } }),
      fetchWithRetry(submissionsUrl, { retries: 1, timeoutMs: 6000, headers: { 'User-Agent': userAgent } })
    ]);

    if (factsResult.status !== 'fulfilled' || !factsResult.value.ok) {
      return null;
    }

    let sic: string | undefined;
    let sicDescription: string | undefined;
    if (submissionsResult.status === 'fulfilled' && submissionsResult.value.ok) {
      try {
        const sub = await submissionsResult.value.json();
        sic = sub?.sic ? String(sub.sic) : undefined;
        sicDescription = sub?.sicDescription || undefined;
      } catch {}
    }

    const facts = await factsResult.value.json();
    const entityName = facts?.entityName || cleanTicker;
    const usGaap = facts?.facts?.['us-gaap'];

    if (!usGaap) {
      return { cik, entityName, sic, sicDescription };
    }

    const businessSummary = companyProfileCache.get(cleanTicker)?.businessSummary;
    return parseSecXbrlDisclosures(cik, entityName, usGaap, sic, sicDescription, businessSummary);
  } catch (err: any) {
    console.warn(`[WebScraper] SEC EDGAR lookup failed for ${cleanTicker}: ${err.message}`);
    return null;
  }
}

export async function fetchSecDisclosures(ticker: string): Promise<SecFinancialDisclosures | null> {
  const cleanTicker = ticker.split('.')[0].toUpperCase();
  let pending = secDisclosureCache.get(cleanTicker);
  if (!pending) {
    pending = loadSecDisclosures(cleanTicker);
    secDisclosureCache.set(cleanTicker, pending);
  }
  return pending;
}
