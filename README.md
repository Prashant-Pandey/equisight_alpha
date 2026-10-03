# EquiSight Alpha: Fully Automated Equity Intelligence Platform

A zero-touch, institutional-grade equity analysis and passive monetization engine. Built with a Node.js multi-agent pipeline, open-source financial ingestion, dynamic contextual affiliate/ad injection, and an Astro.build static frontend architected to scale to 5,000+ unique reports annually.

Operating strictly under the statutory **Publisher's Exemption** of the U.S. Investment Advisers Act of 1940 (Section 202(a)(11)(D)) and FINRA Rule 2210.

---

## 🏛 Platform Architecture Overview

```
                                  +-----------------------------------------------+
                                  |            CRON ORCHESTRATOR                  |
                                  |    (Twice Daily: 07:00 EST & 16:30 EST)       |
                                  +-----------------------+-----------------------+
                                                          |
                      +-----------------------------------+-----------------------------------+
                      |                                   |                                   |
         +------------v------------+         +------------v------------+         +------------v------------+
         |   MARKET MOVERS INGEST  |         |   FUNDAMENTAL & MACRO   |         |   SOCIAL SENTIMENT      |
         |  - US (NYSE / NASDAQ)   |         |  - Balance Sheet/Debt   |         |  - StockTwits Stream    |
         |  - EU (LSE/Euronext/DAX)|         |  - Free Cash Flow/ROIC  |         |  - Reddit Discussions   |
         |  - 365-Day Lockout Filter|        |  - 10Y Yields / ECB / CPI|        |  - Discussion Delta     |
         +------------+------------+         +------------+------------+         +------------+------------+
                      |                                   |                                   |
                      +-----------------------------------+-----------------------------------+
                                                          |
                                            +-------------v-------------+
                                            |   LLM SYNTHESIS AGENT     |
                                            |   - Multi-agent synthesis |
                                            |   - Publisher Exemption   |
                                            +-------------+-------------+
                                                          |
                                            +-------------v-------------+
                                            |  ANTI-HALLUCINATION CHECK |
                                            |   - Strict tolerance math |
                                            |   - Auto-healing patches  |
                                            +-------------+-------------+
                                                          |
                                            +-------------v-------------+
                                            | PROGRAMMATIC MONETIZATION |
                                            |   - Contextual Affiliates |
                                            |   - Native Ad Placements  |
                                            +-------------+-------------+
                                                          |
                      +-----------------------------------+-----------------------------------+
                      |                                                                       |
         +------------v------------+                                             +------------v------------+
         |  ASTRO BUILD & DEPLOY   |                                             |  SOCIAL DISTRIBUTION    |
         |  - Static Generation    |                                             |  - Twitter/X Thread     |
         |  - Schema.org JSON-LD   |                                             |  - Reddit Deep-Dive     |
         |  - Sub-second TTFB Edge |                                             |  - Telegram Alerts      |
         +-------------------------+                                             +-------------------------+
```

---

## 🚀 Quick Start

### 1. Requirements
* Node.js v20+ or v22+
* npm or pnpm

### 2. Installation
```bash
cd stock-intel-platform
npm install
```

### 3. Run Pipeline Tests
```bash
npm run pipeline:test
```
Verifies:
* 12-month lock-out exclusion logic
* US vs EU contextual affiliate mapping
* Anti-hallucination fact-checking and automated heuristic healing
* Market movers ingestion (5 gainers, 5 losers)
* Programmatic ad container injection

### 4. Execute an Immediate Ingestion & Build Cycle
```bash
npm run pipeline:run
```
Fetches movers, ingests financials and macro context, fact-checks and formats 10 reports, writes markdown to `src/content/reports/`, builds the Astro static output to `dist/`, and broadcasts social threads.

### 5. Launch the Continuous Twice-Daily Daemon
```bash
npm run pipeline:cron
```
Schedules automated runs at:
* **Pre-Market Cycle:** 07:00 AM EST (`0 7 * * 1-5`)
* **Post-Market Cycle:** 16:30 PM EST (`30 16 * * 1-5`)

### 6. Local Frontend Preview
```bash
npm run dev
# Or preview built static edge files:
npm run preview
```
Visit `http://localhost:4321`.

---

## 📁 Exact Directory Tree

```
stock-intel-platform/
├── package.json                   # Dependencies, build scripts & CLI shortcuts
├── tsconfig.json                  # Strict TypeScript configuration
├── astro.config.mjs               # Astro static config with sitemap, mdx, tailwind
├── tailwind.config.cjs            # Tailwind theme with typography plugin
├── .env.example                   # Complete configuration variables
├── pipeline/
│   ├── src/
│   │   ├── config.ts              # Typed configuration with fallback defaults
│   │   ├── types.ts               # Core domain TypeScript interfaces
│   │   ├── orchestrator.ts        # Master cron controller & error boundary
│   │   ├── utils/
│   │   │   └── httpClient.ts      # Resilient HTTP fetcher with jitter & 429 backoff
│   │   ├── ingestion/
│   │   │   ├── marketMovers.ts    # US & EU movers with 12-month lockout filter
│   │   │   ├── fundamentalData.ts # Solvency, P/E, FCF, margins & balance sheet
│   │   │   ├── macroContext.ts    # 10Y Yields, Fed/ECB rates, VIX, WTI Oil
│   │   │   └── socialSentiment.ts # StockTwits & Reddit sentiment scraper
│   │   ├── llm/
│   │   │   ├── prompts.ts         # Publisher Exemption system directives
│   │   │   ├── factChecker.ts     # Anti-hallucination verification & auto-healing
│   │   │   └── synthesisAgent.ts  # Multi-agent LLM connector (OpenAI/Anthropic/Fallback)
│   │   ├── monetization/
│   │   │   ├── affiliateEngine.ts # Contextual affiliate mapper (IBKR, Webull, TV, SA)
│   │   │   └── adInjector.ts      # Programmatic ad placeholder & disclosure injector
│   │   ├── storage/
│   │   │   ├── historyTracker.ts  # Trailing 12-month exclusion database
│   │   │   └── reportGenerator.ts # Astro MDX file generator with frontmatter
│   │   ├── distribution/
│   │   │   └── socialPublisher.ts # Twitter/X thread, Reddit r/stocks, Telegram alerts
│   │   └── deploy/
│   │       └── buildAndDeploy.ts  # Static Astro compilation & automated git deployer (add, commit, push)
│   ├── data/
│   │   └── coverage-history.json  # Persisted 365-day lockout database
│   └── logs/
│       └── social-distribution.log# Distribution broadcast telemetry
├── src/
│   ├── content/
│   │   ├── config.ts              # Astro Content Collections Zod schema
│   │   └── reports/               # Auto-generated markdown reports (5,000+ capacity)
│   ├── components/
│   │   ├── SEOHead.astro          # OpenGraph, Twitter, Schema.org FinancialArticle
│   │   ├── ComplianceDisclaimer.astro # Mandatory Publisher's Exemption legal notice
│   │   ├── AdSlot.astro           # Zero-CLS programmatic ad container
│   │   ├── AffiliateBanner.astro  # Contextual partner card with FTC disclosure
│   │   ├── FinancialMetricsTable.astro # Snapshot table for valuation & solvency
│   │   ├── Header.astro           # Live macro ribbon & navigation
│   │   └── Footer.astro           # Regulatory citations, archive & RSS links
│   ├── layouts/
│   │   └── BaseLayout.astro       # Master HTML shell
│   └── pages/
│       ├── index.astro            # Real-time dashboard: Gainers, Losers, Macro
│       ├── reports/
│       │   ├── [slug].astro       # Dynamic report view with MDX, ads & disclaimers
│       │   └── index.astro        # Paginated searchable archive for 5,000+ reports
│       ├── tickers/
│       │   └── [ticker].astro     # High-authority permanent hub per ticker
│       ├── disclaimer.astro       # Dedicated statutory Publisher's Exemption page
│       └── rss.xml.ts             # RSS 2.0 financial syndication feed
└── tests/
    └── pipeline.test.ts           # Automated test suite
```

---

## ⚖️ Regulatory Compliance: The Publisher's Exemption

To ensure full passive protection without licensing as a Registered Investment Adviser (RIA), EquiSight Alpha implements four statutory pillars:

1. **Statutory Exclusion:** Adheres strictly to Section 202(a)(11)(D) of the U.S. Investment Advisers Act of 1940 and the Supreme Court precedent in *Lowe v. SEC*, 472 U.S. 181 (1985).
2. **Impersonal Analysis:** Content is distributed broadly on a scheduled, recurring basis to the general public. No personalized portfolio advice, buy/sell directives, or individual recommendations are ever generated.
3. **FINRA Rule 2210 Standards:** Balanced presentation featuring an objective Bull Thesis and Bear Thesis with equal empirical rigor.
4. **FTC 16 CFR § 255.5 Disclosures:** Explicit disclosure of commercial affiliate partnerships alongside a statement certifying that covered tickers are selected strictly through automated mathematical filters.

---

## 💰 Programmatic Monetization Mapping

Affiliate offers are programmatically mapped based on ticker metadata without manual intervention:

| Ticker Characteristic | Primary Broker / Partner | Specialized Tool | Rationale |
| :--- | :--- | :--- | :--- |
| **European Equities (.L, .DE, .PA)** | Interactive Brokers EU | TradingView Pro | Direct European multi-currency routing |
| **US Growth & Tech** | Webull Financial US | TradingView Pro / Benzinga | Commission-free options, extended hours, Pine Script |
| **High Dividend (> 2.5%)** | Webull / IBKR | Seeking Alpha Premium | Dividend safety ratings & payout coverage |
| **High Volatility (Beta > 1.4)** | Webull Financial | Benzinga Pro | Real-time squawk & unusual options flow |

Ads are programmatically injected at three high-CTR coordinates:
1. **Slot A:** Inline partner card immediately following the Executive Summary.
2. **Slot B:** Mid-article programmatic ad placeholder before Valuation Multiples.
3. **Slot C:** Secondary analytical tool box preceding the Risk/Reward section.
