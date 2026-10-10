# Architecture & Implementation Plan: Interactive, Scannable Reporting & Institutional PDF Export

## 1. Executive Summary & Objective

This plan addresses two core requirements for **EquiSight Alpha**:
1. **Interactive, Scannable Web Experience ("Quick View at First Glance"):**
   Allow users to immediately understand a stock's valuation, risk profile, catalyst driver, and fundamental moat within 5 seconds of opening the page, before giving them an interactive, tabbed deep-dive workspace.
2. **Formal Institutional Research PDF:**
   Provide a single-click, print-perfect institutional research report formatted in strict accordance with the **Morningstar Equity Analyst 7-Module Chronology** (as specified in [`MorningstarEquityAnalystReportFramework.md`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/MorningstarEquityAnalystReportFramework.md)).

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REPORT PAGE ([slug].astro)                      │
├────────────────────────────────────────────────────────────────────────┤
│ [SECTION 1] STICKY ACTION & METADATA BAR                               │
│ • Ticker, Price, Move %, Rating (★★★), PDF Download Button             │
├────────────────────────────────────────────────────────────────────────┤
│ [SECTION 2] FIRST-GLANCE QUICK-VIEW DASHBOARD (< 5-Sec Scan)           │
│ ┌───────────────────┬───────────────────┬────────────────────────────┐ │
│ │ Valuation Gauge   │ Catalyst Diagnosis│ Economic Moat & Solvency   │ │
│ │ • Star Rating     │ • News Headline   │ • 5 Moat Pillars Summary   │ │
│ │ • Fair Value FVE  │ • Alignment State │ • Cash Runway / Debt Risk  │ │
│ │ • Margin of Safety│ • Squeeze / RVOL  │ • 8-Quarter EPS Trend      │ │
│ └───────────────────┴───────────────────┴────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ [SECTION 3] INTERACTIVE TABBED DEEP-DIVE WORKSPACE                     │
│ [Overview] | [Thesis & Citations] | [Valuation Models] | [Microstructure]
│                                                                        │
│ • Tab 1: Thesis & Outlook (Bull vs. Bear with citation deduction modal)│
│ • Tab 2: Financial Health & Balance Sheet (Debt waterfall, ROE, P/E)   │
│ • Tab 3: Multi-Method Intrinsic Valuation (DCF 3-stage fade, RIM, NAV) │
│ • Tab 4: Market Flow & Microstructure (Gamma skew, float turnover)     │
├────────────────────────────────────────────────────────────────────────┤
│ [SECTION 4] HIDDEN INSTITUTIONAL PDF PRINT-STREAM                      │
│ Formatted with @media print CSS matching Morningstar 7-Module Layout   │
│ • Page 1: Persistent Header, FVE Chart, Business Strategy & Outlook    │
│ • Page 2: Bulls Say / Bears Say, Economic Moat & Capital Allocation    │
│ • Page 3: Peer Benchmarking Matrix & Competitors Comparison            │
│ • Page 4: 10-Year Historical Financials & 3-Year Forward Estimates     │
│ • Page 5: Valuation Methodology & Three-Stage DCF Parameters           │
│ • Page 6: Compliance Disclosures & Publisher's Exemption Notices       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component & Implementation Breakdown

### Phase 1: First-Glance "Quick View" Executive Dashboard
Replace the current wall of tables at the top of [`src/pages/reports/[slug].astro`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/pages/reports/%5Bslug%5D.astro) with a visual, color-coded triage grid:

1. **Valuation & Margin of Safety Tile:**
   * Prominent **Morningstar Star Rating** badge (e.g. `★★★★☆ (4/5 Stars) - Undervalued`).
   * **Fair Value Estimate (FVE)** vs. Current Market Price with a visual horizontal range bar (`Current Price: $14.20` vs `Intrinsic FVE: $22.50`, showing `+58.4%` upside/discount).
   * **Required Margin-of-Safety entry hurdle** (`5★ Buy Below $13.50` | `1★ Trim Above $31.00`).
2. **Session Catalyst & Manipulation Triage:**
   * **Catalyst Alignment Tag:** `ALIGNED` (Green), `DIVERGENT_SELL_THE_NEWS` (Orange), `NOISE_SPECULATION` (Rose).
   * **Artificial Inflation Risk Pill:** Low / Moderate / High / Extreme with RVOL and Float Turnover indicators.
3. **Moat & Solvency Snapshot:**
   * **Economic Moat Pill:** Wide / Narrow / None with Moat Trend (`Stable`, `Positive`, `Negative`).
   * **Financial Health Traffic Light:** Solvency risk (Short-term debt maturity coverage vs. cash reserves).

---

### Phase 2: Interactive Scannable Deep-Dive Workspace (Tabs + Filters)
Refactor the 1,200-line monolithic [`[slug].astro`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/pages/reports/%5Bslug%5D.astro) template into clean modular components in `src/components/report/`:

* **`QuickViewDashboard.astro`**: The top-level 3-tile scan bar.
* **`ReportTabsNav.astro`**: Zero-dependency client-side tab switcher with URL hash persistence (`#thesis`, `#valuation`, `#solvency`, `#market-flow`).
* **`ThesisModule.astro`**: Bull & Bear cards with interactive deduction modal, citation badges, and SEC link verification.
* **`ValuationModule.astro`**: 8-model intrinsic matrix with interactive WACC/Growth sensitivity toggles and DCF Stage I/II/III breakdown.
* **`SolvencyModule.astro`**: Interactive debt maturity schedule, 8-quarter EPS surprise chart, P/E and P/B comparison vs industry.
* **`MicrostructureModule.astro`**: Gamma imbalance ratio, float turnover, and retail sentiment indicators.

---

### Phase 3: Formal Institutional PDF Generation Engine
Deliver institutional-grade PDF reports conforming to [`MorningstarEquityAnalystReportFramework.md`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/MorningstarEquityAnalystReportFramework.md):

#### Architecture Option A: Native Browser-Print Engine (`window.print()`) with Print CSS
* **Mechanism:** Add a dedicated `@media print` stylesheet and a hidden/streamlined DOM layout matching Morningstar's multi-page template.
* **UX:** User clicks **"Export Institutional PDF"** $\rightarrow$ opens native PDF print dialog formatted with institutional headers, page breaks (`page-break-after: always`), footers, 2-column editorial layouts, and black/navy styling.
* **Pros:** Zero bundle size overhead, zero server latency, works instantly on client side.

#### Architecture Option B: Static / Server-Rendered PDF Route (`/reports/[slug].pdf` or Print View `/reports/[slug]/print`)
* **Mechanism:** Create a dedicated route `src/pages/reports/[slug]/print.astro` designed exclusively for print/PDF capture.
* **Features:**
  * Clean institutional typography (Times New Roman / Inter serif styling matching Morningstar report).
  * Strict page budget (Page 1: Summary & FVE, Page 2: Qualitative Theses, Page 3: Valuation & Peers, Page 4: Disclosures).
  * Auto-triggers `window.print()` on load or can be piped through a headless generator if deployed.

---

## 4. Work Breakdown & Execution Steps

| Step | Action | Files Affected |
| :---: | :--- | :--- |
| **Step 1** | Extract shared report subcomponents from [`[slug].astro`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/pages/reports/%5Bslug%5D.astro) to create modular structure | `src/components/report/*.astro` |
| **Step 2** | Design & implement the **Quick-View First-Glance Dashboard** component | `src/components/report/QuickViewDashboard.astro` |
| **Step 3** | Implement **Interactive Tabbed Navigation** with responsive mobile fallbacks | `src/components/report/ReportTabsNav.astro` |
| **Step 4** | Build the **Institutional PDF Print Layout** adhering to Morningstar 7-Module standard | `src/pages/reports/[slug]/print.astro` and `@media print` styles in `[slug].astro` |
| **Step 5** | Add "Download Institutional PDF" action button with keyboard shortcut (`Cmd+P` / `Ctrl+P`) support | `src/pages/reports/[slug].astro` |
| **Step 6** | Run type check (`astro check` / build tests) to ensure zero regressions | `tests/`, `npm run build` |

---

## 5. Verification & Acceptance Criteria
1. **First-Glance Test:** When loading `/reports/[slug]`, the user sees Star Rating, Fair Value, Margin of Safety, and Catalyst Alignment within the top viewport without scrolling.
2. **Interactivity Test:** Clicking between tabs (`Thesis`, `Valuation`, `Solvency`, `Microstructure`) immediately updates content smoothly without reloading or layout shift.
3. **Institutional PDF Test:** Clicking "Export Institutional PDF" generates a multi-page document matching Morningstar standards (Module 1 through 7, clean page breaks, no clipped elements, proper disclaimers).
4. **Build Integrity:** `npm run build` completes successfully with all static pages rendered.
