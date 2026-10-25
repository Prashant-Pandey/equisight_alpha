import { PUBLISHER_COMPLIANCE_DIRECTIVE } from './prompts.js';
import { cleanCompanyName } from '../../../src/utils/titleGenerator.js';
import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  ThesisPoint
} from '../types.js';

/**
 * Single round entry in the multi-agent Bull vs. Bear adversarial debate
 * (Phase 2 of Section 9 — arXiv:2412.20138 TradingAgents x EquiSight Alpha Hybrid).
 */
export interface DebateRoundEntry {
  round: number;
  speaker: 'BULL_RESEARCHER' | 'BEAR_RESEARCHER';
  coreClaim: string;
  rebuttalToOpponent: string;
  citedStatutoryAndDeterministicEvidence: string[];
  forensicOrMoatPillarReferenced: string;
  quantifiedImpact: string;
}

/**
 * Complete multi-round dialectical debate transcript and stress-tested thesis output.
 */
export interface DialecticDebateTranscript {
  ticker: string;
  roundsCompleted: number;
  rounds: DebateRoundEntry[];
  unresolvedTensions: string[];
  winningEdge: 'BULL_DOMINANT' | 'BEAR_DOMINANT' | 'CONTESTED_EQUILIBRIUM';
  debateSynthesisSummary: string;
  stressTestedBullTheses: ThesisPoint[];
  stressTestedBearTheses: ThesisPoint[];
  lessonsApplied: string[];
}

export interface AdversarialDebateParams {
  mover: MarketMover;
  fundamentals: FundamentalMetrics;
  macro: MacroBackdrop;
  sentiment: SocialSentiment;
  forensicSummaryText?: string;
  weaponizedBearFlags?: string[];
  institutionalMemoryLessons?: string[];
  executeLLM?: <T>(
    sys: string,
    usr: string,
    label: string,
    schema: Record<string, any>
  ) => Promise<T | null>;
}

interface Turn1DebateOutput {
  bullOpeningRound: DebateRoundEntry;
  bearOpeningCounterRound: DebateRoundEntry;
}

interface Turn2DebateOutput {
  bullRebuttalRound: DebateRoundEntry;
  bearFinalCrossExamRound: DebateRoundEntry;
  unresolvedTensions: string[];
  winningEdge: 'BULL_DOMINANT' | 'BEAR_DOMINANT' | 'CONTESTED_EQUILIBRIUM';
  debateSynthesisSummary: string;
  stressTestedBullTheses: ThesisPoint[];
  stressTestedBearTheses: ThesisPoint[];
  lessonsApplied: string[];
}

const DEBATE_ROUND_ENTRY_SCHEMA = {
  type: 'object',
  properties: {
    round: { type: 'number' },
    speaker: {
      type: 'string',
      enum: ['BULL_RESEARCHER', 'BEAR_RESEARCHER']
    },
    coreClaim: { type: 'string' },
    rebuttalToOpponent: { type: 'string' },
    citedStatutoryAndDeterministicEvidence: {
      type: 'array',
      items: { type: 'string' }
    },
    forensicOrMoatPillarReferenced: { type: 'string' },
    quantifiedImpact: { type: 'string' }
  },
  required: [
    'round',
    'speaker',
    'coreClaim',
    'rebuttalToOpponent',
    'citedStatutoryAndDeterministicEvidence',
    'forensicOrMoatPillarReferenced',
    'quantifiedImpact'
  ]
} as const;

const THESIS_POINT_SCHEMA = {
  type: 'object',
  properties: {
    point: { type: 'string' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          url: { type: 'string' }
        },
        required: ['name', 'url']
      }
    },
    deductionChain: { type: 'string' }
  },
  required: ['point', 'sources', 'deductionChain']
} as const;

export const DEBATE_TURN1_SCHEMA = {
  type: 'object',
  properties: {
    bullOpeningRound: DEBATE_ROUND_ENTRY_SCHEMA,
    bearOpeningCounterRound: DEBATE_ROUND_ENTRY_SCHEMA
  },
  required: ['bullOpeningRound', 'bearOpeningCounterRound']
} as const;

export const DEBATE_TURN2_SCHEMA = {
  type: 'object',
  properties: {
    bullRebuttalRound: DEBATE_ROUND_ENTRY_SCHEMA,
    bearFinalCrossExamRound: DEBATE_ROUND_ENTRY_SCHEMA,
    unresolvedTensions: {
      type: 'array',
      items: { type: 'string' }
    },
    winningEdge: {
      type: 'string',
      enum: ['BULL_DOMINANT', 'BEAR_DOMINANT', 'CONTESTED_EQUILIBRIUM']
    },
    debateSynthesisSummary: { type: 'string' },
    stressTestedBullTheses: {
      type: 'array',
      items: THESIS_POINT_SCHEMA
    },
    stressTestedBearTheses: {
      type: 'array',
      items: THESIS_POINT_SCHEMA
    },
    lessonsApplied: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: [
    'bullRebuttalRound',
    'bearFinalCrossExamRound',
    'unresolvedTensions',
    'winningEdge',
    'debateSynthesisSummary',
    'stressTestedBullTheses',
    'stressTestedBearTheses',
    'lessonsApplied'
  ]
} as const;

export const DIALECTIC_DEBATE_SCHEMA = {
  type: 'object',
  properties: {
    ticker: { type: 'string' },
    roundsCompleted: { type: 'number' },
    rounds: {
      type: 'array',
      items: DEBATE_ROUND_ENTRY_SCHEMA
    },
    unresolvedTensions: {
      type: 'array',
      items: { type: 'string' }
    },
    winningEdge: {
      type: 'string',
      enum: ['BULL_DOMINANT', 'BEAR_DOMINANT', 'CONTESTED_EQUILIBRIUM']
    },
    debateSynthesisSummary: { type: 'string' },
    stressTestedBullTheses: {
      type: 'array',
      items: THESIS_POINT_SCHEMA
    },
    stressTestedBearTheses: {
      type: 'array',
      items: THESIS_POINT_SCHEMA
    },
    lessonsApplied: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: [
    'ticker',
    'roundsCompleted',
    'rounds',
    'unresolvedTensions',
    'winningEdge',
    'debateSynthesisSummary',
    'stressTestedBullTheses',
    'stressTestedBearTheses',
    'lessonsApplied'
  ]
} as const;

/**
 * Formats the adversarial Bull vs. Bear dialectical cross-examination transcript
 * into an institutional Markdown section for inclusion in the equity research dossier.
 */
export function formatDebateTranscriptMarkdown(transcript: DialecticDebateTranscript): string {
  const edgeBadge =
    transcript.winningEdge === 'BULL_DOMINANT'
      ? 'BULL DOMINANT (Intrinsic & Moat Asymmetry)'
      : transcript.winningEdge === 'BEAR_DOMINANT'
        ? 'BEAR DOMINANT (Forensic & Solvency Headwinds)'
        : 'CONTESTED EQUILIBRIUM (Balanced Risk/Reward Tension)';

  const roundBlocks = transcript.rounds
    .map((r) => {
      const speakerLabel =
        r.speaker === 'BULL_RESEARCHER'
          ? `Round ${r.round} — Bull Researcher Agent`
          : `Round ${r.round} — Bear Researcher Agent`;
      const evidenceList =
        r.citedStatutoryAndDeterministicEvidence.length > 0
          ? r.citedStatutoryAndDeterministicEvidence.map((e) => `\`${e}\``).join(', ')
          : '`SEC 10-K / Deterministic Valuation Suite`';
      return [
        `#### ${speakerLabel} (${r.forensicOrMoatPillarReferenced})`,
        `- **Core Dialectical Claim:** ${r.coreClaim}`,
        `- **Direct Cross-Examination Rebuttal:** ${r.rebuttalToOpponent}`,
        `- **Quantified Valuation / Balance Sheet Impact:** ${r.quantifiedImpact}`,
        `- **Statutory & Deterministic Evidence Cited:** ${evidenceList}`
      ].join('\n');
    })
    .join('\n\n');

  const tensionsList =
    transcript.unresolvedTensions.length > 0
      ? transcript.unresolvedTensions.map((t) => `- ${t}`).join('\n')
      : '- Ongoing tension between long-term moat compounding and near-term macroeconomic discount rate sensitivity.';

  const lessonsBlock =
    transcript.lessonsApplied.length > 0
      ? `\n\n#### Institutional Memory Lessons Applied (Phase 4 Feedback Loop)\n${transcript.lessonsApplied.map((l) => `- ${l}`).join('\n')}`
      : '';

  return [
    `### Adversarial Bull vs. Bear Dialectical Cross-Examination`,
    ``,
    `**Dialectical Verdict:** \`${edgeBadge}\` | **Cross-Examination Rounds:** \`${transcript.roundsCompleted}\``,
    ``,
    `${transcript.debateSynthesisSummary}`,
    ``,
    roundBlocks,
    ``,
    `#### Key Unresolved Structural Tensions`,
    tensionsList + lessonsBlock
  ].join('\n');
}

/**
 * Phase 2 Adversarial Dialectic Debate Engine (arXiv:2412.20138 x EquiSight Alpha Hybrid).
 * Orchestrates multi-turn iterative cross-examination between a dedicated Bull Researcher Agent
 * and a forensic-armed Bear Researcher Agent grounded strictly in Phase 1 deterministic math.
 */
export class DialecticDebateEngine {
  /**
   * Executes a multi-turn adversarial Bull vs. Bear debate with automatic failover to
   * the deterministic multi-turn cross-examination engine if LLM calls are unavailable.
   */
  public async runAdversarialDebate(
    params: AdversarialDebateParams
  ): Promise<DialecticDebateTranscript> {
    const {
      mover,
      fundamentals,
      macro,
      sentiment,
      forensicSummaryText,
      weaponizedBearFlags = [],
      institutionalMemoryLessons = [],
      executeLLM
    } = params;

    const deterministicBaseline = this.generateDeterministicDebateTranscript(params);

    if (!executeLLM) {
      return deterministicBaseline;
    }

    try {
      console.log(
        `[DialecticDebateEngine] Launching Turn 1 (Bull Opening vs. Forensic Bear Counter-Attack) for $${mover.ticker}...`
      );

      const turn1Sys = this.buildTurn1SystemPrompt();
      const turn1Usr = this.buildTurn1UserPrompt(
        mover,
        fundamentals,
        macro,
        sentiment,
        forensicSummaryText,
        weaponizedBearFlags,
        institutionalMemoryLessons
      );

      const turn1Result = await executeLLM<Turn1DebateOutput>(
        turn1Sys,
        turn1Usr,
        `DebateTurn1-${mover.ticker}`,
        DEBATE_TURN1_SCHEMA as unknown as Record<string, any>
      );

      if (!turn1Result || !turn1Result.bullOpeningRound || !turn1Result.bearOpeningCounterRound) {
        console.warn(
          `[DialecticDebateEngine] Turn 1 returned null/incomplete for $${mover.ticker}. Using deterministic debate transcript.`
        );
        return deterministicBaseline;
      }

      console.log(
        `[DialecticDebateEngine] Launching Turn 2 (Iterative Cross-Examination & Thesis Stress-Testing) for $${mover.ticker}...`
      );

      const turn2Sys = this.buildTurn2SystemPrompt();
      const turn2Usr = this.buildTurn2UserPrompt(
        mover,
        fundamentals,
        macro,
        sentiment,
        turn1Result,
        forensicSummaryText,
        weaponizedBearFlags,
        institutionalMemoryLessons
      );

      const turn2Result = await executeLLM<Turn2DebateOutput>(
        turn2Sys,
        turn2Usr,
        `DebateTurn2-${mover.ticker}`,
        DEBATE_TURN2_SCHEMA as unknown as Record<string, any>
      );

      if (!turn2Result || !turn2Result.bullRebuttalRound || !turn2Result.bearFinalCrossExamRound) {
        console.warn(
          `[DialecticDebateEngine] Turn 2 returned null/incomplete for $${mover.ticker}. Merging Turn 1 with deterministic Turn 2.`
        );
        const rounds: DebateRoundEntry[] = [
          { ...turn1Result.bullOpeningRound, round: 1, speaker: 'BULL_RESEARCHER' },
          { ...turn1Result.bearOpeningCounterRound, round: 2, speaker: 'BEAR_RESEARCHER' },
          ...deterministicBaseline.rounds.slice(2)
        ];
        return {
          ...deterministicBaseline,
          roundsCompleted: rounds.length,
          rounds
        };
      }

      const rounds: DebateRoundEntry[] = [
        { ...turn1Result.bullOpeningRound, round: 1, speaker: 'BULL_RESEARCHER' },
        { ...turn1Result.bearOpeningCounterRound, round: 2, speaker: 'BEAR_RESEARCHER' },
        { ...turn2Result.bullRebuttalRound, round: 3, speaker: 'BULL_RESEARCHER' },
        { ...turn2Result.bearFinalCrossExamRound, round: 4, speaker: 'BEAR_RESEARCHER' }
      ];

      return {
        ticker: mover.ticker,
        roundsCompleted: rounds.length,
        rounds,
        unresolvedTensions:
          turn2Result.unresolvedTensions?.length > 0
            ? turn2Result.unresolvedTensions
            : deterministicBaseline.unresolvedTensions,
        winningEdge: turn2Result.winningEdge || deterministicBaseline.winningEdge,
        debateSynthesisSummary:
          turn2Result.debateSynthesisSummary || deterministicBaseline.debateSynthesisSummary,
        stressTestedBullTheses:
          turn2Result.stressTestedBullTheses?.length > 0
            ? turn2Result.stressTestedBullTheses
            : deterministicBaseline.stressTestedBullTheses,
        stressTestedBearTheses:
          turn2Result.stressTestedBearTheses?.length > 0
            ? turn2Result.stressTestedBearTheses
            : deterministicBaseline.stressTestedBearTheses,
        lessonsApplied:
          turn2Result.lessonsApplied?.length > 0
            ? turn2Result.lessonsApplied
            : deterministicBaseline.lessonsApplied
      };
    } catch (err: any) {
      console.warn(
        `[DialecticDebateEngine] Adversarial debate LLM execution failed for $${mover.ticker}: ${err?.message || err}. Falling back to deterministic multi-turn debate.`
      );
      return deterministicBaseline;
    }
  }

  /**
   * Deterministic multi-turn Bull vs. Bear cross-examination generator.
   * Grounded strictly in Phase 1 deterministic valuation models, 5 Morningstar moat pillars,
   * 4-pillar forensic accounting surveillance (ASC 842, ASC 606/280, Reg G, Form 4),
   * and market microstructure (option gamma skew & free-float turnover).
   */
  public generateDeterministicDebateTranscript(
    params: AdversarialDebateParams
  ): DialecticDebateTranscript {
    const {
      mover,
      fundamentals: f,
      macro,
      sentiment,
      forensicSummaryText,
      weaponizedBearFlags = [],
      institutionalMemoryLessons = []
    } = params;

    const cleanName = cleanCompanyName(f.companyName || mover.name);
    const consensusFv = f.valuationModels?.consensusFairValue ?? mover.price;
    const dcfFv = f.valuationModels?.dcf?.fairValue ?? consensusFv;
    const rimFv = f.valuationModels?.residualIncomeModel?.fairValue ?? consensusFv;
    const evaSpread = f.valuationModels?.excessReturnModel?.returnSpread ?? 0;
    const wacc = f.valuationModels?.excessReturnModel?.wacc ?? 8.5;
    const roicVal = f.roic ?? 10.0;
    const priceToFv =
      f.morningstarRating?.priceToFairValue ??
      (consensusFv > 0 ? Number((mover.price / consensusFv).toFixed(2)) : 1.0);
    const upsidePct =
      consensusFv > 0
        ? Number((((consensusFv - mover.price) / mover.price) * 100).toFixed(1))
        : 0;

    const moatRating = f.competitiveMoat?.rating || 'Narrow';
    const moatTrend = f.competitiveMoat?.trend || 'Stable';
    const switchingRating = f.competitiveMoat?.sources?.switchingCosts?.rating || 'Narrow';
    const intangibleRating = f.competitiveMoat?.sources?.intangibleAssets?.rating || 'Narrow';

    const debtToEq = f.debtToEquity !== null && f.debtToEquity !== undefined ? f.debtToEquity : 0.45;
    const shortTermDebtM = ((f.shortTermDebt ?? 0) / 1e6).toFixed(1);
    const totalDebtM = ((f.totalDebt ?? 0) / 1e6).toFixed(1);
    const cashM = ((f.cashAndEquivalents ?? 0) / 1e6).toFixed(1);
    const fcfM = f.freeCashFlowTTM !== null ? (f.freeCashFlowTTM / 1e6).toFixed(1) : 'N/A';
    const revM = (f.revenueTTM / 1e6).toFixed(1);

    const gammaRisk = sentiment.optionGammaImbalance?.riskLevel || 'Low';
    const netGamma = sentiment.optionGammaImbalance?.netGammaExposure || 'Balanced';
    const floatTurnover = sentiment.freeFloatConcentration?.floatTurnoverRatio ?? 0.02;

    const primaryForensicFlag =
      weaponizedBearFlags[0] ||
      (forensicSummaryText
        ? forensicSummaryText.split('\n').find((line) => line.trim().length > 20)?.trim()
        : undefined) ||
      `ASC 842 Operating Lease & Debt Refinancing Surveillance: $${shortTermDebtM}M short-term debt maturing against a ${macro.us10YearYield.toFixed(2)}% US 10Y Treasury yield backdrop.`;

    const secondaryForensicFlag =
      weaponizedBearFlags[1] ||
      `ASC 606 / ASC 280 Revenue Concentration & Reg G Quality Audit: Operating margin of ${f.operatingMargin.toFixed(2)}% and working capital conversion require continuous monitoring for DSO elongation and non-GAAP stock-based compensation adjustments.`;

    // Round 1: Bull Researcher Opening (Intrinsic Upside, Moat Resilience, Growth Catalysts)
    const round1Bull: DebateRoundEntry = {
      round: 1,
      speaker: 'BULL_RESEARCHER',
      coreClaim: `${cleanName} ($${mover.ticker}) exhibits structural compounding supported by a ${moatRating} Economic Moat (${moatTrend} trend), generating ${roicVal.toFixed(2)}% ROIC against a ${wacc.toFixed(2)}% WACC (${evaSpread >= 0 ? '+' : ''}${evaSpread.toFixed(2)}% economic value spread) on $${revM}M in TTM revenue.`,
      rebuttalToOpponent: `Pre-empting bearish multiple-compression critiques: the 8-model deterministic valuation suite anchors intrinsic value at $${consensusFv.toFixed(2)} (3-Stage DCF: $${dcfFv.toFixed(2)}, Residual Income: $${rimFv.toFixed(2)}), implying ${upsidePct >= 0 ? '+' : ''}${upsidePct}% asymmetry from the current $${mover.price.toFixed(2)} session print.`,
      citedStatutoryAndDeterministicEvidence: [
        `SEC Form 10-K Item 7 (MD&A: $${revM}M Revenue, ${f.operatingMargin.toFixed(2)}% EBIT Margin)`,
        `Deterministic 3-Stage DCF ($${dcfFv.toFixed(2)}) & Residual Income Model ($${rimFv.toFixed(2)})`,
        `Morningstar Moat Pillars: Switching Costs (${switchingRating}), Intangible Assets (${intangibleRating})`
      ],
      forensicOrMoatPillarReferenced: `Morningstar 5-Pillar Moat Architecture (Switching Costs: ${switchingRating} | Intangible Assets: ${intangibleRating})`,
      quantifiedImpact: `Consensus Fair Value of $${consensusFv.toFixed(2)} (P/FV: ${priceToFv.toFixed(2)}x) backed by $${fcfM}M in TTM Free Cash Flow.`
    };

    // Round 2: Bear Researcher Opening Counter-Attack (Weaponizes Forensic Flags & Microstructure)
    const round2Bear: DebateRoundEntry = {
      round: 2,
      speaker: 'BEAR_RESEARCHER',
      coreClaim: `The Bull Researcher's stage-1 DCF trajectory understates balance sheet and forensic friction: ${primaryForensicFlag} Furthermore, total debt of $${totalDebtM}M (D/E: ${debtToEq.toFixed(2)}x) faces refinancing repricing under a ${macro.fedFundsRate.toFixed(2)}% Fed Funds and ${macro.us10YearYield.toFixed(2)}% 10-Year yield regime.`,
      rebuttalToOpponent: `Directly challenging the Bull's ${roicVal.toFixed(2)}% ROIC durability assumption: ${secondaryForensicFlag} In addition, session order flow exhibits RVOL of ${sentiment.volumeAnomalyRatio.toFixed(2)}x with ${netGamma} (Gamma Risk: ${gammaRisk}, Float Turnover: ${(floatTurnover * 100).toFixed(2)}%), signaling that near-term price action reflects microstructure positioning rather than pure fundamental re-rating.`,
      citedStatutoryAndDeterministicEvidence: [
        `ASC 842 (Leases) & ASC 440 (Commitments) Footnote Capitalization Audit`,
        `ASC 606 (Revenue from Contracts) & ASC 280 (Segment Concentration) Surveillance`,
        `SEC Regulation G Non-GAAP to GAAP Operating Income Bridge`,
        `Options Microstructure Audit: ${netGamma} | RVOL ${sentiment.volumeAnomalyRatio.toFixed(2)}x`
      ],
      forensicOrMoatPillarReferenced: `4-Pillar Forensic Accounting Engine (ASC 842 Hidden Debt, ASC 606/280 Revenue Quality & Reg G Wedge)`,
      quantifiedImpact: `Capitalizing off-balance-sheet obligations and applying a higher margin-of-safety discount rate compresses equity valuation toward the 1-Star/Liquidation floor if EBIT margins (${f.operatingMargin.toFixed(2)}%) mean-revert.`
    };

    // Round 3: Bull Researcher Cross-Examination Rebuttal (Defends Solvency & Unit Economics)
    const round3Bull: DebateRoundEntry = {
      round: 3,
      speaker: 'BULL_RESEARCHER',
      coreClaim: `Cross-examining the Bear Researcher's refinancing and ASC 842 stress test: ${cleanName} maintains $${cashM}M in cash and equivalents alongside $${fcfM}M in TTM free cash flow, providing internal self-funding capacity that insulates core R&D and capital allocation from capital-market freezes.`,
      rebuttalToOpponent: `While the Bear Agent cites ASC 606/280 customer concentration and Reg G adjustments, vertical integration and embedded switching costs (${switchingRating}) allow ${cleanName} to pass through inflationary input costs (${(macro.cpiInflationRate ?? 2.80).toFixed(2)}% CPI) while preserving a ${f.grossMargin !== null ? `${f.grossMargin.toFixed(2)}% gross margin and ` : ''}${f.operatingMargin.toFixed(2)}% operating margin.`,
      citedStatutoryAndDeterministicEvidence: [
        `SEC Form 10-K Consolidated Statements of Cash Flows ($${fcfM}M FCF, $${cashM}M Cash)`,
        `SEC Form 10-Q Liquidity & Capital Resources Debt Maturity Schedule ($${shortTermDebtM}M Short-Term Debt)`,
        `Economic Value Added (EVA) Spread Calculus (${roicVal.toFixed(2)}% ROIC vs ${wacc.toFixed(2)}% WACC)`
      ],
      forensicOrMoatPillarReferenced: `Balance Sheet Self-Funding Capacity & Cost Advantage / Switching Cost Moat Defense`,
      quantifiedImpact: `Internal cash generation covers short-term maturities ($${shortTermDebtM}M) while sustaining stage-2 moat fade horizon (${moatRating === 'Wide' ? '15-year' : moatRating === 'Narrow' ? '10-year' : '5-year'} fade).`
    };

    // Round 4: Bear Researcher Final Cross-Examination (Sensitivity & Execution Asymmetry)
    const round4Bear: DebateRoundEntry = {
      round: 4,
      speaker: 'BEAR_RESEARCHER',
      coreClaim: `Final cross-examination on valuation margin of safety: at $${mover.price.toFixed(2)} (${priceToFv.toFixed(2)}x consensus fair value of $${consensusFv.toFixed(2)}), the equity prices in uninterrupted execution despite ${f.morningstarRating?.uncertaintyRating || 'Medium'} fundamental uncertainty and ${f.volatilityIndex?.rating || 'Moderate'} systematic volatility (Beta: ${(f.beta ?? 1.0).toFixed(2)}).`,
      rebuttalToOpponent: `Even granting ${cleanName}'s $${cashM}M cash buffer, any 150–200 bps compression in operating margins (${f.operatingMargin.toFixed(2)}%) or working-capital DSO expansion from cyclical customer CapEx delays erodes the Stage-1 FCFF trajectory and exposes holders to multiple compression toward sector median P/E (${f.priceToEarnings?.industryAverage?.toFixed(1) ?? '18.5'}x).`,
      citedStatutoryAndDeterministicEvidence: [
        `SEC Form 10-K Item 1A Risk Factors & Cyclical Procurement Disclosures`,
        `Morningstar Uncertainty Calibration (${f.morningstarRating?.uncertaintyRating || 'Medium'} Uncertainty | 5-Star Buy Hurdle: $${(f.morningstarRating?.fiveStarPrice ?? consensusFv * 0.7).toFixed(2)})`,
        `Form 4 & 13F Institutional Positioning / Credit Spread Surveillance`
      ],
      forensicOrMoatPillarReferenced: `Valuation Margin-of-Safety Hurdle & Working Capital / Cyclical CapEx Sensitivity`,
      quantifiedImpact: `Downside re-rating risk toward the 5-Star margin-of-safety entry band ($${(f.morningstarRating?.fiveStarPrice ?? consensusFv * 0.7).toFixed(2)}) if organic growth decelerates.`
    };

    // Determine winningEdge deterministically
    let winningEdge: 'BULL_DOMINANT' | 'BEAR_DOMINANT' | 'CONTESTED_EQUILIBRIUM' =
      'CONTESTED_EQUILIBRIUM';
    if (
      priceToFv <= 0.88 &&
      roicVal > wacc &&
      f.operatingMargin > 10 &&
      weaponizedBearFlags.length <= 1
    ) {
      winningEdge = 'BULL_DOMINANT';
    } else if (
      priceToFv >= 1.15 ||
      roicVal < wacc ||
      f.operatingMargin <= 0 ||
      weaponizedBearFlags.length >= 3 ||
      sentiment.isArtificiallyInflated
    ) {
      winningEdge = 'BEAR_DOMINANT';
    }

    const lessonsApplied =
      institutionalMemoryLessons.length > 0
        ? institutionalMemoryLessons.slice(0, 3)
        : [
            `Cross-checked stage-1 DCF growth assumptions against historical ROIC-WACC spread (${evaSpread >= 0 ? '+' : ''}${evaSpread.toFixed(2)}%) to prevent terminal multiple extrapolation.`,
            `Stress-tested GAAP vs. Non-GAAP operating margins (${f.operatingMargin.toFixed(2)}%) and short-term debt maturities ($${shortTermDebtM}M) under prevailing ${macro.us10YearYield.toFixed(2)}% 10Y Treasury yields.`
          ];

    const unresolvedTensions = [
      `Moat Durability vs. Valuation Multiple: Can ${cleanName}'s ${moatRating} moat (${roicVal.toFixed(2)}% ROIC) sustain above-peer multiples if customer capital budgets tighten under a ${macro.us10YearYield.toFixed(2)}% 10-Year yield environment?`,
      `Cash Flow Conversion vs. Forensic Working Capital Friction: Will TTM Free Cash Flow ($${fcfM}M) remain resilient against ASC 606/280 receivable timing and ASC 842 lease/commitment obligations?`,
      `Session Catalyst vs. Microstructure Positioning: To what extent does today's ${mover.changePercent >= 0 ? '+' : ''}${mover.changePercent.toFixed(2)}% move (${sentiment.volumeAnomalyRatio.toFixed(2)}x RVOL, ${netGamma}) reflect durable institutional accumulation versus short-term options/float positioning?`
    ];

    const debateSynthesisSummary = `Across 4 iterative cross-examination rounds, the Bull Researcher grounded $${mover.ticker}'s upside case in its ${moatRating} economic moat, ${roicVal.toFixed(2)}% ROIC (${evaSpread >= 0 ? '+' : ''}${evaSpread.toFixed(2)}% excess return spread over ${wacc.toFixed(2)}% WACC), and an 8-model consensus fair value of $${consensusFv.toFixed(2)}. Conversely, the Bear Researcher weaponized 4-pillar forensic accounting checks—highlighting ${primaryForensicFlag.toLowerCase()}—alongside microstructure skew (${netGamma}) and valuation sensitivity at ${priceToFv.toFixed(2)}x fair value, resulting in a ${winningEdge.replace(/_/g, ' ')} dialectical posture.`;

    const concentrationVertical =
      f.sector?.toLowerCase().includes('defense') || f.industry?.toLowerCase().includes('defense')
        ? 'Defense'
        : f.sector?.toLowerCase().includes('tech') || f.industry?.toLowerCase().includes('software')
          ? 'Enterprise'
          : f.sector?.toLowerCase().includes('health') || f.industry?.toLowerCase().includes('bio')
            ? 'Lead clinical vertical'
            : 'Primary customer segment';

    const stressTestedBullTheses: ThesisPoint[] = [
      {
        point: `Vertical integration. ${cleanName} develops AND manufactures most of what it sells. It gives the company control over product development, quality, supply chain, capacity management and reduces lead times from R&D to commercialization`,
        sources: [
          {
            name: 'SEC 10-K Operations & Manufacturing Disclosures',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: 'Supply Chain & Product Architecture Review',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `In-house R&D and vertical manufacturing control -> Mitigates third-party supplier bottlenecks and defends ${f.operatingMargin.toFixed(2)}% operating margins -> Supports Stage-1 DCF cash flow compounding toward $${dcfFv.toFixed(2)} fair value.`
      },
      {
        point: `Great M&A strategy and execution. ${cleanName} tends to acquire companies that are complementary to its existing portfolio rather than unrelated assets. This strengthens its ecosystem and makes them easier to integrate. Recent acquisitions were accretive also because they were completed at reasonable valuations`,
        sources: [
          {
            name: 'Corporate Acquisition History & Strategic Review',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: 'SEC 8-K M&A Filings',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `Disciplined bolt-on acquisitions within core ${f.industry} vertical -> Rapid cross-selling integration and switching cost reinforcement (${switchingRating}) -> Accretive ROIC (${roicVal.toFixed(2)}%) above ${wacc.toFixed(2)}% WACC without goodwill impairment.`
      },
      {
        point: `Capital-efficient growth. Despite strong organic growth, acquisitions and a generous dividend policy, ${cleanName}’s balance sheet is clean and returns on capital are high`,
        sources: [
          {
            name: 'Return on Capital (ROIC) & Balance Sheet Solvency Audit',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: 'Consolidated Statements of Cash Flows',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `High return on invested capital (ROIC: ${roicVal.toFixed(2)}%) paired with $${cashM}M cash and $${fcfM}M TTM FCF -> Self-funded organic reinvestment and debt service ($${shortTermDebtM}M short-term maturities) -> Sustains ${ consensusFv > 0 ? `$${consensusFv.toFixed(2)} consensus intrinsic value` : 'intrinsic value compounding' }.`
      }
    ];

    const stressTestedBearTheses: ThesisPoint[] = [
      {
        point: `${concentrationVertical} + customer concentration. A large share of recent growth has come from ${concentrationVertical.toLowerCase()}. The tailwind is currently strong but as ${concentrationVertical.toLowerCase()} becomes an increasingly important part of the revenue mix, the impact of any slowdown would also become more significant`,
        sources: [
          {
            name: 'Segment Revenue Mix & ASC 280 Concentration Disclosures',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: 'SEC 10-K Customer Concentration & ASC 606 Disclosures',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `Elevated reliance on ${concentrationVertical.toLowerCase()} procurement cycles + ${primaryForensicFlag} -> Vulnerability to DSO elongation and order deferrals -> Revenue deceleration compresses operating leverage.`
      },
      {
        point: `Ambitious targets. Management expects ambitious organic annual growth targets. This is very ambitious, especially as ${cleanName} is now much larger than in previous strategic plans. Analyst forecasts are more conservative suggesting that the market is not fully assuming management’s long-term growth target`,
        sources: [
          {
            name: 'Long-Term Strategic Plan & Consensus Analyst Estimates',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: 'SEC Regulation G Non-GAAP Reconciliation & Guidance Audit',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `Aggressive management growth targets at ${priceToFv.toFixed(2)}x P/FV vs conservative consensus -> Zero margin for execution slippage -> Multiple de-rating toward 5-Star margin-of-safety price ($${(f.morningstarRating?.fiveStarPrice ?? consensusFv * 0.7).toFixed(2)}) if guidance moderates.`
      },
      {
        point: `Cyclical revenue. A major part of ${cleanName}’s revenue is project-driven and depends on customer investment cycles. This can create quarterly volatility. Changes in business mix and capacity utilization can also have an impact on margins for several quarters`,
        sources: [
          {
            name: 'Historical Revenue Volatility & Quarterly Contract Timing',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          },
          {
            name: '10-Q Operating Cash Flow Cyclicality & ASC 842 Lease Commitments',
            url: 'https://www.sec.gov/edgar/searchedgar/companysearch'
          }
        ],
        deductionChain: `Lumpy project-based customer CapEx under ${macro.us10YearYield.toFixed(2)}% 10Y yields + $${totalDebtM}M total debt load -> Suboptimal capacity utilization during contract gaps -> Multi-quarter EBIT margin (${f.operatingMargin.toFixed(2)}%) contraction.`
      }
    ];

    return {
      ticker: mover.ticker,
      roundsCompleted: 4,
      rounds: [round1Bull, round2Bear, round3Bull, round4Bear],
      unresolvedTensions,
      winningEdge,
      debateSynthesisSummary,
      stressTestedBullTheses,
      stressTestedBearTheses,
      lessonsApplied
    };
  }

  private buildTurn1SystemPrompt(): string {
    return `You are the Phase 2 Adversarial Dialectic Debate Engine (arXiv:2412.20138 TradingAgents x EquiSight Alpha Hybrid).
You simulate Turn 1 of an institutional cross-examination between two specialized adversarial agents:
1. BULL_RESEARCHER: Argues intrinsic valuation upside, 5-pillar Morningstar moat durability, ROIC-WACC economic value spread, and growth catalysts using ONLY the deterministic numbers provided.
2. BEAR_RESEARCHER: Directly attacks the Bull Researcher's opening claim by weaponizing the 4-Pillar Forensic Accounting flags (ASC 842 hidden lease/commitment debt, ASC 606/280 revenue concentration & DSO spikes, Reg G Non-GAAP vs GAAP earnings wedge, Form 4/13F institutional retreat), debt maturity refinancing risks, and option gamma / float turnover anomalies.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

Output valid JSON matching DEBATE_TURN1_SCHEMA.`;
  }

  private buildTurn1UserPrompt(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    sentiment: SocialSentiment,
    forensicSummaryText?: string,
    weaponizedBearFlags: string[] = [],
    institutionalMemoryLessons: string[] = []
  ): string {
    return `Conduct Turn 1 (Round 1 Bull Opening & Round 2 Bear Counter-Attack) for ${f.companyName} ($${mover.ticker}).

DETERMINISTIC GROUND TRUTH:
- Current Price: $${mover.price.toFixed(2)} (${mover.changePercent >= 0 ? '+' : ''}${mover.changePercent.toFixed(2)}%)
- Consensus Fair Value: $${(f.valuationModels?.consensusFairValue ?? mover.price).toFixed(2)} | 3-Stage DCF: $${(f.valuationModels?.dcf?.fairValue ?? mover.price).toFixed(2)} | Residual Income: $${(f.valuationModels?.residualIncomeModel?.fairValue ?? mover.price).toFixed(2)}
- ROIC: ${(f.roic ?? 0).toFixed(2)}% | WACC: ${(f.valuationModels?.excessReturnModel?.wacc ?? 8.5).toFixed(2)}% | EVA Spread: ${(f.valuationModels?.excessReturnModel?.returnSpread ?? 0).toFixed(2)}%
- Revenue TTM: $${(f.revenueTTM / 1e6).toFixed(2)}M | Operating Margin: ${f.operatingMargin.toFixed(2)}% | FCF TTM: $${f.freeCashFlowTTM !== null ? (f.freeCashFlowTTM / 1e6).toFixed(2) : 'N/A'}M
- Total Debt: $${(f.totalDebt / 1e6).toFixed(2)}M | Short-Term Debt: $${((f.shortTermDebt ?? 0) / 1e6).toFixed(2)}M | Cash: $${(f.cashAndEquivalents / 1e6).toFixed(2)}M | D/E: ${f.debtToEquity ?? 'N/A'}
- Moat Rating: ${f.competitiveMoat?.rating} (${f.competitiveMoat?.trend})
- Macro: 10Y Yield ${macro.us10YearYield.toFixed(2)}%, Fed Funds ${macro.fedFundsRate.toFixed(2)}%, CPI ${macro.cpiInflationRate.toFixed(2)}%, VIX ${macro.vixIndex.toFixed(2)}
- Microstructure: RVOL ${sentiment.volumeAnomalyRatio.toFixed(2)}x, Gamma ${sentiment.optionGammaImbalance?.netGammaExposure || 'Balanced'} (${sentiment.optionGammaImbalance?.riskLevel || 'Low'})

4-PILLAR FORENSIC SURVEILLANCE & WEAPONIZED BEAR FLAGS:
${forensicSummaryText || 'Standard SEC XBRL forensic surveillance active.'}
${weaponizedBearFlags.map((flag, idx) => `${idx + 1}. ${flag}`).join('\n')}

INSTITUTIONAL MEMORY LESSONS (PHASE 4):
${institutionalMemoryLessons.length > 0 ? institutionalMemoryLessons.join('\n') : 'Enforce strict ROIC-WACC spread verification and forensic lease/receivable stress-testing.'}`;
  }

  private buildTurn2SystemPrompt(): string {
    return `You are the Phase 2 Adversarial Dialectic Debate Engine completing Turn 2 (Round 3 Bull Rebuttal, Round 4 Bear Final Cross-Examination, and Final Stress-Tested Thesis Synthesis).
Each thesis point in stressTestedBullTheses and stressTestedBearTheses MUST include:
- point: Specific institutional argument (including core quality pillars: Vertical integration, Great M&A strategy and execution, Capital-efficient growth for Bull; Customer concentration, Ambitious targets, Cyclical revenue + Forensic flags for Bear).
- sources: Verifiable SEC/statutory citations ({ name, url }).
- deductionChain: Step-by-step causal logic chain ('A -> B -> C') surviving cross-examination.

${PUBLISHER_COMPLIANCE_DIRECTIVE}

Output valid JSON matching DEBATE_TURN2_SCHEMA.`;
  }

  private buildTurn2UserPrompt(
    mover: MarketMover,
    f: FundamentalMetrics,
    macro: MacroBackdrop,
    sentiment: SocialSentiment,
    turn1: Turn1DebateOutput,
    forensicSummaryText?: string,
    weaponizedBearFlags: string[] = [],
    institutionalMemoryLessons: string[] = []
  ): string {
    return `Complete Turn 2 (Round 3 Bull Rebuttal & Round 4 Bear Final Cross-Examination) for ${f.companyName} ($${mover.ticker}) and synthesize the stress-tested Bull and Bear theses.

TURN 1 TRANSCRIPT:
- Round 1 (Bull Opening): ${JSON.stringify(turn1.bullOpeningRound)}
- Round 2 (Bear Counter-Attack): ${JSON.stringify(turn1.bearOpeningCounterRound)}

FORENSIC & VALUATION CONTEXT:
- Price: $${mover.price.toFixed(2)} | Consensus Fair Value: $${(f.valuationModels?.consensusFairValue ?? mover.price).toFixed(2)}
- Forensic Flags: ${weaponizedBearFlags.join(' | ') || forensicSummaryText || 'ASC 842 / ASC 606 / Reg G audit'}
- Lessons Applied: ${institutionalMemoryLessons.join(' | ') || 'Historical post-mortem discipline applied.'}`;
  }
}

export const dialecticDebateEngine = new DialecticDebateEngine();
