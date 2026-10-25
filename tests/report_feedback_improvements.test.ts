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

// 2.1 Segments test with segmentRevenueBreakdown
const norbitRaw: any = {
  companyName: 'Norbit ASA',
  sector: 'Technology',
  industry: 'Scientific & Technical Instruments',
  segmentRevenueBreakdown: [
    { segment: 'Ocean business segment', revenue: 65e6 },
    { segment: 'Connectivity', revenue: 45e6 },
    { segment: 'Product Innovation & Realization (PIR)', revenue: 40e6 }
  ]
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

// 2.3 Business summary derived segments test - full untrimmed content
const longSentence1 = 'Novavax, Inc., a biotechnology company, engages in the discovery, development, and commercialization of vaccines to prevent serious infectious diseases in the United States, Europe, and internationally.';
const longSentence2 = 'The company commercializes Nuvaxovid, a COVID-19 vaccine; and R21 Matrix-M adjuvant malaria vaccine across diverse worldwide healthcare channels.';
const longSentence3 = 'It has license and collaboration agreements with Sanofi, Pfizer Inc., Takeda Pharmaceutical Company Limited, and Serum Life Sciences Limited for the to develop, manufacture, and commercialize the COVID-19 vaccine.';
const longSentence4 = 'The company was incorporated in 1987 and is headquartered in Gaithersburg, Maryland.';

const nvaxRaw: any = {
  companyName: 'Novavax, Inc.',
  sector: 'Healthcare',
  industry: 'Biological Products',
  businessSummary: `${longSentence1} ${longSentence2} ${longSentence3} ${longSentence4}`
};
const nvaxMoneyText = formatHowCompanyMakesMoney(nvaxRaw);

assert(nvaxMoneyText.includes(longSentence1), 'Long sentence 1 must be preserved in full without trimming');
assert(nvaxMoneyText.includes(longSentence2), 'Long sentence 2 must be preserved in full without trimming');
assert(nvaxMoneyText.includes(longSentence3), 'Long sentence 3 must be preserved in full without trimming');
assert(nvaxMoneyText.includes(longSentence4), 'Remaining sentence 4 must be included without being dropped or trimmed');
assert(!nvaxMoneyText.includes('...'), 'Untrimmed text must not contain truncation ellipsis');

console.log('✓ "How Does <company> Make Money?" bulleted structure and untrimmed content synthesis verified.');

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

const reportsDistDir = path.resolve('dist/reports');
const fslyDirName = fs.existsSync(reportsDistDir)
  ? (fs.readdirSync(reportsDistDir).find(d => d.includes('fsly-gain-16-percent-fundamental-analysis')) || '2026-10-10-fsly-gain-16-percent-fundamental-analysis')
  : '2026-10-10-fsly-gain-16-percent-fundamental-analysis';
const distReportPath = path.join(reportsDistDir, fslyDirName, 'index.html');
const distPrintPath = path.join(reportsDistDir, fslyDirName, 'print', 'index.html');

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
  reportHtml.includes('business segments:'),
  'Web HTML must contain business segments intro'
);
assert(
  reportHtml.toLowerCase().includes('network services'),
  'Web HTML must contain Network Services segment bullet'
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
  printHtml.includes('business segments:'),
  'Print HTML must contain business segments intro'
);
assert(
  printHtml.includes('Vertical integration.'),
  'Print HTML must contain Vertical integration thesis'
);

console.log('✓ Build artifacts HTML verified with improved titles, bulleted segment monetization, and quality theses.');

// =========================================================================
// TEST 5: Simplified "Macro Condition" (Non-Technical Language) & No Misleading Defaults
// =========================================================================
console.log('\n--- Test 5: Simplified "Macro Condition" & Removal of Misleading Defaults ---');

import { deriveSectorDynamics } from '../pipeline/src/ingestion/valuationBenchmarks.js';
import { buildSystemPrompt, buildUserPrompt } from '../pipeline/src/llm/prompts.js';
import { MAIN_REPORT_SCHEMA } from '../pipeline/src/llm/schemas.js';

// 5.1 Test deriveSectorDynamics produces technical condition and non-technical simplified condition
const techDynamics = deriveSectorDynamics('Technology', 'Services-Prepackaged Software');
assert(techDynamics.industryCondition.length > 0, 'Technical industryCondition must be present');
assert(Boolean(techDynamics.macroConditionSimplified && techDynamics.macroConditionSimplified.length > 0), 'Simplified macroCondition must be present');
assert(Boolean(techDynamics.obstaclesAndChallengesSimplified && techDynamics.obstaclesAndChallengesSimplified.length > 0), 'Simplified obstaclesAndChallenges must be present');
assert(Boolean(techDynamics.economicPoliticalCulturalRisksSimplified && techDynamics.economicPoliticalCulturalRisksSimplified.length > 0), 'Simplified economicPoliticalCulturalRisks must be present');
assert(
  Boolean(techDynamics.macroConditionSimplified && techDynamics.macroConditionSimplified.includes('Tech companies are seeing strong adoption')),
  'Simplified condition should be in plain, non-technical language'
);

const healthDynamics = deriveSectorDynamics('Healthcare', 'Biological Products');
assert(Boolean(healthDynamics.macroConditionSimplified && healthDynamics.macroConditionSimplified.length > 0), 'Healthcare simplified condition present');
assert(Boolean(healthDynamics.obstaclesAndChallengesSimplified && healthDynamics.obstaclesAndChallengesSimplified.length > 0), 'Healthcare simplified obstacles present');
assert(Boolean(healthDynamics.economicPoliticalCulturalRisksSimplified && healthDynamics.economicPoliticalCulturalRisksSimplified.length > 0), 'Healthcare simplified risks present');
assert(
  Boolean(healthDynamics.macroConditionSimplified && healthDynamics.macroConditionSimplified.includes('Healthcare and biotech businesses rely on')),
  'Healthcare simplified condition should be in plain, non-technical language'
);

// 5.2 Test System and User Prompts instruct LLM for simplified Macro Condition, Obstacles, and Risks
const sysPrompt = buildSystemPrompt();
assert(
  sysPrompt.includes('Macro Condition in Simplified Terms') &&
  sysPrompt.includes('macroConditionSimplified') &&
  sysPrompt.includes('non-technical language'),
  'System prompt must instruct LLM to generate Macro Condition in simplified terms'
);
assert(
  sysPrompt.includes('Obstacles and Challenges in Simplified Terms') &&
  sysPrompt.includes('obstaclesAndChallengesSimplified'),
  'System prompt must instruct LLM to generate obstaclesAndChallengesSimplified'
);
assert(
  sysPrompt.includes('Economic, Political, and Cultural Risks in Simplified Terms') &&
  sysPrompt.includes('economicPoliticalCulturalRisksSimplified'),
  'System prompt must instruct LLM to generate economicPoliticalCulturalRisksSimplified'
);

const test5Mover: any = {
  ticker: 'TEST',
  name: 'Test Inc',
  exchange: 'NASDAQ',
  region: 'US',
  price: 50,
  changePercent: 5,
  volume: 1000000,
  avgVolume: 500000,
  category: 'gainer',
  isPennyStock: false,
  moneyMarketTradingVenue: 'Nasdaq Global Select'
};
const test5Fundamentals: any = {
  ...mockFundamentals,
  fiftyTwoWeekLow: 40,
  fiftyTwoWeekHigh: 80,
  earningsPerShare: { currentTTM: 2.0 },
  managementQuality: { rating: 'Exemplary', trackRecord: 'Strong' },
  competitiveMoat: { rating: 'Wide', summary: 'Moat' },
  companyQuestions: { howCompanyMakesMoney: 'A', productsDemandAndWhy: 'B', pastPerformanceSummary: 'C', growthAndProfitabilityOutlook: 'D' },
  industryQuestions: { industryCondition: 'Technical backdrop text', obstaclesAndChallenges: 'Hurdles', economicPoliticalCulturalRisks: 'Risks' },
  sectorDynamics: { industryCondition: 'Technical backdrop text', macroConditionSimplified: 'Plain English macro condition', obstaclesAndChallenges: 'Hurdles', economicPoliticalCulturalRisks: 'Risks' },
  valuationModels: {
    consensusFairValue: 65,
    verdict: 'Undervalued',
    dcf: { fairValue: 70, upsidePercent: 40 },
    ddm: { fairValue: 60, upsidePercent: 20 },
    relativeValuation: { fairValue: 65, upsidePercent: 30 },
    rapidStockValuation: { fairValue: 64, upsidePercent: 28 },
    residualIncomeModel: { fairValue: 66, upsidePercent: 32 },
    assetBasedValuation: { fairValue: 50, upsidePercent: 0 },
    excessReturnModel: { fairValue: 65, upsidePercent: 30 },
    industrySpecificModel: { fairValue: 68, upsidePercent: 36 }
  }
};
const test5Macro: any = {
  us10YearYield: 4.25,
  us2YearYield: 4.0,
  fedFundsRate: 4.75,
  ecbPolicyRate: 3.5,
  vixIndex: 15,
  crudeOilWTI: 75,
  sectorImpactSummary: 'Benign'
};
const test5Sentiment: any = {
  bullishPercent: 70,
  bearishPercent: 30,
  volumeAnomalyRatio: 2.0,
  artificialInflationRisk: 'Low',
  majorPriceDriver: 'Earnings',
  dominantThemes: ['growth']
};

const userPrompt = buildUserPrompt(test5Mover, test5Fundamentals, test5Macro, test5Sentiment);
assert(
  userPrompt.includes('Technical Macro Condition:') &&
  userPrompt.includes('Macro Condition Directive:') &&
  userPrompt.includes('macroConditionSimplified'),
  'User prompt must clearly designate technical Macro Condition and direct generation of simplified Macro Condition'
);
assert(
  userPrompt.includes('Obstacles Directive:') &&
  userPrompt.includes('obstaclesAndChallengesSimplified'),
  'User prompt must include Obstacles Directive for obstaclesAndChallengesSimplified'
);
assert(
  userPrompt.includes('Risks Directive:') &&
  userPrompt.includes('economicPoliticalCulturalRisksSimplified'),
  'User prompt must include Risks Directive for economicPoliticalCulturalRisksSimplified'
);

// 5.3 Test MAIN_REPORT_SCHEMA includes macroConditionSimplified, obstaclesAndChallengesSimplified, economicPoliticalCulturalRisksSimplified
assert(
  'macroConditionSimplified' in MAIN_REPORT_SCHEMA.properties,
  'MAIN_REPORT_SCHEMA must include macroConditionSimplified property'
);
assert(
  'obstaclesAndChallengesSimplified' in MAIN_REPORT_SCHEMA.properties,
  'MAIN_REPORT_SCHEMA must include obstaclesAndChallengesSimplified property'
);
assert(
  'economicPoliticalCulturalRisksSimplified' in MAIN_REPORT_SCHEMA.properties,
  'MAIN_REPORT_SCHEMA must include economicPoliticalCulturalRisksSimplified property'
);

// 5.4 Test slug.astro does NOT contain misleading static default and extracts simplified obstacles and risks
const slugAstroPath = path.resolve(process.cwd(), 'src/pages/reports/[slug].astro');
const slugAstroContent = fs.readFileSync(slugAstroPath, 'utf-8');
const misleadingDefault = 'The ${report.industry} sector is driven by steady commercial demand, ongoing digital transformation, and broad economic capital spending cycles.';
assert(
  !slugAstroContent.includes(misleadingDefault),
  'slug.astro must NOT contain the misleading static default'
);
assert(
  slugAstroContent.includes('obstaclesAndChallengesSimplified') &&
  slugAstroContent.includes('simplifiedObstacles'),
  'slug.astro must extract and use simplifiedObstacles'
);
assert(
  slugAstroContent.includes('economicPoliticalCulturalRisksSimplified') &&
  slugAstroContent.includes('simplifiedRisks'),
  'slug.astro must extract and use simplifiedRisks'
);

// 5.5 Test generated HTML renders simplified layman view and technical popover data
assert(
  reportHtml.includes('Tech companies are seeing strong adoption of software and digital tools'),
  'Report HTML must display the simplified Macro Condition in layman terms'
);
assert(
  reportHtml.includes('data-technical="The Technology sector (Services-Prepackaged Software)'),
  'Report HTML info button must retain the technical Macro Condition in data-technical'
);

console.log('✓ Simplified "Macro Condition" generation, prompt enforcement, and removal of misleading defaults verified.');

console.log('\n🎉 ALL REPORT FEEDBACK IMPROVEMENT TESTS PASSED SUCCESSFULLY!\n');
