/**
 * Deterministic helpers for parsing SEC EDGAR XBRL `companyfacts` payloads.
 *
 * The critical distinction handled here:
 *  - Point-in-time (instant) facts: balance-sheet items (Assets, Cash, Debt, Equity).
 *    These carry only an `end` date; the latest dated value is valid as-is.
 *  - Flow (duration) facts: income-statement / cash-flow items (Revenue, Net Income,
 *    Operating Income, Operating Cash Flow, EPS). These carry `start` + `end`. A 10-Q
 *    value covers a 3-month quarter or a 6/9-month year-to-date period, so it must be
 *    rolled forward into a trailing-twelve-month (TTM) figure before being compared
 *    against other annualised numbers.
 */

export interface XbrlFact {
  start?: string;
  end: string;
  val: number;
  form: string;
  filed: string;
  fy?: number;
  fp?: string;
}

export interface InstantValue {
  value: number;
  asOf: string;
}

export type FlowMethod = 'annual' | 'ytd-rollforward' | 'quarter-sum';

export interface FlowValue {
  value: number;
  periodEnd: string;
  method: FlowMethod;
}

export interface QuarterValue {
  start: string;
  end: string;
  val: number;
  /** True when the quarter was derived by differencing cumulative periods (e.g. Q4 = FY − 9M YTD). */
  derived: boolean;
}

export const DAY_MS = 86_400_000;
const PERIODIC_FORMS = new Set(['10-K', '10-Q', '10-K/A', '10-Q/A']);

export const toMs = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);

export const durationDays = (f: { start?: string; end: string }): number =>
  f.start ? Math.round((toMs(f.end) - toMs(f.start)) / DAY_MS) : 0;

const within = (v: number, lo: number, hi: number): boolean => v >= lo && v <= hi;
const isAnnual = (f: XbrlFact): boolean => within(durationDays(f), 350, 380);
const isQuarter = (f: XbrlFact): boolean => within(durationDays(f), 80, 100);

/**
 * Returns periodic-report facts for one concept/unit, de-duplicated by period
 * (keeping the most recently filed value so restatements win), sorted by end date.
 */
export function getFacts(usGaap: any, concept: string, unit = 'USD'): XbrlFact[] {
  const arr = usGaap?.[concept]?.units?.[unit];
  if (!Array.isArray(arr)) return [];

  const byPeriod = new Map<string, XbrlFact>();
  for (const f of arr) {
    if (!f || typeof f.val !== 'number' || !f.end || !PERIODIC_FORMS.has(f.form)) continue;
    const key = `${f.start ?? ''}|${f.end}`;
    const prev = byPeriod.get(key);
    if (!prev || (f.filed ?? '') > (prev.filed ?? '')) byPeriod.set(key, f);
  }
  return [...byPeriod.values()].sort((a, b) => toMs(a.end) - toMs(b.end));
}

/**
 * Among several candidate concepts (companies switch tags over time, e.g.
 * SalesRevenueNet → RevenueFromContractWithCustomer…), returns the duration facts
 * of the concept with the most recent reporting period. Ties go to list order.
 */
export function pickDurationFacts(usGaap: any, concepts: string[], unit = 'USD'): XbrlFact[] {
  let best: XbrlFact[] = [];
  let bestEnd = -Infinity;
  for (const c of concepts) {
    const facts = getFacts(usGaap, c, unit).filter((f) => f.start);
    if (!facts.length) continue;
    const end = toMs(facts[facts.length - 1].end);
    if (end > bestEnd) {
      best = facts;
      bestEnd = end;
    }
  }
  return best;
}

/**
 * Point-in-time lookup: walks `concepts` in priority order and returns the first
 * value dated on/just before `asOf` that is not stale (older than `maxStalenessDays`).
 * Without `asOf`, returns the latest value of the first concept that has one.
 */
export function instantAt(
  usGaap: any,
  concepts: string[],
  asOf?: string,
  maxStalenessDays = 100
): InstantValue | undefined {
  const refMs = asOf ? toMs(asOf) : Infinity;
  for (const c of concepts) {
    const facts = getFacts(usGaap, c).filter((f) => !f.start);
    for (let i = facts.length - 1; i >= 0; i--) {
      const endMs = toMs(facts[i].end);
      if (endMs > refMs + 5 * DAY_MS) continue;
      if (Number.isFinite(refMs) && refMs - endMs > maxStalenessDays * DAY_MS) break;
      return { value: facts[i].val, asOf: facts[i].end };
    }
  }
  return undefined;
}

/** Latest balance-sheet date reported for a concept (used to align all instant lookups). */
export function latestInstantDate(usGaap: any, concepts: string[]): string | undefined {
  let latest: string | undefined;
  for (const c of concepts) {
    const facts = getFacts(usGaap, c).filter((f) => !f.start);
    const end = facts[facts.length - 1]?.end;
    if (end && (!latest || end > latest)) latest = end;
  }
  return latest;
}

/**
 * Discrete fiscal quarters, combining directly reported 3-month facts with quarters
 * derived by differencing cumulative facts that share a fiscal-year start
 * (Q2 = 6M − Q1, Q3 = 9M − 6M, Q4 = FY − 9M). Sorted oldest → newest.
 */
export function discreteQuarters(facts: XbrlFact[]): QuarterValue[] {
  const flows = facts.filter((f) => f.start);
  const out: QuarterValue[] = [];
  const hasQuarterEnding = (endMs: number) => out.some((q) => Math.abs(toMs(q.end) - endMs) <= 5 * DAY_MS);

  for (const f of flows) {
    if (isQuarter(f) && !hasQuarterEnding(toMs(f.end))) {
      out.push({ start: f.start!, end: f.end, val: f.val, derived: false });
    }
  }

  const cumulative = flows.filter((f) => within(durationDays(f), 101, 380));
  for (const cur of cumulative) {
    const curEnd = toMs(cur.end);
    if (hasQuarterEnding(curEnd)) continue;
    const curStart = toMs(cur.start!);
    const prev = flows.find(
      (p) =>
        p !== cur &&
        Math.abs(toMs(p.start!) - curStart) <= 5 * DAY_MS &&
        within((curEnd - toMs(p.end)) / DAY_MS, 80, 100)
    );
    if (prev) {
      out.push({ start: prev.end, end: cur.end, val: cur.val - prev.val, derived: true });
    }
  }

  return out.sort((a, b) => toMs(a.end) - toMs(b.end));
}

/**
 * Trailing-twelve-month value for a flow concept.
 *
 *  1. Latest period is a full fiscal year → use it directly.
 *  2. Latest period is interim → TTM = last FY + current YTD − prior-year comparable YTD.
 *  3. Otherwise → sum of the four most recent contiguous discrete quarters.
 *  4. Last resort → most recent full fiscal year (stale but period-consistent).
 *
 * A lone 10-Q quarter/YTD value is never returned as an annual figure.
 */
export function trailingTwelveMonths(facts: XbrlFact[]): FlowValue | undefined {
  const flows = facts.filter((f) => f.start);
  if (!flows.length) return undefined;

  const annuals = flows.filter(isAnnual);
  const latestAnnual = annuals[annuals.length - 1];
  const latestEndMs = Math.max(...flows.map((f) => toMs(f.end)));

  if (latestAnnual && toMs(latestAnnual.end) >= latestEndMs - 5 * DAY_MS) {
    return { value: latestAnnual.val, periodEnd: latestAnnual.end, method: 'annual' };
  }

  if (latestAnnual) {
    const fyEndMs = toMs(latestAnnual.end);
    const ytd = flows
      .filter(
        (f) =>
          Math.abs(toMs(f.end) - latestEndMs) <= 5 * DAY_MS &&
          Math.abs(toMs(f.start!) - fyEndMs) <= 10 * DAY_MS &&
          durationDays(f) < 350
      )
      .sort((a, b) => durationDays(b) - durationDays(a))[0];

    if (ytd) {
      const ytdDays = durationDays(ytd);
      const priorTargetMs = toMs(ytd.end) - 365 * DAY_MS;
      const prior = flows.find(
        (f) => Math.abs(toMs(f.end) - priorTargetMs) <= 10 * DAY_MS && Math.abs(durationDays(f) - ytdDays) <= 10
      );
      if (prior) {
        return { value: latestAnnual.val + ytd.val - prior.val, periodEnd: ytd.end, method: 'ytd-rollforward' };
      }
    }
  }

  const quarters = discreteQuarters(flows);
  if (quarters.length >= 4) {
    const last4 = quarters.slice(-4);
    const contiguous = last4.every(
      (q, i) => i === 0 || within((toMs(q.end) - toMs(last4[i - 1].end)) / DAY_MS, 80, 100)
    );
    if (contiguous && Math.abs(toMs(last4[3].end) - latestEndMs) <= 5 * DAY_MS) {
      return { value: last4.reduce((s, q) => s + q.val, 0), periodEnd: last4[3].end, method: 'quarter-sum' };
    }
  }

  if (latestAnnual) {
    return { value: latestAnnual.val, periodEnd: latestAnnual.end, method: 'annual' };
  }
  return undefined;
}

/** Most recent full-fiscal-year fact and the one immediately preceding it (for YoY growth). */
export function lastTwoAnnuals(facts: XbrlFact[]): { latest?: XbrlFact; prior?: XbrlFact } {
  const annuals = facts.filter((f) => f.start && isAnnual(f));
  const latest = annuals[annuals.length - 1];
  if (!latest) return {};
  const targetMs = toMs(latest.end) - 365 * DAY_MS;
  const prior = annuals.find((f) => Math.abs(toMs(f.end) - targetMs) <= 15 * DAY_MS);
  return { latest, prior };
}

/**
 * Labels a quarter by fiscal year, e.g. Apple's quarter ending 2024-12-28 with a
 * late-September fiscal year end → "Q1 FY2025". Falls back to calendar quarters.
 */
export function fiscalQuarterLabel(endIso: string, fiscalYearEndIso?: string): string {
  const endMs = toMs(endIso);
  const end = new Date(endMs);

  if (!fiscalYearEndIso) {
    const adj = new Date(endMs - 10 * DAY_MS);
    return `Q${Math.floor(adj.getUTCMonth() / 3) + 1} ${adj.getUTCFullYear()}`;
  }

  const fy = new Date(toMs(fiscalYearEndIso));
  for (let y = end.getUTCFullYear() - 1; y <= end.getUTCFullYear() + 1; y++) {
    const fyEndMs = Date.UTC(y, fy.getUTCMonth(), fy.getUTCDate());
    if (fyEndMs >= endMs - 20 * DAY_MS) {
      const monthsBefore = Math.round((fyEndMs - endMs) / (DAY_MS * 30.44));
      const q = Math.min(4, Math.max(1, 4 - Math.round(monthsBefore / 3)));
      return `Q${q} FY${y}`;
    }
  }
  return `Q? FY${end.getUTCFullYear()}`;
}
