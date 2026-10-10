import fs from 'fs';
import path from 'path';
import {
  generateImprovedTitle,
  improveExistingTitle,
  cleanCompanyName
} from '../src/utils/titleGenerator';
import { formatHowCompanyMakesMoney } from '../pipeline/src/ingestion/fundamentalData/questionsAndDynamics';
import { buildTheses } from '../pipeline/src/monetization/adInjector';
import type { MarketMover, FundamentalMetrics, LLMAnalysisOutput } from '../pipeline/src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Running Report Feedback Improvements Verification Tests...\n');

// =========================================================================
// TEST 1: Title Generation & Elevation Tests
// =========================================================================
console.log('--- Test 1: Title Generation & Elevation ---');

// 1.1 Clean company name
assert(cleanCompanyName('BNP Paribas S.A.') === 'BNP Paribas', 'BNP Paribas legal suffix stripped');
assert(cleanCompanyName('Microsoft Corporation') === 'Microsoft', 'Microsoft legal suffix stripped');
assert(cleanCompanyName('Norbit ASA') === 'Norbit', 'Norbit legal suffix stripped');
assert(cleanCompanyName('Alphabet Inc.') === 'Alphabet', 'Alphabet legal suffix stripped');
assert(cleanCompanyName('Badger Meter, Inc.') === 'Badger Meter', 'Badger Meter legal suffix stripped');
assert(cleanCompanyName('Fastly, Inc.') === 'Fastly', 'Fastly legal suffix stripped');

// 1.2 Title style: Deep Dive
const bnpTitle = generateImprovedTitle({
  companyName: 'BNP Paribas S.A.',
  ticker: 'BNP',
  preferredStyle: 'deep_dive',
  deepDiveSubtitle: 'From European Bank to Diversified Financial Compounder'
});
assert(
  bnpTitle === 'Stock Deep Dive: BNP Paribas - From European Bank to Diversified Financial Compounder',
  `Expected BNP deep dive title, got: ${bnpTitle}`
);

// 1.3 Title style: Direct Buy Question
const msftTitle = generateImprovedTitle({
  companyName: 'Microsoft Corporation',
  ticker: 'MSFT',
  preferredStyle: 'buy_question'
});
assert(msftTitle === 'Microsoft Stock Analysis: Is MSFT a Buy?', `Expected MSFT buy title, got: ${msftTitle}`);

// 1.4 Title style: Small-Cap Inquiry
const norbitTitle = generateImprovedTitle({
  companyName: 'Norbit ASA',
  ticker: 'NORBIT',
  marketCap: 450e6,
  country: 'Norwegian',
  preferredStyle: 'small_cap'
});
assert(
  norbitTitle === 'Norbit Stock Analysis: Is This Norwegian Small-Cap Still a Buy?',
  `Expected Norbit small-cap title, got: ${norbitTitle}`
);

// 1.5 Title style: Forward Horizon Buy Question
const googlTitle = generateImprovedTitle({
  companyName: 'Alphabet Inc.',
  ticker: 'GOOGL',
  year: 2026,
  preferredStyle: 'buy_year'
});
assert(
  googlTitle === 'Alphabet Stock Analysis: Is GOOGL a Buy in 2026?',
  `Expected GOOGL 2026 title, got: ${googlTitle}`
);

// 1.6 Title style: Quality But Not At The Right Price
const badgerTitle = generateImprovedTitle({
  companyName: 'Badger Meter, Inc.',
  ticker: 'BMI',
  verdict: 'Significantly Overvalued',
  preferredStyle: 'quality_price'
});
assert(
  badgerTitle === 'Badger Meter Stock Analysis: Quality But Not At The Right Price',
  `Expected Badger Meter quality/price title, got: ${badgerTitle}`
);

// 1.7 Elevate legacy mechanical title
const legacyTitle = 'Fastly, Inc. (FSLY) Surges +15.9%: Fundamental & Valuation Analysis';
const elevatedTitle = improveExistingTitle(legacyTitle, {
  companyName: 'Fastly, Inc.',
  ticker: 'FSLY',
  verdict: 'Significantly Overvalued'
});
assert(
  elevatedTitle === 'Fastly Stock Analysis: Quality But Not At The Right Price',
  `Expected elevated title, got: ${elevatedTitle}`
);

console.log('✓ All title generation and pattern elevation tests passed.');

// =========================================================================
// TEST 2: "How Does <company> Make Money?" Bullet Points & Cyclicality
// =========================================================================
console.log('\n--- Test 2: "How Does <company> Make Money?" Segment Breakdown ---');

// 2.1 Norbit exact segments test
const norbitRaw: any = {
  companyName: 'Norbit ASA',
  sector: 'Technology',
  industry: 'Scientific & Technical Instruments'
};
const norbitMoneyText = formatHowCompanyMakesMoney(norbitRaw);

assert(norbitMoneyText.includes('Norbit makes money through 3 business segments:'), 'Norbit intro segment count verified');
assert(norbitMoneyText.includes('- Ocean business segment.'), 'Norbit Ocean segment bullet verified');
assert(norbitMoneyText.includes('- Connectivity.'), 'Norbit Connectivity segment bullet verified');
assert(norbitMoneyText.includes('- Product Innovation & Realization (PIR)'), 'Norbit PIR segment bullet verified');
assert(norbitMoneyText.includes('Most activities are cyclical and depend on contracts with a limited visibility.'), 'Cyclicality opening verified');
assert(norbitMoneyText.includes('the cycles do not always move in perfect synchronisation which helps smooth cyclicality.'), 'Cycle smoothing conclusion verified');

// 2.2 General reporting segments test
const fslyRaw: any = {
  companyName: 'Fastly, Inc.',
  sector: 'Technology',
  industry: 'Services-Prepackaged Software',
  segmentRevenueBreakdown: [
    { segment: 'Network Services', revenue: 450e6 },
    { segment: 'Security Solutions', revenue: 150e6 },
    { segment: 'Edge Applications & Compute', revenue: 90e6 }
  ]
};
const fslyMoneyText = formatHowCompanyMakesMoney(fslyRaw);

assert(fslyMoneyText.includes('Fastly makes money through 3 business segments:'), 'Fastly intro segment count verified');
assert(fslyMoneyText.includes('- Network Services.'), 'Fastly Network Services bullet verified');
assert(fslyMoneyText.includes('- Security Solutions.'), 'Fastly Security Solutions bullet verified');
assert(fslyMoneyText.includes('- Edge Applications & Compute.'), 'Fastly Compute bullet verified');
assert(fslyMoneyText.includes('Most activities are cyclical and depend on contracts with a limited visibility.'), 'Fastly cyclicality text verified');

console.log('✓ "How Does <company> Make Money?" bulleted structure and cyclicality synthesis verified.');

// =========================================================================
// TEST 3: Bullish & Bearish Quality Theses Integration
// =========================================================================
console.log('\n--- Test 3: Quality Bullish & Bearish Theses Retaining Existing Points ---');

const mockMover: MarketMover = {
  ticker: 'NORBIT',
  symbol: 'NORBIT',
  name: 'Norbit ASA',
  exchange: 'OSL',
  price: 78.5,
  change: 4.5,
  changePercent: 6.2,
  volume: 125000,
  avgVolume: 80000,
  marketCap: 450e6,
  category: 'gainer',
  region: 'EU',
  currency: 'NOK',
  isPennyStock: false,
  moneyMarketTradingVenue: 'Euronext Oslo Børs'
};

const mockFundamentals: FundamentalMetrics = {
  ticker: 'NORBIT',
  companyName: 'Norbit ASA',
  marketCap: 450e6,
  revenueTTM: 150e6,
  netIncomeTTM: 25e6,
  operatingMargin: 21.5,
  peRatioTrailing: 18.0,
  peRatioForward: 15.2,
  priceToBook: 3.2,
  dividendYield: 3.5,
  debtToEquity: 0.25,
  cashAndEquivalents: 35e6,
  totalDebt: 25e6,
  netDebt: -10e6,
  returnOnEquity: 22.0,
  roic: 18.5,
  beta: 0.9,
  sector: 'Technology',
  industry: 'Maritime Tech & Sensor Systems',
  classification: 'Growth & Income Compounder',
  fundamentalRating: 'Quality Compounder',
  cashFlow: { operatingCashFlow: 32e6, status: 'Positive FCF' }
} as any;

const mockAnalysis: LLMAnalysisOutput = {
  title: 'Norbit Stock Analysis: Is This Norwegian Small-Cap Still a Buy?',
  seoDescription: 'Fundamental analysis of Norbit ASA',
  slug: 'norbit-stock-analysis',
  primaryKeywords: [],
  secondaryKeywords: [],
  catalystSummary: 'Quarterly order book expansion',
  markdownBody: '',
  extractedFigures: {} as any,
  socialHooks: {} as any,
  theses: {
    bull: [
      {
        point: 'Consensus 8-Model Valuation Asymmetry supporting multi-year compounding.',
        sources: ['Valuation Engine'],
        deductionChain: 'Valuation discount -> Upside potential.'
      }
    ],
    bear: [
      {
        point: 'European macro rate pressures impacting CapEx deployment.',
        sources: ['ECB Data'],
        deductionChain: 'High hurdle rate -> Slower order placement.'
      }
    ]
  }
};

const compiledTheses = buildTheses(mockMover, mockFundamentals, mockAnalysis);

// Verify existing points are preserved
assert(
  compiledTheses.bull.some((b) => b.point.includes('Consensus 8-Model Valuation Asymmetry')),
  'Existing bullish point must be preserved'
);
assert(
  compiledTheses.bear.some((b) => b.point.includes('European macro rate pressures')),
  'Existing bearish point must be preserved'
);

// Verify Quality Bullish Thesis Points
assert(
  compiledTheses.bull.some((b) => b.point.toLowerCase().includes('vertical integration')),
  'Vertical integration quality thesis must be included'
);
assert(
  compiledTheses.bull.some((b) => b.point.toLowerCase().includes('great m&a strategy and execution')),
  'Great M&A strategy quality thesis must be included'
);
assert(
  compiledTheses.bull.some((b) => b.point.toLowerCase().includes('capital-efficient growth')),
  'Capital-efficient growth quality thesis must be included'
);

// Verify Quality Bearish Risk Theses Points
assert(
  compiledTheses.bear.some((b) => b.point.toLowerCase().includes('customer concentration')),
  'Customer concentration quality risk thesis must be included'
);
assert(
  compiledTheses.bear.some((b) => b.point.toLowerCase().includes('ambitious targets')),
  'Ambitious targets quality risk thesis must be included'
);
assert(
  compiledTheses.bear.some((b) => b.point.toLowerCase().includes('cyclical revenue')),
  'Cyclical revenue quality risk thesis must be included'
);

// Verify total counts (1 existing + 3 quality = 4)
assert(compiledTheses.bull.length >= 4, `Expected at least 4 bull theses, got ${compiledTheses.bull.length}`);
assert(compiledTheses.bear.length >= 4, `Expected at least 4 bear theses, got ${compiledTheses.bear.length}`);

console.log('✓ Quality theses successfully merged with existing empirical points.');

// =========================================================================
// TEST 4: Build Artifacts HTML Verification (Web & Print)
// =========================================================================
console.log('\n--- Test 4: Verifying HTML Output in Built Report ---');

const distReportPath = path.resolve('dist/reports/2026-10-10-fsly-gain-16-percent-fundamental-analysis/index.html');
const distPrintPath = path.resolve('dist/reports/2026-10-10-fsly-gain-16-percent-fundamental-analysis/print/index.html');

assert(fs.existsSync(distReportPath), `Built HTML report should exist at ${distReportPath}`);
assert(fs.existsSync(distPrintPath), `Built print HTML should exist at ${distPrintPath}`);

const reportHtml = fs.readFileSync(distReportPath, 'utf8');
const printHtml = fs.readFileSync(distPrintPath, 'utf8');

// Title verification in web HTML
assert(
  reportHtml.includes('Fastly Stock Analysis: Quality But Not At The Right Price'),
  'Web HTML must contain the improved title'
);

// "How Does Fastly, Inc. Make Money?" bullet points in web HTML
assert(
  reportHtml.includes('Fastly, Inc. makes money through 3 business segments:'),
  'Web HTML must contain 3 business segments intro'
);
assert(
  reportHtml.includes('Network Services segment.'),
  'Web HTML must contain Network Services segment bullet'
);
assert(
  reportHtml.includes('Security Solutions.'),
  'Web HTML must contain Security Solutions segment bullet'
);
assert(
  reportHtml.includes('Edge Applications &amp; Compute.') || reportHtml.includes('Edge Applications & Compute.'),
  'Web HTML must contain Edge Applications segment bullet'
);
assert(
  reportHtml.includes('the cycles do not always move in perfect synchronisation which helps smooth cyclicality.'),
  'Web HTML must contain cyclicality smoothing conclusion'
);

// Quality Theses in Web HTML
assert(
  reportHtml.includes('Vertical integration.'),
  'Web HTML must contain Vertical integration thesis'
);
assert(
  reportHtml.includes('Great M&amp;A strategy and execution.') || reportHtml.includes('Great M&A strategy and execution.'),
  'Web HTML must contain Great M&A strategy thesis'
);
assert(
  reportHtml.includes('Capital-efficient growth.'),
  'Web HTML must contain Capital-efficient growth thesis'
);
assert(
  reportHtml.includes('customer concentration.'),
  'Web HTML must contain customer concentration risk'
);
assert(
  reportHtml.includes('Ambitious targets.'),
  'Web HTML must contain Ambitious targets risk'
);
assert(
  reportHtml.includes('Cyclical revenue.'),
  'Web HTML must contain Cyclical revenue risk'
);

// Print HTML verification
assert(
  printHtml.includes('Business Profile &amp; Operational Architecture') || printHtml.includes('Business Profile & Operational Architecture'),
  'Print HTML must include Business Profile section'
);
assert(
  printHtml.includes('Fastly, Inc. makes money through 3 business segments:'),
  'Print HTML must contain 3 business segments intro'
);
assert(
  printHtml.includes('Vertical integration.'),
  'Print HTML must contain Vertical integration thesis'
);

console.log('✓ Build artifacts HTML verified with improved titles, bulleted segment monetization, and quality theses.');

console.log('\n🎉 ALL REPORT FEEDBACK IMPROVEMENT TESTS PASSED SUCCESSFULLY!\n');
