# Code Review & Financial Audit Findings — SG Property Optimizer

This document summarizes the findings from a thorough inspection of the HTML, CSS, and JavaScript codebase of the SG Property Optimizer.

---

## 1. Calculation Anomalies & Financial Formula Issues

### 1.1. Loan Quantum Calculated on Effective Price (Major Anomaly)
* **File:** `js/simulator.js` (`simulateBTO`, `simulateResale3Room`, `simulateResale4Room`)
* **Issue:** The simulator calculates the maximum LTV loan quantum and downpayment using `effectivePrice = price - totalGrants`.
* **Impact:** In Singapore, housing grants (EHG, Singles Grant) are credited to the buyer's CPF Ordinary Account and used as part of the downpayment; they do **not** reduce the purchase price for loan LTV calculations. By calculating the loan on the net price, the simulation artificially reduces the maximum eligible loan amount (e.g. at 75% LTV, a S$40k grant reduces the loan by S$30k and increases the required upfront cash/CPF out-of-pocket). This unfairly penalizes lower-income buyers.
* **Resolution:** Calculate the loan amount and downpayment based on the gross purchase price `price`, and then apply housing grants `totalGrants` directly to offset the downpayment.

### 1.2. MSR and TDSR Limits Ignored in Loan Eligibility (Major Policy Gap)
* **File:** `js/simulator.js` (all simulation paths)
* **Issue:** If a user's gross monthly income cannot support the 75% LTV loan due to Mortgage Servicing Ratio (MSR) or Total Debt Servicing Ratio (TDSR) limits, the simulator currently only issues a warning. It proceeds with the oversized loan, showing the path as "Affordable" with an inflated net worth.
* **Impact:** In reality, HDB and banks enforce MSR (30% of gross income for HDB flats) and TDSR (55% for all properties) as strict legal limits. If the user's income is insufficient, their loan principal is capped. They must pay the shortfall as a larger upfront downpayment. If they do not have the CPF/cash to cover this shortfall, the strategy is unaffordable.
* **Resolution:** Cap the loan quantum by the maximum allowed under MSR/TDSR. Add the loan shortfall to the required downpayment. If the buyer's cash + CPF cannot cover the new downpayment + stamp duty + renovation, mark the strategy as unaffordable (`isAffordable = false`).

### 1.3. BTO Renovation Timing & Compounding Penalization (Timeline Issue)
* **File:** `js/simulator.js` (`simulateBTO`)
* **Issue:** The renovation fee (`renoBto2Room`) is deducted from cash at Year 0.
* **Impact:** BTO flats have a construction wait time of 4 years. Renovation occurs only upon key collection (Year 4). Deducting the renovation cost at Year 0 unnecessarily drains cash reserves 4 years too early, depriving the user of compound investment growth (at the configured 7.5% equity return rate).
* **Resolution:** Exclude the renovation fee from upfront costs at Year 0. Deduct it from the equity portfolio at Year 4 (completion).

### 1.4. Missing BTO Running Costs Post-Completion (Missing Deduction)
* **File:** `js/simulator.js` (`simulateBTO`)
* **Issue:** The running costs (HDB Service & Conservancy Charges and Property Tax) are set to `0` for the entire 10-year projection.
* **Impact:** Once a BTO flat is completed (Year 4 onwards), the owner must pay SCC (monthly S$90) and property tax. Setting these to `0` artificially inflates the BTO strategy's final net worth.
* **Resolution:** In the BTO year-by-year loop, set the running costs to `cfg.runningCosts.hdbSCC + (propertyTax / 12)` for all years `t >= btoWait`.

### 1.5. Cash Flow Deficits Ignored (Deficit Loophole)
* **File:** `js/simulator.js` (`simulateResale3Room`, `simulateResale4Room`, `simulatePrivateCondo`)
* **Issue:** The simulator uses `Math.max(0, monthlySavings + rentalIncome - cashMortgageShortfall - otherMonthlyCosts)` to compute the monthly equity portfolio contribution.
* **Impact:** If a user runs a monthly cash flow deficit (expenses exceed savings + rent), the contribution is capped at `0`. The cash reserves (`equityPortfolio`) are never depleted. This allows users to afford properties that drain their cash reserves, resulting in unrealistic "affordable" projections.
* **Resolution:** Remove the `Math.max(0, ...)` check for the monthly contribution, allowing a deficit to drain the equity portfolio. If the portfolio goes below `0` at any point, add a warning and mark the path as unaffordable.

---

## 2. Responsive Layout & CSS Issues

### 2.1. Absolute Warnings Overlapping Chart (Visual Defect)
* **File:** `css/chart.css` (`.chart-warnings`)
* **Issue:** The `.chart-warnings` container containing warning badges is positioned absolutely in the top-right of the chart container.
* **Impact:** On smaller screens, the warnings stack and overlap the chart series, titles, and legends, rendering the visualization unreadable.
* **Resolution:** Remove the absolute positioning and place the warnings in the normal document flow between the subtitle and the chart canvas.

### 2.2. Warning Badge Width Constraint (Visual Defect)
* **File:** `index.html` (`.warning-badge` style)
* **Issue:** The warning badge has a hardcoded `max-width: 240px`.
* **Impact:** On mobile viewports, the badges wrap awkwardly and waste horizontal space.
* **Resolution:** Change `max-width` to `100%` so the badges expand to fit the parent container width.

---

## 3. Code Cleanliness & Redundancies

### 3.1. Redundant Ternary logic
* **File:** `js/simulator.js` (`simulateResale3Room`)
* **Issue:** `const rentalIncome = (t >= 1 && t <= mop) ? monthlyRent : (t > mop ? monthlyRent : 0)` is a redundant expression.
* **Resolution:** Simplify to `const rentalIncome = t >= 1 ? monthlyRent : 0`.

---

## Refactoring Plan

1. **`js/simulator.js`:**
   - Correct the LTV and downpayment calculations to use the gross purchase price.
   - Restructure the loan allocation: Cap loans using MSR/TDSR limits and roll shortfalls into the downpayment.
   - Adjust the BTO simulation to delay renovation fees until Year 4, and deduct property tax and SCC after completion.
   - Allow monthly cash flow deficits to drain cash/equity reserves. Set `isAffordable = false` and add a warning if the reserves go below zero.
   - Simplify the resale rental income logic.
2. **`css/chart.css`:**
   - Change `.chart-warnings` to standard block flow with proper margins.
3. **`index.html`:**
   - Change `.warning-badge` `max-width` to `100%`.
4. **Verification:**
   - Verify that calculations match Singapore regulations and render correctly without console errors.
