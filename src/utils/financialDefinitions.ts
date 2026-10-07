/**
 * Institutional Equity Research Definitions & Quantitative Thresholds Registry
 * 
 * Single source of truth for financial domain definitions, regulatory citations,
 * quantitative heuristics, and analyst reviewer notes across the platform.
 */

export type DefinitionCategory =
  | 'Asset Class & Regulatory Qualification'
  | 'Equity Style & Factor Taxonomy'
  | 'Fundamental Health & Solvency'
  | 'Cash Flow Quality & Capital Intensity'
  | 'Management Quality & Stewardship'
  | 'Economic Moat & Competitive Dynamics'
  | 'Systematic Risk & Market Sensitivity'
  | 'Intrinsic Valuation & Margin of Safety'
  | 'Exchange Structure & Trading Venue';

export interface DefinitionTier {
  code: string;
  label: string;
  criteria: string;
  analystImplication: string;
}

export interface FinancialDomainDefinition {
  id: string;
  term: string;
  category: DefinitionCategory;
  regulatoryStandard?: string;
  academicOrMethodologyAnchor: string;
  formulaOrLogicSummary: string;
  methodologyRationale: string;
  reviewerNotes: string;
  thresholds: Record<string, number | string | string[] | boolean>;
  tiers?: DefinitionTier[];
}

/**
 * Centralized quantitative threshold values used across pipelines and components.
 * Modifying these values updates logic platform-wide.
 */
export const FINANCIAL_THRESHOLDS = {
  pennyStock: {
    priceCeilingUSD: 5.0,
    pennyVenues: ['NYSE AMERICAN', 'CAPITAL MARKET', 'PINK', 'OTC'] as const,
  },
  classification: {
    incomeMinDividendYieldPct: 2.0,
    growthMinPeRatio: 25.0,
    growthMinOperatingMarginPct: 15.0,
  },
  fundamentalRating: {
    strongDebtToEquityCeiling: 1.5,
    weakDebtToEquityFloor: 2.5,
    strongConsensusUpsidePct: 15.0,
    weakConsensusUpsidePct: -10.0,
    strongRiskScoreCeiling: 3,
    fairRiskScoreCeiling: 6,
  },
  riskCategory: {
    conservativeMaxScore: 3,
    coreMaxScore: 6,
  },
  cashFlow: {
    positiveFcfFloorUSD: 0,
    labels: {
      positiveFcf: 'Positive Free Cash Flow',
      positiveOperating: 'Positive Operating Free Cash Flow',
      cashBurn: 'Cash Burn / Capital Intensive',
      operatingDeficit: 'Operating Cash Flow Deficit',
      pennyFocus: 'Micro-Cap / Cash Conservation Focus',
      neutral: 'Cash Neutral / Not Reported',
      notAvailable: 'Not Available'
    }
  },
  managementQuality: {
    exemplaryRoicFloorPct: 15.0,
    exemplaryRoeFloorPct: 20.0,
    headwindsDebtToEquityFloor: 2.5,
    ratings: {
      exemplary: 'Exemplary',
      established: 'Established',
      standard: 'Standard',
      speculative: 'Speculative',
      notRated: 'Not Rated'
    },
    trackRecordNarratives: {
      penny: 'Executive leadership operating in micro-cap capital structure environment with ongoing financing exposure.',
      exemplary: 'Executive team demonstrating disciplined capital allocation with consistent value-accretive returns on capital.',
      headwinds: 'Management navigating balance sheet leverage headwinds with capital discipline under review.',
      established: 'Management team with operational track record navigating sector cycles.',
      notAvailable: 'Not Available'
    }
  },
  moatTrend: {
    positiveRevenueGrowthFloorPct: 8.0,
    positiveRoicFloorPct: 10.0,
    negativeRevenueGrowthCeilingPct: -5.0,
    negativeRoicCeilingPct: 4.0,
    trends: ['Positive', 'Stable', 'Negative'] as const,
  },
  economicMoat: {
    wideMinPillars: 1,
    narrowToWideMinNarrowPillars: 2,
    narrowToWideRoicHurdlePct: 8.0,
    narrowRoicHurdlePct: 9.0,
    ratings: {
      wide: 'Wide Moat',
      narrow: 'Narrow Moat',
      none: 'None'
    },
    summaries: {
      penny: 'Limited enterprise switching barriers; operations exposed to commodity pricing or commercial adoption velocity.',
      wide: 'Structural competitive advantages driven by durable economic moat pillars and defensible market position.',
      narrow: 'Established customer relationships, localized scale, and specialized operations provide baseline commercial protection.',
      none: 'Minimal competitive barriers; subject to industry cyclicality and pricing pressures.'
    }
  },
  volatility: {
    lowBetaCeiling: 0.9,
    highBetaFloor: 1.3,
  },
  debtLeverage: {
    healthyDebtToEquityCeiling: 1.2,
  },
  valuationVerdict: {
    significantlyUndervaluedFloorPct: 15.0,
    modestlyUndervaluedFloorPct: 5.0,
    fairlyValuedFloorPct: -5.0,
  },
  starRating: {
    minStars: 1,
    maxStars: 5,
  },
  uncertaintyRating: {
    utilityBetaCeiling: 1.0,
    utilityDebtCeiling: 1.5,
    consumerDefensiveBetaCeiling: 0.9,
    veryHighBetaFloor: 1.8,
    veryHighDebtFloor: 3.0,
    highBetaFloor: 1.3,
    highDebtFloor: 1.8,
    mediumBetaFloor: 0.85,
    tiers: ['Low', 'Medium', 'High', 'Very High', 'Extreme'] as const
  }
} as const;

/**
 * Domain-specific definition dictionary designed for human reviewers,
 * equity research analysts, and compliance audits.
 */
export const FINANCIAL_DEFINITIONS: Record<string, FinancialDomainDefinition> = {
  pennyStock: {
    id: 'penny-stock-designation',
    term: 'SEC Rule 3a51-1 Penny Stock & Micro-Cap Classification',
    category: 'Asset Class & Regulatory Qualification',
    regulatoryStandard: 'SEC Securities Exchange Act Rule 3a51-1 (17 CFR § 240.3a51-1); FINRA Rule 2111',
    academicOrMethodologyAnchor: 'SEC Exchange Act Statutory Definition & OTC Market Tiers',
    formulaOrLogicSummary: 'Price < $5.00 USD OR Exchange ∈ {NYSE American, Nasdaq Capital Market, OTC Pink, OTCQB, OTCQX}',
    methodologyRationale:
      'Securities priced below $5.00 or listed on venture/tier-3 boards typically exhibit higher bid-ask spreads, acute retail float turnover, heightened vulnerability to dilution, and lower institutional coverage.',
    reviewerNotes:
      'Human reviewers must verify whether reverse stock splits or uplistings have recently occurred. If an explicit manual flag is present, it takes precedent over automatic price thresholding.',
    thresholds: {
      priceCeilingUSD: FINANCIAL_THRESHOLDS.pennyStock.priceCeilingUSD,
      pennyVenues: [...FINANCIAL_THRESHOLDS.pennyStock.pennyVenues],
    },
    tiers: [
      {
        code: 'PENNY',
        label: 'Speculative Penny Stock',
        criteria: 'Price < $5.00 USD or secondary board listing',
        analystImplication: 'Requires heightened disclosure, liquidity stress checks, and elevated risk caveat branding.'
      },
      {
        code: 'NON_PENNY',
        label: 'Senior National Market Issue',
        criteria: 'Price >= $5.00 USD and listed on primary market tiers (NYSE, Nasdaq Global)',
        analystImplication: 'Standard fundamental metrics, DCF models, and institutional multiples apply.'
      }
    ]
  },

  stockClassification: {
    id: 'equity-style-classification',
    term: 'Equity Factor Style Taxonomy (Growth / Income / Value / Penny)',
    category: 'Equity Style & Factor Taxonomy',
    regulatoryStandard: 'SEC Form N-PORT Investment Classification Standards',
    academicOrMethodologyAnchor: 'Morningstar Style Box™ Factor Model & Graham-Dodd Security Analysis',
    formulaOrLogicSummary:
      'Hierarchical cascade: Speculative Penny (if penny) → Income (Yield >= 2.0%) → Growth (P/E > 25x OR Operating Margin > 15%) → Value / Turnaround (residual)',
    methodologyRationale:
      'Categorizes companies into recognizable institutional investment mandates. Dividend yields exceeding 2.0% indicate income-generating equity profiles; elevated multiples and operating margins signal secular growth re-investment; lower multiples with positive cash flow signify value or turnaround opportunities.',
    reviewerNotes:
      'Reviewers should check for dividend sustainability (payout ratio vs free cash flow) before classifying as Income, and confirm operating margin durability for Growth classifications.',
    thresholds: {
      incomeMinDividendYieldPct: FINANCIAL_THRESHOLDS.classification.incomeMinDividendYieldPct,
      growthMinPeRatio: FINANCIAL_THRESHOLDS.classification.growthMinPeRatio,
      growthMinOperatingMarginPct: FINANCIAL_THRESHOLDS.classification.growthMinOperatingMarginPct,
    },
    tiers: [
      {
        code: 'GROWTH',
        label: 'Growth Stock',
        criteria: 'P/E > 25.0x OR Operating Margin > 15.0%',
        analystImplication: 'Valuation driven by multi-stage DCF, ROIC reinvestment rates, and revenue expansion.'
      },
      {
        code: 'INCOME',
        label: 'Income Stock',
        criteria: 'Dividend Yield >= 2.0% with sustainable operational cash flow',
        analystImplication: 'Focus on dividend coverage ratio, free cash flow conversion, and debt maturity profile.'
      },
      {
        code: 'VALUE',
        label: 'Value / Turnaround',
        criteria: 'P/E <= 25.0x, Yield < 2.0%, or cyclical recovery profile',
        analystImplication: 'Focus on tangible book value, normalized earnings power, and restructuring catalysts.'
      },
      {
        code: 'SPECULATIVE_PENNY',
        label: 'Speculative Penny Stock',
        criteria: 'Sub-$5.00 price or venture exchange registration',
        analystImplication: 'Classified under high-risk speculative equity mandates; prioritize capital preservation.'
      }
    ]
  },

  fundamentalRating: {
    id: 'fundamental-health-rating',
    term: 'Fundamental Financial Health & Solvency Tier',
    category: 'Fundamental Health & Solvency',
    regulatoryStandard: 'CFA Institute Financial Statement Analysis Guidelines & Basel III Capital Buffer Concepts',
    academicOrMethodologyAnchor: 'Altman Z-Score Solvency Framework & Intrinsic Valuation Triangulation',
    formulaOrLogicSummary:
      'Penny Stock → Weak. Intrinsic Undervalued + D/E < 1.5 → Strong; Overvalued OR D/E > 2.5 → Weak. Alternatively: Consensus Upside > +15% → Strong; < -10% → Weak. Or Risk Score: <= 3 Strong, 4-6 Fair, >= 7 Weak.',
    methodologyRationale:
      'Synthesizes balance sheet leverage, capital structure sustainability, and valuation upside into a unified 3-tier health verdict (Strong, Fairly Valued, Weak).',
    reviewerNotes:
      'Special consideration must be given to capital-intensive sectors (utilities, REITs, pipeline midstream) where higher debt-to-equity is normative.',
    thresholds: {
      strongDebtToEquityCeiling: FINANCIAL_THRESHOLDS.fundamentalRating.strongDebtToEquityCeiling,
      weakDebtToEquityFloor: FINANCIAL_THRESHOLDS.fundamentalRating.weakDebtToEquityFloor,
      strongConsensusUpsidePct: FINANCIAL_THRESHOLDS.fundamentalRating.strongConsensusUpsidePct,
      weakConsensusUpsidePct: FINANCIAL_THRESHOLDS.fundamentalRating.weakConsensusUpsidePct,
      strongRiskScoreCeiling: FINANCIAL_THRESHOLDS.fundamentalRating.strongRiskScoreCeiling,
      fairRiskScoreCeiling: FINANCIAL_THRESHOLDS.fundamentalRating.fairRiskScoreCeiling,
    },
    tiers: [
      {
        code: 'STRONG',
        label: 'Strong',
        criteria: 'Low leverage (D/E < 1.5), favorable valuation margin of safety (> +15%), and robust balance sheet',
        analystImplication: 'High-conviction financial profile with defensive balance sheet and favorable risk-reward.'
      },
      {
        code: 'FAIRLY_VALUED',
        label: 'Fairly Valued',
        criteria: 'Moderate leverage and balanced valuation within historical trading band',
        analystImplication: 'Core market-conforming equity profile trading near intrinsic economic value.'
      },
      {
        code: 'WEAK',
        label: 'Weak',
        criteria: 'Elevated financial leverage (D/E > 2.5), penny stock status, or substantial valuation premium',
        analystImplication: 'Heightened capital impairment risk; sensitive to liquidity tightening or operational shocks.'
      }
    ]
  },

  riskCategory: {
    id: 'risk-spectrum-category',
    term: 'Composite Fundamental Risk Spectrum Tier',
    category: 'Systematic Risk & Market Sensitivity',
    regulatoryStandard: 'FINRA Rule 2111 (Suitability - Customer Investment Profile)',
    academicOrMethodologyAnchor: 'Markowitz Modern Portfolio Theory & Downside Risk Measurement',
    formulaOrLogicSummary:
      'Risk Score 1–3 → Conservative / Low Risk; 4–6 → Core / Moderate Risk; 7–10 → High Risk / Speculative',
    methodologyRationale:
      'Translates quantitative multi-factor risk scores into standardized institutional suitability bands suitable for portfolio construction and investor suitability assessment.',
    reviewerNotes:
      'Verify that risk scores incorporate revenue concentration, customer churn, debt maturities, and regulatory risks.',
    thresholds: {
      conservativeMaxScore: FINANCIAL_THRESHOLDS.riskCategory.conservativeMaxScore,
      coreMaxScore: FINANCIAL_THRESHOLDS.riskCategory.coreMaxScore,
    },
    tiers: [
      {
        code: 'CONSERVATIVE',
        label: 'Conservative / Low Risk',
        criteria: 'Risk Score 1 to 3',
        analystImplication: 'Suitable for capital preservation and core defensive equity allocations.'
      },
      {
        code: 'CORE',
        label: 'Core / Moderate Risk',
        criteria: 'Risk Score 4 to 6',
        analystImplication: 'Standard market risk profile appropriate for balanced equity strategies.'
      },
      {
        code: 'HIGH_RISK',
        label: 'High Risk / Speculative',
        criteria: 'Risk Score 7 to 10',
        analystImplication: 'High dispersion of outcomes; potential for severe capital drawdowns.'
      }
    ]
  },

  cashFlowProfile: {
    id: 'cash-flow-generation-profile',
    term: 'Free Cash Flow (FCF) Generation & Capital Intensity Profile',
    category: 'Cash Flow Quality & Capital Intensity',
    regulatoryStandard: 'GAAP / IFRS Statement of Cash Flows (ASC 230 / IAS 7)',
    academicOrMethodologyAnchor: 'Jensen (1986) Free Cash Flow Hypothesis & CFA Institute FCFF Framework',
    formulaOrLogicSummary:
      'Penny Stock → Micro-Cap Conservation Focus; FCF > 0 → Positive Free Cash Flow; FCF < 0 → Operating Deficit / Cash Burn; FCF == 0/null → Cash Neutral / Not Reported',
    methodologyRationale:
      'Free cash flow measures discretionary cash generated by core operations after maintaining and expanding capital asset base. Positive FCF supports organic self-funding, share repurchases, and dividends; negative FCF necessitates external debt or equity financing.',
    reviewerNotes:
      'Assess whether negative FCF is driven by temporary high-ROI growth CapEx or chronic operating losses.',
    thresholds: {
      positiveFcfFloorUSD: FINANCIAL_THRESHOLDS.cashFlow.positiveFcfFloorUSD,
    },
    tiers: [
      {
        code: 'POSITIVE_FCF',
        label: 'Positive Free Cash Flow',
        criteria: 'TTM Free Cash Flow > $0',
        analystImplication: 'Self-sustaining operational model with capital distribution flexibility.'
      },
      {
        code: 'CASH_BURN',
        label: 'Operating Cash Flow Deficit / Cash Burn',
        criteria: 'TTM Free Cash Flow < $0',
        analystImplication: 'Dependent on external financing; evaluate runway, cash balance, and debt covenants.'
      },
      {
        code: 'PENNY_CONSERVATION',
        label: 'Micro-Cap / Cash Conservation Focus',
        criteria: 'Penny stock status requiring scrutiny of capital conservation runway',
        analystImplication: 'High sensitivity to financing dilutive rounds; examine quarterly burn rate.'
      },
      {
        code: 'CASH_NEUTRAL',
        label: 'Cash Neutral / Not Reported',
        criteria: 'FCF = 0 or missing filing statements',
        analystImplication: 'Require audited 10-K / 10-Q reconciliation.'
      }
    ]
  },

  managementQuality: {
    id: 'management-quality-stewardship',
    term: 'Morningstar Capital Allocation & Management Stewardship Rating',
    category: 'Management Quality & Stewardship',
    regulatoryStandard: 'Morningstar Capital Allocation Methodology & CFA Institute Corporate Governance Guidelines',
    academicOrMethodologyAnchor: 'Jensen & Meckling (1976) Agency Theory & Corporate Capital Deployment',
    formulaOrLogicSummary:
      'Penny Stock → Speculative rating & Micro-cap track record; ROIC > 15% OR ROE > 20% → Exemplary rating & Value-accretive track record; D/E > 2.5 OR OCF < 0 → Headwinds track record; Default → Established rating & Sector navigation track record',
    methodologyRationale:
      'Assesses management’s historical stewardship of shareholder capital across three pillars: balance sheet health, investment discipline (M&A / CapEx), and shareholder distributions (dividends / share repurchases).',
    reviewerNotes:
      'Reviewers should evaluate CEO tenure, historical ROIC versus WACC spread, and track record of dilutive secondary offerings before overriding standard ratings.',
    thresholds: {
      exemplaryRoicFloorPct: FINANCIAL_THRESHOLDS.managementQuality.exemplaryRoicFloorPct,
      exemplaryRoeFloorPct: FINANCIAL_THRESHOLDS.managementQuality.exemplaryRoeFloorPct,
      headwindsDebtToEquityFloor: FINANCIAL_THRESHOLDS.managementQuality.headwindsDebtToEquityFloor,
    },
    tiers: [
      {
        code: 'EXEMPLARY',
        label: 'Exemplary',
        criteria: 'Consistent ROIC > 15% or ROE > 20% with superior capital allocation discipline',
        analystImplication: 'High management alpha; value-accretive organic reinvestment and prudent M&A.'
      },
      {
        code: 'ESTABLISHED',
        label: 'Established / Standard',
        criteria: 'Prudent balance sheet management navigating industry cycles with aligned executive incentives',
        analystImplication: 'Competent stewardship conforming to industry norms without excessive risk-taking.'
      },
      {
        code: 'SPECULATIVE',
        label: 'Speculative',
        criteria: 'Micro-cap capital structure vulnerability, chronic dilution, or high financing risk',
        analystImplication: 'Elevated execution risk; monitor executive compensation and capital market dependencies.'
      }
    ]
  },

  moatTrend: {
    id: 'moat-trend-trajectory',
    term: 'Morningstar Moat Trend™ Dynamic Advantage Trajectory',
    category: 'Economic Moat & Competitive Dynamics',
    regulatoryStandard: 'Morningstar Equity Research Moat Trend Methodology',
    academicOrMethodologyAnchor: 'Porter Five Forces & Dynamic Competitive Moat Expansion / Erosion',
    formulaOrLogicSummary:
      'YoY Revenue Growth > 8.0% AND ROIC > 10.0% → Positive; YoY Revenue Growth < -5.0% OR ROIC < 4.0% → Negative; Otherwise → Stable',
    methodologyRationale:
      'Captures whether a company’s economic moat is expanding, stable, or deteriorating over a 3- to 5-year forecast horizon. Forward trajectory provides crucial context beyond static moat ratings.',
    reviewerNotes:
      'Reviewers should check whether positive revenue growth stems from price realization (moat expansion) or unprofitable volume dumping.',
    thresholds: {
      positiveRevenueGrowthFloorPct: FINANCIAL_THRESHOLDS.moatTrend.positiveRevenueGrowthFloorPct,
      positiveRoicFloorPct: FINANCIAL_THRESHOLDS.moatTrend.positiveRoicFloorPct,
      negativeRevenueGrowthCeilingPct: FINANCIAL_THRESHOLDS.moatTrend.negativeRevenueGrowthCeilingPct,
      negativeRoicCeilingPct: FINANCIAL_THRESHOLDS.moatTrend.negativeRoicCeilingPct,
    },
    tiers: [
      {
        code: 'POSITIVE',
        label: 'Positive',
        criteria: 'Revenue Growth > 8.0% and ROIC > 10.0%',
        analystImplication: 'Structural competitive advantage is strengthening; expanding pricing power and customer lock-in.'
      },
      {
        code: 'STABLE',
        label: 'Stable',
        criteria: 'Competitive advantages and market share defending established profit pools',
        analystImplication: 'Moat is durable and expected to maintain current ROIC-WACC spreads.'
      },
      {
        code: 'NEGATIVE',
        label: 'Negative',
        criteria: 'Revenue Growth < -5.0% or sub-hurdle ROIC < 4.0%',
        analystImplication: 'Competitive advantage eroding due to technological disruption, regulatory shifts, or commoditization.'
      }
    ]
  },

  economicMoat: {
    id: 'economic-moat-rating',
    term: 'Morningstar 5-Pillar Economic Moat™ Rating & Competitive Advantage',
    category: 'Economic Moat & Competitive Dynamics',
    regulatoryStandard: 'Morningstar Equity Research Moat Rating Methodology',
    academicOrMethodologyAnchor: 'Competitive Strategy (Porter, 1980) & Excess Return Duration Modeling',
    formulaOrLogicSummary:
      'Penny Stock → None; Wide Pillars >= 1 OR (Narrow Pillars >= 2 AND ROIC > 8%) → Wide Moat; Narrow Pillars >= 1 OR ROIC > 9% → Narrow Moat; Otherwise → None',
    methodologyRationale:
      'Evaluates structural competitive advantages across 5 pillars: Network Effect, Intangible Assets, Cost Advantage, Switching Costs, and Efficient Scale to assess duration of excess economic returns.',
    reviewerNotes:
      'Ensure high returns on invested capital are structural rather than cyclical peak-of-cycle commodity windfalls.',
    thresholds: {
      wideMinPillars: FINANCIAL_THRESHOLDS.economicMoat.wideMinPillars,
      narrowToWideMinNarrowPillars: FINANCIAL_THRESHOLDS.economicMoat.narrowToWideMinNarrowPillars,
      narrowToWideRoicHurdlePct: FINANCIAL_THRESHOLDS.economicMoat.narrowToWideRoicHurdlePct,
      narrowRoicHurdlePct: FINANCIAL_THRESHOLDS.economicMoat.narrowRoicHurdlePct,
    },
    tiers: [
      {
        code: 'WIDE',
        label: 'Wide Moat',
        criteria: '1+ Wide pillars or 2+ Narrow pillars with sustainable ROIC > 8%',
        analystImplication: 'Competitive advantages virtually certain to endure 20+ years, protecting economic profits.'
      },
      {
        code: 'NARROW',
        label: 'Narrow Moat',
        criteria: '1+ Narrow pillars or ROIC > 9%',
        analystImplication: 'Advantages more likely than not to persist for at least 10 years before fading.'
      },
      {
        code: 'NONE',
        label: 'None',
        criteria: 'Commoditized economics, penny stock status, or absence of structural moats',
        analystImplication: 'No competitive barriers; vulnerable to price competition and swift mean reversion.'
      }
    ]
  },

  volatilityBetaRating: {
    id: 'systematic-market-beta-rating',
    term: 'Systematic Risk & Market Beta Volatility Rating',
    category: 'Systematic Risk & Market Sensitivity',
    regulatoryStandard: 'SEC Investment Company Act Risk Disclosures',
    academicOrMethodologyAnchor: 'Capital Asset Pricing Model (Sharpe, 1964; Lintner, 1965)',
    formulaOrLogicSummary:
      'Beta < 0.90 → Low Volatility; 0.90 <= Beta <= 1.30 → Moderate Volatility; Beta > 1.30 → High Volatility',
    methodologyRationale:
      'Market beta quantifies covariance with the benchmark index (S&P 500 / MSCI World). Betas > 1.30 amplify market downturns, while betas < 0.90 provide defensive buffer during drawdowns.',
    reviewerNotes:
      'Ensure Beta is calculated over a minimum 36-month or 60-month monthly return window against a broad-market benchmark.',
    thresholds: {
      lowBetaCeiling: FINANCIAL_THRESHOLDS.volatility.lowBetaCeiling,
      highBetaFloor: FINANCIAL_THRESHOLDS.volatility.highBetaFloor,
    },
    tiers: [
      {
        code: 'LOW_VOLATILITY',
        label: 'Low Volatility',
        criteria: 'Beta < 0.90',
        analystImplication: 'Defensive asset profile exhibiting muted cyclical drawdowns.'
      },
      {
        code: 'MODERATE_VOLATILITY',
        label: 'Moderate Volatility',
        criteria: '0.90 <= Beta <= 1.30',
        analystImplication: 'Covaries in line with general equity benchmarks; standard market beta exposure.'
      },
      {
        code: 'HIGH_VOLATILITY',
        label: 'High Volatility',
        criteria: 'Beta > 1.30',
        analystImplication: 'High systematic sensitivity; amplified volatility in both bull and bear market regimes.'
      }
    ]
  },

  debtLeverageRatio: {
    id: 'debt-to-equity-leverage-tier',
    term: 'Balance Sheet Leverage & Capital Structure Solvency Rating',
    category: 'Fundamental Health & Solvency',
    regulatoryStandard: 'Credit Rating Agency Leverage Guidelines (Moody’s / S&P)',
    academicOrMethodologyAnchor: 'Modigliani-Miller Theorem with Bankruptcy Costs & Financial Distress Theory',
    formulaOrLogicSummary:
      'Total Debt / Total Stockholders Equity <= 1.20 → Healthy Leverage; > 1.20 → Elevated Leverage',
    methodologyRationale:
      'The Debt-to-Equity ratio gauges the proportion of debt financing relative to equity capital. Elevated leverage (>1.2x) magnifies interest rate sensitivity, refinance risk, and debt-service burden during macroeconomic contraction.',
    reviewerNotes:
      'Examine interest coverage (EBIT / Interest Expense) alongside Debt-to-Equity to confirm cash servicing capacity.',
    thresholds: {
      healthyDebtToEquityCeiling: FINANCIAL_THRESHOLDS.debtLeverage.healthyDebtToEquityCeiling,
    },
    tiers: [
      {
        code: 'HEALTHY_LEVERAGE',
        label: 'Healthy Leverage',
        criteria: 'Debt-to-Equity <= 1.20x',
        analystImplication: 'Conservatively capitalized balance sheet with adequate equity cushion.'
      },
      {
        code: 'ELEVATED_LEVERAGE',
        label: 'Elevated Leverage',
        criteria: 'Debt-to-Equity > 1.20x',
        analystImplication: 'Aggressive capital structure requiring monitoring of debt maturity schedules.'
      }
    ]
  },

  consensusValuationVerdict: {
    id: 'valuation-verdict-margin-of-safety',
    term: 'Consensus Intrinsic Valuation & Margin of Safety Verdict',
    category: 'Intrinsic Valuation & Margin of Safety',
    regulatoryStandard: 'FINRA Rule 2210 Balanced Communications & CFA Institute Valuation Standards',
    academicOrMethodologyAnchor: 'Benjamin Graham Margin of Safety Principle & Morningstar Fair Value Engine',
    formulaOrLogicSummary:
      'Upside >= +15% → Significantly Undervalued; +5% to +15% → Modestly Undervalued; -5% to +5% → Fairly Valued; < -5% → Overvalued',
    methodologyRationale:
      'Derived from the spread between market price and blended intrinsic fair value estimate (Discounted Cash Flow, Multiples Triangulation, Asset Value). Incorporates margin of safety requirements to guard against estimation error.',
    reviewerNotes:
      'Reviewers should check that fair value estimates are cross-checked across both DCF and comparable multiple methodologies.',
    thresholds: {
      significantlyUndervaluedFloorPct: FINANCIAL_THRESHOLDS.valuationVerdict.significantlyUndervaluedFloorPct,
      modestlyUndervaluedFloorPct: FINANCIAL_THRESHOLDS.valuationVerdict.modestlyUndervaluedFloorPct,
      fairlyValuedFloorPct: FINANCIAL_THRESHOLDS.valuationVerdict.fairlyValuedFloorPct,
    },
    tiers: [
      {
        code: 'SIGNIFICANTLY_UNDERVALUED',
        label: 'Significantly Undervalued / Attractive Risk-Reward',
        criteria: 'Consensus Upside >= +15.0%',
        analystImplication: 'Substantial margin of safety relative to calculated intrinsic fair value.'
      },
      {
        code: 'MODESTLY_UNDERVALUED',
        label: 'Modestly Undervalued / Accumulate',
        criteria: '+5.0% <= Consensus Upside < +15.0%',
        analystImplication: 'Positive economic margin of safety; favorable entry on disciplined pullbacks.'
      },
      {
        code: 'FAIRLY_VALUED',
        label: 'Fairly Valued / Market Weight',
        criteria: '-5.0% <= Consensus Upside < +5.0%',
        analystImplication: 'Market price accurately reflects intrinsic earnings power; neutral risk-reward.'
      },
      {
        code: 'OVERVALUED',
        label: 'Overvalued / Multiple Vulnerability',
        criteria: 'Consensus Upside < -5.0%',
        analystImplication: 'Negative margin of safety; vulnerable to multiple compression upon earnings misses.'
      }
    ]
  },

  starRating: {
    id: 'star-rating-margin-of-safety',
    term: 'Morningstar-Aligned 1-to-5 Star Valuation Rating',
    category: 'Intrinsic Valuation & Margin of Safety',
    regulatoryStandard: 'Morningstar Quantitative Equity Rating Framework',
    academicOrMethodologyAnchor: 'Uncertainty-Adjusted Margin of Safety Discount Bands',
    formulaOrLogicSummary:
      'Star rating 1 to 5 mapped to 5-star visual representation string (e.g., ★★★★★ to ★☆☆☆☆) bounded by uncertainty bands',
    methodologyRationale:
      'Synthesizes Price/Fair Value ratio against an uncertainty-adjusted margin of safety discount. 5-Star stocks trade at substantial discounts, while 1-Star stocks trade at significant premiums.',
    reviewerNotes:
      'Verify that high-uncertainty issues require wider margin of safety discounts to attain 4-star or 5-star ratings.',
    thresholds: {
      minStars: FINANCIAL_THRESHOLDS.starRating.minStars,
      maxStars: FINANCIAL_THRESHOLDS.starRating.maxStars,
    },
    tiers: [
      {
        code: '5_STAR',
        label: '★★★★★ (5 Stars)',
        criteria: 'Price trading well below fair value beyond uncertainty hurdle (Deep Value / Strong Buy)',
        analystImplication: 'Compelling long-term asymmetric upside opportunity.'
      },
      {
        code: '4_STAR',
        label: '★★★★☆ (4 Stars)',
        criteria: 'Price trading moderately below fair value (Accumulate / Buy)',
        analystImplication: 'Favorable risk-adjusted entry point.'
      },
      {
        code: '3_STAR',
        label: '★★★☆☆ (3 Stars)',
        criteria: 'Price trading within fair value band (Hold / Market Weight)',
        analystImplication: 'Market expectation matches economic reality.'
      },
      {
        code: '2_STAR',
        label: '★★☆☆☆ (2 Stars)',
        criteria: 'Price trading moderately above fair value (Underweight / Reduce)',
        analystImplication: 'Unfavorable valuation asymmetry; trim on strength.'
      },
      {
        code: '1_STAR',
        label: '★☆☆☆☆ (1 Star)',
        criteria: 'Price trading well above fair value beyond uncertainty hurdle (Overvalued / Sell)',
        analystImplication: 'Severe downside multiple compression risk.'
      }
    ]
  },

  uncertaintyRating: {
    id: 'uncertainty-margin-of-safety-tiers',
    term: 'Valuation Uncertainty Tier & Margin of Safety Calibration',
    category: 'Intrinsic Valuation & Margin of Safety',
    regulatoryStandard: 'Morningstar Quantitative Equity Methodology & CFA Valuation Guidelines',
    academicOrMethodologyAnchor: 'Fundamental Cash Flow Predictability & Operating Leverage Analysis',
    formulaOrLogicSummary:
      'Penny Stock → Extreme; Utilities (Beta < 1.0, D/E < 1.5) → Low; Consumer Defensive (Beta < 0.9) → Low; Beta > 1.8 OR D/E > 3.0 → Very High; Beta > 1.3 OR D/E > 1.8 → High; Beta >= 0.85 → Medium; Default → Low',
    methodologyRationale:
      'Calibrates the required discount or premium for Star Ratings. Higher uncertainty requires a larger margin of safety discount before achieving a 5-Star (Buy) recommendation.',
    reviewerNotes:
      'Reviewers should ensure that high financial leverage or revenue volatility pushes uncertainty to High or Very High.',
    thresholds: {
      utilityBetaCeiling: FINANCIAL_THRESHOLDS.uncertaintyRating.utilityBetaCeiling,
      utilityDebtCeiling: FINANCIAL_THRESHOLDS.uncertaintyRating.utilityDebtCeiling,
      consumerDefensiveBetaCeiling: FINANCIAL_THRESHOLDS.uncertaintyRating.consumerDefensiveBetaCeiling,
      veryHighBetaFloor: FINANCIAL_THRESHOLDS.uncertaintyRating.veryHighBetaFloor,
      veryHighDebtFloor: FINANCIAL_THRESHOLDS.uncertaintyRating.veryHighDebtFloor,
      highBetaFloor: FINANCIAL_THRESHOLDS.uncertaintyRating.highBetaFloor,
      highDebtFloor: FINANCIAL_THRESHOLDS.uncertaintyRating.highDebtFloor,
      mediumBetaFloor: FINANCIAL_THRESHOLDS.uncertaintyRating.mediumBetaFloor,
    },
    tiers: [
      {
        code: 'LOW',
        label: 'Low Uncertainty',
        criteria: 'Predictable recurring revenues, low leverage, defensive beta',
        analystImplication: 'Requires standard 20% margin of safety discount for 5-star rating.'
      },
      {
        code: 'MEDIUM',
        label: 'Medium Uncertainty',
        criteria: 'Average cyclicality and normal balance sheet leverage',
        analystImplication: 'Requires 30% margin of safety discount.'
      },
      {
        code: 'HIGH',
        label: 'High Uncertainty',
        criteria: 'Elevated beta (>1.3) or elevated debt leverage (>1.8x)',
        analystImplication: 'Requires 40% margin of safety discount.'
      },
      {
        code: 'VERY_HIGH',
        label: 'Very High Uncertainty',
        criteria: 'Substantial operating leverage, beta > 1.8 or D/E > 3.0x',
        analystImplication: 'Requires 50% margin of safety discount.'
      },
      {
        code: 'EXTREME',
        label: 'Extreme Uncertainty',
        criteria: 'Micro-cap / penny stock or distressed balance sheet',
        analystImplication: 'Requires 75% margin of safety discount; highly speculative.'
      }
    ]
  },

  tradingVenueGovernance: {
    id: 'primary-trading-venue-resolution',
    term: 'Listing Market Structure & Execution Venue Resolution',
    category: 'Exchange Structure & Trading Venue',
    regulatoryStandard: 'SEC Regulation NMS (National Market System) & MiFID II Venue Classification',
    academicOrMethodologyAnchor: 'Market Microstructure & Exchange Tier Governance',
    formulaOrLogicSummary:
      'Resolution mapping based on exchange acronym and penny stock qualification (e.g. Nasdaq Global Select vs Nasdaq Capital Market; NYSE vs NYSE American; Euronext; XETRA; LSE)',
    methodologyRationale:
      'Accurate venue naming ensures investors and compliance auditors distinguish senior national market tiers from micro-cap venture or OTC boards.',
    reviewerNotes:
      'Confirm whether foreign cross-listings (ADRs) are properly denoted alongside primary listing venue.',
    thresholds: {
      majorExchanges: ['NASDAQ', 'NYSE', 'LSE', 'EURONEXT', 'DAX']
    }
  }
};

/**
 * Returns a specific definition record by unique ID or key.
 */
export function getDefinitionById(idOrKey: string): FinancialDomainDefinition | undefined {
  if (FINANCIAL_DEFINITIONS[idOrKey]) {
    return FINANCIAL_DEFINITIONS[idOrKey];
  }
  return Object.values(FINANCIAL_DEFINITIONS).find(def => def.id === idOrKey);
}

/**
 * Returns all definitions grouped by their domain category.
 */
export function getDefinitionsByCategory(): Record<DefinitionCategory, FinancialDomainDefinition[]> {
  const grouped: Partial<Record<DefinitionCategory, FinancialDomainDefinition[]>> = {};

  for (const def of Object.values(FINANCIAL_DEFINITIONS)) {
    if (!grouped[def.category]) {
      grouped[def.category] = [];
    }
    grouped[def.category]!.push(def);
  }

  return grouped as Record<DefinitionCategory, FinancialDomainDefinition[]>;
}

/**
 * Returns an array of all active domain definitions for inspection.
 */
export function listAllDefinitions(): FinancialDomainDefinition[] {
  return Object.values(FINANCIAL_DEFINITIONS);
}
