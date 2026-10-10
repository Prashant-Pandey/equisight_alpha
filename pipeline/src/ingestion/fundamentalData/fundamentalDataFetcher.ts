/**
 * External fundamental screener and chart data fetching via Yahoo and Finnhub APIs.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';
import { CONFIG } from '../../config.js';
import type { FundamentalMetrics } from '../../types.js';
import type { RawFundamentalInput } from './types.js';

export async function fetchYahooChart(ticker: string): Promise<any | null> {
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

export async function fetchFinnhubMetrics(
  ticker: string,
  enrichFn: (raw: RawFundamentalInput) => FundamentalMetrics
): Promise<FundamentalMetrics | null> {
  if (!CONFIG.FINNHUB_API_KEY) return null;
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${CONFIG.FINNHUB_API_KEY}`;
  try {
    const res = await fetchWithRetry(url, { retries: 1, timeoutMs: 5000 });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.metric;
    if (!m || Object.keys(m).length === 0 || !m.marketCapitalization) return null;

    const mktCap = (m.marketCapitalization || 0) * 1_000_000;
    return enrichFn({
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
