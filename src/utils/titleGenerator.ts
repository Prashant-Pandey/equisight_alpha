/**
 * Institutional Equity Research Title Generator
 * 
 * Generates compelling, SEO-optimized, and context-aware research report titles
 * adhering to institutional equity analysis standards:
 * - "Stock Deep Dive: [Company] - [Key Thesis / Evolution / Structural Story]"
 * - "[Company] Stock Analysis: Is [TICKER] a Buy?"
 * - "[Company] Stock Analysis: Is This [Geography/Sector/Cap] Still a Buy?"
 * - "[Company] Stock Analysis: Is [TICKER] a Buy in [Year]?"
 * - "[Company] Stock Analysis: Quality But Not At The Right Price"
 */

export interface TitleGeneratorParams {
  companyName: string;
  ticker: string;
  verdict?: string;
  isPennyStock?: boolean;
  marketCap?: number;
  region?: string;
  country?: string;
  sector?: string;
  industry?: string;
  moatRating?: string;
  year?: number | string;
  preferredStyle?: 'deep_dive' | 'buy_question' | 'small_cap' | 'buy_year' | 'quality_price' | 'auto';
  deepDiveSubtitle?: string;
  currentPrice?: number;
  fairValue?: number;
}

/**
 * Strips corporate legal suffixes to produce a natural, human-readable company name.
 * e.g. "Fastly, Inc." -> "Fastly"
 *      "Badger Meter, Inc." -> "Badger Meter"
 *      "Norbit ASA" -> "Norbit"
 *      "BNP Paribas S.A." -> "BNP Paribas"
 */
export function cleanCompanyName(name: string): string {
  if (!name) return '';
  return name
    .replace(/,\s*(?:Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|ASA|AG|S\.A\.|SA|NV|N\.V\.|SE|Holdings?|Co\.)(?:\s*Class\s*[A-Z])?$/i, '')
    .replace(/\s+(?:Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|ASA|AG|S\.A\.|SA|NV|N\.V\.|SE|Holdings?|Co\.)(?:\s*Class\s*[A-Z])?$/i, '')
    .trim();
}

/**
 * Determines an appropriate descriptor for small-cap equities.
 */
function resolveSmallCapDescriptor(params: TitleGeneratorParams): string {
  if (params.country) {
    return `${params.country} Small-Cap`;
  }
  if (params.region === 'EU') {
    return 'European Small-Cap';
  }
  if (params.sector) {
    const sec = params.sector.trim();
    if (/tech/i.test(sec)) return 'Tech Small-Cap';
    if (/health|bio/i.test(sec)) return 'Biotech Small-Cap';
    if (/industr/i.test(sec)) return 'Industrial Small-Cap';
    if (/consum/i.test(sec)) return 'Consumer Small-Cap';
    return `${sec} Small-Cap`;
  }
  return 'Small-Cap';
}

/**
 * Generates an institutional research title tailored to the security's fundamental profile.
 */
export function generateImprovedTitle(params: TitleGeneratorParams): string {
  const cleanName = cleanCompanyName(params.companyName) || params.companyName;
  const ticker = params.ticker.toUpperCase();
  const year = params.year || new Date().getFullYear();
  const style = params.preferredStyle || 'auto';

  // Explicit style overrides
  if (style === 'deep_dive' && params.deepDiveSubtitle) {
    return `Stock Deep Dive: ${cleanName} - ${params.deepDiveSubtitle}`;
  }
  if (style === 'quality_price') {
    return `${cleanName} Stock Analysis: Quality But Not At The Right Price`;
  }
  if (style === 'small_cap') {
    const desc = resolveSmallCapDescriptor(params);
    return `${cleanName} Stock Analysis: Is This ${desc} Still a Buy?`;
  }
  if (style === 'buy_year') {
    return `${cleanName} Stock Analysis: Is ${ticker} a Buy in ${year}?`;
  }
  if (style === 'buy_question') {
    return `${cleanName} Stock Analysis: Is ${ticker} a Buy?`;
  }

  // Automatic style selection based on fundamental parameters:
  const isOvervalued = params.verdict && /overvalued/i.test(params.verdict);
  const isSmallCap = params.isPennyStock || (params.marketCap !== undefined && params.marketCap < 2e9);

  // 1. High Quality / Overvalued Multiple Asymmetry
  if (isOvervalued) {
    return `${cleanName} Stock Analysis: Quality But Not At The Right Price`;
  }

  // 2. Small-Cap / Micro-Cap Equity
  if (isSmallCap) {
    const desc = resolveSmallCapDescriptor(params);
    return `${cleanName} Stock Analysis: Is This ${desc} Still a Buy?`;
  }

  // 3. Deep Dive with Subtitle if provided
  if (params.deepDiveSubtitle) {
    return `Stock Deep Dive: ${cleanName} - ${params.deepDiveSubtitle}`;
  }

  // 4. Large Cap / High-Profile Horizon Question
  if (params.marketCap && params.marketCap > 100e9) {
    return `${cleanName} Stock Analysis: Is ${ticker} a Buy in ${year}?`;
  }

  // 5. Default direct institutional inquiry
  return `${cleanName} Stock Analysis: Is ${ticker} a Buy?`;
}

/**
 * Detects legacy mechanical titles (e.g. "FSLY Surges +15.9%: Fundamental & Valuation Analysis")
 * and elevates them to the new institutional format.
 */
export function improveExistingTitle(existingTitle: string, params: TitleGeneratorParams): string {
  if (!existingTitle) {
    return generateImprovedTitle(params);
  }

  // Check if existing title is already in one of the approved institutional patterns
  const isApprovedPattern =
    existingTitle.startsWith('Stock Deep Dive:') ||
    existingTitle.endsWith('a Buy?') ||
    /a Buy in \d{4}\?$/.test(existingTitle) ||
    existingTitle.endsWith('Quality But Not At The Right Price');

  if (isApprovedPattern) {
    return existingTitle;
  }

  // Check if existing title is in the legacy mechanical pattern
  const isLegacyMechanical =
    /(?:Surges|Retreats|Gains|Drops|Jumps|Falls|Slips|Rallies)\s+[+-]?\d+(?:\.\d+)?%/i.test(existingTitle) ||
    /Fundamental & Valuation Analysis/i.test(existingTitle);

  if (isLegacyMechanical) {
    return generateImprovedTitle(params);
  }

  return existingTitle;
}
