# WealthFlow: Modular Personal Wealth & Insurance Platform

A production-grade financial command center built with **Ruby on Rails 8.1**, modularized using the **Packwerk** package boundary engine, styled with **Tailwind CSS**, and brought to life with **ViewComponent**, **Hotwire (Turbo 8 & Stimulus)**, and **Motion.js**.

---

## 🏗️ Architecture & Modular Monolith Design

The application separates financial domains into autonomous packages located in `packages/`:

```
├── packages/
│   ├── core/                   # Pure mathematical formulas (XIRR, CAGR, Compounding, Day-count, Currency)
│   ├── dashboard/              # Aggregators & net worth projection engine
│   ├── investments/
│   │   ├── fixed_income/       # FD, RD, Flexi-RD engine & ledger transactions
│   │   ├── mutual_funds/       # Equity portfolios, NAV tracking, XIRR calculations
│   │   └── retirement_funds/   # PPF & EPF statutory multi-bucket tracking
│   └── insurance/
│       ├── health_insurance/   # Base policies, family floaters, deductibles
│       └── life_insurance/     # Pure term cover, HLV adequacy analyzer
```

Each package declares its explicit dependencies and boundary visibility in `package.yml` and exposes public entry points inside `app/public/<package_name>/`. Cross-package queries outside these boundaries are strictly prohibited and validated by Packwerk.

---

## 💰 Supported Asset & Protection Classes

| Component | Calculation Engine | Key Capabilities |
| :--- | :--- | :--- |
| **Fixed Deposits (FD)** | Quarterly Compounding Formula | Custom tenures, tax-saving (80C) tags, maturity forecasting |
| **Recurring Deposits (RD)** | Monthly Compounding Engine | Systematic monthly deposits with quarterly compounding intervals |
| **Flexi RD** | Exact Day-Count Compounding | Irregular deposit intervals and variable amounts |
| **Mutual Funds** | Newton-Raphson XIRR & CAGR | Folio tracking, NAV valuations, SIP wealth gain projections |
| **PPF** | 5th-to-End Min-Balance Rule | Annual financial year compounding (March 31) & statutory limits |
| **EPF** | Multi-pool Split Engine | 12% Employee + 3.67% Employer EPF + 8.33% Pension (EPS) |
| **Health Insurance** | Deductibles & Buffer Engine | Family floaters, critical illness rider monitoring, renewal tracking |
| **Life Insurance** | Human Life Value (HLV) Analyzer | 15x-20x income adequacy ratio, coverage gap identification |

---

## ⚡ Interactive UI & Motion.js Reactive Experience

- **ViewComponent Design:** Reusable UI components for metrics (`FinancialMetricCardComponent`), asset distributions (`AssetAllocationChartComponent`), and insurance policies (`PolicyCardComponent`).
- **Motion.js via Stimulus:** Hardware-accelerated entrance springs and smooth numeric counter animations when Turbo Frames re-render.
- **Instant Client-Side Previews:** Interactive sliders update maturity numbers with zero latency locally, backed by authoritative server-side Turbo Streams.

---

## 🚀 Setup & Execution

1. **Install Ruby and System Dependencies:**
   ```bash
   bundle install
   npm install
   ```

2. **Database Initialization & Seeding:**
   ```bash
   bin/rails db:migrate
   bin/rails db:seed
   ```

3. **Validate Packwerk Boundaries:**
   ```bash
   bundle exec packwerk check
   ```

4. **Launch the Development Server:**
   ```bash
   bin/rails server
   ```
   Open `http://localhost:3000` to access the Portfolio Command Center.

