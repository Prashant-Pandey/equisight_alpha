import type {
  MarketMover,
  FundamentalMetrics,
  MacroBackdrop,
  SocialSentiment,
  UncertaintyRating
} from '../types.js';

export type RiskGovernanceStatus =
  | 'APPROVED_HIGH_CONVICTION'
  | 'APPROVED_WITH_HEDGING_CONSTRAINTS'
  | 'CAUTION_ELEVATED_UNCERTAINTY'
  | 'VETOED_FORENSIC_OR_SOLVENCY_BREACH';

export interface RiskProfileEnvelope {
  profile: 'Conservative' | 'Moderate' | 'Aggressive';
  stance: string;
  maxDrawdownTolerancePct: number;
  impliedDailyVaR95Pct: number;
  atrStopEnvelopePct: number;
  allocationCeilingPct: number;
  rationale: string;
}

export interface RiskGuardianAudit {
  ticker: string;
  governanceStatus: RiskGovernanceStatus;
  vetoTriggered: boolean;
  vetoReasons: string[];
  compositeRiskScore: number; // 1-10
  calibratedUncertaintyRating: UncertaintyRating;
  requiredMarginOfSafetyPct: number;
  actualDiscountToFairValuePct: number;
  marginOfSafetyPassed: boolean;
  forensicRiskContribution: string;
  microstructureSqueezeRisk: string;
  refinancingWallRisk: string;
  riskProfiles: {
    conservative: RiskProfileEnvelope;
    moderate: RiskProfileEnvelope;
    aggressive: RiskProfileEnvelope;
  };
  governanceConditions: string[];
  executiveGovernanceSummary: string;
}

export interface RiskGuardianAuditParams {
  mover: MarketMover;
  fundamentals: FundamentalMetrics;
  macro: MacroBackdrop;
  sentiment: SocialSentiment;
  forensicCompositeScore?: number;
  forensicSeverity?: string;
  forensicActiveAlertsCount?: number;
  debateWinningEdge?: 'BULL_DOMINANT' | 'BEAR_DOMINANT' | 'CONTESTED_EQUILIBRIUM';
  unresolvedDebateTensions?: string[];
  executeLLM?: <T>(
    sys: string,
    usr: string,
    label: string,
    schema: Record<string, any>
  ) => Promise<T | null>;
}

interface LLMRiskGovernanceEnrichment {
  executiveGovernanceSummary: string;
  governanceConditions: string[];
}

const RISK_GOVERNANCE_LLM_SCHEMA: Record<string, any> = {
  type: 'object',
  properties: {
    executiveGovernanceSummary: {
      type: 'string',
      description:
        'A concise 3-4 sentence institutional governance summary synthesizing the quantitative VaR/ATR envelope, Morningstar uncertainty hurdle calibration, forensic audit state, and Publisher Exemption compliance framing.'
    },
    governanceConditions: {
      type: 'array',
      items: { type: 'string' },
      description:
        '3 to 5 specific analytical risk guardrails, monitoring triggers, or balance-sheet covenant conditions framed strictly as impersonal research parameters.'
    }
  },
  required: ['executiveGovernanceSummary', 'governanceConditions'],
  additionalProperties: false
};

const UNCERTAINTY_MARGIN_OF_SAFETY_HURDLES: Record<UncertaintyRating, number> = {
  Low: 15.0,
  Medium: 25.0,
  High: 35.0,
  'Very High': 45.0,
  Extreme: 55.0
};

/**
 * Independent Risk Guardian & Uncertainty Calibration Engine (Phase 3).
 *
 * Separates thesis generation from an independent Risk Management & Governance
 * audit (inspired by arXiv:2412.20138 + Morningstar Uncertainty Calibration).
 * Evaluates Conservative, Moderate, and Aggressive risk envelopes, calibrates
 * uncertainty-adjusted margin-of-safety hurdles, and enforces institutional
 * veto gates when forensic or solvency breaches are detected.
 *
 * Framed strictly as impersonal analytical risk parameters under the Publisher's
 * Exemption (Section 202(a)(11)(D) / FINRA Rule 2210).
 */
export class RiskGuardianEngine {
  /**
   * Executes deterministic quantitative risk calibration and governance veto checks,
   * optionally enriching the executive summary and analytical conditions via LLM
   * with a 100% deterministic fallback.
   */
  public async auditAndCalibrateRisk(
    params: RiskGuardianAuditParams
  ): Promise<RiskGuardianAudit> {
    const {
      mover,
      fundamentals,
      macro,
      sentiment,
      forensicCompositeScore = 25,
      forensicSeverity = 'CLEAN',
      forensicActiveAlertsCount = 0,
      debateWinningEdge = 'CONTESTED_EQUILIBRIUM',
      unresolvedDebateTensions = [],
      executeLLM
    } = params;

    const ticker = mover.ticker.toUpperCase();
    const currentPrice = mover.price > 0 ? mover.price : 1;

    // 1. Quantitative Volatility, Daily 95% Parametric VaR, and ATR Stop Envelope
    const beta =
      fundamentals.beta !== null &&
      fundamentals.beta !== undefined &&
      !Number.isNaN(fundamentals.beta)
        ? Math.max(0.35, Math.min(3.5, Math.abs(fundamentals.beta)))
        : 1.15;

    const vix = macro.vixIndex > 0 ? macro.vixIndex : 18.5;
    const volIndexVal =
      fundamentals.volatilityIndex?.value && fundamentals.volatilityIndex.value > 0
        ? fundamentals.volatilityIndex.value
        : vix * beta;

    // Implied annualized volatility (%) combining idiosyncratic volatility index, beta*VIX, and session shock
    const sessionMoveAbs = Math.abs(mover.changePercent || 0);
    const annualizedVolPct = Math.max(
      14.0,
      Math.min(
        135.0,
        0.55 * volIndexVal + 0.35 * (vix * beta) + 0.1 * Math.min(80, sessionMoveAbs * 2.5)
      )
    );

    // Daily standard deviation = Annualized Vol / sqrt(252) (~15.8745)
    const dailySigmaPct = annualizedVolPct / 15.8745;
    // 95% one-tailed parametric daily VaR = 1.645 * dailySigma
    const impliedDailyVaR95Pct = Number(
      Math.max(1.2, Math.min(18.5, dailySigmaPct * 1.645)).toFixed(2)
    );

    // 14-day ATR proxy & 2.0x ATR analytical volatility stop envelope
    const estimatedDailyAtrPct = Math.max(
      1.1,
      dailySigmaPct * 1.25 + Math.min(4.5, sessionMoveAbs * 0.12)
    );
    const atrStopEnvelopePct = Number(
      Math.max(2.5, Math.min(28.0, estimatedDailyAtrPct * 2.0)).toFixed(2)
    );

    // 2. Refinancing Wall & Solvency Stress Evaluation
    const shortTermDebt = Math.max(0, fundamentals.shortTermDebt ?? 0);
    const totalDebt = Math.max(0, fundamentals.totalDebt ?? 0);
    const cash = Math.max(0, fundamentals.cashAndEquivalents ?? 0);
    const ocf = fundamentals.cashFlow?.operatingCashFlow ?? 0;
    const fcf = fundamentals.freeCashFlowTTM ?? fundamentals.cashFlow?.freeCashFlow ?? 0;
    const currentRatio = fundamentals.currentRatio ?? null;

    const liquidityPool = cash + Math.max(0, ocf);
    const shortTermDebtToLiquidityRatio =
      liquidityPool > 0
        ? shortTermDebt / liquidityPool
        : shortTermDebt > 0
          ? 9.99
          : 0;

    const severeRefinancingWall =
      shortTermDebt > 0 &&
      shortTermDebt > liquidityPool &&
      (fcf !== null && fcf < 0) &&
      (currentRatio === null || currentRatio < 1.05);

    const elevatedRefinancingWall =
      !severeRefinancingWall &&
      shortTermDebt > 0 &&
      (shortTermDebtToLiquidityRatio > 0.75 ||
        (currentRatio !== null && currentRatio < 1.15 && fundamentals.netDebt > 0));

    let refinancingWallRisk: string;
    if (severeRefinancingWall) {
      refinancingWallRisk = `CRITICAL REFINANCING WALL: Short-term debt ($${(shortTermDebt / 1e6).toFixed(1)}M) exceeds combined cash and operating cash flow ($${(liquidityPool / 1e6).toFixed(1)}M) alongside negative free cash flow ($${((fcf ?? 0) / 1e6).toFixed(1)}M) in a ${macro.us10YearYield.toFixed(2)}% 10Y Treasury yield environment.`;
    } else if (elevatedRefinancingWall) {
      refinancingWallRisk = `ELEVATED MATURITY CONCENTRATION: Near-term debt obligations ($${(shortTermDebt / 1e6).toFixed(1)}M vs. $${(cash / 1e6).toFixed(1)}M cash, coverage ratio ${shortTermDebtToLiquidityRatio.toFixed(2)}x) create rollover sensitivity at current ${macro.fedFundsRate.toFixed(2)}% policy rates.`;
    } else if (totalDebt === 0 || fundamentals.netDebt <= 0) {
      refinancingWallRisk = `FORTRESS LIQUIDITY: Net cash position (Cash $${(cash / 1e6).toFixed(1)}M vs. Total Debt $${(totalDebt / 1e6).toFixed(1)}M) insulates the balance sheet from near-term maturity wall pressure.`;
    } else {
      refinancingWallRisk = `MANAGEABLE MATURITY LADDER: Short-term debt ($${(shortTermDebt / 1e6).toFixed(1)}M) is covered by $${(liquidityPool / 1e6).toFixed(1)}M in cash plus operating cash flow (short-term debt/liquidity ratio ${shortTermDebtToLiquidityRatio.toFixed(2)}x).`;
    }

    // 3. Microstructure & Gamma Squeeze Risk Evaluation
    const gammaRisk = sentiment.optionGammaImbalance?.riskLevel ?? 'Low';
    const floatConc = sentiment.freeFloatConcentration?.concentrationLevel ?? 'Low';
    const volAnomaly = sentiment.volumeAnomalyRatio ?? 1.0;

    let microstructureSqueezeRisk: string;
    if (
      gammaRisk === 'Severe' ||
      gammaRisk === 'High' ||
      floatConc === 'Extreme' ||
      sentiment.artificialInflationRisk === 'Severe'
    ) {
      microstructureSqueezeRisk = `HIGH MICROSTRUCTURE FRAGILITY: Gamma imbalance risk is ${gammaRisk} (${sentiment.optionGammaImbalance?.netGammaExposure ?? 'Elevated Dealer Gamma Sensitivity'}) with ${floatConc} free-float concentration and ${volAnomaly.toFixed(2)}x volume anomaly. Elevated tail risk of non-fundamental air-pockets or forced covering.`;
    } else if (
      gammaRisk === 'Moderate' ||
      floatConc === 'High' ||
      sentiment.artificialInflationRisk === 'High' ||
      volAnomaly > 2.2
    ) {
      microstructureSqueezeRisk = `MODERATE ORDER-BOOK CONVEXITY: Session volume at ${volAnomaly.toFixed(2)}x 30-day average alongside ${gammaRisk} options gamma skew and ${floatConc} float concentration warrants wider execution bands.`;
    } else {
      microstructureSqueezeRisk = `NORMALIZED LIQUIDITY DEPTH: Options gamma exposure (${gammaRisk}) and free-float turnover (${volAnomaly.toFixed(2)}x volume ratio) indicate orderly two-way institutional liquidity.`;
    }

    // 4. Forensic Accounting Risk Contribution
    const normalizedForensicSeverity = (forensicSeverity || 'CLEAN').toUpperCase();
    const isForensicCritical =
      normalizedForensicSeverity === 'CRITICAL' || forensicCompositeScore >= 75;
    const isForensicElevated =
      !isForensicCritical &&
      (normalizedForensicSeverity === 'ELEVATED' ||
        normalizedForensicSeverity === 'HIGH' ||
        normalizedForensicSeverity === 'WARNING' ||
        forensicCompositeScore >= 50 ||
        forensicActiveAlertsCount >= 2);

    let forensicRiskContribution: string;
    if (isForensicCritical) {
      forensicRiskContribution = `CRITICAL FORENSIC RED FLAG (Score ${forensicCompositeScore}/100, Severity: ${normalizedForensicSeverity}, Active Alerts: ${forensicActiveAlertsCount}): Earnings quality or balance-sheet integrity signals breach institutional safety thresholds.`;
    } else if (isForensicElevated) {
      forensicRiskContribution = `ELEVATED FORENSIC WATCH (Score ${forensicCompositeScore}/100, Severity: ${normalizedForensicSeverity}, Active Alerts: ${forensicActiveAlertsCount}): Accrual divergence or working-capital stress requires upward uncertainty recalibration.`;
    } else {
      forensicRiskContribution = `CLEAN FORENSIC BASELINE (Score ${forensicCompositeScore}/100, Severity: ${normalizedForensicSeverity}, Active Alerts: ${forensicActiveAlertsCount}): Cash conversion and accrual metrics align with reported GAAP operating performance.`;
    }

    // 5. Morningstar Uncertainty Calibration & Margin-of-Safety Hurdle Gatekeeping
    const baseUncertainty: UncertaintyRating =
      fundamentals.morningstarRating?.uncertaintyRating ??
      fundamentals.uncertaintyRating ??
      (mover.isPennyStock
        ? 'Extreme'
        : annualizedVolPct > 55
          ? 'Very High'
          : annualizedVolPct > 38
            ? 'High'
            : annualizedVolPct > 24
              ? 'Medium'
              : 'Low');

    const uncertaintyLadder: UncertaintyRating[] = [
      'Low',
      'Medium',
      'High',
      'Very High',
      'Extreme'
    ];
    let uncertaintyIdx = Math.max(0, uncertaintyLadder.indexOf(baseUncertainty));

    // Escalate uncertainty rating if forensic alerts, refinancing walls, penny stock status, or unresolved Bear edge exist
    if (mover.isPennyStock) {
      uncertaintyIdx = Math.max(uncertaintyIdx, 4); // Extreme
    }
    if (isForensicCritical || severeRefinancingWall) {
      uncertaintyIdx = Math.min(4, Math.max(uncertaintyIdx + 2, 3)); // At least Very High / Extreme
    } else if (
      isForensicElevated ||
      elevatedRefinancingWall ||
      debateWinningEdge === 'BEAR_DOMINANT'
    ) {
      uncertaintyIdx = Math.min(4, uncertaintyIdx + 1);
    }

    const calibratedUncertaintyRating: UncertaintyRating =
      uncertaintyLadder[uncertaintyIdx];
    const requiredMarginOfSafetyPct =
      UNCERTAINTY_MARGIN_OF_SAFETY_HURDLES[calibratedUncertaintyRating];

    const consensusFairValue =
      fundamentals.valuationModels?.consensusFairValue ??
      fundamentals.morningstarRating?.fairValueEstimate ??
      fundamentals.valuationModels?.dcf?.fairValue ??
      currentPrice;

    // Positive discount means currentPrice < consensusFairValue (trading at a discount to fair value)
    const actualDiscountToFairValuePct =
      consensusFairValue && consensusFairValue > 0
        ? Number(
            (((consensusFairValue - currentPrice) / consensusFairValue) * 100).toFixed(2)
          )
        : 0;

    const marginOfSafetyPassed =
      actualDiscountToFairValuePct >= requiredMarginOfSafetyPct;

    // 6. Veto Triggers & Composite Risk Score (1-10)
    const vetoReasons: string[] = [];
    if (isForensicCritical) {
      vetoReasons.push(
        `Forensic Accounting Severity is ${normalizedForensicSeverity} (Composite Score ${forensicCompositeScore}/100 with ${forensicActiveAlertsCount} active alerts), breaching institutional earnings-quality covenants.`
      );
    }
    if (severeRefinancingWall) {
      vetoReasons.push(
        `Solvency & Refinancing Wall Breach: Short-term debt ($${(shortTermDebt / 1e6).toFixed(1)}M) exceeds cash + operating cash flow ($${(liquidityPool / 1e6).toFixed(1)}M) while free cash flow is negative ($${((fcf ?? 0) / 1e6).toFixed(1)}M).`
      );
    }
    if (mover.isPennyStock && (fcf !== null && fcf < 0) && fundamentals.netDebt > 0) {
      vetoReasons.push(
        `Micro-Cap / Penny Stock Capital Distress: Sub-$5 equity profile combined with negative free cash flow and net leverage poses extreme dilution risk.`
      );
    }

    const vetoTriggered = vetoReasons.length > 0;

    // Compute 1-10 Composite Risk Score
    let rawRiskScore = 2.0 + uncertaintyIdx * 1.35;
    if (isForensicCritical) rawRiskScore += 2.2;
    else if (isForensicElevated) rawRiskScore += 1.0;
    if (severeRefinancingWall) rawRiskScore += 1.8;
    else if (elevatedRefinancingWall) rawRiskScore += 0.8;
    if (!marginOfSafetyPassed && actualDiscountToFairValuePct < 0) rawRiskScore += 0.8;
    if (gammaRisk === 'Severe' || gammaRisk === 'High') rawRiskScore += 0.6;
    if (debateWinningEdge === 'BEAR_DOMINANT') rawRiskScore += 0.5;

    const compositeRiskScore = Math.max(
      1,
      Math.min(10, Math.round(rawRiskScore))
    );

    // Determine Governance Status
    let governanceStatus: RiskGovernanceStatus;
    if (vetoTriggered) {
      governanceStatus = 'VETOED_FORENSIC_OR_SOLVENCY_BREACH';
    } else if (
      marginOfSafetyPassed &&
      compositeRiskScore <= 4 &&
      debateWinningEdge !== 'BEAR_DOMINANT'
    ) {
      governanceStatus = 'APPROVED_HIGH_CONVICTION';
    } else if (
      compositeRiskScore <= 6 &&
      actualDiscountToFairValuePct >= 0 &&
      !isForensicElevated
    ) {
      governanceStatus = 'APPROVED_WITH_HEDGING_CONSTRAINTS';
    } else {
      governanceStatus = 'CAUTION_ELEVATED_UNCERTAINTY';
    }

    // 7. Build Conservative, Moderate, and Aggressive Risk Profile Envelopes
    const riskProfiles = this.buildRiskProfileEnvelopes({
      ticker,
      governanceStatus,
      vetoTriggered,
      calibratedUncertaintyRating,
      impliedDailyVaR95Pct,
      atrStopEnvelopePct,
      marginOfSafetyPassed,
      actualDiscountToFairValuePct,
      requiredMarginOfSafetyPct,
      compositeRiskScore
    });

    // 8. Build Deterministic Governance Conditions & Summary
    const deterministicConditions = this.buildDeterministicGovernanceConditions({
      ticker,
      governanceStatus,
      vetoReasons,
      calibratedUncertaintyRating,
      requiredMarginOfSafetyPct,
      actualDiscountToFairValuePct,
      consensusFairValue,
      currentPrice,
      atrStopEnvelopePct,
      impliedDailyVaR95Pct,
      unresolvedDebateTensions
    });

    const deterministicSummary = this.buildDeterministicExecutiveSummary({
      ticker,
      companyName: fundamentals.companyName || mover.name,
      governanceStatus,
      compositeRiskScore,
      calibratedUncertaintyRating,
      requiredMarginOfSafetyPct,
      actualDiscountToFairValuePct,
      marginOfSafetyPassed,
      impliedDailyVaR95Pct,
      atrStopEnvelopePct,
      vetoTriggered,
      vetoReasons
    });

    let executiveGovernanceSummary = deterministicSummary;
    let governanceConditions = deterministicConditions;

    // 9. Optional LLM Enrichment with 100% Deterministic Fallback
    if (executeLLM) {
      try {
        const sysPrompt = [
          'You are the Chief Institutional Risk Guardian auditing an equity research dossier under the SEC Publisher\'s Exemption (Section 202(a)(11)(D)) and FINRA Rule 2210.',
          'Your mandate is strictly independent of the Bull/Bear thesis writers: you audit quantitative Value-at-Risk (VaR), ATR volatility envelopes, Morningstar uncertainty hurdle compliance, forensic accounting red flags, and debt maturity walls.',
          'Never issue personal investment advice or direct buy/sell instructions; frame all outputs strictly as impersonal analytical risk parameters and institutional governance conditions.'
        ].join(' ');

        const usrPrompt = JSON.stringify({
          ticker,
          companyName: fundamentals.companyName || mover.name,
          governanceStatus,
          vetoTriggered,
          vetoReasons,
          compositeRiskScore,
          calibratedUncertaintyRating,
          requiredMarginOfSafetyPct,
          actualDiscountToFairValuePct,
          marginOfSafetyPassed,
          impliedDailyVaR95Pct,
          atrStopEnvelopePct,
          forensicRiskContribution,
          refinancingWallRisk,
          microstructureSqueezeRisk,
          debateWinningEdge,
          unresolvedDebateTensions: unresolvedDebateTensions.slice(0, 4)
        });

        const llmResult = await executeLLM<LLMRiskGovernanceEnrichment>(
          sysPrompt,
          usrPrompt,
          `RiskGuardian-${ticker}`,
          RISK_GOVERNANCE_LLM_SCHEMA
        );

        if (
          llmResult &&
          typeof llmResult.executiveGovernanceSummary === 'string' &&
          llmResult.executiveGovernanceSummary.trim().length > 40
        ) {
          executiveGovernanceSummary = llmResult.executiveGovernanceSummary.trim();
        }
        if (
          llmResult &&
          Array.isArray(llmResult.governanceConditions) &&
          llmResult.governanceConditions.length >= 2
        ) {
          governanceConditions = llmResult.governanceConditions
            .map((c) => String(c).trim())
            .filter(Boolean);
        }
      } catch {
        // Fallback silently to deterministic summary and conditions
      }
    }

    return {
      ticker,
      governanceStatus,
      vetoTriggered,
      vetoReasons,
      compositeRiskScore,
      calibratedUncertaintyRating,
      requiredMarginOfSafetyPct,
      actualDiscountToFairValuePct,
      marginOfSafetyPassed,
      forensicRiskContribution,
      microstructureSqueezeRisk,
      refinancingWallRisk,
      riskProfiles,
      governanceConditions,
      executiveGovernanceSummary
    };
  }

  private buildRiskProfileEnvelopes(params: {
    ticker: string;
    governanceStatus: RiskGovernanceStatus;
    vetoTriggered: boolean;
    calibratedUncertaintyRating: UncertaintyRating;
    impliedDailyVaR95Pct: number;
    atrStopEnvelopePct: number;
    marginOfSafetyPassed: boolean;
    actualDiscountToFairValuePct: number;
    requiredMarginOfSafetyPct: number;
    compositeRiskScore: number;
  }): {
    conservative: RiskProfileEnvelope;
    moderate: RiskProfileEnvelope;
    aggressive: RiskProfileEnvelope;
  } {
    const {
      governanceStatus,
      vetoTriggered,
      calibratedUncertaintyRating,
      impliedDailyVaR95Pct,
      atrStopEnvelopePct,
      marginOfSafetyPassed,
      actualDiscountToFairValuePct,
      requiredMarginOfSafetyPct,
      compositeRiskScore
    } = params;

    if (vetoTriggered) {
      return {
        conservative: {
          profile: 'Conservative',
          stance: 'Excluded / Risk-Off Veto',
          maxDrawdownTolerancePct: 5.0,
          impliedDailyVaR95Pct,
          atrStopEnvelopePct: Number((atrStopEnvelopePct * 0.75).toFixed(2)),
          allocationCeilingPct: 0.0,
          rationale:
            'Forensic or solvency veto trigger breaches capital-preservation covenants; zero benchmark exposure weight.'
        },
        moderate: {
          profile: 'Moderate',
          stance: 'Excluded / Wait for Balance-Sheet Remediation',
          maxDrawdownTolerancePct: 10.0,
          impliedDailyVaR95Pct,
          atrStopEnvelopePct,
          allocationCeilingPct: 0.0,
          rationale:
            'Independent Risk Guardian veto supersedes valuation upside until forensic/liquidity alerts clear.'
        },
        aggressive: {
          profile: 'Aggressive',
          stance: 'Special-Situations Watchlist Only (Hedged)',
          maxDrawdownTolerancePct: 18.0,
          impliedDailyVaR95Pct,
          atrStopEnvelopePct: Number((atrStopEnvelopePct * 1.25).toFixed(2)),
          allocationCeilingPct: 0.5,
          rationale:
            'Restricted to distressed/event-driven tracking with strict options-defined downside protection.'
        }
      };
    }

    const scaleFactor = Math.max(0.25, (11 - compositeRiskScore) / 8);

    const conservativeCeiling =
      governanceStatus === 'APPROVED_HIGH_CONVICTION'
        ? Number((3.5 * scaleFactor).toFixed(1))
        : governanceStatus === 'APPROVED_WITH_HEDGING_CONSTRAINTS' &&
            (calibratedUncertaintyRating === 'Low' ||
              calibratedUncertaintyRating === 'Medium')
          ? Number((2.0 * scaleFactor).toFixed(1))
          : 0.0;

    const moderateCeiling =
      governanceStatus === 'APPROVED_HIGH_CONVICTION'
        ? Number((5.0 * scaleFactor).toFixed(1))
        : governanceStatus === 'APPROVED_WITH_HEDGING_CONSTRAINTS'
          ? Number((3.0 * scaleFactor).toFixed(1))
          : Number((1.25 * scaleFactor).toFixed(1));

    const aggressiveCeiling =
      governanceStatus === 'APPROVED_HIGH_CONVICTION'
        ? Number((7.5 * scaleFactor).toFixed(1))
        : governanceStatus === 'APPROVED_WITH_HEDGING_CONSTRAINTS'
          ? Number((5.0 * scaleFactor).toFixed(1))
          : Number((2.5 * scaleFactor).toFixed(1));

    return {
      conservative: {
        profile: 'Conservative',
        stance:
          conservativeCeiling > 0
            ? 'Core Quality / Margin-of-Safety Compliant'
            : 'Stand Aside / Hurdle Rate Unmet',
        maxDrawdownTolerancePct: 8.0,
        impliedDailyVaR95Pct,
        atrStopEnvelopePct: Number((atrStopEnvelopePct * 0.8).toFixed(2)),
        allocationCeilingPct: conservativeCeiling,
        rationale: marginOfSafetyPassed
          ? `Meets the ${requiredMarginOfSafetyPct.toFixed(0)}% uncertainty-adjusted discount hurdle (${actualDiscountToFairValuePct.toFixed(1)}% actual discount) with daily 95% VaR of ${impliedDailyVaR95Pct.toFixed(2)}%.`
          : `Current discount to fair value (${actualDiscountToFairValuePct.toFixed(1)}%) falls short of the ${requiredMarginOfSafetyPct.toFixed(0)}% hurdle required for ${calibratedUncertaintyRating} uncertainty.`
      },
      moderate: {
        profile: 'Moderate',
        stance:
          governanceStatus === 'APPROVED_HIGH_CONVICTION'
            ? 'Standard Benchmark Weight'
            : governanceStatus === 'APPROVED_WITH_HEDGING_CONSTRAINTS'
              ? 'Tranched Scaling with Collar/Stop Guardrails'
              : 'Underweight / Catalyst Verification Required',
        maxDrawdownTolerancePct: 14.0,
        impliedDailyVaR95Pct,
        atrStopEnvelopePct,
        allocationCeilingPct: moderateCeiling,
        rationale: `Balanced mandate calibrated for ${calibratedUncertaintyRating} uncertainty, ${impliedDailyVaR95Pct.toFixed(2)}% daily VaR(95%), and a ${atrStopEnvelopePct.toFixed(2)}% 2x-ATR volatility envelope.`
      },
      aggressive: {
        profile: 'Aggressive',
        stance:
          governanceStatus === 'CAUTION_ELEVATED_UNCERTAINTY'
            ? 'Tactical Opportunistic / Volatility-Sized'
            : 'High-Beta Convexity Allocation',
        maxDrawdownTolerancePct: 22.0,
        impliedDailyVaR95Pct,
        atrStopEnvelopePct: Number((atrStopEnvelopePct * 1.3).toFixed(2)),
        allocationCeilingPct: aggressiveCeiling,
        rationale: `Accommodates wider ${Number((atrStopEnvelopePct * 1.3).toFixed(2))}% volatility bands while capping single-name tail exposure at ${aggressiveCeiling.toFixed(1)}% under ${calibratedUncertaintyRating} uncertainty.`
      }
    };
  }

  private buildDeterministicGovernanceConditions(params: {
    ticker: string;
    governanceStatus: RiskGovernanceStatus;
    vetoReasons: string[];
    calibratedUncertaintyRating: UncertaintyRating;
    requiredMarginOfSafetyPct: number;
    actualDiscountToFairValuePct: number;
    consensusFairValue: number;
    currentPrice: number;
    atrStopEnvelopePct: number;
    impliedDailyVaR95Pct: number;
    unresolvedDebateTensions: string[];
  }): string[] {
    const conditions: string[] = [];

    if (params.vetoReasons.length > 0) {
      for (const reason of params.vetoReasons) {
        conditions.push(`VETO REMEDIATION GATE: ${reason}`);
      }
    }

    const hurdlePrice =
      params.consensusFairValue * (1 - params.requiredMarginOfSafetyPct / 100);
    conditions.push(
      `MORNINGSTAR UNCERTAINTY HURDLE (${params.calibratedUncertaintyRating.toUpperCase()}): Requires a ${params.requiredMarginOfSafetyPct.toFixed(0)}% discount to consensus fair value ($${params.consensusFairValue.toFixed(2)}), corresponding to an analytical entry hurdle of $${hurdlePrice.toFixed(2)} vs. current price $${params.currentPrice.toFixed(2)} (actual discount: ${params.actualDiscountToFairValuePct.toFixed(1)}%).`
    );

    conditions.push(
      `QUANTITATIVE VOLATILITY & VAR ENVELOPE: 1-day 95% parametric Value-at-Risk is calibrated at ${params.impliedDailyVaR95Pct.toFixed(2)}% with a 2.0x ATR analytical volatility stop band at ${params.atrStopEnvelopePct.toFixed(2)}% ($${(params.currentPrice * (1 - params.atrStopEnvelopePct / 100)).toFixed(2)} downside reference level).`
    );

    if (params.unresolvedDebateTensions.length > 0) {
      conditions.push(
        `ADVERSARIAL DEBATE COVENANT: Monitor unresolved thesis tension — "${params.unresolvedDebateTensions[0]}" — across upcoming 10-Q/10-K filings.`
      );
    } else {
      conditions.push(
        `QUARTERLY CASH CONVERSION AUDIT: Verify operating cash flow to net income conversion and short-term debt maturity coverage in subsequent quarterly disclosures.`
      );
    }

    return conditions;
  }

  private buildDeterministicExecutiveSummary(params: {
    ticker: string;
    companyName: string;
    governanceStatus: RiskGovernanceStatus;
    compositeRiskScore: number;
    calibratedUncertaintyRating: UncertaintyRating;
    requiredMarginOfSafetyPct: number;
    actualDiscountToFairValuePct: number;
    marginOfSafetyPassed: boolean;
    impliedDailyVaR95Pct: number;
    atrStopEnvelopePct: number;
    vetoTriggered: boolean;
    vetoReasons: string[];
  }): string {
    const statusText = params.vetoTriggered
      ? `issued a formal ${params.governanceStatus} (${params.vetoReasons[0]})`
      : `assigned a governance status of ${params.governanceStatus}`;

    const mosClause = params.marginOfSafetyPassed
      ? `satisfies the ${params.requiredMarginOfSafetyPct.toFixed(0)}% uncertainty-adjusted margin-of-safety hurdle with an actual discount to consensus fair value of ${params.actualDiscountToFairValuePct.toFixed(1)}%`
      : `does not clear the ${params.requiredMarginOfSafetyPct.toFixed(0)}% margin-of-safety hurdle required for ${params.calibratedUncertaintyRating} uncertainty (actual discount: ${params.actualDiscountToFairValuePct.toFixed(1)}%)`;

    return `Independent Risk Guardian audit for ${params.companyName} (${params.ticker}) has ${statusText}, calibrating composite risk at ${params.compositeRiskScore}/10 under a ${params.calibratedUncertaintyRating} Morningstar Uncertainty Rating. At current market pricing, the equity ${mosClause}, while exhibiting a 1-day 95% parametric Value-at-Risk of ${params.impliedDailyVaR95Pct.toFixed(2)}% and a 2.0x ATR volatility stop envelope of ${params.atrStopEnvelopePct.toFixed(2)}%. All risk profile envelopes below represent impersonal analytical risk parameters published under the Section 202(a)(11)(D) Publisher's Exemption.`;
  }
}

/**
 * Formats the RiskGuardianAudit into an institutional Markdown section for the synthesis dossier.
 */
export function formatRiskGuardianMarkdown(audit: RiskGuardianAudit): string {
  const statusBadge =
    audit.governanceStatus === 'APPROVED_HIGH_CONVICTION'
      ? 'APPROVED — HIGH CONVICTION'
      : audit.governanceStatus === 'APPROVED_WITH_HEDGING_CONSTRAINTS'
        ? 'APPROVED WITH HEDGING CONSTRAINTS'
        : audit.governanceStatus === 'CAUTION_ELEVATED_UNCERTAINTY'
          ? 'CAUTION — ELEVATED UNCERTAINTY'
          : 'VETOED — FORENSIC OR SOLVENCY BREACH';

  const lines: string[] = [
    `## Independent Risk Guardian & Uncertainty Governance Audit`,
    ``,
    `> **Governance Verdict:** **${statusBadge}** | **Composite Risk Score:** **${audit.compositeRiskScore}/10** | **Calibrated Uncertainty:** **${audit.calibratedUncertaintyRating}** | **Margin-of-Safety Gate:** **${audit.marginOfSafetyPassed ? 'PASSED' : 'UNMET'}** (${audit.actualDiscountToFairValuePct.toFixed(1)}% Actual vs. ${audit.requiredMarginOfSafetyPct.toFixed(0)}% Required)`,
    ``,
    `${audit.executiveGovernanceSummary}`,
    ``
  ];

  if (audit.vetoTriggered && audit.vetoReasons.length > 0) {
    lines.push(`### Institutional Veto Triggers`);
    for (const reason of audit.vetoReasons) {
      lines.push(`- **VETO TRIGGER:** ${reason}`);
    }
    lines.push(``);
  }

  lines.push(
    `### Quantitative Risk & Balance-Sheet Stress Telemetry`,
    `- **Forensic Accounting Contribution:** ${audit.forensicRiskContribution}`,
    `- **Refinancing Wall & Liquidity Stress:** ${audit.refinancingWallRisk}`,
    `- **Microstructure & Gamma Squeeze Profile:** ${audit.microstructureSqueezeRisk}`,
    ``,
    `### Multi-Mandate Analytical Risk Profile Envelopes`,
    `| Mandate Profile | Analytical Stance | Max Drawdown Tolerance | 1-Day 95% VaR | 2x ATR Volatility Envelope | Analytical Allocation Ceiling | Mandate Rationale |`,
    `| :--- | :--- | :---: | :---: | :---: | :---: | :--- |`,
    `| **Conservative** | ${audit.riskProfiles.conservative.stance} | ${audit.riskProfiles.conservative.maxDrawdownTolerancePct.toFixed(1)}% | ${audit.riskProfiles.conservative.impliedDailyVaR95Pct.toFixed(2)}% | ${audit.riskProfiles.conservative.atrStopEnvelopePct.toFixed(2)}% | ${audit.riskProfiles.conservative.allocationCeilingPct.toFixed(1)}% | ${audit.riskProfiles.conservative.rationale} |`,
    `| **Moderate** | ${audit.riskProfiles.moderate.stance} | ${audit.riskProfiles.moderate.maxDrawdownTolerancePct.toFixed(1)}% | ${audit.riskProfiles.moderate.impliedDailyVaR95Pct.toFixed(2)}% | ${audit.riskProfiles.moderate.atrStopEnvelopePct.toFixed(2)}% | ${audit.riskProfiles.moderate.allocationCeilingPct.toFixed(1)}% | ${audit.riskProfiles.moderate.rationale} |`,
    `| **Aggressive** | ${audit.riskProfiles.aggressive.stance} | ${audit.riskProfiles.aggressive.maxDrawdownTolerancePct.toFixed(1)}% | ${audit.riskProfiles.aggressive.impliedDailyVaR95Pct.toFixed(2)}% | ${audit.riskProfiles.aggressive.atrStopEnvelopePct.toFixed(2)}% | ${audit.riskProfiles.aggressive.allocationCeilingPct.toFixed(1)}% | ${audit.riskProfiles.aggressive.rationale} |`,
    ``,
    `### Institutional Governance Conditions & Analytical Guardrails`
  );

  for (const cond of audit.governanceConditions) {
    lines.push(`- ${cond}`);
  }

  lines.push(
    ``,
    `*Regulatory Governance Notice: Analytical risk envelopes, VaR/ATR volatility bands, and uncertainty hurdle calibrations are impersonal quantitative research parameters published under the Investment Advisers Act Section 202(a)(11)(D) Publisher's Exemption and do not constitute individualized portfolio advice.*`
  );

  return lines.join('\n');
}

export const riskGuardianEngine = new RiskGuardianEngine();
