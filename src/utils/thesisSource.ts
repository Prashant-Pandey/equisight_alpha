/**
 * Utility for parsing and resolving reference citation sources for Bull/Bear investment theses.
 */

export interface ResolvedThesisSource {
  name: string;
  url: string;
  domain: string;
}

/**
 * Extracts a clean, human-readable domain name from a URL.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Resolves an authoritative, clickable URL for institutional reference citations.
 */
function getAuthoritativeUrl(citation: string, ticker: string = ''): string {
  const lower = citation.toLowerCase();
  const cleanTicker = ticker ? ticker.toUpperCase() : '';

  // SEC Filings (10-K, 10-Q, 8-K, S-3, 6-K, etc.)
  if (
    lower.includes('10-k') ||
    lower.includes('10-q') ||
    lower.includes('8-k') ||
    lower.includes('s-3') ||
    lower.includes('6-k') ||
    lower.includes('40-f') ||
    lower.includes('sec form') ||
    lower.includes('edgar') ||
    lower.includes('prospectus')
  ) {
    if (cleanTicker) {
      if (lower.includes('10-k')) {
        return `https://www.sec.gov/edgar/search/#/ciks=${cleanTicker}&forms=10-K`;
      }
      if (lower.includes('10-q')) {
        return `https://www.sec.gov/edgar/search/#/ciks=${cleanTicker}&forms=10-Q`;
      }
      if (lower.includes('8-k')) {
        return `https://www.sec.gov/edgar/search/#/ciks=${cleanTicker}&forms=8-K`;
      }
      if (lower.includes('s-3')) {
        return `https://www.sec.gov/edgar/search/#/ciks=${cleanTicker}&forms=S-3`;
      }
      if (lower.includes('6-k')) {
        return `https://www.sec.gov/edgar/search/#/ciks=${cleanTicker}&forms=6-K`;
      }
      return `https://www.sec.gov/edgar/browse/?CIK=${cleanTicker}`;
    }
    return 'https://www.sec.gov/edgar/searchedgar/companysearch';
  }

  // ClinicalTrials.gov study IDs
  const nctMatch = citation.match(/NCT\d+/i);
  if (nctMatch) {
    return `https://clinicaltrials.gov/study/${nctMatch[0].toUpperCase()}`;
  }
  if (lower.includes('clinicaltrials.gov')) {
    return 'https://clinicaltrials.gov/';
  }

  // FDA (Food & Drug Administration)
  if (
    lower.includes('fda') ||
    lower.includes('orphan drug') ||
    lower.includes('fast track') ||
    lower.includes('cder') ||
    lower.includes('biologics license')
  ) {
    return 'https://www.accessdata.fda.gov/scripts/opdlisting/oopd/';
  }

  // EPA / Environmental Regulations
  if (
    lower.includes('epa') ||
    lower.includes('underground injection control') ||
    lower.includes('uic')
  ) {
    return 'https://www.epa.gov/uic';
  }

  // USPTO / Patents
  if (lower.includes('uspto') || lower.includes('patent')) {
    return cleanTicker
      ? `https://patents.google.com/?assignee=${encodeURIComponent(cleanTicker)}`
      : 'https://www.uspto.gov/patents';
  }

  // U.S. Department of Defense / Military / Defense Contracts
  if (
    lower.includes('department of defense') ||
    lower.includes('dod') ||
    lower.includes('defense procurement') ||
    lower.includes('contract award')
  ) {
    return 'https://www.defense.gov/News/Contracts/';
  }

  // U.S. Department of Homeland Security
  if (lower.includes('homeland security') || lower.includes('dhs') || lower.includes('biometric')) {
    return 'https://www.dhs.gov/';
  }

  // U.S. Government Accountability Office (GAO)
  if (lower.includes('gao')) {
    return 'https://www.gao.gov/';
  }

  // Exchanges: NASDAQ
  if (lower.includes('nasdaq')) {
    return cleanTicker
      ? `https://www.nasdaq.com/market-activity/stocks/${cleanTicker.toLowerCase()}`
      : 'https://www.nasdaq.com/';
  }

  // Exchanges: NYSE / NYSE American
  if (lower.includes('nyse')) {
    return cleanTicker
      ? `https://www.nyse.com/quote/${cleanTicker}`
      : 'https://www.nyse.com/';
  }

  // London Metal Exchange (LME)
  if (lower.includes('lme') || lower.includes('london metal exchange')) {
    return 'https://www.lme.com/en/Metals/Non-ferrous/LME-Copper';
  }

  // FINRA / Short sale reports
  if (lower.includes('finra') || lower.includes('short volume') || lower.includes('short interest')) {
    return 'https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data';
  }

  // Federal Reserve / Macro / St. Louis Fed FRED
  if (
    lower.includes('federal reserve') ||
    lower.includes('fed funds') ||
    lower.includes('treasury yield') ||
    lower.includes('sovereign yield')
  ) {
    return 'https://fred.stlouisfed.org/';
  }

  // OECD
  if (lower.includes('oecd')) {
    return 'https://data.oecd.org/';
  }

  // Medical Societies & Academic Conferences
  if (lower.includes('hematology') || lower.includes('ash')) {
    return 'https://www.hematology.org/';
  }
  if (lower.includes('eha') || lower.includes('european hematology')) {
    return 'https://ehaweb.org/';
  }
  if (lower.includes('iata')) {
    return 'https://www.iata.org/';
  }
  if (lower.includes('icsg') || lower.includes('copper study group')) {
    return 'https://icsg.org/';
  }
  if (lower.includes('wood mackenzie')) {
    return 'https://www.woodmac.com/';
  }
  if (lower.includes('s&p global') || lower.includes('credit rating')) {
    return 'https://www.spglobal.com/marketintelligence/en/';
  }
  if (lower.includes('stocktwits')) {
    return cleanTicker ? `https://stocktwits.com/symbol/${cleanTicker}` : 'https://stocktwits.com/';
  }
  if (lower.includes('deltek') || lower.includes('govwin')) {
    return 'https://www.deltek.com/en/products/business-development/govwin';
  }

  // Default fallback to company SEC filings or Google Finance
  if (cleanTicker) {
    return `https://www.sec.gov/edgar/browse/?CIK=${cleanTicker}`;
  }

  return 'https://www.sec.gov/edgar/searchedgar/companysearch';
}

/**
 * Normalizes any thesis source (string, markdown link, or structured object)
 * into a verified ResolvedThesisSource with name, url, and domain.
 */
export function resolveThesisSource(
  source: string | { name?: string; title?: string; url?: string; domain?: string } | unknown,
  ticker: string = ''
): ResolvedThesisSource {
  // If source is null/undefined
  if (!source) {
    return {
      name: 'SEC Disclosures & Institutional Market Intelligence',
      url: ticker ? `https://www.sec.gov/edgar/browse/?CIK=${ticker.toUpperCase()}` : 'https://www.sec.gov/',
      domain: 'sec.gov'
    };
  }

  // If already an object
  if (typeof source === 'object' && source !== null) {
    const obj = source as { name?: string; title?: string; url?: string; domain?: string };
    const rawUrl = (obj.url || '').trim();
    const rawName = (obj.name || obj.title || '').trim();

    if (rawUrl) {
      return {
        name: rawName || extractDomain(rawUrl) || 'Documentation Resource',
        url: rawUrl,
        domain: obj.domain || extractDomain(rawUrl)
      };
    }

    if (rawName) {
      const generatedUrl = getAuthoritativeUrl(rawName, ticker);
      return {
        name: rawName,
        url: generatedUrl,
        domain: extractDomain(generatedUrl)
      };
    }
  }

  const str = String(source).trim();

  // Check for Markdown link: [Title](https://...)
  const mdMatch = str.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
  if (mdMatch) {
    const name = mdMatch[1].trim();
    const url = mdMatch[2].trim();
    return {
      name,
      url,
      domain: extractDomain(url)
    };
  }

  // Check if string contains an embedded URL: "Name (https://...)" or "Name https://..."
  const embeddedMatch = str.match(/^(.*?)\s*\(?(https?:\/\/[^\s)]+)\)?$/);
  if (embeddedMatch && embeddedMatch[1].trim()) {
    const name = embeddedMatch[1].trim();
    const url = embeddedMatch[2].trim();
    return {
      name,
      url,
      domain: extractDomain(url)
    };
  }

  // Check if the string itself is a direct URL
  if (/^https?:\/\//i.test(str)) {
    return {
      name: extractDomain(str) || 'Web Resource',
      url: str,
      domain: extractDomain(str)
    };
  }

  // Plain text citation: resolve authoritative URL
  const resolvedUrl = getAuthoritativeUrl(str, ticker);
  return {
    name: str,
    url: resolvedUrl,
    domain: extractDomain(resolvedUrl)
  };
}
