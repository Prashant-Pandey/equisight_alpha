import assert from 'assert';
import {
  EXECUTIVE_SUMMARY_SCHEMA,
  MAIN_REPORT_SCHEMA,
  TIER1_SENTIMENT_SCHEMA,
  sanitizeJson,
  safeParseJson
} from '../pipeline/src/llm/schemas.js';

console.log('🧪 Running Schema Enforcement & Resilient JSON Parser Tests...\n');

// Test 1: Verify Schema Schemas structure
console.log('--- Test 1: Schema Structure Verification ---');
assert.strictEqual(EXECUTIVE_SUMMARY_SCHEMA.type, 'object');
assert.ok(Array.isArray(EXECUTIVE_SUMMARY_SCHEMA.required));
assert.ok(EXECUTIVE_SUMMARY_SCHEMA.required.includes('catalystHeadline'));
assert.ok(EXECUTIVE_SUMMARY_SCHEMA.required.includes('formattedMarkdown'));

assert.strictEqual(MAIN_REPORT_SCHEMA.type, 'object');
assert.ok(Array.isArray(MAIN_REPORT_SCHEMA.required));
assert.ok(MAIN_REPORT_SCHEMA.required.includes('title'));
assert.ok(MAIN_REPORT_SCHEMA.required.includes('markdownBody'));

assert.strictEqual(TIER1_SENTIMENT_SCHEMA.type, 'object');
assert.ok(Array.isArray(TIER1_SENTIMENT_SCHEMA.required));
assert.ok(TIER1_SENTIMENT_SCHEMA.required.includes('majorPriceDriver'));
console.log('✓ All JSON schemas properly structured and typed.');

// Test 2: Verify Sanitize JSON on Bad Escapes
console.log('\n--- Test 2: JSON Sanitizer on LLM Malformed Escapes ---');
// Simulates the exact NVAX bug: \$ in price, \* in markdown, \' single quote
const malformedJson = `{
  "catalystHeadline": "Novavax Surges \\$12.50 Following \\*Historic\\* FDA Approval",
  "takeaways": [
    "Revenue expanded past \\$500M",
    "It\\'s an institutional inflection point",
    "Net debt reduced by 15\\%"
  ],
  "path": "C:\\\\Windows\\\\Path",
  "validEscape": "Line 1\\nLine 2\\tTabbed \\"quoted\\""
}`;

// Native JSON.parse should fail on this malformed JSON
let nativeFailed = false;
try {
  JSON.parse(malformedJson);
} catch (e: any) {
  nativeFailed = true;
  assert.ok(e.message.includes('Bad escaped character') || e.message.includes('JSON'));
}
assert.ok(nativeFailed, 'Native JSON.parse must fail on un-sanitized bad escapes');

// safeParseJson must successfully recover and parse
const parsed = safeParseJson<{
  catalystHeadline: string;
  takeaways: string[];
  path: string;
  validEscape: string;
}>(malformedJson);

assert.strictEqual(parsed.catalystHeadline, 'Novavax Surges $12.50 Following *Historic* FDA Approval');
assert.strictEqual(parsed.takeaways[0], 'Revenue expanded past $500M');
assert.strictEqual(parsed.takeaways[1], "It's an institutional inflection point");
assert.strictEqual(parsed.takeaways[2], 'Net debt reduced by 15%');
assert.strictEqual(parsed.path, 'C:\\Windows\\Path');
assert.ok(parsed.validEscape.includes('Line 1\nLine 2\tTabbed "quoted"'));
console.log('✓ Resilient parser successfully healed illegal LLM escapes ($ , * , \' , %).');

// Test 3: Normal Valid JSON Parse
console.log('\n--- Test 3: Valid JSON Parsing ---');
const validJson = JSON.stringify({ ok: true, count: 42, tags: ['growth', 'tech'] });
const validResult = safeParseJson<{ ok: boolean; count: number; tags: string[] }>(validJson);
assert.strictEqual(validResult.ok, true);
assert.strictEqual(validResult.count, 42);
assert.deepStrictEqual(validResult.tags, ['growth', 'tech']);
console.log('✓ Normal JSON parses without alteration.');

console.log('\n🎉 ALL SCHEMA ENFORCEMENT & RESILIENT PARSER TESTS PASSED!');
