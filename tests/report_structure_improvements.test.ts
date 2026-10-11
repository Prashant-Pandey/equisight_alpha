import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Running Report Structure & Institutional PDF Improvement Tests...\n');

const distDir = path.resolve('dist');
const reportsDir = path.join(distDir, 'reports');

// Test 1: Verify distribution files exist
const fslyDirName = fs.existsSync(reportsDir)
  ? (fs.readdirSync(reportsDir).find(d => d.includes('fsly-gain-16-percent-fundamental-analysis')) || '2026-10-10-fsly-gain-16-percent-fundamental-analysis')
  : '2026-10-10-fsly-gain-16-percent-fundamental-analysis';
const fslyWebHtmlPath = path.join(reportsDir, fslyDirName, 'index.html');
const fslyPrintHtmlPath = path.join(reportsDir, fslyDirName, 'print', 'index.html');

assert(fs.existsSync(fslyWebHtmlPath), `Web report page should exist at ${fslyWebHtmlPath}`);
assert(fs.existsSync(fslyPrintHtmlPath), `Institutional PDF print page should exist at ${fslyPrintHtmlPath}`);
console.log('✓ Build artifacts verified for both interactive web page and institutional print route.');

const fslyWebContent = fs.readFileSync(fslyWebHtmlPath, 'utf8');
const fslyPrintContent = fs.readFileSync(fslyPrintHtmlPath, 'utf8');

// Test 2: Sticky Action & Metadata Bar
assert(fslyWebContent.includes('sticky-action-bar'), 'Web page must contain sticky-action-bar');
assert(fslyWebContent.includes('Export Institutional PDF'), 'Web page must contain "Export Institutional PDF" action button');
assert(fslyWebContent.includes('export-pdf-action-btn'), 'Web page must contain export-pdf-action-btn ID');
assert(fslyWebContent.includes('print?autoprint=true'), 'PDF action button must link to print route with autoprint parameter');
console.log('✓ Sticky Action & Metadata Bar verified with single-click PDF export.');

// Test 3: First-Glance Quick-View Dashboard (< 5-Sec Scan)
assert(fslyWebContent.includes('Executive Triage &bull; 5-Second Quick-View Dashboard'), 'Web page must contain 5-second quick-view header');
assert(fslyWebContent.includes('Valuation &amp; Margin of Safety') || fslyWebContent.includes('Valuation & Margin of Safety'), 'Quick-View must contain Valuation & Margin of Safety tile');
assert(fslyWebContent.includes('Catalyst &amp; Order Flow') || fslyWebContent.includes('Catalyst & Order Flow'), 'Quick-View must contain Catalyst & Order Flow tile');
assert(fslyWebContent.includes('Moat &amp; Solvency Snapshot') || fslyWebContent.includes('Moat & Solvency Snapshot'), 'Quick-View must contain Moat & Solvency Snapshot tile');
assert(fslyWebContent.includes('5★ Buy Below'), 'Quick-View must contain 5★ Buy hurdle');
assert(fslyWebContent.includes('1★ Trim Above'), 'Quick-View must contain 1★ Trim hurdle');
assert(fslyWebContent.includes('5 Competitive Moat Pillars:'), 'Quick-View must show 5 Competitive Moat Pillars summary');
console.log('✓ First-Glance Quick-View Dashboard verified with 3-tile triage layout.');

// Test 4: Tabbed Workspace Navigation & Modules
assert(fslyWebContent.includes('tab-btn-overview'), 'Tab navigation must contain overview tab');
assert(fslyWebContent.includes('tab-btn-thesis'), 'Tab navigation must contain thesis tab');
assert(fslyWebContent.includes('tab-btn-valuation'), 'Tab navigation must contain valuation tab');
assert(fslyWebContent.includes('tab-btn-solvency'), 'Tab navigation must contain solvency tab');
assert(fslyWebContent.includes('tab-btn-microstructure'), 'Tab navigation must contain microstructure tab');

assert(fslyWebContent.includes('tab-panel-overview'), 'Tab panel overview must exist');
assert(fslyWebContent.includes('tab-panel-thesis'), 'Tab panel thesis must exist');
assert(fslyWebContent.includes('tab-panel-valuation'), 'Tab panel valuation must exist');
assert(fslyWebContent.includes('tab-panel-solvency'), 'Tab panel solvency must exist');
assert(fslyWebContent.includes('tab-panel-microstructure'), 'Tab panel microstructure must exist');
console.log('✓ Tabbed Deep-Dive Workspace verified with all 5 functional tab panels.');

// Test 5: Reusable Modular Components Rendered
assert(fslyWebContent.includes('thesis-modal'), 'ThesisModule dialog modal must be included');
assert(fslyWebContent.includes('Multi-Method Intrinsic Valuation Models'), 'ValuationModule 8-model matrix must be included');
assert(fslyWebContent.includes('Three-Stage DCF Mechanics &amp; Moat Fade Sensitivity') || fslyWebContent.includes('Three-Stage DCF Mechanics & Moat Fade Sensitivity'), 'ValuationModule DCF sensitivity matrix must be included');
assert(fslyWebContent.includes('8-Quarter Earnings Per Share (EPS) Progression'), 'SolvencyModule 8-quarter EPS SVG chart must be included');
assert(fslyWebContent.includes('Balance Sheet Solvency &amp; Debt Maturity Waterfall') || fslyWebContent.includes('Balance Sheet Solvency & Debt Maturity Waterfall'), 'SolvencyModule debt waterfall must be included');
assert(fslyWebContent.includes('Market Microstructure &amp; Volume Integrity Audit') || fslyWebContent.includes('Market Microstructure & Volume Integrity Audit'), 'MicrostructureModule audit must be included');
console.log('✓ Modular report subcomponents (ExecutiveSummaryModule, ThesisModule, ValuationModule, SolvencyModule, MicrostructureModule) successfully rendered.');

// Test 6: Morningstar 7-Module Chronology on Institutional Print Page
assert(fslyPrintContent.includes('Module 1 &bull; Executive Summary &amp; Valuation Triage') || fslyPrintContent.includes('Module 1 &bull; Executive Summary & Valuation Triage'), 'Print view must include Module 1');
assert(fslyPrintContent.includes('Module 2 &bull; Deep Qualitative Dissection: Strategy &amp; Theses') || fslyPrintContent.includes('Module 2 &bull; Deep Qualitative Dissection: Strategy & Theses'), 'Print view must include Module 2');
assert(fslyPrintContent.includes('Module 3 &bull; Peer Benchmarking Matrix &amp; Competitors') || fslyPrintContent.includes('Module 3 &bull; Peer Benchmarking Matrix & Competitors'), 'Print view must include Module 3');
assert(fslyPrintContent.includes('Module 4 &amp; 5 &bull; Financial Health, Debt &amp; 8-Quarter EPS') || fslyPrintContent.includes('Module 4 & 5 &bull; Financial Health, Debt & 8-Quarter EPS'), 'Print view must include Module 4 & 5');
assert(fslyPrintContent.includes('Module 6 &bull; Valuation Methodology &amp; 8-Model Intrinsic Matrix') || fslyPrintContent.includes('Module 6 &bull; Valuation Methodology & 8-Model Intrinsic Matrix'), 'Print view must include Module 6');
assert(fslyPrintContent.includes('Module 7 &bull; Compliance, Governance &amp; Disclosures') || fslyPrintContent.includes('Module 7 &bull; Compliance, Governance & Disclosures'), 'Print view must include Module 7');
assert(fslyPrintContent.includes('mstar-metric-strip'), 'Print view must include Morningstar persistent 8-tile header strip');
assert(fslyPrintContent.includes('page-break'), 'Print view must contain page breaks for institutional pagination');
assert(fslyPrintContent.includes('no-print'), 'Print view must include screen toolbar hidden on paper print');
// Test 7: Executive Summary Full-Width Expand Feature
assert(fslyWebContent.includes('id="btn-expand-executive-summary"'), 'Web page must contain btn-expand-executive-summary ID');
assert(fslyWebContent.includes('id="exec-summary-fullwidth-slot"'), 'Web page must contain exec-summary-fullwidth-slot ID');
assert(fslyWebContent.includes('id="exec-summary-normal-slot"'), 'Web page must contain exec-summary-normal-slot ID');
assert(fslyWebContent.includes('id="sec-executive-summary"'), 'Web page must contain sec-executive-summary ID');
assert(fslyWebContent.includes('id="exec-expand-icon-expand"'), 'Web page must contain expand icon');
assert(fslyWebContent.includes('id="exec-expand-icon-collapse"'), 'Web page must contain collapse icon');
assert(fslyWebContent.includes('aria-controls="sec-executive-summary"'), 'Expand button must have aria-controls set to sec-executive-summary');
console.log('✓ Executive Summary & Strategic Takeaways Full-Width Expand Feature verified.');

console.log('\n🎉 ALL REPORT STRUCTURE & PDF EXPORT VERIFICATION TESTS PASSED!\n');

