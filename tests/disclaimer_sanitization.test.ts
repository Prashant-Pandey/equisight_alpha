import assert from 'assert';
import { stripRedundantDisclaimers } from '../pipeline/src/llm/factChecker.js';
import {
  buildSystemPrompt,
  buildExecutiveSummarySystemPrompt,
  buildReportPart2SystemPrompt,
  PUBLISHER_COMPLIANCE_DIRECTIVE
} from '../pipeline/src/llm/prompts.js';

console.log('🧪 Starting Publisher Exemption & Disclaimer Sanitization Test Suite...\n');

// ============================================================================
// TEST 1: Strip Header + Bulleted Publisher's Exemption Block
// ============================================================================
console.log('Test 1: Strip Header + Bulleted Publisher Exemption Block');
const markdownWithBullets = `## Executive Summary & Session Catalyst

### 1. Session Catalyst & Expectations Gap Deconstruction
Acme announced a major contract expansion.

---

### Automated Quantitative Methodology & Legal Regulatory Disclosures
* **Publisher's Exemption Notice:** This research section is prepared and distributed exclusively for general institutional, educational, and informational purposes under the **Publisher's Exemption of Section 202(a)(11)(D) of the U.S. Investment Advisers Act of 1940** and in strict adherence to **FINRA Rule 2210**.
* **No Personalized Investment Advice:** Nothing within this document constitutes personalized investment, tax, or legal advice.
* **Automated Pipeline Disclosure:** Financial metrics were compiled algorithmically.

---

## 1. Trading Activity & Artificial Inflation Analysis
Trading volume expanded significantly.`;

const cleanedBullets = stripRedundantDisclaimers(markdownWithBullets);
assert.ok(!cleanedBullets.includes("Publisher's Exemption Notice"), 'Must strip Publisher Exemption Notice bullet');
assert.ok(!cleanedBullets.includes('Automated Quantitative Methodology & Legal Regulatory Disclosures'), 'Must strip disclaimer heading');
assert.ok(!cleanedBullets.includes('No Personalized Investment Advice'), 'Must strip accompanying disclaimer bullets');
assert.ok(cleanedBullets.includes('## Executive Summary & Session Catalyst'), 'Must preserve Executive Summary');
assert.ok(cleanedBullets.includes('## 1. Trading Activity & Artificial Inflation Analysis'), 'Must preserve subsequent analytical sections');
console.log('✓ Pass: Header + bulleted disclaimer block cleanly removed.\n');

// ============================================================================
// TEST 2: Strip Italicized or Blockquote Disclaimers
// ============================================================================
console.log('Test 2: Strip Italicized or Blockquote Disclaimers');
const markdownWithBlockquote = `## Executive Summary & Session Catalyst

> **Regulatory & Compliance Notice**: Prepared solely for general educational and informational purposes under the Publisher's Exemption of Section 202(a)(11)(D) of the U.S. Investment Advisers Act of 1940 and FINRA Rule 2210. This quantitative research report does not constitute personalized investment advice.

### Catalyst Analysis
Strong revenue growth catalyzed the rally.`;

const cleanedBlockquote = stripRedundantDisclaimers(markdownWithBlockquote);
assert.ok(!cleanedBlockquote.includes('Regulatory & Compliance Notice'), 'Must strip blockquote disclaimer');
assert.ok(!cleanedBlockquote.includes("Publisher's Exemption"), 'Must not contain Publisher Exemption text');
assert.ok(cleanedBlockquote.includes('### Catalyst Analysis'), 'Must preserve Catalyst Analysis heading');
console.log('✓ Pass: Blockquote disclaimers cleanly removed.\n');

// ============================================================================
// TEST 3: Preserve Legitimate Business Text Referencing "Publishers"
// ============================================================================
console.log('Test 3: Preserve Legitimate Business Text (e.g. Adobe / Media Publishers)');
const legitimateBusinessText = `## 4. Qualitative Deep Dive: 4 Key Company Questions

Adobe operates worldwide across multiple segments.
The Digital Experience segment serves marketers, advertisers, agencies, publishers, merchandisers, and merchants.
The Publishing and Advertising segment offers e-learning and technical document publishing.`;

const cleanedLegit = stripRedundantDisclaimers(legitimateBusinessText);
assert.strictEqual(cleanedLegit, legitimateBusinessText, 'Must not touch legitimate business text mentioning publishers');
console.log('✓ Pass: Business descriptions with "publishers" correctly preserved.\n');

// ============================================================================
// TEST 4: Prompt Directives Enforce Behavioral Separation
// ============================================================================
console.log('Test 4: Prompt Directives Enforce Behavioral Separation');
assert.ok(
  PUBLISHER_COMPLIANCE_DIRECTIVE.includes("PUBLISHER'S EXEMPTION"),
  'System directive must maintain legal reference for behavioral compliance'
);
assert.ok(
  PUBLISHER_COMPLIANCE_DIRECTIVE.includes('NO REDUNDANT LEGAL BOILERPLATE IN BODY'),
  'System directive must explicitly forbid generating legal boilerplate in markdown body'
);

const sysPrompt = buildSystemPrompt();
assert.ok(
  !sysPrompt.includes("8. Social Distribution Hooks & Publisher's Exemption Notice"),
  'Full report system prompt must not list Publisher Exemption Notice as an output section'
);

const execSysPrompt = buildExecutiveSummarySystemPrompt();
assert.ok(
  execSysPrompt.includes('Do NOT include any publisher\'s exemption or legal disclaimer boilerplate'),
  'Executive summary prompt must explicitly instruct model to omit boilerplate notices'
);

const part2SysPrompt = buildReportPart2SystemPrompt();
assert.ok(
  part2SysPrompt.includes('Do NOT append any legal disclaimers'),
  'Part 2 prompt must explicitly instruct model to omit boilerplate notices'
);
console.log('✓ Pass: Prompt directives correctly configure behavioral compliance without body boilerplate.\n');

console.log('🎉 ALL DISCLAIMER SANITIZATION TESTS PASSED SUCCESSFULLY!\n');
