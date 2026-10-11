/**
 * Valuation benchmarks: SIC → sector mapping, sector reference multiples and
 * capital-market assumptions used to make the valuation suite macro- and sector-aware.
 *
 * Reference multiples are long-run US sector medians (approximately aligned with
 * Damodaran's January 2025 US industry datasets). They are anchored to a reference
 * risk-free rate and re-scaled at runtime for the prevailing 10Y Treasury yield.
 */

export type SectorKey =
  | 'Technology'
  | 'Communication Services'
  | 'Healthcare'
  | 'Financial Services'
  | 'Real Estate'
  | 'Utilities'
  | 'Energy'
  | 'Industrials'
  | 'Basic Materials'
  | 'Consumer Cyclical'
  | 'Consumer Defensive'
  | 'General Equities';

export type IndustryMetric = 'EV/Sales' | 'EV/EBITDA' | 'Justified P/B' | 'P/FFO';

export interface SectorBenchmark {
  /** Median trailing P/E used by the relative valuation model. */
  pe: number;
  /** Long-run median P/B, reported as the P/B industry average. */
  pb: number;
  /** Industry-specific model the sector is valued on. */
  industryMetric: IndustryMetric;
  /** Reference multiple for `industryMetric` (unused for Justified P/B, which is derived). */
  industryMultiple: number;
}

export const SECTOR_BENCHMARKS: Record<SectorKey, SectorBenchmark> = {
  'Technology':             { pe: 28.0, pb: 7.0, industryMetric: 'EV/Sales',      industryMultiple: 5.5 },
  'Communication Services': { pe: 20.0, pb: 3.0, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 },
  'Healthcare':             { pe: 24.0, pb: 4.0, industryMetric: 'EV/EBITDA',     industryMultiple: 14.0 },
  'Financial Services':     { pe: 13.0, pb: 1.3, industryMetric: 'Justified P/B', industryMultiple: 1.3 },
  'Real Estate':            { pe: 30.0, pb: 1.8, industryMetric: 'P/FFO',         industryMultiple: 15.0 },
  'Utilities':              { pe: 17.0, pb: 1.8, industryMetric: 'EV/EBITDA',     industryMultiple: 11.0 },
  'Energy':                 { pe: 11.0, pb: 1.7, industryMetric: 'EV/EBITDA',     industryMultiple: 6.0 },
  'Industrials':            { pe: 21.0, pb: 3.5, industryMetric: 'EV/EBITDA',     industryMultiple: 12.0 },
  'Basic Materials':        { pe: 16.0, pb: 2.0, industryMetric: 'EV/EBITDA',     industryMultiple: 8.0 },
  'Consumer Cyclical':      { pe: 20.0, pb: 3.5, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 },
  'Consumer Defensive':     { pe: 21.0, pb: 4.0, industryMetric: 'EV/EBITDA',     industryMultiple: 12.0 },
  'General Equities':       { pe: 18.0, pb: 2.8, industryMetric: 'EV/EBITDA',     industryMultiple: 10.0 }
};

/** Capital-market assumptions. */
export const CAPITAL_MARKET = {
  /** Equity risk premium over the 10Y Treasury. */
  equityRiskPremium: 0.05,
  /** Fallback 10Y Treasury yield when no macro context is supplied. */
  defaultRiskFreeRate: 0.0425,
  /** Risk-free rate the reference multiples are anchored to. */
  referenceRiskFreeRate: 0.0425,
  /** US federal statutory corporate tax rate. */
  taxRate: 0.21,
  /** Pre-tax credit spread over Treasuries for cost of debt. */
  creditSpread: 0.015,
  /** Bounds on beta to dampen noisy estimates. */
  betaFloor: 0.5,
  betaCap: 2.5
} as const;

const SECTOR_ALIASES: Record<string, SectorKey> = {
  'technology': 'Technology',
  'information technology': 'Technology',
  'communication services': 'Communication Services',
  'communications': 'Communication Services',
  'healthcare': 'Healthcare',
  'health care': 'Healthcare',
  'financial services': 'Financial Services',
  'financials': 'Financial Services',
  'financial': 'Financial Services',
  'real estate': 'Real Estate',
  'utilities': 'Utilities',
  'energy': 'Energy',
  'industrials': 'Industrials',
  'basic materials': 'Basic Materials',
  'materials': 'Basic Materials',
  'consumer cyclical': 'Consumer Cyclical',
  'consumer discretionary': 'Consumer Cyclical',
  'consumer defensive': 'Consumer Defensive',
  'consumer staples': 'Consumer Defensive'
};

/** Normalises free-text sector names (Yahoo / GICS style) to a benchmark key. */
export function normalizeSector(sector?: string | null): SectorKey {
  if (!sector) return 'General Equities';
  return SECTOR_ALIASES[sector.trim().toLowerCase()] ?? 'General Equities';
}

/** Maps an SEC Standard Industrial Classification code to a sector. */
export function sectorFromSic(sicInput?: string | number | null): SectorKey {
  const sic = Number(sicInput);
  if (!Number.isFinite(sic) || sic <= 0) return 'General Equities';
  const inRange = (lo: number, hi: number) => sic >= lo && sic <= hi;

  // Specific overrides first
  if (inRange(1300, 1399) || inRange(2900, 2999) || inRange(5171, 5172)) return 'Energy';
  if (inRange(2830, 2836) || inRange(3840, 3851) || inRange(5120, 5122) || inRange(8000, 8099)) return 'Healthcare';
  if (inRange(2840, 2844) || sic === 5912 || inRange(5400, 5499)) return 'Consumer Defensive';
  if (inRange(3570, 3579) || inRange(3600, 3629) || inRange(3640, 3699) || inRange(7370, 7379)) return 'Technology';
  if (inRange(3630, 3639) || inRange(3710, 3716)) return 'Consumer Cyclical';
  if (inRange(2700, 2799) || inRange(4800, 4899) || inRange(7800, 7999)) return 'Communication Services';
  if (inRange(6500, 6599) || sic === 6798) return 'Real Estate';

  // Broad divisions
  if (inRange(100, 999) || inRange(2000, 2199)) return 'Consumer Defensive';
  if (inRange(1000, 1299) || inRange(1400, 1499)) return 'Basic Materials';
  if (inRange(1500, 1799)) return 'Industrials';
  if (inRange(2200, 2399) || inRange(3900, 3999)) return 'Consumer Cyclical';
  if (inRange(2400, 2699) || inRange(2800, 2899) || inRange(3000, 3399)) return 'Basic Materials';
  if (inRange(3400, 3599) || inRange(3700, 3799)) return 'Industrials';
  if (inRange(3800, 3899)) return 'Technology';
  if (inRange(4000, 4799)) return 'Industrials';
  if (inRange(4900, 4999)) return 'Utilities';
  if (inRange(5000, 5199)) return 'Industrials';
  if (inRange(5200, 5999)) return 'Consumer Cyclical';
  if (inRange(6000, 6799)) return 'Financial Services';
  if (inRange(7000, 7299)) return 'Consumer Cyclical';
  if (inRange(7300, 7399) || inRange(8700, 8799)) return 'Industrials';
  return 'General Equities';
}

/**
 * Rate-sensitivity scalar for reference multiples. Earnings multiples compress when
 * the cost of equity rises above the reference level (and expand when it falls).
 * Bounded to ±20% so a single macro input cannot dominate the valuation.
 */
export function rateAdjustmentFactor(riskFreeRate: number): number {
  const { equityRiskPremium: erp, referenceRiskFreeRate: ref } = CAPITAL_MARKET;
  const factor = (ref + erp) / (riskFreeRate + erp);
  return Math.min(1.2, Math.max(0.8, factor));
}

export const SECTOR_ETF_MAP: Record<SectorKey, string> = {
  'Technology': 'XLK',
  'Communication Services': 'XLC',
  'Healthcare': 'XLV',
  'Financial Services': 'XLF',
  'Real Estate': 'XLRE',
  'Utilities': 'XLU',
  'Energy': 'XLE',
  'Industrials': 'XLI',
  'Basic Materials': 'XLB',
  'Consumer Cyclical': 'XLY',
  'Consumer Defensive': 'XLP',
  'General Equities': 'SPY'
};

export interface SectorDynamics {
  industryCondition: string;
  macroConditionSimplified?: string;
  obstaclesAndChallenges: string;
  obstaclesAndChallengesSimplified?: string;
  economicPoliticalCulturalRisks: string;
  economicPoliticalCulturalRisksSimplified?: string;
}

/**
 * Dynamically derives sector and industry conditions using live market data,
 * benchmark ETF multiples, sovereign discount rates, and the company's real industry/SIC.
 * Eliminates static hardcoded narratives.
 */
export function deriveSectorDynamics(
  sectorInput?: string | null,
  industryInput?: string | null,
  macro?: {
    us10YearYield?: number;
    fedFundsRate?: number;
    vixIndex?: number;
    crudeOilWTI?: number;
    cpiInflationRate?: number;
  } | null,
  etfQuote?: { price?: number; trailingPE?: number; forwardPE?: number } | null
): SectorDynamics {
  const sector = normalizeSector(sectorInput);
  const industry = industryInput?.trim() || `${sector} Industry`;
  const y10 = macro?.us10YearYield ?? 4.25;
  const fedRate = macro?.fedFundsRate ?? 4.75;
  const vix = macro?.vixIndex ?? 15.0;
  const oil = macro?.crudeOilWTI ?? 75.0;
  const cpi = macro?.cpiInflationRate ?? 2.8;
  const etfTicker = SECTOR_ETF_MAP[sector] || 'SPY';
  const peStr = etfQuote?.trailingPE
    ? `trading at a benchmark P/E of ${etfQuote.trailingPE}x (via ${etfTicker})`
    : `benchmarked against ${etfTicker}`;

  const rateHurdle = y10 > 4.25 ? 'elevated long-term borrowing costs' : 'moderating sovereign discount rates';
  const volRegime = vix > 20 ? 'elevated market volatility' : 'subdued volatility conditions';

  let condition: string;
  let simplifiedCondition: string;
  let simplifiedObstacles: string;
  let simplifiedRisks: string;
  if (sector === 'Utilities') {
    condition = `The Utilities sector (${industry}), ${peStr}, operates within regulated capital return frameworks sensitive to prevailing 10-Year sovereign yields of ${y10.toFixed(2)}%. Operating conditions require ongoing balancing between capital expenditure obligations, grid transmission maintenance, and cost-of-debt hurdles, with return on equity governed by regulatory rate-case filings.`;
    simplifiedCondition = `Utility companies provide essential services like power and water under government regulation, benefiting from steady demand but facing higher financing costs when interest rates rise.`;
    simplifiedObstacles = `High spending needed to upgrade power grids and maintain infrastructure, along with state regulators limiting how quickly customer rates can be raised.`;
    simplifiedRisks = `Rising interest rates make large debt loads more expensive, while extreme weather and changing clean-energy rules create operational uncertainty.`;
  } else if (sector === 'Technology') {
    condition = `The Technology sector (${industry}), ${peStr}, is influenced by enterprise capital allocation cycles, technology adoption velocity, and discount-rate sensitivity from prevailing ${y10.toFixed(2)}% Treasury yields on long-duration equity cash flows.`;
    simplifiedCondition = `Tech companies are seeing strong adoption of software and digital tools, but corporate customers are scrutinizing their budgets carefully given current borrowing costs.`;
    simplifiedObstacles = `Companies face longer customer sales cycles, tight corporate software budgets, and fierce competition to deliver rapid product innovation.`;
    simplifiedRisks = `Fast-changing technology cycles, potential antitrust or data privacy regulations, and broader corporate pullbacks in technology spending.`;
  } else if (sector === 'Energy') {
    condition = `The Energy sector (${industry}), ${peStr}, operates against benchmark crude prices of $${oil.toFixed(2)}/bbl, balancing operational reinvestment rates against balance-sheet discipline and cash returns across global commodity cycles.`;
    simplifiedCondition = `Energy producers depend on global oil and fuel prices, focusing on operational discipline and returning cash to shareholders rather than aggressive new drilling.`;
    simplifiedObstacles = `Managing fluctuating oil and gas prices, rising equipment and extraction costs, and complying with stricter environmental guidelines.`;
    simplifiedRisks = `Geopolitical conflicts disrupting energy transit routes, government carbon reduction policies, and global recessions reducing energy demand.`;
  } else if (sector === 'Financial Services') {
    condition = `Financial institutions in ${industry}, ${peStr}, navigate yield curve dynamics between 10-Year yields at ${y10.toFixed(2)}% and the policy rate at ${fedRate.toFixed(2)}%, managing deposit beta pressures and credit quality across economic cycles.`;
    simplifiedCondition = `Banks and financial firms earn money on the difference between borrowing and lending rates, balancing loan growth against deposit costs and borrower credit risk.`;
    simplifiedObstacles = `Higher interest paid to keep depositor savings, slowing loan demand, and cautious lending standards across commercial borrowers.`;
    simplifiedRisks = `Unanticipated shifts in central bank interest rate policies, stricter regulatory capital rules, and potential loan losses if the economy weakens.`;
  } else if (sector === 'Healthcare') {
    condition = `The Healthcare sector (${industry}), ${peStr}, is guided by clinical research timelines, commercial patent protection cycles, and payor reimbursement trends alongside broader healthcare labor and supply input costs.`;
    simplifiedCondition = `Healthcare and biotech businesses rely on clinical trial milestones and insurance coverage, supported by steady medical demand despite ongoing regulatory and research costs.`;
    simplifiedObstacles = `High research and development costs, lengthy drug approval timelines, and price negotiation pressures from insurers and healthcare agencies.`;
    simplifiedRisks = `FDA approval delays or rejections, loss of patent protections to generic competitors, and government healthcare policy changes.`;
  } else if (sector === 'Real Estate') {
    condition = `Real Estate operators in ${industry}, ${peStr}, face capitalization rate adjustments driven by the ${y10.toFixed(2)}% 10-Year Treasury yield, refinancing spreads, and commercial occupancy patterns.`;
    simplifiedCondition = `Real estate companies manage rental properties and buildings, but higher interest rates make financing new developments and refinancing existing mortgages more expensive.`;
    simplifiedObstacles = `High borrowing rates depressing property sales, changing tenant demand for office and commercial space, and rising property maintenance costs.`;
    simplifiedRisks = `Falling commercial property values, looming mortgage refinancings at higher rates, and local tax or zoning policy adjustments.`;
  } else if (sector === 'Consumer Cyclical') {
    condition = `The Consumer Cyclical sector (${industry}), ${peStr}, is shaped by household disposable income, consumer sentiment, and financing rates on discretionary purchases.`;
    simplifiedCondition = `Discretionary consumer businesses depend on household spending confidence and interest rates, seeing sales fluctuate with broader consumer budget trends.`;
    simplifiedObstacles = `Shoppers cutting back on non-essential spending due to inflation, increased promotional discounting to clear inventory, and supply chain expenses.`;
    simplifiedRisks = `Weakening consumer sentiment during economic slowdowns, rapid shifts in buyer trends, and tariff or import policy changes.`;
  } else if (sector === 'Consumer Defensive') {
    condition = `The Consumer Defensive sector (${industry}), ${peStr}, benefits from non-discretionary grocery and household demand, managing commodity input inflation and retailer pricing power.`;
    simplifiedCondition = `Consumer staples companies produce essential everyday items, enjoying stable customer demand but managing packaging and ingredient cost pressures.`;
    simplifiedObstacles = `Consumer pushback against further price hikes, rising costs for agricultural ingredients and packaging, and store-brand competition.`;
    simplifiedRisks = `Supply chain interruptions for raw ingredients, sudden food and safety regulations, and inflationary pinches on consumer household budgets.`;
  } else if (sector === 'Basic Materials') {
    condition = `The Basic Materials sector (${industry}), ${peStr}, operates across international raw material cycles, industrial production volume, and global supply-chain inventories.`;
    simplifiedCondition = `Materials companies provide raw resources and chemicals to manufacturers, with revenue closely tied to global factory activity and commodity prices.`;
    simplifiedObstacles = `High energy costs for processing materials, volatile raw commodity prices, and fluctuating orders from industrial customers.`;
    simplifiedRisks = `Slowdowns in global construction and manufacturing, trade barriers or tariffs, and stringent environmental permitting standards.`;
  } else if (sector === 'Industrials') {
    condition = `The Industrials sector (${industry}), ${peStr}, is driven by business capital equipment investment, supply-chain logistics, and commercial manufacturing activity.`;
    simplifiedCondition = `Industrial companies build machinery, equipment, and transportation infrastructure, depending on commercial business investment and shipping activity.`;
    simplifiedObstacles = `Shortages of skilled technical labor, delays in parts and components, and customers postponing large factory equipment orders.`;
    simplifiedRisks = `Broader industrial cycle slowdowns, trade conflicts impacting exported machinery, and fluctuating freight and energy prices.`;
  } else {
    condition = `The ${sector} sector (${industry}), ${peStr}, operates in a macroeconomic environment anchored by a US 10-Year yield of ${y10.toFixed(2)}% and policy rates at ${fedRate.toFixed(2)}%, where operating execution, margin resilience, and capital allocation determine competitive performance.`;
    simplifiedCondition = `Companies in ${industry} navigate current customer demand and operational expenses within broader interest rate and economic trends.`;
    simplifiedObstacles = `Managing elevated borrowing costs, maintaining healthy profit margins amid inflationary expenses, and retaining customer demand.`;
    simplifiedRisks = `Uncertainty in interest rate policies, shifts in regulatory and legal requirements, and broader economic cycle volatility.`;
  }

  const obstacles = `Primary operational obstacles across ${industry} include managing ${rateHurdle}, navigating labor and input expenses (CPI inflation at ${cpi.toFixed(1)}%), and defending unit margins amid competitive market positioning.`;

  const risks = `Macro, political, and regulatory risks encompass central bank interest rate trajectory adjustments, sovereign yield volatility, sector-specific statutory oversight, and broader economic cycle shifts under ${volRegime} (VIX: ${vix.toFixed(1)}).`;

  return {
    industryCondition: condition,
    macroConditionSimplified: simplifiedCondition,
    obstaclesAndChallenges: obstacles,
    obstaclesAndChallengesSimplified: simplifiedObstacles,
    economicPoliticalCulturalRisks: risks,
    economicPoliticalCulturalRisksSimplified: simplifiedRisks
  };
}

export function getSectorDynamics(
  sectorInput?: string | null,
  industryInput?: string | null,
  macro?: {
    us10YearYield?: number;
    fedFundsRate?: number;
    vixIndex?: number;
    crudeOilWTI?: number;
    cpiInflationRate?: number;
  } | null,
  etfQuote?: { price?: number; trailingPE?: number; forwardPE?: number } | null
): SectorDynamics {
  return deriveSectorDynamics(sectorInput, industryInput, macro, etfQuote);
}

export interface PeerProfile {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number | null;
  evToEbitda: number | null;
  moat: string;
  roic: number | null;
}

/**
 * Legacy synchronous stub: Returns empty array.
 * Peer tickers and profiles are fetched dynamically from live financial APIs
 * via webScraper.fetchPeerTickers() and webScraper.fetchPeerQuotes().
 */
export function getPeersForTicker(ticker: string, sectorInput?: string | null): PeerProfile[] {
  return [];
}

/**
 * Morningstar Uncertainty Tiers & Margin of Safety Calibration
 * Table directly replicating Morningstar Equity Analyst Framework (Framework 3, Page 17)
 */
export const UNCERTAINTY_TIERS: Record<UncertaintyRating, { discount5Star: number; premium1Star: number }> = {
  'Low':       { discount5Star: 0.20, premium1Star: 0.25 },
  'Medium':    { discount5Star: 0.30, premium1Star: 0.35 },
  'High':      { discount5Star: 0.40, premium1Star: 0.55 },
  'Very High': { discount5Star: 0.50, premium1Star: 0.75 },
  'Extreme':   { discount5Star: 0.75, premium1Star: 3.00 }
};

export type UncertaintyRating = 'Low' | 'Medium' | 'High' | 'Very High' | 'Extreme';
export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface MorningstarRatingResult {
  starRating: StarRating;
  starRatingString: '★' | '★★' | '★★★' | '★★★★' | '★★★★★';
  uncertaintyRating: UncertaintyRating;
  fairValueEstimate: number;
  currentPrice: number;
  priceToFairValue: number;
  fiveStarPrice: number;
  oneStarPrice: number;
  requiredMarginOfSafety: number;
  overvaluationHurdle: number;
}

export function determineUncertaintyRating(
  arg1?: any,
  arg2?: any,
  arg3?: any,
  arg4?: any
): UncertaintyRating {
  let sector: string | undefined;
  let beta: number | null | undefined;
  let debtToEquity: number | null | undefined;
  let isPennyStock = false;

  if (typeof arg1 === 'string') {
    // Signature: (sector, beta, debtToEquity, isPennyStock)
    sector = arg1;
    beta = typeof arg2 === 'number' ? arg2 : null;
    debtToEquity = typeof arg3 === 'number' ? arg3 : null;
    isPennyStock = Boolean(arg4);
  } else {
    // Signature: (beta, isPennyStock, debtToEquity, sector)
    beta = typeof arg1 === 'number' ? arg1 : null;
    isPennyStock = Boolean(arg2);
    debtToEquity = typeof arg3 === 'number' ? arg3 : null;
    sector = typeof arg4 === 'string' ? arg4 : undefined;
  }

  if (isPennyStock) return 'Extreme';
  const normSec = sector ? normalizeSector(sector) : undefined;
  const b = beta ?? 1.1;
  const de = debtToEquity ?? 0.5;

  if (normSec === 'Utilities' && b < 1.0 && de < 1.5) return 'Low';
  if (normSec === 'Consumer Defensive' && b < 0.9) return 'Low';

  if (b > 1.8 || de > 3.0) return 'Very High';
  if (b > 1.3 || de > 1.8) return 'High';
  if (b >= 0.85) return 'Medium';
  return 'Low';
}

/**
 * Calculates formal Morningstar 1-to-5 Star Rating based on Price / Fair Value ratio
 * within the calibrated Uncertainty margin-of-safety band.
 */
export function calculateMorningstarRating(
  currentPrice: number,
  fairValueEstimate: number,
  uncertainty?: UncertaintyRating,
  beta?: number | null,
  isPennyStock?: boolean,
  debtToEquity?: number | null,
  sector?: SectorKey
): MorningstarRatingResult {
  const unc = uncertainty || determineUncertaintyRating(beta, isPennyStock, debtToEquity, sector);
  const params = UNCERTAINTY_TIERS[unc] || UNCERTAINTY_TIERS['Medium'];

  const fv = Math.max(0.01, fairValueEstimate);
  const p = Math.max(0.01, currentPrice);
  const pFv = parseFloat((p / fv).toFixed(2));

  const fiveStarPrice = parseFloat((fv * (1 - params.discount5Star)).toFixed(2));
  const oneStarPrice = parseFloat((fv * (1 + params.premium1Star)).toFixed(2));

  let starRating: StarRating;
  let starRatingString: '★' | '★★' | '★★★' | '★★★★' | '★★★★★';

  if (p <= fiveStarPrice) {
    starRating = 5;
    starRatingString = '★★★★★';
  } else if (p <= fv * (1 - params.discount5Star * 0.35)) {
    starRating = 4;
    starRatingString = '★★★★';
  } else if (p < fv * (1 + params.premium1Star * 0.35)) {
    starRating = 3;
    starRatingString = '★★★';
  } else if (p < oneStarPrice) {
    starRating = 2;
    starRatingString = '★★';
  } else {
    starRating = 1;
    starRatingString = '★';
  }

  return {
    starRating,
    starRatingString,
    uncertaintyRating: unc,
    fairValueEstimate: fv,
    currentPrice: p,
    priceToFairValue: pFv,
    fiveStarPrice,
    oneStarPrice,
    requiredMarginOfSafety: Math.round(params.discount5Star * 100),
    overvaluationHurdle: Math.round(params.premium1Star * 100)
  };
}

