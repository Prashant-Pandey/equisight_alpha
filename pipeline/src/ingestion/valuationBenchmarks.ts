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

export interface SectorDynamics {
  industryCondition: string;
  obstaclesAndChallenges: string;
  economicPoliticalCulturalRisks: string;
}

export const SECTOR_DYNAMICS: Record<SectorKey, SectorDynamics> = {
  'Utilities': {
    industryCondition: 'The Utilities sector is experiencing an unprecedented structural renaissance driven by surging baseload power demand from AI hyperscale data centers, industrial onshoring, and vehicle electrification. Grid operators face tightening reserve margins while transitioning to clean generation portfolios, elevating the value of 24/7 carbon-free capacity.',
    obstaclesAndChallenges: 'Primary operational obstacles include elevated capital expenditure requirements for transmission upgrades, prolonged interconnection queue backlogs, regional ISO market design frictions, and the necessity to maintain reserve reliability under volatile weather extremes.',
    economicPoliticalCulturalRisks: 'Key exposures encompass interest rate sensitivity given heavy balance-sheet debt loads, state Public Utility Commission (PUC) rate case regulatory lag, Federal Energy Regulatory Commission (FERC) policy interventions, and clean-energy tax credit policy shifts.'
  },
  'Technology': {
    industryCondition: 'The enterprise technology and semiconductor sector is propelled by generative AI infrastructure buildouts, enterprise cloud migration, and accelerated compute deployment. Platform providers with integrated software ecosystems and proprietary silicon architectures continue to capture disproportionate operating leverage.',
    obstaclesAndChallenges: 'Leading operational hurdles involve rapid hardware obsolescence cycles, massive advanced-node foundry capacity constraints, escalating hyperscaler R&D expenditures, and intense developer ecosystem lock-in competition.',
    economicPoliticalCulturalRisks: 'Vulnerabilities center on cross-border semiconductor export controls, heightened FTC/DOJ antitrust scrutiny over proprietary walled gardens, enterprise IT budget tightening, and sovereign cloud data residency mandates.'
  },
  'Healthcare': {
    industryCondition: 'The healthcare and life sciences landscape is characterized by secular demographic aging tailwinds, GLP-1 and antibody-drug conjugate clinical breakthroughs, and increasing adoption of outpatient ambulatory care models, counterbalanced by payor cost-containment pressures.',
    obstaclesAndChallenges: 'Structural obstacles include clinical trial Phase III attrition rates, patent exclusivity cliffs, generic and biosimilar substitution erosion, and prolonged FDA regulatory approval timelines.',
    economicPoliticalCulturalRisks: 'Primary macro risks include Inflation Reduction Act (IRA) Medicare drug price negotiations, pharmacy benefit manager (PBM) legislative reform, Medicaid redetermination volume shifts, and healthcare labor wage inflation.'
  },
  'Financial Services': {
    industryCondition: 'Financial institutions navigate a higher-for-longer yield curve environment marked by net interest margin (NIM) recalibration, deposit beta competition, and rising non-interest fee diversification across wealth management and investment banking.',
    obstaclesAndChallenges: 'Headwinds encompass commercial real estate (CRE) credit exposure normalization, regulatory capital requirement increases under Basel III Endgame revisions, and fintech payment disintermediation.',
    economicPoliticalCulturalRisks: 'Vulnerabilities involve Federal Reserve rate easing pacing, cyclical credit default cycles in leveraged lending, deposit flight risks during market stress, and consumer credit card delinquency trends.'
  },
  'Energy': {
    industryCondition: 'The global energy sector operates under capital discipline mandates prioritizing shareholder return dividends and share buybacks over speculative production growth, supported by global liquids demand growth and LNG export expansion.',
    obstaclesAndChallenges: 'Core challenges feature geological reserve depletion, OPEC+ production quota volatility, oilfield service cost inflation, and midstream pipeline egress bottlenecks in key producing basins.',
    economicPoliticalCulturalRisks: 'Macro risks include global crude demand cyclicality, geopolitical supply disruption shocks, carbon taxation frameworks, and fluctuating environmental drilling permitting policies.'
  },
  'Industrials': {
    industryCondition: 'Capital goods and aerospace manufacturers benefit from multi-year federal infrastructure investment programs, defense modernization outlays, and aerospace commercial fleet replacement backlogs.',
    obstaclesAndChallenges: 'Major headwinds comprise persistent aerospace supply chain bottlenecks, specialized machining labor shortages, and cyclical freight/industrial destocking cycles.',
    economicPoliticalCulturalRisks: 'Exposures include global trade tariff escalations, raw material input cost volatility (steel, titanium, composites), and sovereign defense budget allocation reprioritizations.'
  },
  'Communication Services': {
    industryCondition: 'The sector transitions toward digital ad optimization fueled by algorithmic machine learning targeting, connected TV (CTV) streaming consolidation, and high-margin subscription monetization.',
    obstaclesAndChallenges: 'Obstacles include linear television cord-cutting acceleration, digital advertising cyclical sensitivity, and ballooning streaming content production expenditures.',
    economicPoliticalCulturalRisks: 'Risks encompass global digital privacy regulations, app platform tracking restrictions, antitrust content distribution reviews, and macro consumer discretionary spending fatigue.'
  },
  'Consumer Cyclical': {
    industryCondition: 'Consumer discretionary operators experience bifurcation between value-oriented discounters and premium luxury brands, with omnichannel fulfillment and loyalty data playing decisive competitive roles.',
    obstaclesAndChallenges: 'Challenges encompass inventory markdown pressures, customer acquisition cost inflation across digital channels, and shifting retail labor wage dynamics.',
    economicPoliticalCulturalRisks: 'Primary vulnerabilities include real wage growth deceleration, elevated consumer debt servicing burdens, consumer confidence sentiment drops, and retail shrinkage.'
  },
  'Consumer Defensive': {
    industryCondition: 'Staples businesses rely on brand equity and category dominance to defend pricing power, though volume elasticity is increasingly tested by private-label grocery alternatives.',
    obstaclesAndChallenges: 'Hurdles involve packaging and agricultural commodity input inflation, shelf-space competition with retailer private labels, and shifting consumer wellness preferences.',
    economicPoliticalCulturalRisks: 'Exposures include foreign currency translation headwinds from overseas revenue, retail partner margin negotiations, and regulatory restrictions on ultra-processed foods.'
  },
  'Basic Materials': {
    industryCondition: 'Chemical, mining, and packaging producers navigate global industrial demand cycles, with structural demand driven by critical minerals for grid transformation and lightweight packaging.',
    obstaclesAndChallenges: 'Headwinds involve commodity pricing cyclicality, heavy energy and feedstock input costs, and prolonged capital expenditure gestation cycles for new extraction capacity.',
    economicPoliticalCulturalRisks: 'Risks center on Chinese industrial demand fluctuations, environmental mining permitting hurdles, resource nationalism, and global freight rate swings.'
  },
  'Real Estate': {
    industryCondition: 'Real estate investment trusts (REITs) experience wide divergence across sub-sectors, with data centers, industrial logistics, and cell towers outperforming traditional office and retail properties.',
    obstaclesAndChallenges: 'Obstacles involve refinancing maturing low-coupon mortgage debt at substantially higher interest rates and elevated building materials replacement costs.',
    economicPoliticalCulturalRisks: 'Exposures include tenant credit distress, municipal property tax reassessments, cap rate expansion, and sovereign bond yield competition for income investors.'
  },
  'General Equities': {
    industryCondition: 'Broad equities operate under prevailing monetary policy and macroeconomic liquidity conditions, where balance sheet resilience and free cash flow generation separate market leaders from capital-dependent operators.',
    obstaclesAndChallenges: 'Key challenges center on competitive pricing power, customer retention, input cost discipline, and technological modernization.',
    economicPoliticalCulturalRisks: 'Risks involve broader macroeconomic interest rate trajectories, sovereign yield volatility, and economic growth cycle shifts.'
  }
};

export interface PeerProfile {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number | null;
  evToEbitda: number | null;
  moat: 'Wide' | 'Narrow' | 'None';
  roic: number | null;
}

export const PEER_UNIVERSE: Record<string, PeerProfile[]> = {
  // Key Utilities / Independent Power Producers
  'CEG': [
    { ticker: 'VST', name: 'Vistra Corp', marketCap: 54e9, peRatio: 27.1, evToEbitda: 13.8, moat: 'Narrow', roic: 14.2 },
    { ticker: 'NRG', name: 'NRG Energy Inc', marketCap: 22e9, peRatio: 25.3, evToEbitda: 10.4, moat: 'Narrow', roic: 11.8 },
    { ticker: 'EXC', name: 'Exelon Corporation', marketCap: 43e9, peRatio: 15.3, evToEbitda: 11.2, moat: 'Narrow', roic: 7.9 }
  ],
  'VST': [
    { ticker: 'CEG', name: 'Constellation Energy Corp', marketCap: 108e9, peRatio: 30.0, evToEbitda: 14.5, moat: 'Narrow', roic: 12.8 },
    { ticker: 'NRG', name: 'NRG Energy Inc', marketCap: 22e9, peRatio: 25.3, evToEbitda: 10.4, moat: 'Narrow', roic: 11.8 },
    { ticker: 'TLN', name: 'Talen Energy Corp', marketCap: 11e9, peRatio: 24.0, evToEbitda: 12.1, moat: 'Narrow', roic: 13.5 }
  ],
  'TLN': [
    { ticker: 'CEG', name: 'Constellation Energy Corp', marketCap: 108e9, peRatio: 30.0, evToEbitda: 14.5, moat: 'Narrow', roic: 12.8 },
    { ticker: 'VST', name: 'Vistra Corp', marketCap: 54e9, peRatio: 27.1, evToEbitda: 13.8, moat: 'Narrow', roic: 14.2 },
    { ticker: 'NRG', name: 'NRG Energy Inc', marketCap: 22e9, peRatio: 25.3, evToEbitda: 10.4, moat: 'Narrow', roic: 11.8 }
  ],
  // Key Tech / Hardware / Semis
  'AAPL': [
    { ticker: 'MSFT', name: 'Microsoft Corporation', marketCap: 3200e9, peRatio: 34.5, evToEbitda: 23.1, moat: 'Wide', roic: 28.4 },
    { ticker: 'GOOGL', name: 'Alphabet Inc', marketCap: 2100e9, peRatio: 24.2, evToEbitda: 16.5, moat: 'Wide', roic: 26.1 },
    { ticker: 'HPQ', name: 'HP Inc', marketCap: 35e9, peRatio: 11.8, evToEbitda: 7.9, moat: 'None', roic: 18.2 }
  ],
  'NVDA': [
    { ticker: 'AMD', name: 'Advanced Micro Devices', marketCap: 260e9, peRatio: 48.0, evToEbitda: 35.2, moat: 'Narrow', roic: 12.5 },
    { ticker: 'INTC', name: 'Intel Corporation', marketCap: 95e9, peRatio: 22.0, evToEbitda: 11.0, moat: 'None', roic: 3.5 },
    { ticker: 'QCOM', name: 'Qualcomm Inc', marketCap: 185e9, peRatio: 18.5, evToEbitda: 14.2, moat: 'Narrow', roic: 24.8 }
  ]
};

export const SECTOR_DEFAULT_PEERS: Record<SectorKey, PeerProfile[]> = {
  'Utilities': [
    { ticker: 'CEG', name: 'Constellation Energy Corp', marketCap: 108e9, peRatio: 30.0, evToEbitda: 14.5, moat: 'Narrow', roic: 12.8 },
    { ticker: 'VST', name: 'Vistra Corp', marketCap: 54e9, peRatio: 27.1, evToEbitda: 13.8, moat: 'Narrow', roic: 14.2 },
    { ticker: 'EXC', name: 'Exelon Corporation', marketCap: 43e9, peRatio: 15.3, evToEbitda: 11.2, moat: 'Narrow', roic: 7.9 }
  ],
  'Technology': [
    { ticker: 'MSFT', name: 'Microsoft Corporation', marketCap: 3200e9, peRatio: 34.5, evToEbitda: 23.1, moat: 'Wide', roic: 28.4 },
    { ticker: 'AAPL', name: 'Apple Inc', marketCap: 3400e9, peRatio: 33.2, evToEbitda: 24.0, moat: 'Wide', roic: 52.0 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', marketCap: 3000e9, peRatio: 45.2, evToEbitda: 32.0, moat: 'Wide', roic: 42.0 }
  ],
  'Healthcare': [
    { ticker: 'LLY', name: 'Eli Lilly and Company', marketCap: 850e9, peRatio: 55.0, evToEbitda: 38.0, moat: 'Wide', roic: 22.0 },
    { ticker: 'UNH', name: 'UnitedHealth Group Inc', marketCap: 520e9, peRatio: 22.5, evToEbitda: 14.0, moat: 'Narrow', roic: 15.5 },
    { ticker: 'JNJ', name: 'Johnson & Johnson', marketCap: 390e9, peRatio: 16.5, evToEbitda: 12.0, moat: 'Wide', roic: 16.8 }
  ],
  'Financial Services': [
    { ticker: 'JPM', name: 'JPMorgan Chase & Co', marketCap: 620e9, peRatio: 12.4, evToEbitda: 10.5, moat: 'Wide', roic: 16.5 },
    { ticker: 'BAC', name: 'Bank of America Corp', marketCap: 310e9, peRatio: 13.8, evToEbitda: 9.8, moat: 'Narrow', roic: 10.2 },
    { ticker: 'MS', name: 'Morgan Stanley', marketCap: 170e9, peRatio: 15.2, evToEbitda: 11.4, moat: 'Narrow', roic: 13.0 }
  ],
  'Energy': [
    { ticker: 'XOM', name: 'Exxon Mobil Corp', marketCap: 470e9, peRatio: 13.5, evToEbitda: 6.8, moat: 'Narrow', roic: 14.5 },
    { ticker: 'CVX', name: 'Chevron Corporation', marketCap: 280e9, peRatio: 14.2, evToEbitda: 7.2, moat: 'Narrow', roic: 12.0 },
    { ticker: 'COP', name: 'ConocoPhillips', marketCap: 130e9, peRatio: 12.0, evToEbitda: 5.8, moat: 'Narrow', roic: 16.2 }
  ],
  'Industrials': [
    { ticker: 'GE', name: 'GE Aerospace', marketCap: 200e9, peRatio: 32.0, evToEbitda: 20.5, moat: 'Wide', roic: 18.0 },
    { ticker: 'CAT', name: 'Caterpillar Inc', marketCap: 190e9, peRatio: 17.5, evToEbitda: 12.2, moat: 'Narrow', roic: 28.5 },
    { ticker: 'HON', name: 'Honeywell International', marketCap: 140e9, peRatio: 22.0, evToEbitda: 14.5, moat: 'Narrow', roic: 15.8 }
  ],
  'Communication Services': [
    { ticker: 'GOOGL', name: 'Alphabet Inc', marketCap: 2100e9, peRatio: 24.2, evToEbitda: 16.5, moat: 'Wide', roic: 26.1 },
    { ticker: 'META', name: 'Meta Platforms Inc', marketCap: 1500e9, peRatio: 28.0, evToEbitda: 17.2, moat: 'Wide', roic: 29.5 },
    { ticker: 'DIS', name: 'Walt Disney Co', marketCap: 190e9, peRatio: 21.0, evToEbitda: 12.8, moat: 'Narrow', roic: 8.5 }
  ],
  'Consumer Cyclical': [
    { ticker: 'AMZN', name: 'Amazon.com Inc', marketCap: 2000e9, peRatio: 42.0, evToEbitda: 18.5, moat: 'Wide', roic: 15.0 },
    { ticker: 'HD', name: 'The Home Depot Inc', marketCap: 400e9, peRatio: 26.5, evToEbitda: 17.0, moat: 'Wide', roic: 36.0 },
    { ticker: 'TSLA', name: 'Tesla Inc', marketCap: 750e9, peRatio: 65.0, evToEbitda: 38.0, moat: 'Narrow', roic: 14.0 }
  ],
  'Consumer Defensive': [
    { ticker: 'WMT', name: 'Walmart Inc', marketCap: 640e9, peRatio: 32.0, evToEbitda: 16.5, moat: 'Wide', roic: 14.0 },
    { ticker: 'PG', name: 'Procter & Gamble Co', marketCap: 400e9, peRatio: 26.0, evToEbitda: 18.0, moat: 'Wide', roic: 22.0 },
    { ticker: 'COST', name: 'Costco Wholesale Corp', marketCap: 410e9, peRatio: 52.0, evToEbitda: 28.0, moat: 'Wide', roic: 21.0 }
  ],
  'Basic Materials': [
    { ticker: 'LIN', name: 'Linde plc', marketCap: 220e9, peRatio: 33.0, evToEbitda: 18.0, moat: 'Wide', roic: 13.5 },
    { ticker: 'APD', name: 'Air Products and Chemicals', marketCap: 65e9, peRatio: 24.0, evToEbitda: 13.5, moat: 'Narrow', roic: 11.0 },
    { ticker: 'FCX', name: 'Freeport-McMoRan Inc', marketCap: 68e9, peRatio: 26.0, evToEbitda: 9.5, moat: 'Narrow', roic: 14.8 }
  ],
  'Real Estate': [
    { ticker: 'PLD', name: 'Prologis Inc', marketCap: 115e9, peRatio: 35.0, evToEbitda: 22.0, moat: 'Narrow', roic: 7.2 },
    { ticker: 'AMT', name: 'American Tower Corp', marketCap: 105e9, peRatio: 38.0, evToEbitda: 20.0, moat: 'Narrow', roic: 8.5 },
    { ticker: 'EQIX', name: 'Equinix Inc', marketCap: 88e9, peRatio: 72.0, evToEbitda: 24.5, moat: 'Narrow', roic: 6.8 }
  ],
  'General Equities': [
    { ticker: 'SPY', name: 'S&P 500 Index Benchmark', marketCap: 500e9, peRatio: 22.0, evToEbitda: 14.0, moat: 'Narrow', roic: 15.0 },
    { ticker: 'QQQ', name: 'Invesco QQQ Benchmark', marketCap: 280e9, peRatio: 28.0, evToEbitda: 18.0, moat: 'Wide', roic: 22.0 },
    { ticker: 'IWM', name: 'Russell 2000 Benchmark', marketCap: 70e9, peRatio: 18.0, evToEbitda: 11.0, moat: 'None', roic: 8.0 }
  ]
};

export function getPeersForTicker(ticker: string, sectorInput?: string | null): PeerProfile[] {
  const clean = ticker.split('.')[0].toUpperCase();
  if (PEER_UNIVERSE[clean]) {
    return PEER_UNIVERSE[clean];
  }
  const sector = normalizeSector(sectorInput);
  const defaults = SECTOR_DEFAULT_PEERS[sector] || SECTOR_DEFAULT_PEERS['General Equities'];
  // Exclude current ticker if it happens to be in default list
  const filtered = defaults.filter((p) => p.ticker.toUpperCase() !== clean);
  return filtered.slice(0, 3);
}

export function getSectorDynamics(sectorInput?: string | null): SectorDynamics {
  const sector = normalizeSector(sectorInput);
  return SECTOR_DYNAMICS[sector] || SECTOR_DYNAMICS['General Equities'];
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

