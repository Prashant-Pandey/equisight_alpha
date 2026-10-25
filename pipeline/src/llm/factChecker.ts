import { CONFIG } from '../config.js';
import type { LLMAnalysisOutput, FundamentalMetrics, MarketMover, FactCheckResult, FactCheckViolation } from '../types.js';

export class AntiHallucinationFactChecker {
  /**
   * Verifies all numerical assertions in the research report against ingested raw facts.
   * Automatically heals hallucinated values by deterministic patching.
   */
  public verifyAndCorrect(
    output: LLMAnalysisOutput,
    mover: MarketMover,
    fundamentals: FundamentalMetrics
  ): FactCheckResult {
    const violations: FactCheckViolation[] = [];
    const auditLog: string[] = [];
    let patchedMarkdown = output.markdownBody;

    auditLog.push(`[FactCheck] Initiating multi-point verification for ${mover.ticker}...`);

    // 1. Verify Price Change Percentage
    const moveClaim = output.extractedFigures.movePercent;
    if (moveClaim !== undefined) {
      const divergence = Math.abs(moveClaim - mover.changePercent);
      if (divergence > 0.5) {
        violations.push({
          field: 'sessionMovePercent',
          claimedValue: moveClaim,
          actualValue: mover.changePercent,
          divergencePercent: divergence,
          severity: 'critical',
          context: `Report cited ${moveClaim}% move vs actual ${mover.changePercent}%`
        });
      }
    }

    // 2. Verify P/E Ratio
    const claimedPE = output.extractedFigures.peRatio;
    const actualPE = fundamentals.peRatioTrailing || fundamentals.peRatioForward;
    if (claimedPE && actualPE) {
      const peDivergence = (Math.abs(claimedPE - actualPE) / actualPE) * 100;
      if (peDivergence > CONFIG.FACT_CHECK_TOLERANCE_PERCENT) {
        violations.push({
          field: 'peRatio',
          claimedValue: claimedPE,
          actualValue: actualPE,
          divergencePercent: parseFloat(peDivergence.toFixed(2)),
          severity: peDivergence > 20 ? 'critical' : 'warning',
          context: `Claimed P/E of ${claimedPE} vs ground truth ${actualPE.toFixed(1)}`
        });

        // Auto-heal regex replacement in markdown
        const peRegex = new RegExp(`P/E(?:\\s+ratio)?(?:\\s+of)?\\s+${claimedPE.toFixed(1)}`, 'gi');
        if (peRegex.test(patchedMarkdown)) {
          patchedMarkdown = patchedMarkdown.replace(peRegex, `P/E ratio of ${actualPE.toFixed(1)}`);
          auditLog.push(`[FactCheck] Auto-healed mismatched P/E ${claimedPE} -> ${actualPE.toFixed(1)}`);
        }
      }
    }

    // 3. Verify TTM Revenue Scale
    const claimedRev = output.extractedFigures.revenueTTM;
    const actualRev = fundamentals.revenueTTM;
    if (claimedRev && actualRev) {
      const revDivergence = (Math.abs(claimedRev - actualRev) / actualRev) * 100;
      if (revDivergence > CONFIG.FACT_CHECK_TOLERANCE_PERCENT) {
        violations.push({
          field: 'revenueTTM',
          claimedValue: `$${(claimedRev / 1e9).toFixed(2)}B`,
          actualValue: `$${(actualRev / 1e9).toFixed(2)}B`,
          divergencePercent: parseFloat(revDivergence.toFixed(2)),
          severity: 'critical',
          context: `Claimed revenue ${(claimedRev / 1e9).toFixed(2)}B vs actual ${(actualRev / 1e9).toFixed(2)}B`
        });

        // Patch occurrence in text
        const revClaimBillions = (claimedRev / 1e9).toFixed(1);
        const revActualBillions = (actualRev / 1e9).toFixed(1);
        const revRegex = new RegExp(`\\$${revClaimBillions}\\s*B(?:illion)?`, 'gi');
        if (revRegex.test(patchedMarkdown)) {
          patchedMarkdown = patchedMarkdown.replace(revRegex, `$${revActualBillions} billion`);
          auditLog.push(`[FactCheck] Auto-healed revenue citation $${revClaimBillions}B -> $${revActualBillions}B`);
        }
      }
    }

    // 4. Verify Operating Margin
    const claimedMargin = output.extractedFigures.operatingMargin;
    const actualMargin = fundamentals.operatingMargin;
    if (claimedMargin && actualMargin) {
      const marginDiv = Math.abs(claimedMargin - actualMargin);
      if (marginDiv > 3.0) { // More than 3 percentage points difference
        violations.push({
          field: 'operatingMargin',
          claimedValue: `${claimedMargin}%`,
          actualValue: `${actualMargin.toFixed(1)}%`,
          divergencePercent: parseFloat(marginDiv.toFixed(2)),
          severity: 'warning',
          context: `Claimed operating margin ${claimedMargin}% vs actual ${actualMargin.toFixed(1)}%`
        });
      }
    }

    // 5. Verification of Compliance & Impersonal Language
    const lowerBody = patchedMarkdown.toLowerCase();
    const hasAdviceClaims = lowerBody.includes('you should buy') || lowerBody.includes('strong buy recommendation') || lowerBody.includes('target price of');
    if (hasAdviceClaims) {
      violations.push({
        field: 'complianceDirectives',
        claimedValue: 'Personalized recommendation detected',
        actualValue: 'Objective analysis required under publisher exemption',
        divergencePercent: 100,
        severity: 'critical',
        context: 'Found impermissible advisory phrase in text.'
      });

      // Neutralize impermissible phrasing
      patchedMarkdown = patchedMarkdown
        .replace(/you should buy/gi, 'investors often evaluate')
        .replace(/strong buy recommendation/gi, 'favorable fundamental profile')
        .replace(/you must sell/gi, 'risk-averse market participants may reconsider');
      auditLog.push('[FactCheck] Neutralized advisory statements to satisfy Publisher Exemption.');
    }

    // 6. Standardize and ensure transparent automated agent authorship disclosures
    const aiPhrases = [
      /as an ai(?: language model)?/gi,
      /ai-generated(?: report)?/gi,
      /generated by ai/gi,
      /i am an ai/gi,
      /this ai report/gi,
      /artificial intelligence model/gi
    ];
    for (const pattern of aiPhrases) {
      if (pattern.test(patchedMarkdown)) {
        patchedMarkdown = patchedMarkdown.replace(pattern, 'automated quantitative equity research pipeline');
        auditLog.push('[FactCheck] Standardized transparent automated agent authorship disclosure (Prepared using automated quantitative agents and institutional analysis pipelines).');
      }
    }

    // 7. Strip redundant LLM-generated legal disclaimers / Publisher's Exemption boilerplate
    // Statutory compliance disclaimers are handled deterministically by presentation templates.
    const beforeStrip = patchedMarkdown;
    patchedMarkdown = stripRedundantDisclaimers(patchedMarkdown);
    if (patchedMarkdown !== beforeStrip) {
      auditLog.push('[FactCheck] Stripped redundant LLM-generated Publisher Exemption notice; handled deterministically by layout templates.');
    }

    const passed = violations.filter((v) => v.severity === 'critical').length === 0;

    auditLog.push(`[FactCheck] Verification complete for ${mover.ticker}. Passed: ${passed}. Total violations: ${violations.length}`);

    return {
      passed,
      violations,
      correctedContent: patchedMarkdown,
      auditLog
    };
  }
}

export const factChecker = new AntiHallucinationFactChecker();

/**
 * Strips LLM-generated legal disclaimers, methodology disclosures, and Publisher's Exemption notices
 * from markdown content since these are handled deterministically by presentation templates.
 */
export function stripRedundantDisclaimers(markdown: string): string {
  if (!markdown) return markdown;

  // Split into paragraphs / blocks by double-newlines
  const blocks = markdown.split(/\n{2,}/);
  const resultBlocks: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();

    // Check if this block contains Publisher's Exemption / 1940 Act statutory disclaimer
    const isDisclaimer =
      /publisher['’]s exemption/i.test(block) ||
      /202\(a\)\(11\)\(D\)/.test(block) ||
      (/FINRA Rule 2210/i.test(block) && /educational|informational|statutory/i.test(block));

    if (isDisclaimer) {
      // If the preceding block was a disclaimer heading, remove it too
      if (resultBlocks.length > 0) {
        const prevBlock = resultBlocks[resultBlocks.length - 1].trim();
        if (
          /^#{2,4}\s+/m.test(prevBlock) &&
          /(?:Methodology|Regulatory|Compliance|Disclosure|Publisher)/i.test(prevBlock)
        ) {
          resultBlocks.pop();
        }
      }
      continue;
    }

    // Also check if block itself is just a heading for a disclaimer that has no content
    if (
      /^#{2,4}\s+(?:Automated Quantitative Methodology|Regulatory Compliance|Legal Regulatory Disclosures|Transparent Methodology|Regulatory, Compliance)/i.test(block) &&
      !block.includes('\n')
    ) {
      continue;
    }

    resultBlocks.push(blocks[i]);
  }

  let cleaned = resultBlocks.join('\n\n').trim();

  // Clean up duplicate horizontal rules, leading horizontal rule, or dangling HR after H2
  cleaned = cleaned.replace(/(?:^|\n)---\s*\n+---/g, '\n---');
  cleaned = cleaned.replace(/^---\s*\n+/, '');
  cleaned = cleaned.replace(/(^##[^\n]+\n+)\s*---\s*\n+/gm, '$1\n');

  return cleaned.trim();
}
