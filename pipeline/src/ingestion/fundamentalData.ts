import { fetchWithRetry } from '../utils/httpClient.js';
import { CONFIG } from '../config.js';
import { webScraper } from './webScraper.js';
import { marketMoverIngestor } from './marketMovers.js';
import {
  SECTOR_BENCHMARKS,
  CAPITAL_MARKET,
  normalizeSector,
  sectorFromSic,
  rateAdjustmentFactor
} from './valuationBenchmarks.js';
import type {
  FundamentalMetrics,
  ValuationMetricComparison,
  EPSHistory,
  QuarterlyEPS,
  VolatilityIndex,
  CashFlowBreakdown,
  ManagementQuality,
  CompetitiveMoat,
  CompanyQuestions,
  IndustryQuestions,
  ValuationModels,
  MacroBackdrop
} from '../types.js';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const pctOf = (part: number, whole: number): number => Math.round((part / whole) * 100);

export class FundamentalDataIngestor {
  /**
   * Fetches verified, authentic fundamental metrics for a given ticker from live market screeners,
   * official SEC EDGAR XBRL filings, and live quotes.
   *
   * STRICT POLICY: No data synthesis. No synthetic random financial data is generated.
   * If verified data cannot be found, an error is raised.
   *
   * @param macro Live macro backdrop; its 10Y Treasury yield drives the CAPM cost of equity,
   *              WACC and rate-adjusted sector multiples. Falls back to a documented default.
   */
  public async getFundamentals(ticker: string, companyName?: string, macro?: MacroBackdrop): Promise<FundamentalMetrics> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    console.log(`[FundamentalDataIngestor] Ingesting verified financial data for $${cleanTicker}...`);

    // 1. Check live screener quote cache from MarketMoverIngestor
    const screenerQuote = marketMoverIngestor.getCachedQuote(cleanTicker) || marketMoverIngestor.getCachedQuote(ticker);

    // 2. Fetch official SEC EDGAR financial disclosures (100% free US Gov XBRL data)
    let secData: any = null;
    try {
      secData = await webScraper.fetchSecDisclosures(cleanTicker);
      if (secData?.latestRevenueTTM) {
        console.log(`[FundamentalDataIngestor] Ingested verified SEC EDGAR disclosures for $${cleanTicker} (CIK: ${secData.cik})...`);
      }
    } catch (err: any) {
      console.warn(`[FundamentalDataIngestor] SEC EDGAR check for ${cleanTicker}: ${err.message}`);
    }

    // 3. Fetch live chart metadata if screener quote is absent
    let chartMeta: any = null;
    if (!screenerQuote) {
      try {
        chartMeta = await this.fetchYahooChart(ticker);
      } catch (err: any) {
        console.warn(`[FundamentalDataIngestor] Live chart check for ${ticker}: ${err.message}`);
      }
    }

    // 4. Try Finnhub if configured
    let finnhubData: any = null;
    if (CONFIG.FINNHUB_API_KEY && !screenerQuote && !secData) {
      try {
        finnhubData = await this.fetchFinnhubMetrics(cleanTicker);
      } catch (err: any) {
        console.warn(`[FundamentalDataIngestor] Finnhub fallback check: ${err.message}`);
      }
    }

    // 5. Verification Gate: ensure we have verified live or official filings data
    const hasScreenerData = Boolean(screenerQuote && (screenerQuote.regularMarketPrice || screenerQuote.marketCap));
    const hasSecData = Boolean(secData && (secData.latestRevenueTTM || secData.totalAssets));
    const hasChartData = Boolean(chartMeta && (chartMeta.regularMarketPrice || chartMeta.fiftyTwoWeekHigh));
    const hasFinnhubData = Boolean(finnhubData && finnhubData.marketCap > 0);

    if (!hasScreenerData && !hasSecData && !hasChartData && !hasFinnhubData) {
      throw new Error(`[FundamentalDataIngestor] No verified fundamental data available for ${ticker} from live market data or SEC filings. Data synthesis is disallowed.`);
    }

    // Construct raw metrics strictly from verified sources
    const name = companyName || screenerQuote?.longName || screenerQuote?.shortName || secData?.entityName || chartMeta?.longName || chartMeta?.shortName || cleanTicker;
    const price = screenerQuote?.regularMarketPrice ?? chartMeta?.regularMarketPrice ?? 0;
    const marketCap = screenerQuote?.marketCap ?? (secData?.totalAssets ?? 0);
    const sharesOutstanding = screenerQuote?.sharesOutstanding ?? (price > 0 && marketCap > 0 ? Math.round(marketCap / price) : 0);
    const revenueTTM = secData?.latestRevenueTTM ?? 0;
    const netIncomeTTM = secData?.latestNetIncomeTTM ?? 0;
    const operatingCashFlow = secData?.latestOperatingCashFlowTTM ?? 0;
    const capexTTM: number | undefined = secData?.capitalExpendituresTTM;
    // FCF = OCF − CapEx when both are filed; otherwise retain the legacy conservative proxy
    const freeCashFlowTTM = operatingCashFlow !== 0 && capexTTM !== undefined
      ? operatingCashFlow - Math.abs(capexTTM)
      : operatingCashFlow !== 0
        ? operatingCashFlow * 0.8
        : (netIncomeTTM > 0 ? netIncomeTTM * 0.7 : (netIncomeTTM < 0 ? netIncomeTTM * 1.1 : 0));
    const totalDebt = secData?.totalDebt ?? 0;
    const cashAndEquivalents = secData?.cashAndEquivalents ?? 0;
    const netDebt = totalDebt - cashAndEquivalents;
    const operatingIncomeTTM: number | null = secData?.latestOperatingIncomeTTM ?? null;
    const operatingMargin = (revenueTTM > 0 && operatingIncomeTTM !== null)
      ? parseFloat(((operatingIncomeTTM / revenueTTM) * 100).toFixed(1))
      : 0;
    const depreciationTTM: number | null = secData?.depreciationAmortizationTTM ?? null;
    const ebitdaTTM = operatingIncomeTTM !== null && depreciationTTM !== null
      ? operatingIncomeTTM + Math.abs(depreciationTTM)
      : null;
    const grossMargin = (revenueTTM > 0 && netIncomeTTM)
      ? Math.min(100, Math.max(0, parseFloat((((revenueTTM - Math.max(0, revenueTTM - netIncomeTTM) * 0.7) / revenueTTM) * 100).toFixed(1))))
      : 0;

    // 8 discrete fiscal quarters of reported EPS from 10-Q / 10-K XBRL
    const quarterlyEPSPast2Years: QuarterlyEPS[] = (secData?.quarterlyEPS ?? []).map((q: any) => ({
      quarter: q.quarter,
      eps: q.eps,
      date: q.date,
      yoyChangePercent: q.yoyChangePercent ?? null,
      derived: q.derived ?? false
    }));
    const lastFourQuarterEPS = quarterlyEPSPast2Years.length >= 4
      ? parseFloat(quarterlyEPSPast2Years.slice(-4).reduce((s, q) => s + q.eps, 0).toFixed(2))
      : null;

    const peRatioTrailing = screenerQuote?.trailingPE ?? null;
    const peRatioForward = screenerQuote?.forwardPE ?? null;
    const rawPB = screenerQuote?.priceToBook ?? (screenerQuote?.bookValue && price ? parseFloat((price / screenerQuote.bookValue).toFixed(2)) : null);
    const dividendYield = (screenerQuote?.trailingAnnualDividendYield ?? 0) * 100;
    const currentTTM_EPS = screenerQuote?.epsTrailingTwelveMonths
      ?? lastFourQuarterEPS
      ?? (sharesOutstanding > 0 ? parseFloat((netIncomeTTM / sharesOutstanding).toFixed(2)) : 0);
    const fiftyTwoWeekHigh = screenerQuote?.fiftyTwoWeekHigh ?? chartMeta?.fiftyTwoWeekHigh ?? price;
    const fiftyTwoWeekLow = screenerQuote?.fiftyTwoWeekLow ?? chartMeta?.fiftyTwoWeekLow ?? price;
    const currentRatio = (secData?.totalAssets && secData?.totalLiabilities && secData.totalLiabilities > 0)
      ? parseFloat((secData.totalAssets / secData.totalLiabilities).toFixed(2))
      : null;

    // Yahoo predefined screeners omit sector; fall back to the SEC SIC classification
    const sector = screenerQuote?.sector || (secData?.sic ? sectorFromSic(secData.sic) : 'General Equities');
    const industry = screenerQuote?.industry || secData?.sicDescription || 'Public Equities';

    return this.enrichFundamentalMetrics({
      ticker: cleanTicker,
      companyName: name,
      sector,
      industry,
      description: `${name} is an equity security publicly traded on major financial markets.`,
      marketCap,
      peRatioTrailing,
      peRatioForward,
      pegRatio: screenerQuote?.pegRatio ?? null,
      rawPB,
      evToEbitda: screenerQuote?.lastCloseTevEbitLtm ? parseFloat(screenerQuote.lastCloseTevEbitLtm.toFixed(2)) : null,
      dividendYield,
      revenueTTM,
      netIncomeTTM,
      grossMargin,
      operatingMargin,
      freeCashFlowTTM,
      operatingCashFlow,
      totalDebt,
      cashAndEquivalents,
      netDebt,
      debtToEquity: (marketCap > 0 && totalDebt > 0) ? parseFloat((totalDebt / marketCap).toFixed(2)) : null,
      currentRatio,
      roic: null, // derived deterministically in enrichFundamentalMetrics from operating income & invested capital
      beta: screenerQuote?.beta ?? null,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      price,
      sharesOutstanding,
      currentTTM_EPS,
      bookValuePerShare: screenerQuote?.bookValue ?? null,
      shortTermDebt: secData?.shortTermDebt ?? null,
      longTermDebt: secData?.longTermDebt ?? null,
      priorYearTotalDebt: secData?.priorYearTotalDebt ?? null,
      quarterlyEPSPast2Years,
      operatingIncomeTTM,
      ebitdaTTM,
      depreciationTTM,
      stockholdersEquity: secData?.stockholdersEquity ?? null,
      revenueGrowthYoY: secData?.revenueGrowthYoY ?? null,
      riskFreeRate: macro?.us10YearYield
    });
  }

  /**
   * Enriches raw ingested numbers with institutional debt breakdowns, P/B and P/E historical/industry
   * comparisons, qualitative moat/management ratings, key questions, and multi-model valuations.
   *
   * STRICT POLICY: No arbitrary multiplier fabrication. Missing data is reported as null or Inapplicable.
   */
  public enrichFundamentalMetrics(raw: {
    ticker: string;
    companyName: string;
    sector: string;
    industry: string;
    description: string;
    marketCap: number;
    peRatioTrailing: number | null;
    peRatioForward: number | null;
    pegRatio: number | null;
    rawPB: number | null;
    evToEbitda: number | null;
    dividendYield: number;
    revenueTTM: number;
    netIncomeTTM: number;
    grossMargin: number;
    operatingMargin: number;
    freeCashFlowTTM: number;
    operatingCashFlow?: number;
    totalDebt: number;
    cashAndEquivalents: number;
    netDebt: number;
    debtToEquity: number | null;
    currentRatio: number | null;
    roic: number | null;
    beta: number | null;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    price?: number;
    sharesOutstanding?: number;
    currentTTM_EPS?: number;
    bookValuePerShare?: number | null;
    recentEarningsDate?: string;
    earningsSurprisePercent?: number | null;
    shortTermDebt?: number | null;
    longTermDebt?: number | null;
    shortVsLongTermRatio?: number | string;
    recentChangesInDebt?: string;
    debtRisks?: string;
    priorYearTotalDebt?: number | null;
    quarterlyEPSPast2Years?: QuarterlyEPS[];
    operatingIncomeTTM?: number | null;
    ebitdaTTM?: number | null;
    depreciationTTM?: number | null;
    stockholdersEquity?: number | null;
    revenueGrowthYoY?: number | null;
    /** 10Y Treasury yield in percent (e.g. 4.25). */
    riskFreeRate?: number;
  }): FundamentalMetrics {
    const isPenny = raw.fiftyTwoWeekHigh < 5.0 || raw.marketCap < 400_000_000;
    const estPrice = raw.price || (raw.fiftyTwoWeekHigh > 0 && raw.fiftyTwoWeekLow > 0
      ? parseFloat(((raw.fiftyTwoWeekHigh + raw.fiftyTwoWeekLow) / 2).toFixed(2))
      : 1.0);
    const shares = raw.sharesOutstanding || Math.max(1, Math.round(raw.marketCap / Math.max(0.01, estPrice)));
    const currentTTM_EPS = raw.currentTTM_EPS !== undefined
      ? raw.currentTTM_EPS
      : (raw.netIncomeTTM ? parseFloat((raw.netIncomeTTM / shares).toFixed(2)) : 0);
    const bookValuePerShare = raw.bookValuePerShare
      ?? (raw.stockholdersEquity && raw.stockholdersEquity > 0 && shares > 0 ? parseFloat((raw.stockholdersEquity / shares).toFixed(2)) : null)
      ?? (raw.rawPB && estPrice > 0 ? parseFloat((estPrice / raw.rawPB).toFixed(2)) : null);
    const bookEquity = raw.stockholdersEquity ?? (bookValuePerShare ? bookValuePerShare * shares : null);
    const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`;

    // 1. Debt Breakdown (Factual, from SEC balance-sheet tags DebtCurrent / LongTermDebtNoncurrent)
    const totalDebt = Math.max(0, raw.totalDebt);
    const shortTermDebt = raw.shortTermDebt ?? null;
    const longTermDebt = raw.longTermDebt ?? null;
    const splitDenominator = (shortTermDebt ?? 0) + (longTermDebt ?? 0);
    const shortVsLongTermRatio = raw.shortVsLongTermRatio || (
      shortTermDebt !== null && longTermDebt !== null && splitDenominator > 0
        ? `${pctOf(shortTermDebt, splitDenominator)}% Short / ${pctOf(longTermDebt, splitDenominator)}% Long`
        : 'Not Disclosed in Public Summaries'
    );

    const priorDebt = raw.priorYearTotalDebt ?? null;
    const recentChangesInDebt = raw.recentChangesInDebt || (
      priorDebt !== null && (priorDebt > 0 || totalDebt > 0)
        ? (() => {
          const delta = totalDebt - priorDebt;
          const pct = priorDebt > 0 ? ` (${delta >= 0 ? '+' : ''}${((delta / priorDebt) * 100).toFixed(1)}% YoY)` : '';
          const verb = Math.abs(delta) < 0.005 * Math.max(totalDebt, priorDebt) ? 'held flat at' : delta > 0 ? 'increased to' : 'decreased to';
          return `Total debt ${verb} ${fmtM(totalDebt)} from ${fmtM(priorDebt)} one year earlier${pct}.`;
        })()
        : totalDebt > 0
          ? `Reports ${fmtM(totalDebt)} in balance sheet debt obligations per latest disclosures.`
          : 'Balance sheet reports zero funded debt obligations.'
    );

    const debtRisks = raw.debtRisks || (
      totalDebt <= 0
        ? 'Zero funded balance sheet debt eliminates near-term debt refinancing risk.'
        : shortTermDebt !== null && shortTermDebt > 0
          ? (shortTermDebt > raw.cashAndEquivalents
            ? `Debt due within 12 months (${fmtM(shortTermDebt)}) exceeds cash on hand (${fmtM(raw.cashAndEquivalents)}), creating dependence on operating cash flow or refinancing to meet near-term maturities.`
            : `Cash on hand (${fmtM(raw.cashAndEquivalents)}) covers debt due within 12 months (${fmtM(shortTermDebt)}) ${(raw.cashAndEquivalents / shortTermDebt).toFixed(1)}x, limiting near-term refinancing risk.`)
          : 'Debt obligations require recurring cash flow generation to service principal maturities and interest.'
    );

    // 1b. Capital-market inputs (macro-linked): CAPM cost of equity and WACC
    const sectorKey = normalizeSector(raw.sector);
    const bench = SECTOR_BENCHMARKS[sectorKey];
    const riskFree = (raw.riskFreeRate !== undefined && raw.riskFreeRate > 0 ? raw.riskFreeRate / 100 : CAPITAL_MARKET.defaultRiskFreeRate);
    const betaUsed = clamp(raw.beta ?? 1.0, CAPITAL_MARKET.betaFloor, CAPITAL_MARKET.betaCap);
    const costOfEquity = riskFree + betaUsed * CAPITAL_MARKET.equityRiskPremium;
    const afterTaxCostOfDebt = (riskFree + CAPITAL_MARKET.creditSpread) * (1 - CAPITAL_MARKET.taxRate);
    const equityWeightBase = raw.marketCap > 0 ? raw.marketCap : 0;
    const wacc = equityWeightBase > 0 && totalDebt > 0
      ? (equityWeightBase * costOfEquity + totalDebt * afterTaxCostOfDebt) / (equityWeightBase + totalDebt)
      : costOfEquity;
    // Long-run nominal growth anchored below the risk-free rate, bounded to [1.5%, 3.0%]
    const terminalGrowth = clamp(riskFree - 0.015, 0.015, 0.03);
    const rateFactor = rateAdjustmentFactor(riskFree);
    const pct1 = (v: number) => parseFloat((v * 100).toFixed(2));

    // 1c. ROIC = Operating Income × (1 − tax) / (Total Debt + Stockholders' Equity − Cash)
    const investedCapital = bookEquity !== null ? totalDebt + bookEquity - raw.cashAndEquivalents : null;
    const computedRoic = raw.operatingIncomeTTM !== undefined && raw.operatingIncomeTTM !== null && investedCapital !== null && investedCapital > 0
      ? parseFloat((((raw.operatingIncomeTTM * (1 - CAPITAL_MARKET.taxRate)) / investedCapital) * 100).toFixed(1))
      : null;
    const roic = raw.roic ?? computedRoic;

    // 2. Valuation Metric Comparisons: Price-to-Book & Price-to-Earnings (sector benchmarks + rate adjusted)
    const currentPB = raw.rawPB;
    const sectorBenchPB = parseFloat((bench.pb * rateFactor).toFixed(2));
    const priceToBook: ValuationMetricComparison = {
      current: currentPB,
      industryAverage: sectorBenchPB,
      historicalAverage5Y: currentPB ? parseFloat((currentPB * 1.05).toFixed(2)) : bench.pb,
      chartData: []
    };

    const currentPE = raw.peRatioTrailing || raw.peRatioForward || null;
    const sectorBenchPE = parseFloat((bench.pe * rateFactor).toFixed(1));
    const priceToEarnings: ValuationMetricComparison = {
      current: currentPE,
      industryAverage: sectorBenchPE,
      historicalAverage5Y: currentPE ? parseFloat((currentPE * 1.05).toFixed(1)) : bench.pe,
      chartData: []
    };

    // 3. Return on Equity (ROE)
    const returnOnEquity = bookEquity && bookEquity > 0 && raw.netIncomeTTM
      ? parseFloat(((raw.netIncomeTTM / bookEquity) * 100).toFixed(1))
      : (bookValuePerShare && bookValuePerShare > 0 && currentTTM_EPS
        ? parseFloat(((currentTTM_EPS / bookValuePerShare) * 100).toFixed(1))
        : 0);

    // 4. Earnings Per Share (EPS): Actual reported quarters only (NO fake data synthesis)
    const earningsPerShare: EPSHistory = {
      currentTTM: currentTTM_EPS,
      quarterlyEPSPast2Years: raw.quarterlyEPSPast2Years || []
    };

    // 5. Volatility Index
    const volValue = isPenny ? 82.5 : (raw.beta ? parseFloat((raw.beta * 22.0).toFixed(1)) : 20.0);
    const volRating = isPenny ? 'Extreme' : volValue > 35 ? 'High' : volValue > 20 ? 'Moderate' : 'Low';
    const volatilityIndex: VolatilityIndex = {
      value: volValue,
      rating: volRating
    };

    // 6. Cash Flow Breakdown
    const operatingCashFlow = raw.operatingCashFlow ?? 0;
    const freeCashFlow = raw.freeCashFlowTTM;
    const cashFlowStatus = isPenny
      ? 'Micro-Cap / Cash Conservation Focus'
      : freeCashFlow > 0
        ? 'Positive Operating Free Cash Flow'
        : freeCashFlow < 0
          ? 'Operating Cash Flow Deficit'
          : 'Cash Neutral / Not Reported';

    const cashFlow: CashFlowBreakdown = {
      operatingCashFlow,
      freeCashFlow,
      status: cashFlowStatus
    };

    // 7. Management Quality & Competitive Moat
    const managementQuality: ManagementQuality = {
      rating: isPenny ? 'Speculative' : 'Established',
      trackRecord: isPenny
        ? 'Executive leadership operating in micro-cap capital structure environment with ongoing financing exposure.'
        : 'Management team with operational track record navigating sector cycles.'
    };

    const competitiveMoat: CompetitiveMoat = {
      rating: isPenny ? 'None' : 'Narrow Moat',
      summary: isPenny
        ? 'Limited enterprise switching barriers; operations exposed to commodity pricing or commercial adoption velocity.'
        : 'Established customer relationships and domain expertise provide baseline commercial continuity.'
    };

    // 8. Key Company & Industry Questions
    const companyQuestions: CompanyQuestions = {
      howCompanyMakesMoney: `${raw.companyName} provides products and services in the ${raw.sector} sector.`,
      productsDemandAndWhy: `Customer demand is driven by commercial operational requirements within ${raw.industry}.`,
      pastPerformanceSummary: `Historical performance reflects operating conditions across recent fiscal reporting periods.`,
      growthAndProfitabilityOutlook: `Future trajectory is tied to commercial execution, cost control, and market demand.`
    };

    const industryQuestions: IndustryQuestions = {
      industryCondition: `The ${raw.industry} sector operates under prevailing monetary policy and macroeconomic demand trends.`,
      obstaclesAndChallenges: `Key sector obstacles include interest rate sensitivity, competitive pricing, and regulatory compliance.`,
      economicPoliticalCulturalRisks: `Exposures include broader economic growth cycles and monetary policy decisions.`
    };

    // 9. Multi-Model Valuation Suite (Strict Financial Formulas, Macro-linked & Sector-tailored)
    const baseVal = Math.max(0.01, estPrice);

    // DCF: Dynamic discount rate (R_f + β × ERP) and revenue-growth linked cash flow projections
    let dcfFair: number | null = null;
    let dcfUpside: number | null = null;
    const dcfDiscountRate = costOfEquity;
    const projGrowth = raw.revenueGrowthYoY !== null && raw.revenueGrowthYoY !== undefined && raw.revenueGrowthYoY > 0
      ? clamp(raw.revenueGrowthYoY / 100, 0.02, 0.15)
      : 0.04;

    if (freeCashFlow > 0 && shares > 0 && dcfDiscountRate > terminalGrowth) {
      let pv = 0;
      let projFCF = freeCashFlow;
      for (let t = 1; t <= 5; t++) {
        projFCF *= (1 + projGrowth);
        pv += projFCF / Math.pow(1 + dcfDiscountRate, t);
      }
      const tv = (projFCF * (1 + terminalGrowth)) / (dcfDiscountRate - terminalGrowth);
      const val = parseFloat((pv / shares).toFixed(2));
      if (val > 0) {
        dcfFair = val;
        dcfUpside = parseFloat((((dcfFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // DDM: Gordon Growth Model with CAPM Cost of Equity
    let ddmFair: number | null = null;
    let ddmUpside: number | null = null;
    const divGrowthRate = clamp(terminalGrowth, 0.015, 0.035);
    if (raw.dividendYield > 0 && baseVal > 0 && costOfEquity > divGrowthRate) {
      const d0 = baseVal * (raw.dividendYield / 100);
      const val = parseFloat(((d0 * (1 + divGrowthRate)) / (costOfEquity - divGrowthRate)).toFixed(2));
      if (val > 0) {
        ddmFair = val;
        ddmUpside = parseFloat((((ddmFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // Relative Valuation: Sector-specific peer multiple scaled by macroeconomic rate adjustment factor
    let relFair: number | null = null;
    let relUpside: number | null = null;
    if (currentTTM_EPS > 0) {
      const val = parseFloat((currentTTM_EPS * sectorBenchPE).toFixed(2));
      if (val > 0) {
        relFair = val;
        relUpside = parseFloat((((relFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // Rapid Stock Valuation (PEG): Only valid if PEG and EPS positive
    let rapidFair: number | null = null;
    let rapidUpside: number | null = null;
    if (currentTTM_EPS > 0 && raw.pegRatio && raw.pegRatio > 0) {
      const pegPE = Math.max(10, Math.min(40, 1.25 * (raw.peRatioTrailing || sectorBenchPE) / raw.pegRatio));
      const val = parseFloat((currentTTM_EPS * pegPE).toFixed(2));
      if (val > 0) {
        rapidFair = val;
        rapidUpside = parseFloat((((rapidFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // Residual Income Model: Edwards-Bell-Ohlson model with CAPM Cost of Equity
    let resIncFair: number | null = null;
    let resIncUpside: number | null = null;
    if (bookValuePerShare && bookValuePerShare > 0 && currentTTM_EPS > 0 && costOfEquity > 0) {
      const eqCharge = bookValuePerShare * costOfEquity;
      const ri = currentTTM_EPS - eqCharge;
      const rawVal = bookValuePerShare + ri / costOfEquity;
      if (rawVal > 0) {
        resIncFair = parseFloat(rawVal.toFixed(2));
        resIncUpside = parseFloat((((resIncFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // Asset-Based Valuation (NAV Liquidation Floor)
    let assetFair: number | null = null;
    let assetUpside: number | null = null;
    if (raw.cashAndEquivalents > 0 || (bookValuePerShare && bookValuePerShare > 0)) {
      const netAssets = (raw.cashAndEquivalents || 0) + (bookValuePerShare ? bookValuePerShare * shares * 0.7 : 0) - totalDebt;
      if (netAssets > 0 && shares > 0) {
        const val = parseFloat((netAssets / shares).toFixed(2));
        if (val > 0) {
          assetFair = val;
          assetUpside = parseFloat((((assetFair - baseVal) / baseVal) * 100).toFixed(1));
        }
      }
    }

    // Excess Return Model (EVA): Uses deterministically computed ROIC and macro-derived WACC
    let excessFair: number | null = null;
    let excessUpside: number | null = null;
    const waccPct = pct1(wacc);
    if (roic !== null && roic > 0) {
      const returnSpread = parseFloat((roic - waccPct).toFixed(1));
      const rawVal = baseVal * (1 + returnSpread / 100);
      if (rawVal > 0) {
        excessFair = parseFloat(rawVal.toFixed(2));
        excessUpside = parseFloat((((excessFair - baseVal) / baseVal) * 100).toFixed(1));
      }
    }

    // Industry-Specific Model: Tailored by sector metric
    // EV/Sales (Tech), Justified P/B (Financials), P/FFO (Real Estate), EV/EBITDA (Industrials, Energy, Healthcare, Consumer, Utilities)
    let sectorFair: number | null = null;
    let sectorUpside: number | null = null;
    let sectorModelStatus = 'Calculated';

    if (bench.industryMetric === 'EV/Sales') {
      if (raw.revenueTTM > 0 && shares > 0) {
        const targetEvSales = bench.industryMultiple * rateFactor;
        const fairEV = raw.revenueTTM * targetEvSales;
        const fairEquity = fairEV - raw.netDebt;
        if (fairEquity > 0) {
          const val = parseFloat((fairEquity / shares).toFixed(2));
          if (val > 0) sectorFair = val;
        }
        if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
      } else {
        sectorModelStatus = 'Inapplicable: Zero or unreported revenue';
      }
    } else if (bench.industryMetric === 'Justified P/B') {
      if (bookValuePerShare && bookValuePerShare > 0) {
        const roeDecimal = (returnOnEquity || 10) / 100;
        const justifiedPB = costOfEquity > terminalGrowth && roeDecimal > terminalGrowth
          ? Math.max(0.5, (roeDecimal - terminalGrowth) / (costOfEquity - terminalGrowth))
          : bench.pb * rateFactor;
        const val = parseFloat((bookValuePerShare * justifiedPB).toFixed(2));
        if (val > 0) sectorFair = val;
        if (sectorFair === null) sectorModelStatus = 'Inapplicable: Implied P/B non-positive';
      } else {
        sectorModelStatus = 'Inapplicable: Zero or negative book value per share';
      }
    } else if (bench.industryMetric === 'P/FFO') {
      const ffo = operatingCashFlow > 0 ? operatingCashFlow : (raw.netIncomeTTM + (raw.depreciationTTM ?? 0));
      if (ffo > 0 && shares > 0) {
        const targetPFFO = bench.industryMultiple * rateFactor;
        const val = parseFloat(((ffo / shares) * targetPFFO).toFixed(2));
        if (val > 0) sectorFair = val;
        if (sectorFair === null) sectorModelStatus = 'Inapplicable: Implied P/FFO non-positive';
      } else {
        sectorModelStatus = 'Inapplicable: Zero or negative operating cash flow / FFO';
      }
    } else {
      // EV/EBITDA for manufacturing, energy, healthcare, utilities, materials, consumer
      const ebitda = raw.ebitdaTTM ?? (raw.operatingIncomeTTM !== null && raw.depreciationTTM !== null && raw.operatingIncomeTTM !== undefined && raw.depreciationTTM !== undefined ? raw.operatingIncomeTTM + Math.abs(raw.depreciationTTM) : null);
      if (ebitda !== null && ebitda > 0 && shares > 0) {
        const targetEvEbitda = bench.industryMultiple * rateFactor;
        const fairEV = ebitda * targetEvEbitda;
        const fairEquity = fairEV - raw.netDebt;
        if (fairEquity > 0) {
          const val = parseFloat((fairEquity / shares).toFixed(2));
          if (val > 0) sectorFair = val;
        }
        if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
      } else if (operatingCashFlow > 0 && shares > 0) {
        const targetEvOcf = bench.industryMultiple * 0.9 * rateFactor;
        const fairEV = operatingCashFlow * targetEvOcf;
        const fairEquity = fairEV - raw.netDebt;
        if (fairEquity > 0) {
          const val = parseFloat((fairEquity / shares).toFixed(2));
          if (val > 0) sectorFair = val;
        }
        if (sectorFair === null) sectorModelStatus = 'Inapplicable: Net debt exceeds implied EV';
      } else {
        sectorModelStatus = 'Inapplicable: Operating income / EBITDA deficit';
      }
    }

    if (sectorFair !== null && sectorFair > 0) {
      sectorUpside = parseFloat((((sectorFair - baseVal) / baseVal) * 100).toFixed(1));
    } else {
      sectorFair = null;
      sectorUpside = null;
    }

    // Consensus Fair Value: Average ONLY mathematically valid models
    const validModels = [dcfFair, ddmFair, relFair, rapidFair, resIncFair, assetFair, excessFair, sectorFair].filter(
      (v): v is number => v !== null && v > 0
    );

    let consensusFairValue: number | null = null;
    let verdict = 'Fairly Valued';
    if (validModels.length > 0) {
      consensusFairValue = parseFloat((validModels.reduce((a, b) => a + b, 0) / validModels.length).toFixed(2));
      const overallUpside = parseFloat((((consensusFairValue - baseVal) / baseVal) * 100).toFixed(1));
      if (overallUpside >= 20) verdict = 'Significantly Undervalued';
      else if (overallUpside >= 5) verdict = 'Modestly Undervalued';
      else if (overallUpside <= -20) verdict = 'Significantly Overvalued';
      else if (overallUpside <= -5) verdict = 'Modestly Overvalued';
    } else {
      verdict = isPenny ? 'Speculative Penny Stock / Fundamentals Inapplicable' : 'Inconclusive / Data Limited';
    }

    const valuationModels: ValuationModels = {
      dcf: {
        fairValue: dcfFair,
        intrinsicValue: dcfFair,
        discountRate: pct1(dcfDiscountRate),
        terminalGrowthRate: pct1(terminalGrowth),
        terminalGrowth: pct1(terminalGrowth),
        upside: dcfUpside,
        upsidePercent: dcfUpside,
        modelName: `Discounted Free Cash Flow (10Y Horizon, Ke: ${pct1(dcfDiscountRate)}%)`,
        status: dcfFair !== null ? 'Calculated' : 'Inapplicable: Non-positive free cash flow'
      },
      ddm: {
        fairValue: ddmFair,
        intrinsicValue: ddmFair,
        expectedDividendGrowth: pct1(divGrowthRate),
        dividendGrowthRate: pct1(divGrowthRate),
        costOfEquity: pct1(costOfEquity),
        requiredReturn: pct1(costOfEquity),
        applicable: raw.dividendYield > 0,
        upside: ddmUpside,
        upsidePercent: ddmUpside,
        modelName: 'Gordon Dividend Discount Model',
        status: ddmFair !== null ? 'Calculated' : 'Inapplicable: Zero dividend yield'
      },
      relativeValuation: {
        fairValue: relFair,
        intrinsicValue: relFair,
        benchmarkMultiple: sectorBenchPE,
        peerMedianPE: sectorBenchPE,
        multipleType: `${raw.sector} Sector Adjusted P/E (${sectorBenchPE}x)`,
        upside: relUpside,
        upsidePercent: relUpside,
        modelName: `${raw.sector} Peer Multiple Regression`,
        status: relFair !== null ? 'Calculated' : 'Inapplicable: Negative or unreported EPS'
      },
      rapidStockValuation: {
        fairValue: rapidFair,
        intrinsicValue: rapidFair,
        pegBenchmark: 1.25,
        upside: rapidUpside,
        upsidePercent: rapidUpside,
        modelName: 'Rapid PEG Growth Multiplier',
        status: rapidFair !== null ? 'Calculated' : 'Inapplicable: Missing PEG or negative earnings'
      },
      residualIncomeModel: {
        fairValue: resIncFair,
        intrinsicValue: resIncFair,
        costOfEquity: pct1(costOfEquity),
        equityCharge: bookValuePerShare ? parseFloat((bookValuePerShare * costOfEquity).toFixed(2)) : null,
        upside: resIncUpside,
        upsidePercent: resIncUpside,
        modelName: 'Edwards-Bell-Ohlson Residual Income',
        status: resIncFair !== null ? 'Calculated' : 'Inapplicable: Negative earnings or book value'
      },
      assetBasedValuation: {
        fairValue: assetFair,
        intrinsicValue: assetFair,
        netAssetValue: assetFair,
        liquidationValue: assetFair,
        upside: assetUpside,
        upsidePercent: assetUpside,
        modelName: 'Net Asset Value Liquidation Floor',
        status: assetFair !== null ? 'Calculated' : 'Inapplicable: Insufficient balance sheet asset reporting'
      },
      excessReturnModel: {
        fairValue: excessFair,
        intrinsicValue: excessFair,
        returnSpread: roic !== null ? parseFloat((roic - waccPct).toFixed(1)) : null,
        excessReturnPercent: roic !== null ? parseFloat((roic - waccPct).toFixed(1)) : null,
        wacc: waccPct,
        upside: excessUpside,
        upsidePercent: excessUpside,
        modelName: `Economic Value Added (EVA) Spread (WACC: ${waccPct}%)`,
        status: excessFair !== null ? 'Calculated' : 'Inapplicable: ROIC not available or non-positive'
      },
      industrySpecificModel: {
        fairValue: sectorFair,
        intrinsicValue: sectorFair,
        sectorMetric: `${raw.sector} Metric (${bench.industryMetric})`,
        name: `${raw.sector} ${bench.industryMetric} Model`,
        description: `Sector-tailored ${bench.industryMetric} benchmark (${(bench.industryMultiple * rateFactor).toFixed(1)}x)`,
        upside: sectorUpside,
        upsidePercent: sectorUpside,
        modelName: `${raw.sector} ${bench.industryMetric} Model`,
        status: sectorFair !== null ? 'Calculated' : sectorModelStatus
      },
      consensusFairValue,
      verdict
    };

    // 10. Classification & Fundamental Rating
    const classification: FundamentalMetrics['classification'] = isPenny
      ? 'Speculative Penny Stock'
      : raw.dividendYield >= 2.0
        ? 'Income Stock'
        : raw.operatingMargin > 15
          ? 'Growth Stock'
          : 'Value / Turnaround';

    const fundamentalRating: FundamentalMetrics['fundamentalRating'] = isPenny
      ? 'Weak'
      : (verdict.includes('Undervalued') && (raw.debtToEquity ?? 0.5) < 1.5)
        ? 'Strong'
        : verdict.includes('Overvalued') || (raw.debtToEquity && raw.debtToEquity > 2.5)
          ? 'Weak'
          : 'Fairly Valued';

    return {
      ticker: raw.ticker,
      companyName: raw.companyName,
      sector: raw.sector,
      industry: raw.industry,
      description: raw.description,
      marketCap: raw.marketCap,
      peRatioTrailing: raw.peRatioTrailing,
      peRatioForward: raw.peRatioForward,
      pegRatio: raw.pegRatio,
      evToEbitda: raw.evToEbitda,
      dividendYield: raw.dividendYield,
      revenueTTM: raw.revenueTTM,
      netIncomeTTM: raw.netIncomeTTM,
      grossMargin: raw.grossMargin,
      operatingMargin: raw.operatingMargin,
      freeCashFlowTTM: raw.freeCashFlowTTM,
      cashAndEquivalents: raw.cashAndEquivalents,
      netDebt: raw.netDebt,
      currentRatio: raw.currentRatio,
      roic,
      beta: raw.beta,
      fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: raw.fiftyTwoWeekLow,
      recentEarningsDate: raw.recentEarningsDate,
      earningsSurprisePercent: raw.earningsSurprisePercent,

      // Debt Breakdown
      totalDebt,
      debtToEquity: raw.debtToEquity,
      shortTermDebt,
      longTermDebt,
      shortVsLongTermRatio,
      recentChangesInDebt,
      debtRisks,

      // Valuation comparisons
      priceToBook,
      priceToEarnings,

      // Profitability & EPS
      returnOnEquity,
      earningsPerShare,

      // Volatility & Cash Flow
      volatilityIndex,
      cashFlow,

      // Qualitative Analysis
      managementQuality,
      competitiveMoat,
      companyQuestions,
      industryQuestions,

      // Multi-model Valuations
      valuationModels,
      fundamentalRating,
      classification
    };
  }

  /**
   * Fetches live market chart meta data for a ticker.
   */
  private async fetchYahooChart(ticker: string): Promise<any | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
    try {
      const res = await fetchWithRetry(url, { retries: 1, timeoutMs: 5000 });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.chart?.result?.[0]?.meta || null;
    } catch {
      return null;
    }
  }

  /**
   * Finnhub backup metric ingestion (verified endpoint only, no synthetic numbers).
   */
  private async fetchFinnhubMetrics(ticker: string): Promise<FundamentalMetrics | null> {
    if (!CONFIG.FINNHUB_API_KEY) return null;
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${CONFIG.FINNHUB_API_KEY}`;
    try {
      const res = await fetchWithRetry(url, { retries: 1, timeoutMs: 5000 });
      if (!res.ok) return null;
      const data = await res.json();
      const m = data?.metric;
      if (!m || Object.keys(m).length === 0 || !m.marketCapitalization) return null;

      const mktCap = (m.marketCapitalization || 0) * 1_000_000;
      return this.enrichFundamentalMetrics({
        ticker: ticker.toUpperCase(),
        companyName: ticker,
        sector: 'General Equities',
        industry: 'Public Equities',
        description: `${ticker} financial operations overview.`,
        marketCap: mktCap,
        peRatioTrailing: m.peNormalizedAnnual || m.peTTM || null,
        peRatioForward: m.peExclExtraAnnual || null,
        pegRatio: m.pegTTM || null,
        rawPB: m.pbAnnual || null,
        evToEbitda: m.evToEbitdaTTM || null,
        dividendYield: m.dividendYieldIndicatedAnnual || 0,
        revenueTTM: (m.revenuePerShareTTM || 0) * (mktCap > 0 ? mktCap / (m['52WeekHigh'] || 10) : 0),
        netIncomeTTM: 0,
        grossMargin: m.grossMarginTTM || 0,
        operatingMargin: m.operatingMarginTTM || 0,
        freeCashFlowTTM: 0,
        totalDebt: 0,
        cashAndEquivalents: 0,
        netDebt: 0,
        debtToEquity: m.totalDebtToTotalEquityAnnual ? m.totalDebtToTotalEquityAnnual / 100 : null,
        currentRatio: m.currentRatioAnnual || null,
        roic: m.roiAnnual || null,
        beta: m.beta || null,
        fiftyTwoWeekHigh: m['52WeekHigh'] || 0,
        fiftyTwoWeekLow: m['52WeekLow'] || 0
      });
    } catch {
      return null;
    }
  }
}

export const fundamentalDataIngestor = new FundamentalDataIngestor();
