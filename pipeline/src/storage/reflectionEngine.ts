import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';

export interface PredictionSnapshot {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  archetype?: string;
  recordedAt: string;
  priceAtCoverage: number;
  consensusFairValue: number | null;
  fundamentalRating: 'Strong' | 'Fairly Valued' | 'Weak';
  starRating?: number;
  uncertaintyRating?: string;
  forensicCompositeScore?: number;
  debateWinningEdge?: 'BULL_DOMINANT' | 'BEAR_DOMINANT' | 'CONTESTED_EQUILIBRIUM';
  riskGovernanceStatus?: string;
  bullCoreThesis?: string;
  bearCoreThesis?: string;
  slug: string;
}

export interface EpisodicReflectionRecord {
  snapshotId: string;
  ticker: string;
  sector: string;
  evaluatedAt: string;
  holdingDays: number;
  entryPrice: number;
  realizedPrice: number;
  realizedReturnPct: number;
  impliedFairValueReturnPct: number | null;
  directionalAccuracy: 'ACCURATE' | 'PREMATURE_OR_DIVERGENT' | 'INACCURATE';
  thesisValidationOutcome: string;
  postMortemCritique: string;
  distilledInstitutionalLesson: string;
}

export interface EpisodicMemoryLedger {
  updatedAt: string;
  snapshots: PredictionSnapshot[];
  reflections: EpisodicReflectionRecord[];
}

interface CoreInstitutionalRule {
  id: string;
  scope: 'CROSS_SECTOR' | 'ARCHETYPE' | 'FORENSIC' | 'SECTOR';
  targetTag?: string;
  lesson: string;
}

const CORE_INSTITUTIONAL_RULES: CoreInstitutionalRule[] = [
  {
    id: 'RULE-VAL-01',
    scope: 'CROSS_SECTOR',
    lesson:
      '[Valuation vs. Catalyst Velocity] Deep DCF or Multi-Model undervaluation (>25% discount to Consensus Fair Value) does not prevent near-term multiple compression when session flow is MACRO_DOMINATED or when sovereign 10Y yields exceed 4.5%. Bull arguments must identify a concrete near-term fundamental catalyst (e.g., earnings revision, buyback execution, or margin inflection) rather than relying solely on static terminal value upside.'
  },
  {
    id: 'RULE-FORENSIC-02',
    scope: 'FORENSIC',
    lesson:
      '[ASC 606 & Working Capital Divergence] When operating cash flow lags GAAP net income or contract assets/receivables grow faster than revenue, bullish operating-leverage theses frequently fail at subsequent earnings releases. Bear researchers must weight forensic working-capital bloat and short-term debt maturity walls above management guidance.'
  },
  {
    id: 'RULE-ARCH-CONTRARIAN',
    scope: 'ARCHETYPE',
    targetTag: 'contrarian',
    lesson:
      '[Contrarian Archetype Calibration] Single-session oversold drawdowns (-10% to -25%) on sub-normal relative volume (<0.75x RVOL) often signal temporary bid withdrawal rather than structural insolvency—provided Cash/Short-Term Debt coverage exceeds 1.5x. Conversely, high-volume selloffs (>2.0x RVOL) accompanied by leverage >2.5x Debt/Equity require Bear thesis dominance.'
  },
  {
    id: 'RULE-ARCH-PEAD',
    scope: 'ARCHETYPE',
    targetTag: 'pead',
    lesson:
      '[Post-Earnings Announcement Drift (PEAD)] Positive earnings surprises accompanied by upward free-cash-flow conversion sustain multi-week drift only when Price-to-Fair-Value remains below the 1-Star overvaluation hurdle. Chasing momentum above 1.30x Consensus Fair Value exposes the thesis to sharp mean-reversion.'
  },
  {
    id: 'RULE-ARCH-MOAT',
    scope: 'ARCHETYPE',
    targetTag: 'moat',
    lesson:
      '[Wide Moat Duration Sensitivity] Wide Moat compounders with high ROIC (>25%) still suffer acute multiple contraction when top-line organic growth decelerates toward single digits while trading at premium P/E multiples. Bull researchers must verify that ROIC-WACC spread expansion is supported by incremental reinvestment runway.'
  }
];

export class ContinuousLearningEngine {
  private reflectionsFilePath: string;
  private lessonsFilePath: string;
  private reportsDir: string;
  private ledger: EpisodicMemoryLedger = {
    updatedAt: new Date().toISOString(),
    snapshots: [],
    reflections: []
  };

  constructor(options?: {
    reflectionsFilePath?: string;
    lessonsFilePath?: string;
    reportsDir?: string;
  }) {
    this.reflectionsFilePath =
      options?.reflectionsFilePath ||
      path.resolve(CONFIG.PROJECT_ROOT, 'pipeline/data/episodic-reflections.json');
    this.lessonsFilePath =
      options?.lessonsFilePath ||
      path.resolve(CONFIG.PROJECT_ROOT, 'pipeline/data/lessons_learned.md');
    this.reportsDir = options?.reportsDir || CONFIG.REPORTS_DIR;

    this.init();
  }

  private init(): void {
    try {
      const dataDir = path.dirname(this.reflectionsFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const lessonsDir = path.dirname(this.lessonsFilePath);
      if (!fs.existsSync(lessonsDir)) {
        fs.mkdirSync(lessonsDir, { recursive: true });
      }

      if (fs.existsSync(this.reflectionsFilePath)) {
        const raw = fs.readFileSync(this.reflectionsFilePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<EpisodicMemoryLedger>;
        this.ledger = {
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
          reflections: Array.isArray(parsed.reflections) ? parsed.reflections : []
        };
      } else {
        this.persistLedgerSync();
      }

      if (!fs.existsSync(this.lessonsFilePath)) {
        this.writeLessonsMarkdownSync();
      }
    } catch (error) {
      console.error('[ContinuousLearningEngine] Failed to initialize reflection store:', error);
      this.ledger = {
        updatedAt: new Date().toISOString(),
        snapshots: [],
        reflections: []
      };
    }
  }

  private persistLedgerSync(): void {
    this.ledger.updatedAt = new Date().toISOString();
    const tempPath = `${this.reflectionsFilePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(this.ledger, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.reflectionsFilePath);
  }

  private writeLessonsMarkdownSync(): void {
    const lines: string[] = [
      '# EquiSight Alpha — Persistent Institutional Memory (`lessons_learned.md`)',
      '',
      '> **Architecture Reference:** Phase 4 Continuous Learning & Episodic Reflection Loop (arXiv:2412.20138 *TradingAgents* + *EquiSight Alpha* Deterministic Valuation & Forensic Synthesis).',
      `> **Last Updated:** ${this.ledger.updatedAt}`,
      `> **Tracked Dossier Snapshots:** ${this.ledger.snapshots.length} | **Completed Post-Mortem Reflections:** ${this.ledger.reflections.length}`,
      '',
      '---',
      '',
      '## 1. Core Institutional Heuristic Guardrails (Cross-Cycle Principles)',
      ''
    ];

    for (const rule of CORE_INSTITUTIONAL_RULES) {
      lines.push(`- **${rule.id} (${rule.scope}${rule.targetTag ? `:${rule.targetTag}` : ''}):** ${rule.lesson}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 2. Empirical Post-Settlement Reflections & Post-Mortem Critiques');
    lines.push('');

    if (this.ledger.reflections.length === 0) {
      lines.push(
        '_No post-settlement reflection intervals have been evaluated yet. Run `runSettlementReflectionPass()` or `evaluateReportOutcome()` to populate empirical post-mortems._'
      );
      lines.push('');
    } else {
      const sortedReflections = [...this.ledger.reflections].sort(
        (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
      );

      for (const ref of sortedReflections) {
        const snapshot = this.ledger.snapshots.find((s) => s.id === ref.snapshotId);
        const ratingLabel = snapshot ? snapshot.fundamentalRating : 'Unknown';
        const fvLabel =
          ref.impliedFairValueReturnPct !== null
            ? `${ref.impliedFairValueReturnPct >= 0 ? '+' : ''}${ref.impliedFairValueReturnPct.toFixed(2)}%`
            : 'N/A';
        const realizedLabel = `${ref.realizedReturnPct >= 0 ? '+' : ''}${ref.realizedReturnPct.toFixed(2)}%`;

        lines.push(
          `### [${ref.ticker}] (${ref.sector}) — Verdict Accuracy: \`${ref.directionalAccuracy}\` (${ref.holdingDays}d holding window)`
        );
        lines.push(
          `- **Snapshot ID:** \`${ref.snapshotId}\` | **Evaluated At:** \`${ref.evaluatedAt.split('T')[0]}\``
        );
        lines.push(
          `- **Entry Price:** $${ref.entryPrice.toFixed(2)} -> **Realized Price:** $${ref.realizedPrice.toFixed(2)} (**Realized Return:** \`${realizedLabel}\` vs. **Implied Fair Value Upside:** \`${fvLabel}\` | **Initial Verdict:** \`${ratingLabel}\`)`
        );
        lines.push(`- **Thesis Validation Outcome:** ${ref.thesisValidationOutcome}`);
        lines.push(`- **Post-Mortem Critique:** ${ref.postMortemCritique}`);
        lines.push(`- **Distilled Institutional Lesson:** ${ref.distilledInstitutionalLesson}`);
        lines.push('');
      }
    }

    const tempPath = `${this.lessonsFilePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempPath, lines.join('\n'), 'utf-8');
    fs.renameSync(tempPath, this.lessonsFilePath);
  }

  /**
   * Logs each newly completed stock analysis dossier so future runs can evaluate its realized outcome.
   */
  public recordAnalysisSnapshot(
    snapshotInput: Omit<PredictionSnapshot, 'id' | 'recordedAt'> & {
      id?: string;
      recordedAt?: string;
    },
    skipPersist = false
  ): PredictionSnapshot {
    const recordedAt = snapshotInput.recordedAt || new Date().toISOString();
    const datePrefix = recordedAt.split('T')[0];
    const cleanTicker = snapshotInput.ticker.toUpperCase();
    const cleanSlug = snapshotInput.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const id = snapshotInput.id || `${cleanTicker}-${datePrefix}-${cleanSlug}`;

    const snapshot: PredictionSnapshot = {
      id,
      ticker: cleanTicker,
      companyName: snapshotInput.companyName,
      sector: snapshotInput.sector || 'Uncategorized',
      archetype: snapshotInput.archetype,
      recordedAt,
      priceAtCoverage: Number(snapshotInput.priceAtCoverage),
      consensusFairValue:
        snapshotInput.consensusFairValue !== undefined && snapshotInput.consensusFairValue !== null
          ? Number(snapshotInput.consensusFairValue)
          : null,
      fundamentalRating: snapshotInput.fundamentalRating,
      starRating: snapshotInput.starRating,
      uncertaintyRating: snapshotInput.uncertaintyRating,
      forensicCompositeScore: snapshotInput.forensicCompositeScore,
      debateWinningEdge: snapshotInput.debateWinningEdge,
      riskGovernanceStatus: snapshotInput.riskGovernanceStatus,
      bullCoreThesis: snapshotInput.bullCoreThesis,
      bearCoreThesis: snapshotInput.bearCoreThesis,
      slug: cleanSlug
    };

    const existingIdx = this.ledger.snapshots.findIndex(
      (s) => s.id === snapshot.id || (s.ticker === snapshot.ticker && s.slug === snapshot.slug && s.recordedAt.split('T')[0] === datePrefix)
    );

    if (existingIdx >= 0) {
      this.ledger.snapshots[existingIdx] = snapshot;
    } else {
      this.ledger.snapshots.push(snapshot);
    }

    if (!skipPersist) {
      this.persistLedgerSync();
      this.writeLessonsMarkdownSync();
    }
    return snapshot;
  }

  /**
   * Evaluates a past prediction against realized price movement and earnings trajectory,
   * computing realized return %, directional accuracy vs. initial verdict/fair value,
   * and synthesizing a post-mortem critique + actionable lesson for future Bull/Bear debates.
   */
  public evaluateReportOutcome(
    snapshot: PredictionSnapshot,
    currentPrice: number,
    latestEarningsSurprisePct?: number | null,
    evaluatedAtOverride?: string,
    skipPersist = false
  ): EpisodicReflectionRecord {
    const evaluatedAt = evaluatedAtOverride || new Date().toISOString();
    const startMs = new Date(snapshot.recordedAt).getTime();
    const endMs = new Date(evaluatedAt).getTime();
    const rawDays = Math.round(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24));
    const holdingDays = Math.max(1, Number.isFinite(rawDays) ? rawDays : 1);

    const entryPrice = snapshot.priceAtCoverage > 0 ? snapshot.priceAtCoverage : currentPrice;
    const realizedReturnPct = Number(
      (((currentPrice - entryPrice) / (entryPrice || 1)) * 100).toFixed(2)
    );

    const impliedFairValueReturnPct =
      snapshot.consensusFairValue !== null && snapshot.consensusFairValue > 0 && entryPrice > 0
        ? Number(
            (((snapshot.consensusFairValue - entryPrice) / entryPrice) * 100).toFixed(2)
          )
        : null;

    // Determine expected directional stance from fundamentalRating, impliedFairValueReturnPct, and debateWinningEdge
    const isBullishVerdict =
      snapshot.fundamentalRating === 'Strong' ||
      snapshot.debateWinningEdge === 'BULL_DOMINANT' ||
      (snapshot.fundamentalRating !== 'Weak' &&
        impliedFairValueReturnPct !== null &&
        impliedFairValueReturnPct >= 12);

    const isBearishVerdict =
      snapshot.fundamentalRating === 'Weak' ||
      snapshot.debateWinningEdge === 'BEAR_DOMINANT' ||
      (snapshot.fundamentalRating !== 'Strong' &&
        impliedFairValueReturnPct !== null &&
        impliedFairValueReturnPct <= -12);

    let directionalAccuracy: 'ACCURATE' | 'PREMATURE_OR_DIVERGENT' | 'INACCURATE';

    if (isBullishVerdict) {
      if (realizedReturnPct >= 1.0) {
        directionalAccuracy = 'ACCURATE';
      } else if (realizedReturnPct <= -5.0) {
        directionalAccuracy = 'INACCURATE';
      } else {
        directionalAccuracy = 'PREMATURE_OR_DIVERGENT';
      }
    } else if (isBearishVerdict) {
      if (realizedReturnPct <= -1.0) {
        directionalAccuracy = 'ACCURATE';
      } else if (realizedReturnPct >= 5.0) {
        directionalAccuracy = 'INACCURATE';
      } else {
        directionalAccuracy = 'PREMATURE_OR_DIVERGENT';
      }
    } else {
      // Fairly Valued / Contested Equilibrium
      if (Math.abs(realizedReturnPct) <= 6.0) {
        directionalAccuracy = 'ACCURATE';
      } else if (Math.abs(realizedReturnPct) <= 12.0) {
        directionalAccuracy = 'PREMATURE_OR_DIVERGENT';
      } else {
        directionalAccuracy = 'INACCURATE';
      }
    }

    const earningsContext =
      latestEarningsSurprisePct !== undefined && latestEarningsSurprisePct !== null
        ? ` Subsequent earnings surprise registered ${latestEarningsSurprisePct >= 0 ? '+' : ''}${latestEarningsSurprisePct.toFixed(2)}%.`
        : '';

    const fvContext =
      impliedFairValueReturnPct !== null
        ? `implied fair value gap of ${impliedFairValueReturnPct >= 0 ? '+' : ''}${impliedFairValueReturnPct.toFixed(2)}% ($${snapshot.consensusFairValue?.toFixed(2)} target vs. $${entryPrice.toFixed(2)} entry)`
        : `entry price of $${entryPrice.toFixed(2)}`;

    let thesisValidationOutcome: string;
    let postMortemCritique: string;
    let distilledInstitutionalLesson: string;

    if (directionalAccuracy === 'ACCURATE') {
      if (isBullishVerdict) {
        thesisValidationOutcome = `Bullish conviction (${snapshot.fundamentalRating} rating, ${fvContext}) was validated as ${snapshot.ticker} appreciated ${realizedReturnPct >= 0 ? '+' : ''}${realizedReturnPct.toFixed(2)}% over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
        postMortemCritique = `The Bull Researcher's emphasis on ${snapshot.bullCoreThesis || 'intrinsic valuation discount and cash flow resilience'} appropriately outweighed near-term macro friction (${snapshot.bearCoreThesis || 'sector multiple compression concerns'}). Margin-of-safety discipline correctly identified asymmetric upside.`;
        distilledInstitutionalLesson = `[${snapshot.sector}${snapshot.archetype ? ` / ${snapshot.archetype.toUpperCase()}` : ''} — Validated Bullish Margin-of-Safety] In ${snapshot.sector} equities (${snapshot.ticker}), when Consensus Fair Value signals >15% upside backed by solid solvency and a '${snapshot.fundamentalRating}' rating, lean constructively into the Bull thesis even amidst transient session volatility.`;
      } else if (isBearishVerdict) {
        thesisValidationOutcome = `Cautious/Bearish verdict (${snapshot.fundamentalRating} rating, ${fvContext}) was validated as ${snapshot.ticker} contracted ${realizedReturnPct.toFixed(2)}% over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
        postMortemCritique = `The Bear Researcher's scrutiny of ${snapshot.bearCoreThesis || 'valuation premium and balance sheet/macro headwinds'} proved decisive, whereas the Bull case (${snapshot.bullCoreThesis || 'secular moat narrative'}) underestimated near-term multiple compression risk.`;
        distilledInstitutionalLesson = `[${snapshot.sector}${snapshot.archetype ? ` / ${snapshot.archetype.toUpperCase()}` : ''} — Validated Bearish Multiple Discipline] For ${snapshot.sector} issuers like ${snapshot.ticker}, when price trades above Consensus Fair Value ('${snapshot.fundamentalRating}' verdict), Bear thesis warnings on multiple compression and rate sensitivity must override qualitative moat narratives.`;
      } else {
        thesisValidationOutcome = `Neutral/Balanced verdict (${snapshot.fundamentalRating} rating, ${fvContext}) held accurately as ${snapshot.ticker} traded within a bounded ${realizedReturnPct >= 0 ? '+' : ''}${realizedReturnPct.toFixed(2)}% range over ${holdingDays} days.${earningsContext}`;
        postMortemCritique = `Balanced dialectic tension between Bull (${snapshot.bullCoreThesis || 'cash generation'}) and Bear (${snapshot.bearCoreThesis || 'valuation hurdle'}) vectors properly reflected equilibrium pricing.`;
        distilledInstitutionalLesson = `[${snapshot.sector} — Equilibrium Discipline] When Price/Fair Value hovers near parity without an extreme forensic or earnings catalyst (${snapshot.ticker}), maintain contested equilibrium and demand wider margin-of-safety hurdles before taking directional conviction.`;
      }
    } else if (directionalAccuracy === 'INACCURATE') {
      if (isBullishVerdict) {
        thesisValidationOutcome = `Bullish verdict (${snapshot.fundamentalRating} rating, ${fvContext}) diverged sharply as ${snapshot.ticker} declined ${realizedReturnPct.toFixed(2)}% over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
        postMortemCritique = `Post-mortem indicates the synthesis over-indexed on static model upside (${snapshot.bullCoreThesis || 'DCF/Consensus discount'}) while under-weighting the Bear Researcher's warning: "${snapshot.bearCoreThesis || 'macro/rate drag and execution deceleration'}". Valuation discounts alone failed to arrest downside momentum without an immediate earnings or liquidity catalyst.`;
        distilledInstitutionalLesson = `[${snapshot.sector}${snapshot.archetype ? ` / ${snapshot.archetype.toUpperCase()}` : ''} — Value Trap Warning (${snapshot.ticker})] Do not let theoretical DCF/Fair-Value upside override active Bear warnings regarding (${snapshot.bearCoreThesis || 'multiple compression and operational headwinds'}) in ${snapshot.sector}; require explicit cash-flow inflection or lower uncertainty hurdles before assigning Bull dominance.`;
      } else if (isBearishVerdict) {
        thesisValidationOutcome = `Bearish/Weak verdict (${snapshot.fundamentalRating} rating, ${fvContext}) was contradicted as ${snapshot.ticker} rallied +${realizedReturnPct.toFixed(2)}% over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
        postMortemCritique = `Post-mortem indicates excessive anchor bias on backward-looking valuation multiples (${snapshot.bearCoreThesis || 'overvaluation hurdle'}), underestimating the Bull Researcher's catalyst thesis: "${snapshot.bullCoreThesis || 'operating momentum, moat pricing power, and institutional capital inflows'}".`;
        distilledInstitutionalLesson = `[${snapshot.sector}${snapshot.archetype ? ` / ${snapshot.archetype.toUpperCase()}` : ''} — Momentum & Moat Underestimation (${snapshot.ticker})] In ${snapshot.sector}, when a company exhibits strong ROIC/operating momentum (${snapshot.bullCoreThesis || 'structural moat strength'}), mechanical overvaluation flags ('Weak' rating) can fail during institutional accumulation waves; Bull researchers should highlight capital efficiency and earnings revisions.`;
      } else {
        thesisValidationOutcome = `Equilibrium verdict (${snapshot.fundamentalRating} rating) saw an unexpected ${realizedReturnPct >= 0 ? '+' : ''}${realizedReturnPct.toFixed(2)}% breakout/breakdown over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
        postMortemCritique = `The analysis treated bull and bear arguments as offsetting when session microstructure and catalyst velocity warranted stronger directional weighting.`;
        distilledInstitutionalLesson = `[${snapshot.sector} — Catalyst Asymmetry (${snapshot.ticker})] When evaluating seemingly fairly-valued ${snapshot.sector} equities, stress-test option gamma skew and earnings revision velocity to detect imminent directional breakouts.`;
      }
    } else {
      // PREMATURE_OR_DIVERGENT
      thesisValidationOutcome = `Initial '${snapshot.fundamentalRating}' verdict (${fvContext}) remains in gestation/mild divergence as ${snapshot.ticker} moved ${realizedReturnPct >= 0 ? '+' : ''}${realizedReturnPct.toFixed(2)}% over ${holdingDays} days to $${currentPrice.toFixed(2)}.${earningsContext}`;
      postMortemCritique = `Over a ${holdingDays}-day window, price action has not yet converged toward the ${impliedFairValueReturnPct !== null ? `${impliedFairValueReturnPct >= 0 ? '+' : ''}${impliedFairValueReturnPct.toFixed(2)}% fair value spread` : 'model target'}. Both Bull (${snapshot.bullCoreThesis || 'intrinsic value'}) and Bear (${snapshot.bearCoreThesis || 'near-term macro friction'}) forces remain locked in tension.`;
      distilledInstitutionalLesson = `[${snapshot.sector}${snapshot.archetype ? ` / ${snapshot.archetype.toUpperCase()}` : ''} — Convergence Horizon (${snapshot.ticker})] Valuation convergence in ${snapshot.sector} requires multi-quarter earnings confirmation; Phase 2 debates should explicitly separate 1-to-10 day microstructure noise from 12-month intrinsic value realization.`;
    }

    const reflection: EpisodicReflectionRecord = {
      snapshotId: snapshot.id,
      ticker: snapshot.ticker,
      sector: snapshot.sector,
      evaluatedAt,
      holdingDays,
      entryPrice,
      realizedPrice: currentPrice,
      realizedReturnPct,
      impliedFairValueReturnPct,
      directionalAccuracy,
      thesisValidationOutcome,
      postMortemCritique,
      distilledInstitutionalLesson
    };

    const existingIdx = this.ledger.reflections.findIndex(
      (r) => r.snapshotId === snapshot.id
    );
    if (existingIdx >= 0) {
      this.ledger.reflections[existingIdx] = reflection;
    } else {
      this.ledger.reflections.push(reflection);
    }

    if (!skipPersist) {
      this.persistLedgerSync();
      this.writeLessonsMarkdownSync();
    }
    return reflection;
  }

  /**
   * Scans markdown reports in `src/content/reports/` to seed snapshots if not already recorded,
   * and evaluates outcomes using either `priceLookupFn` or subsequent report filings for the same ticker.
   */
  public async runSettlementReflectionPass(
    priceLookupFn?: (
      ticker: string
    ) => Promise<{ price: number; earningsSurprisePct?: number | null } | null>
  ): Promise<EpisodicReflectionRecord[]> {
    const parsedReports = this.scanExistingMarkdownReports();

    // Group reports by ticker in chronological order
    const reportsByTicker = new Map<string, PredictionSnapshot[]>();
    for (const snap of parsedReports) {
      const recordToUse = this.recordAnalysisSnapshot(snap, true);
      const list = reportsByTicker.get(recordToUse.ticker) || [];
      list.push(recordToUse);
      reportsByTicker.set(recordToUse.ticker, list);
    }

    const newlyEvaluated: EpisodicReflectionRecord[] = [];

    // 1. Evaluate multi-date historical report chains in `src/content/reports/`
    for (const [, snapshots] of reportsByTicker.entries()) {
      snapshots.sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );

      if (snapshots.length >= 2) {
        const latestSnapshot = snapshots[snapshots.length - 1];
        for (let i = 0; i < snapshots.length - 1; i++) {
          const earlierSnapshot = snapshots[i];
          // Evaluate earlier coverage snapshot against the latest realized report price
          if (
            latestSnapshot.priceAtCoverage > 0 &&
            earlierSnapshot.priceAtCoverage > 0 &&
            latestSnapshot.id !== earlierSnapshot.id
          ) {
            const reflection = this.evaluateReportOutcome(
              earlierSnapshot,
              latestSnapshot.priceAtCoverage,
              null,
              latestSnapshot.recordedAt,
              true
            );
            newlyEvaluated.push(reflection);
          }
        }
      }
    }

    // 2. If a live priceLookupFn is provided, evaluate the most recent snapshot per ticker against live market data
    if (priceLookupFn) {
      const latestByTicker = new Map<string, PredictionSnapshot>();
      for (const snap of this.ledger.snapshots) {
        const prev = latestByTicker.get(snap.ticker);
        if (!prev || new Date(snap.recordedAt).getTime() >= new Date(prev.recordedAt).getTime()) {
          latestByTicker.set(snap.ticker, snap);
        }
      }

      for (const [ticker, snap] of latestByTicker.entries()) {
        try {
          const liveQuote = await priceLookupFn(ticker);
          if (liveQuote && typeof liveQuote.price === 'number' && liveQuote.price > 0) {
            const reflection = this.evaluateReportOutcome(
              snap,
              liveQuote.price,
              liveQuote.earningsSurprisePct ?? null,
              undefined,
              true
            );
            newlyEvaluated.push(reflection);
          }
        } catch (err) {
          console.warn(
            `[ContinuousLearningEngine] Live price lookup failed for ${ticker}:`,
            err
          );
        }
      }
    }

    this.persistLedgerSync();
    this.writeLessonsMarkdownSync();
    return newlyEvaluated;
  }

  /**
   * Retrieves the most relevant lessons learned (matching ticker, sector, or archetype,
   * plus core cross-sector valuation/forensic lessons) to inject directly into Phase 2's Bull and Bear Researcher prompts.
   */
  public getLessonsForDebate(params: {
    ticker: string;
    sector?: string;
    archetype?: string;
    limit?: number;
  }): string[] {
    const limit = params.limit ?? 5;
    const targetTicker = params.ticker.toUpperCase();
    const targetSector = (params.sector || '').toLowerCase();
    const targetArchetype = (params.archetype || '').toLowerCase();

    // If ledger has not been seeded from existing reports yet and reflections are empty, run a quick synchronous scan
    if (this.ledger.snapshots.length === 0 && fs.existsSync(this.reportsDir)) {
      this.seedFromExistingReportsSync();
    }

    const scoredLessons: Array<{ lesson: string; score: number; key: string }> = [];

    // Score empirical reflections from past settlements
    for (const ref of this.ledger.reflections) {
      const snap = this.ledger.snapshots.find((s) => s.id === ref.snapshotId);
      let score = 10;

      if (ref.ticker.toUpperCase() === targetTicker) {
        score += 100; // Direct prior post-mortem on the exact same ticker
      }
      if (targetSector && ref.sector.toLowerCase() === targetSector) {
        score += 40; // Same sector lesson
      }
      if (targetArchetype && snap?.archetype?.toLowerCase() === targetArchetype) {
        score += 30; // Same quantitative archetype
      }
      if (ref.directionalAccuracy === 'INACCURATE') {
        score += 20; // Prioritize past mistakes/post-mortems to prevent repeat analytical blind spots
      } else if (ref.directionalAccuracy === 'ACCURATE') {
        score += 10;
      }

      scoredLessons.push({
        lesson: `${ref.distilledInstitutionalLesson} (Empirical outcome on ${ref.ticker}: Entry $${ref.entryPrice.toFixed(2)} -> Realized $${ref.realizedPrice.toFixed(2)} [${ref.realizedReturnPct >= 0 ? '+' : ''}${ref.realizedReturnPct.toFixed(2)}% over ${ref.holdingDays}d], Verdict Accuracy: ${ref.directionalAccuracy})`,
        score,
        key: `ref-${ref.ticker}-${ref.directionalAccuracy}`
      });
    }

    // Score core institutional heuristic rules
    for (const rule of CORE_INSTITUTIONAL_RULES) {
      let score = 15;
      if (rule.scope === 'ARCHETYPE' && rule.targetTag === targetArchetype) {
        score += 45;
      } else if (rule.scope === 'CROSS_SECTOR' || rule.scope === 'FORENSIC') {
        score += 25;
      }
      scoredLessons.push({
        lesson: rule.lesson,
        score,
        key: rule.id
      });
    }

    scoredLessons.sort((a, b) => b.score - a.score);

    const selected: string[] = [];
    const seenKeys = new Set<string>();
    const seenTickers = new Set<string>();

    for (const item of scoredLessons) {
      if (selected.length >= limit) break;
      if (seenKeys.has(item.key)) continue;

      // Avoid filling all slots with multiple reflections from the same non-target ticker
      const tickerMatch = item.key.startsWith('ref-') ? item.key.split('-')[1] : null;
      if (tickerMatch && tickerMatch !== targetTicker && seenTickers.has(tickerMatch)) {
        continue;
      }

      seenKeys.add(item.key);
      if (tickerMatch) seenTickers.add(tickerMatch);
      selected.push(item.lesson);
    }

    return selected;
  }

  public getLedger(): EpisodicMemoryLedger {
    return this.ledger;
  }

  private seedFromExistingReportsSync(): void {
    try {
      const parsedReports = this.scanExistingMarkdownReports();
      const reportsByTicker = new Map<string, PredictionSnapshot[]>();
      for (const snap of parsedReports) {
        const existing = this.ledger.snapshots.find((s) => s.id === snap.id);
        const recordToUse = existing || this.recordAnalysisSnapshot(snap, true);
        const list = reportsByTicker.get(recordToUse.ticker) || [];
        list.push(recordToUse);
        reportsByTicker.set(recordToUse.ticker, list);
      }

      for (const [, snapshots] of reportsByTicker.entries()) {
        snapshots.sort(
          (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        if (snapshots.length >= 2) {
          const latestSnapshot = snapshots[snapshots.length - 1];
          for (let i = 0; i < snapshots.length - 1; i++) {
            const earlierSnapshot = snapshots[i];
            if (
              latestSnapshot.priceAtCoverage > 0 &&
              earlierSnapshot.priceAtCoverage > 0 &&
              latestSnapshot.id !== earlierSnapshot.id
            ) {
              this.evaluateReportOutcome(
                earlierSnapshot,
                latestSnapshot.priceAtCoverage,
                null,
                latestSnapshot.recordedAt,
                true
              );
            }
          }
        }
      }

      this.persistLedgerSync();
      this.writeLessonsMarkdownSync();
    } catch (err) {
      console.warn('[ContinuousLearningEngine] Failed to seed from existing reports:', err);
    }
  }

  private scanExistingMarkdownReports(): PredictionSnapshot[] {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.reportsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const snapshots: PredictionSnapshot[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(this.reportsDir, file);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = matter(raw);
        const data = parsed.data as Record<string, any>;

        if (!data || !data.ticker || typeof data.currentPrice !== 'number') {
          continue;
        }

        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
        const datePrefix = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
        const slug = dateMatch ? dateMatch[2] : file.replace(/\.md$/, '');
        const recordedAt =
          typeof data.publishDate === 'string' && data.publishDate
            ? data.publishDate
            : `${datePrefix}T16:30:00.000Z`;

        const ratingRaw = data.fundamentalRating;
        const fundamentalRating: 'Strong' | 'Fairly Valued' | 'Weak' =
          ratingRaw === 'Strong' || ratingRaw === 'Weak' || ratingRaw === 'Fairly Valued'
            ? ratingRaw
            : 'Fairly Valued';

        const consensusFairValue =
          typeof data.valuationModels?.consensusFairValue === 'number'
            ? data.valuationModels.consensusFairValue
            : typeof data.morningstarRating?.fairValueEstimate === 'number'
              ? data.morningstarRating.fairValueEstimate
              : null;

        const bullItems = Array.isArray(data.theses?.bull) ? data.theses.bull : [];
        const bearItems = Array.isArray(data.theses?.bear) ? data.theses.bear : [];
        const bullFirst =
          bullItems.length > 0
            ? `${bullItems[0]?.point || 'Valuation & Cash Flow Upside'}${bullItems[0]?.deductionChain ? ` (${bullItems[0].deductionChain.split('->')[0].trim()})` : ''}`
            : undefined;
        const bearFirst =
          bearItems.length > 0
            ? `${bearItems[0]?.point || 'Macro & Execution Risk'}${bearItems[0]?.deductionChain ? ` (${bearItems[0].deductionChain.split('->')[0].trim()})` : ''}`
            : undefined;

        const ticker = String(data.ticker).toUpperCase();
        const id = `${ticker}-${datePrefix}-${slug}`;

        snapshots.push({
          id,
          ticker,
          companyName: String(data.companyName || ticker),
          sector: String(data.sector || 'Uncategorized'),
          archetype: typeof data.archetype === 'string' ? data.archetype : undefined,
          recordedAt,
          priceAtCoverage: Number(data.currentPrice),
          consensusFairValue,
          fundamentalRating,
          starRating:
            typeof data.starRating === 'number'
              ? data.starRating
              : typeof data.morningstarRating?.starRating === 'number'
                ? data.morningstarRating.starRating
                : undefined,
          uncertaintyRating:
            typeof data.uncertaintyRating === 'string'
              ? data.uncertaintyRating
              : typeof data.morningstarRating?.uncertaintyRating === 'string'
                ? data.morningstarRating.uncertaintyRating
                : undefined,
          forensicCompositeScore:
            typeof data.forensicAudit?.compositeScore === 'number'
              ? data.forensicAudit.compositeScore
              : typeof data.forensicAnalysis?.compositeScore === 'number'
                ? data.forensicAnalysis.compositeScore
                : undefined,
          debateWinningEdge: data.dialecticDebate?.winningEdge ?? data.adversarialDebate?.winningEdge,
          riskGovernanceStatus: data.riskGuardianAudit?.governanceStatus ?? data.riskGovernance?.governanceStatus,
          bullCoreThesis: bullFirst,
          bearCoreThesis: bearFirst,
          slug
        });
      } catch (err) {
        console.warn(`[ContinuousLearningEngine] Skipping malformed report ${file}:`, err);
      }
    }

    return snapshots;
  }
}

export const reflectionEngine = new ContinuousLearningEngine();
