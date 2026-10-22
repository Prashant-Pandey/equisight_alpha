# EquiSight Alpha: Institutional Financial Definitions & Quantitative Heuristics Registry

> **Document Type:** Institutional Domain Specification & Methodology Governance Handbook  
> **Audience:** Financial Domain Experts, Equity Research Reviewers, Compliance Officers & CFA Charterholders  
> **Code Implementation:** [`src/utils/financialDefinitions.ts`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/utils/financialDefinitions.ts) & [`src/utils/financialClassification.ts`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/utils/financialClassification.ts)  
> **Live Reviewer Portal:** [`/definitions`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/pages/definitions.astro)

---

## 1. Executive Summary & Reviewer Governance

This registry establishes the single source of truth for all quantitative heuristics, equity style classifications, solvency tiers, management stewardship standards, and intrinsic margin-of-safety rules utilized across the **EquiSight Alpha** automated equity intelligence platform.

To maintain strict domain relevance, regulatory compliance, and auditability for institutional human reviewers:
1. **Zero Hardcoded Heuristics in Pipeline Code:** All thresholds are centralized in [`FINANCIAL_THRESHOLDS`](file:///Users/prashantpandey/Desktop/Projects/ai-agents/FinanceBlog/src/utils/financialDefinitions.ts#L42).
2. **Standard Financial Theory Anchors:** Every classification maps to established capital market standards, including SEC statutory rules, Morningstar equity research methodology, the Capital Asset Pricing Model (CAPM), Jensen & Meckling agency theory, and Graham & Dodd security analysis.
3. **Structured Reviewer Audit Notes:** Each metric provides guidance on edge cases (e.g., REIT leverage norms, reverse splits, CapEx lumpiness) that human reviewers should verify.

---

## 2. Core Quantitative Thresholds Matrix

The following threshold constants govern automated metric derivation:

| Metric Group | Parameter Key | Configured Value | Domain Rationale / Standard |
| :--- | :--- | :--- | :--- |
| **Micro-Cap / Penny** | `priceCeilingUSD` | **`$5.00`** | SEC Rule 3a51-1 statutory penny stock ceiling |
| **Micro-Cap Venues** | `pennyVenues` | `NYSE American`, `Capital Market`, `Pink`, `OTC` | Sub-tier execution boards with elevated liquidity spread |
| **Equity Style: Income** | `incomeMinDividendYieldPct` | **`2.00%`** | Graham-Dodd dividend yield hurdle vs. risk-free rate |
| **Equity Style: Growth** | `growthMinPeRatio` | **`25.0x`** | P/E multiple signifying premium secular growth expectations |
| **Equity Style: Growth** | `growthMinOperatingMarginPct` | **`15.00%`** | Operating margin hurdle indicating pricing power |
| **Leverage: Solvency** | `healthyDebtToEquityCeiling` | **`1.20x`** | Conservative debt buffer relative to total stockholders' equity |
| **Leverage: Distress** | `weakDebtToEquityFloor` | **`2.50x`** | Severe financial leverage tier elevating refinancing risk |
| **Valuation: Upside** | `strongConsensusUpsidePct` | **`+15.00%`** | Substantial margin of safety threshold |
| **Valuation: Downside** | `weakConsensusUpsidePct` | **`-10.00%`** | Downside valuation overhang / multiple compression risk |
| **Systematic Risk: Beta** | `lowBetaCeiling` | **`0.90`** | Below-market systematic volatility (Defensive profile) |
| **Systematic Risk: Beta** | `highBetaFloor` | **`1.30`** | High cyclicality / amplified drawdown sensitivity |
| **Risk Spectrum Score** | `conservativeMaxScore` | **`3` (of 10)** | Conservative / Capital preservation tier |
| **Risk Spectrum Score** | `coreMaxScore` | **`6` (of 10)** | Moderate / Balanced core equity risk tier |
| **Management Stewardship** | `exemplaryRoicFloorPct` | **`15.00%`** | Value-accretive capital deployment hurdle |
| **Management Stewardship** | `exemplaryRoeFloorPct` | **`20.00%`** | High-return equity compounder benchmark |
| **Management Stewardship** | `headwindsDebtToEquityFloor` | **`2.50x`** | Balance sheet pressure triggering capital review |
| **Moat Trend: Positive** | `positiveRevenueGrowthFloorPct` | **`8.00%`** | Competitive moat expansion revenue trajectory |
| **Moat Trend: Positive** | `positiveRoicFloorPct` | **`10.00%`** | Economic profit generation accompanying expansion |
| **Moat Trend: Negative** | `negativeRevenueGrowthCeilingPct` | **`-5.00%`** | Structural contraction signaling moat erosion |
| **Moat Trend: Negative** | `negativeRoicCeilingPct` | **`4.00%`** | Sub-cost-of-capital ROIC indicating loss of pricing power |
| **Economic Moat: Wide** | `wideMinPillars` | **`1` Wide Pillar** | 20+ year durable structural competitive advantage |
| **Economic Moat: Narrow** | `narrowToWideMinNarrowPillars`| **`2` Narrow Pillars** | 10+ year durable advantage with ROIC > 8% |
| **Forensic: Hidden Debt** | `offBalanceSheetWarningThresholdPct` | **`20.00%`** | Footnote commitments exceeding 20% of reported debt |
| **Forensic: CapEx Funding** | `minCapExFundingRatio` | **`0.80x`** | Operating Cash Flow / CapEx below 0.8x indicates debt-funded CapEx |
| **Forensic: Share Creep** | `maxNetDilutionShareCreepPct` | **`3.00%`** | Annual net dilution creep > 3.0% despite headline buybacks |
| **Forensic: Customer Conc.** | `singleCustomerConcentrationThresholdPct` | **`10.00%`** | ASC 280-10-50-42 statutory threshold for major customer disclosure |
| **Forensic: Top 3 Conc.** | `top3CustomerConcentrationThresholdPct` | **`30.00%`** | Top 3 counterparties generating > 30% of total revenue |
| **Forensic: DSO Spike** | `dsoSpikeYoYDaysThreshold` | **`15.0 days`** | YoY spike in Days Sales Outstanding signaling revenue pull-forward |
| **Forensic: Unbilled Assets** | `unbilledReceivablesMaxPct` | **`12.00%`** | Unbilled contract assets > 12% revenue signaling circular/unearned revenue |
| **Forensic: Client Distress** | `customerAltmanZStressFloor` | **`1.81`** | Average key counterparty Altman Z-Score in distress territory |
| **Forensic: Earnings Wedge** | `earningsQualityWedgeMaxPct` | **`25.00%`** | Non-GAAP EBITDA exceeding GAAP Operating Income by > 25% revenue |
| **Forensic: Compute Cost** | `computeElasticityRatioMax` | **`1.25x`** | Cloud delivery infrastructure cost growth vs revenue growth |
| **Forensic: CAC Payback** | `cacPaybackMonthsMax` | **`18.0 mo`** | Customer acquisition payback > 18 months signals flawed unit economics |
| **Forensic: Switching Score** | `switchingFrictionMinScore` | **`40.0 / 100`** | Switching friction score < 40 indicates commoditized zero-moat offering |
| **Forensic: Credit Spread** | `creditSpreadBlowoutBps` | **`350 bps`** | Corporate debt OAS spread > 350 bps over benchmark Treasuries |
| **Forensic: Margin Haircut** | `primeBrokerMarginHaircutFloorPct` | **`35.00%`** | Prime broker collateral haircut > 35% indicates synthetic distress |
| **Forensic: Institutional Out**| `institutionalNetSellingPct` | **`15.00%`** | Net 13F institutional share liquidation rate > 15% |
| **Forensic: Insider Ratio** | `insiderSellToBuyRatioFloor` | **`4.00x`** | Form 4 insider dollar sale to purchase ratio > 4:1 |

---

## 3. Detailed Financial Domain Definitions

### 3.1 SEC Rule 3a51-1 Penny Stock & Micro-Cap Classification
* **Domain Category:** Asset Class & Regulatory Qualification
* **Regulatory Standard:** SEC Securities Exchange Act Rule 3a51-1 (17 CFR § 240.3a51-1); FINRA Rule 2111 (Suitability).
* **Formula / Logic:**
  $$\text{isPennyStock} = (\text{Price} < \$5.00) \lor (\text{Venue} \in \{\text{NYSE American, Nasdaq Capital Market, OTC Pink, OTCQB, OTCQX}\}) \lor \text{explicitFlag}$$
* **Methodology Rationale:** Securities priced under $5.00 or trading on secondary/venture tiers exhibit higher volatility, thinner order-book depth, higher float turnover, and elevated vulnerability to retail pump-and-dump dynamics or sudden dilutive secondary offerings.
* **Reviewer Audit Notes:** Check for recent reverse stock splits that may artificially elevate price above $5.00 without improving underlying balance sheet fundamentals.

---

### 3.2 Equity Factor Style Taxonomy
* **Domain Category:** Equity Style & Factor Taxonomy
* **Academic / Industry Anchor:** Morningstar Style Box™ & Graham & Dodd Security Analysis (1934).
* **Classification Cascade:**
  1. If `isPennyStock == true` $\rightarrow$ **Speculative Penny Stock**
  2. Else if `Dividend Yield >= 2.0%` $\rightarrow$ **Income Stock**
  3. Else if `P/E > 25.0x` $\lor$ `Operating Margin > 15.0%` $\rightarrow$ **Growth Stock**
  4. Otherwise $\rightarrow$ **Value / Turnaround**
* **Analyst Implications:**
  * **Growth Stock:** Modeled via multi-stage DCF, secular revenue trajectory, and ROIC reinvestment capacity.
  * **Income Stock:** Focuses on dividend coverage ratio, cash conversion cycle, and payout durability.
  * **Value / Turnaround:** Focuses on tangible book value, normalized trough earnings, and restructuring catalysts.
  * **Speculative Penny Stock:** Emphasizes liquidity runway, cash burn rate, and shareholder dilution risk.
* **Reviewer Audit Notes:** Confirm whether dividend yield is inflated due to severe stock price collapse (dividend trap) before finalizing Income classification.

---

### 3.3 Fundamental Health & Solvency Tier
* **Domain Category:** Fundamental Health & Solvency
* **Academic / Industry Anchor:** Altman Z-Score & Basel III Capital Buffer Concepts.
* **Tiers:**
  * **Strong:** Favorable valuation margin of safety combined with conservative debt-to-equity ($D/E < 1.5$), or composite risk score $\le 3$.
  * **Fairly Valued:** Balanced balance sheet metrics trading within historical trading multiple envelopes.
  * **Weak:** Distressed debt-to-equity ($D/E > 2.5$), penny stock designation, or valuation trading well above intrinsic fair value.
* **Reviewer Audit Notes:** Capital-intensive industries (e.g., regulated utilities, midstream pipelines, REITs) inherently operate at higher debt ratios ($D/E > 1.8$). Reviewers should evaluate interest coverage ratios ($\text{EBIT} / \text{Interest Expense}$) for these sectors.

---

### 3.4 Composite Fundamental Risk Spectrum Tier
* **Domain Category:** Systematic Risk & Market Sensitivity
* **Regulatory Standard:** FINRA Rule 2111 (Customer Investment Profile Suitability).
* **Tiers (1–10 Scale):**
  * **1–3 (Conservative / Low Risk):** High-grade balance sheets, positive free cash flow, sustainable economic moat, defensive beta.
  * **4–6 (Core / Moderate Risk):** Standard market-conforming equity risk suitable for diversified core allocations.
  * **7–10 (High Risk / Speculative):** Significant operating leverage, negative cash generation, binary catalyst reliance, or high beta.
* **Reviewer Audit Notes:** Ensure customer concentration risk and debt maturity walls within 18 months are accounted for.

---

### 3.5 Free Cash Flow Generation & Capital Intensity Profile
* **Domain Category:** Cash Flow Quality & Capital Intensity
* **Accounting Standards:** GAAP ASC 230 / IFRS IAS 7 (Statement of Cash Flows).
* **Formula:**
  $$\text{Free Cash Flow (FCF)} = \text{Cash Flow from Operating Activities (CFO)} - \text{Capital Expenditures (CapEx)}$$
* **Tiers:**
  * **Positive Free Cash Flow:** $\text{FCF} > 0$. Indicates organic self-funding capability, enabling discretionary debt reduction, dividend payments, and share buybacks.
  * **Operating Cash Flow Deficit / Cash Burn:** $\text{FCF} < 0$. Indicates reliance on revolving credit facilities, debt issuances, or secondary equity dilution.
  * **Micro-Cap / Cash Conservation Focus:** Triggered for penny stocks to highlight liquidity runway monitoring.
  * **Cash Neutral / Not Reported:** $\text{FCF} = 0$ or absent cash flow disclosures.
* **Reviewer Audit Notes:** Differentiate between productive growth CapEx (e.g. semiconductor fabs, datacenter expansion) vs. maintenance CapEx deficits.

---

### 3.6 Morningstar Capital Allocation & Management Stewardship
* **Domain Category:** Management Quality & Stewardship
* **Methodology Anchor:** Morningstar Capital Allocation Methodology & CFA Institute Corporate Governance Guidelines.
* **Tiers & Logic:**
  * **Exemplary:** $\text{ROIC} > 15\%$ or $\text{ROE} > 20\%$. Exceptional capital discipline, value-accretive organic reinvestment, and shareholder-friendly distribution policies.
  * **Established / Standard:** Competent operational stewardship conforming to sector norms without aggressive debt-fueled speculation.
  * **Speculative:** Micro-cap capital structure exposure, frequent dilutive offerings, or severe financing overhang.
* **Reviewer Audit Notes:** Verify whether management is deploying capital into empire-building dilutive M&A or high-ROI organic product lines.

---

### 3.7 Morningstar Moat Trend™ Dynamic Advantage Trajectory
* **Domain Category:** Economic Moat & Competitive Dynamics
* **Methodology Anchor:** Morningstar Equity Research Moat Trend Methodology.
* **Tiers & Logic:**
  * **Positive:** $\text{Revenue Growth YoY} > 8.0\%$ and $\text{ROIC} > 10.0\%$. Moat is actively expanding via pricing power or network effects.
  * **Stable:** Market position and competitive moats defending historical economic rents.
  * **Negative:** $\text{Revenue Growth YoY} < -5.0\%$ or $\text{ROIC} < 4.0\%$. Moat is eroding due to technological disruption or intensifying substitute competition.
* **Reviewer Audit Notes:** Ensure positive revenue growth is accompanied by healthy operating margins rather than margin-destroying promotional pricing.

---

### 3.8 Morningstar 5-Pillar Economic Moat™ Rating
* **Domain Category:** Economic Moat & Competitive Dynamics
* **Academic Anchor:** Porter (1980) Competitive Advantage & Excess Return Duration Modeling.
* **Tiers & Logic:**
  * **Wide Moat:** $\ge 1$ Wide pillar OR ($\ge 2$ Narrow pillars with $\text{ROIC} > 8\%$). Competitive edge durable for 20+ years.
  * **Narrow Moat:** $\ge 1$ Narrow pillar OR $\text{ROIC} > 9\%$. Competitive edge durable for 10+ years.
  * **None:** Zero structural competitive barriers; commodity economics or micro-cap status.
* **Reviewer Audit Notes:** Review 5 structural pillars: Network Effect, Intangible Assets, Switching Costs, Cost Advantage, and Efficient Scale.

---

### 3.9 Systematic Risk & Market Beta Volatility Rating
* **Domain Category:** Systematic Risk & Market Sensitivity
* **Academic Anchor:** Capital Asset Pricing Model (Sharpe, 1964; Lintner, 1965).
* **Tiers:**
  * **Low Volatility:** $\beta < 0.90$. Below-market covariance; defensive characteristics during market corrections.
  * **Moderate Volatility:** $0.90 \le \beta \le 1.30$. Standard market-conforming systematic risk.
  * **High Volatility:** $\beta > 1.30$. High market sensitivity; aggressive cyclical amplification.
* **Reviewer Audit Notes:** Verify beta measurement frequency (monthly vs daily) and benchmark index consistency.

---

### 3.10 Balance Sheet Leverage & Solvency Ratio
* **Domain Category:** Fundamental Health & Solvency
* **Credit Standards:** S&P Global / Moody's Corporate Credit Rating Guidelines.
* **Formula:**
  $$\text{Debt-to-Equity} = \frac{\text{Total Short-Term \& Long-Term Debt}}{\text{Total Stockholders' Equity}}$$
* **Tiers:**
  * **Healthy Leverage:** $D/E \le 1.20x$. Solvency cushion protects against downturns.
  * **Elevated Leverage:** $D/E > 1.20x$. Increased debt-servicing requirements and refinancing risk in higher interest rate environments.

---

### 3.11 Consensus Valuation & Margin of Safety Verdict
* **Domain Category:** Intrinsic Valuation & Margin of Safety
* **Methodology Anchor:** Benjamin Graham *Security Analysis* (1934) & Morningstar Fair Value Engine.
* **Formula:**
  $$\text{Consensus Upside \%} = \frac{\text{Consensus Fair Value} - \text{Current Market Price}}{\text{Current Market Price}} \times 100$$
* **Tiers:**
  * **Consensus Upside $\ge +15.0\%$:** Significantly Undervalued / Attractive Risk-Reward
  * **$+5.0\% \le \text{Consensus Upside} < +15.0\%$:** Modestly Undervalued / Accumulate
  * **$-5.0\% \le \text{Consensus Upside} < +5.0\%$:** Fairly Valued / Market Weight
  * **$\text{Consensus Upside} < -5.0\%$:** Overvalued / Multiple Vulnerability

---

### 3.12 Valuation Uncertainty Tier & Margin of Safety Calibration
* **Domain Category:** Intrinsic Valuation & Margin of Safety
* **Methodology Anchor:** Morningstar Uncertainty Rating Framework.
* **Tiers:**
  * **Low Uncertainty:** Stable utilities or consumer defensives with $\beta < 1.0$ and $D/E < 1.5$. Requires $20\%$ discount for 5 stars.
  * **Medium Uncertainty:** Standard diversified corporate issuers. Requires $30\%$ discount.
  * **High Uncertainty:** Elevated beta ($> 1.3$) or elevated leverage ($D/E > 1.8$). Requires $40\%$ discount.
  * **Very High Uncertainty:** High operating leverage or beta $> 1.8$. Requires $50\%$ discount.
  * **Extreme Uncertainty:** Penny/micro-cap issues or balance sheet distress. Requires $75\%$ discount.

---

### 3.13 Forensic Pillar 1: Hidden Debt, Off-Balance Sheet Obligations & Capital Engineering
* **Domain Category:** Forensic Accounting & Structural Risk
* **Regulatory Standard:** FASB ASC 842 (Leases), FASB ASC 440 (Commitments), FASB ASC 810 (Consolidation of Variable Interest Entities), SEC Regulation S-K Item 303 (MD&A Capital Resources).
* **Methodology Anchor:** Damodaran Synthetic Debt Capitalization Framework & Moody's Global Corporate Adjusted Leverage Metrics.
* **Formula / Logic:**
  $$\text{Adjusted Total Debt} = \text{Reported Debt} + \text{PV}(\text{Operating Leases}) + \text{Unconsolidated VIE/SPV Debt} + \text{Take-or-Pay Purchase Commitments}$$
  $$\text{CapEx Funding Divergence} = \frac{\text{Cash Flow from Operations (OCF)}}{\text{Gross Capital Expenditures (CapEx)}}$$
  $$\text{Net Dilution Share Creep} = \frac{\Delta \text{Diluted Shares Outstanding}}{\text{Beginning Diluted Shares}} \times 100$$
* **Methodology Rationale:** Companies frequently conceal structural financial commitments within footnote disclosures rather than recognized balance sheet liabilities. When Operating Cash Flow fails to cover CapEx ($\text{Ratio} < 0.8\text{x}$), enterprise growth is synthetically financed through disguised borrowing or persistent dilutive stock issuance, rendering headline buyback numbers deceptive.
* **Reviewer Audit Notes:** Cross-reference 10-K Note 7 (Commitments) and Note 12 (Leases). Check whether disclosed buyback programs are offset by large executive stock-based compensation (SBC) grants resulting in net share creep ($> 3.0\%$).

---

### 3.14 Forensic Pillar 2: Circular Revenue, Unbilled Assets & Customer Concentration Stress
* **Domain Category:** Forensic Accounting & Structural Risk
* **Regulatory Standard:** FASB ASC 280 (Segment Reporting - Major Customers § 280-10-50-42), FASB ASC 606 (Revenue from Contracts with Customers), SEC Staff Accounting Bulletin No. 104, SEC Regulation S-K Item 101.
* **Methodology Anchor:** Altman & Hotchkiss Counterparty Credit Contagion Model & Beneish M-Score Days Sales in Receivables Index (DSRI).
* **Formula / Logic:**
  $$\text{Single Customer Concentration} = \max_i \left( \frac{\text{Customer}_i\text{ Revenue}}{\text{Total Revenue}} \right) \ge 10.0\%$$
  $$\text{Days Sales Outstanding (DSO)} = \frac{\text{Accounts Receivable}}{\text{Total Revenue}} \times 365, \quad \Delta \text{DSO}_{\text{YoY}} = \text{DSO}_t - \text{DSO}_{t-1}$$
  $$\text{Unbilled Contract Assets Ratio} = \frac{\text{Contract Assets / Unbilled Receivables}}{\text{Total Revenue}} \times 100$$
* **Methodology Rationale:** Counterparty dependency above $10\%$ presents existential revenue shock risks. A sudden expansion in unbilled contract assets or a DSO increase $> 15\text{ days}$ YoY typically signals aggressive revenue acceleration, channel stuffing, disputed milestone billings, or circular round-tripping with cash-strapped customer entities.
* **Reviewer Audit Notes:** Verify whether major customers are venture-backed startups with short liquidity runways ($\text{Altman Z} < 1.81$). Examine related-party disclosures in Item 13 for circular vendor-financing arrangements.

---

### 3.15 Forensic Pillar 3: Flawed Unit Economics, Earnings Quality Wedge & Zero-Moat Commoditization
* **Domain Category:** Forensic Accounting & Structural Risk
* **Regulatory Standard:** SEC Regulation G (Conditions for Use of Non-GAAP Financial Measures), SEC Regulation S-K Item 10(e), CFA Institute Financial Reporting Quality Standards.
* **Methodology Anchor:** Dechow & Dichev Accrual Quality Model & Microeconomic Cost Function Elasticity.
* **Formula / Logic:**
  $$\text{Earnings Quality Wedge (EQW)} = \frac{\text{Non-GAAP Adjusted EBITDA} - \text{GAAP Operating Income}}{\text{Total Revenue}} \times 100$$
  $$\text{Compute / Delivery Elasticity Ratio} = \frac{\% \Delta \text{Cloud Infrastructure COGS}}{\% \Delta \text{Total Revenue}}$$
  $$\text{Switching Friction Score (SFS)} \in [0, 100], \quad \text{CAC Payback Months} = \frac{\text{Sales \& Marketing Expense}}{\text{Gross Margin} \times \text{Net New ARR / 12}}$$
* **Methodology Rationale:** An excessive wedge between GAAP operating profit and non-GAAP pro-forma metrics ($\text{EQW} > 25\%$) signifies that baseline profitability excludes ongoing economic costs of doing business (such as recurring SBC or computing infrastructure). If hosting/compute infrastructure costs expand faster than revenue ($\text{Elasticity} > 1.25\text{x}$), gross margin decays with scale, proving an absent economic moat.
* **Reviewer Audit Notes:** Scrutinize non-GAAP reconciliations for items labeled "non-recurring" that reappear every fiscal quarter. When CAC payback exceeds 18 months and SFS falls below 40, customer churn will outpace lifetime value.

---

### 3.16 Forensic Pillar 4: Institutional Liquidity Retreat, Credit Spread Blowout & Multiple Disconnect
* **Domain Category:** Forensic Accounting & Structural Risk
* **Regulatory Standard:** SEC Form 4 (Insider Transactions), SEC Form 13F (Institutional Holdings), FINRA Rule 6700 (TRACE Corporate Debt Reporting).
* **Methodology Anchor:** Merton Structural Credit Risk Model & Information Asymmetry Smart Money Liquidation Theory (Seyhun; Cohen, Gompers, Vuolteenaho).
* **Formula / Logic:**
  $$\text{OAS Spread Blowout} = \text{Corporate Debt OAS} - \text{Benchmark Treasury Yield} > 350\text{ bps}$$
  $$\text{Prime Broker Margin Haircut} \ge 35.0\% \quad (\text{Normal Baseline: } 15\text{–}20\%)$$
  $$\text{Form 4 Insider Sell-to-Buy Ratio} = \frac{\sum \text{Dollar Value of Insider Dispositions}}{\sum \text{Dollar Value of Insider Purchases}} > 4.0\text{x}$$
  $$\text{13F Net Institutional Liquidation Rate} = \frac{\Delta \text{Institutional Shares}}{\text{Total Institutional Shares}} < -15.0\%$$
* **Methodology Rationale:** Bond markets and prime brokers price insolvency distress significantly ahead of equity markets. When corporate debt OAS widens into high-yield spread territory ($> 350\text{ bps}$) and prime broker margin haircuts spike, leverage covenants are tightening. If institutional funds and corporate insiders are actively dumping shares while retail accumulates, multiple compression is imminent.
* **Reviewer Audit Notes:** Cross-check TRACE secondary bond prices for traded notes. Ensure that Form 4 insider sales are not purely Rule 10b5-1 tax-withholding transactions, but active discretionary executive liquidations.

---

## 4. Code Integration & Reviewer Access

Human reviewers can inspect and manipulate definitions in TypeScript:

```typescript
import {
  FINANCIAL_DEFINITIONS,
  FINANCIAL_THRESHOLDS,
  getCashFlowStatus,
  getManagementQuality,
  getMoatTrend,
  getEconomicMoat,
  determineUncertaintyRating,
  getDefinitionById,
  getDefinitionsByCategory,
  listAllDefinitions
} from '@/utils/financialClassification';

// Query a specific definition
const mgmtDef = getDefinitionById('management-quality-stewardship');
console.log(mgmtDef?.methodologyRationale);
console.log(mgmtDef?.reviewerNotes);

// Dynamically evaluate a company profile
const stewardship = getManagementQuality({ roic: 16.4, roe: 22.1 });
console.log(stewardship.rating); // 'Exemplary'
console.log(stewardship.trackRecord); // 'Executive team demonstrating disciplined capital allocation...'
```
