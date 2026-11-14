# WealthFlow — Personal Finance, Mutual Fund, Fixed Income & Tax Cockpit

WealthFlow is a **100% Ruby on Rails 8.1 Modular Monolith** for personal wealth management, post-tax fixed-income analytics, mutual fund overlap detection, sovereign retirement tracking (PPF & EPF), insurance adequacy, banking liquidity, and Indian income tax planning.

All UI surfaces remain clean and product-focused, while the complete engineering architecture and technology stack are documented below.

---

## Complete Technology Stack

| Layer | Technology | Role in WealthFlow |
| :--- | :--- | :--- |
| **Core Framework** | Ruby `>= 3.3` & Ruby on Rails `8.1.x` | Full-stack MVC, REST JSON APIs, CSRF protection, Strong Parameters & CSP |
| **Modular Architecture** | `packwerk` (`~> 3.1`) | Enforced 13-package domain boundaries under `packages/` with verified public APIs |
| **Authentication & Vault** | `devise` (`~> 4.9`) + `bcrypt` (`~> 3.1`) | Full sign-in, sign-up, password reset, account profile edit & optional quick-lock security PIN |
| **AI Search & Indexing** | `ransack` (`~> 4.2`) + `AiSearch::OmnibarEngine` | Top-panel AI financial assistant & instant multi-model search strictly scoped to `current_user.id` |
| **Frontend Interactivity** | Hotwire (`turbo-rails` + `stimulus-rails`) + `importmap-rails` | Declarative Stimulus controllers (`carousel`, `global_search`, `theme`, `toast`, `motion`, `sidebar`, `fi_slab`, `tax_planner`, `portfolio_sync`) with **zero financial math in JS** |
| **Styling & Theming** | Tailwind CSS v4 (`tailwindcss-rails`) + `theme.yml` (`Core::ThemeRegistry`) | Config-driven theme engine in `theme.yml` (`midnight`, `light`, `aurora`) with automated CSS variable injection and executive light/dark styling |
| **Animations** | Motion.js (`public/javascripts/motion.min.js`) | CSP-safe Web Animations API transitions for cards, slide-over drawers, floating toasts & the 4-slide main-page Carousel |
| **UI Components & Charts** | `view_component` (`~> 3.21`), `chartkick`, `groupdate` | Server-rendered financial components, dark/light-compatible charts & time-series grouping |
| **Asset Pipeline** | `propshaft` + `bootsnap` | Zero-Node asset serving & fast Rails boot |
| **Database & Persistence** | `sqlite3` (`>= 2.1`) WAL + ActiveRecord | Indexed per-user (`user_id`) relational storage across 10 portfolio tables + atomic JSON snapshot for the primary seeded account |
| **Background Jobs** | `solid_queue` (`config/recurring.yml`) | Scheduled live AMFI NAV fetches, stock overlap sync & sovereign PPF/EPF rate updates |
| **Security & Observability** | `rack-attack`, Strict CSP, `lograge` | Brute-force throttling on login/API/PIN/search routes, strict Content Security Policy & structured single-line request logs |
| **Testing & Static Audit** | `rspec-rails` (`~> 7.0`), `capybara`, `brakeman`, `bundler-audit`, `rubocop-rails-omakase` | Request/model/isolation specs, static security scanning, dependency audit & Ruby linting |

---

## Modular Monolith Packages (`packages/`)

Packwerk ([packwerk.yml](packwerk.yml) & root [package.yml](package.yml)) enforces strict acyclic dependencies across **13 domain packages**:

1. `packages/core` — `Core::ThemeRegistry` (`theme.yml` loader), `Core::CurrencyFormatter`, `Core::FinancialMath` (compound FD/RD/Flexi RD, RBI <180-day simple interest rule, post-tax slab interest, EMI & Indian date formatting)
2. `packages/investments/fixed_income` — `FixedIncome::Calculator` (FD/RD/Flexi RD aggregation, slab post-tax previews & live modal deposit preview generator)
3. `packages/investments/mutual_funds` — `MutualFunds::Analytics` & `MutualFunds::OverlapAnalyzer` (SIP summary, XIRR/P&L metrics, 10-year step-up projection, AMC factsheet catalog & pairwise stock overlap matrix)
4. `packages/investments/retirement_funds` — `RetirementFunds::Calculator` (PPF FY ₹1.5L ceiling tracker & EPF UAN passbook aggregator)
5. `packages/insurance/health_insurance` — `HealthInsurance::Analyzer` (Health cover, annual premium & policy expiry status)
6. `packages/insurance/life_insurance` — `LifeInsurance::AdequacyCalculator` (10x Human Life Value term adequacy & ULIP summary)
7. `packages/liabilities/home_loan` — `HomeLoan::EmiCalculator` (Standard formula EMI, principal repaid % & mortgage summary)
8. `packages/banking` — `Banking::SummaryService` (Liquid bank account balances, annual interest & credit card utilization scoring)
9. `packages/tax_planning` — `TaxPlanning::RegimeComparator` (FY 2024-25 & 2025-26 Old vs New Section 115BAC slabs, 87A rebate + marginal relief, surcharge & ITR refund/payable engine)
10. `packages/dashboard` — `Dashboard::Aggregator` (Consolidated Net Worth, asset allocation & backend SVG/bar graph metrics for Total Wealth, MF/EPF/PPF movement & Home Loan principal decrease)
11. `packages/market_data` — `MarketData::AmfiClient` (Live AMFI MFAPI client, scheme search catalog & statutory PPF 7.10% / EPF 8.25% rate registry)
12. `packages/reporting` — `Reporting::PortfolioExporter` (9-sheet Excel SpreadsheetML workbook & CSV full portfolio statement generator)
13. `packages/ai_search` — `AiSearch::OmnibarEngine` (Top-panel AI Financial Copilot synthesizing instant Net Worth, Tax, FD Post-Tax Yield, MF SIP, Retirement, Insurance & Banking answers alongside module shortcuts and AMFI lookup)

---

## Key UX & Security Features

- **Left Sidebar Navigation + Top Search / AI Drawer:** Module navigation lives in the left `<aside>` sidebar, while the sticky top `<header>` features a simple **Search Bar** with a `Search` / `Ask AI` mode toggle (`/` or `⌘K`/`Ctrl+K`), plus a dedicated **"Ask AI"** button that opens `#right-drawer`. In `Search` mode, matches navigate directly to existing module pages (`/fixed_income`, `/mutual_funds`, `/retirement`, `/insurance`, `/home_loan`, `/banking`, `/tax_calculator`, `/`) or display `"No match found"`.
- **Dedicated Home Loan & Mortgage Amortization Section (`/home_loan`):** Standalone module page with sanctioned principal, monthly EMI breakdown, principal decrease trajectory graph, amortization milestones, and linked home loan protection policies.
- **100% Drawer-Based UI (Zero Modals / Zero Popups):** Every record creation/edit form, delete/reset confirmation, Security PIN configuration, Mutual Fund overlap inspection, SIP step-up simulator, and AI Q&A assistant operates cleanly inside `#right-drawer` or inline on the page — zero modal overlays or confirmation popups.
- **YAML Config-Driven Theme Engine (`theme.yml`):** Themes (`midnight`, `light`, `aurora`) are configured cleanly in `/home/sayan/WealthFlow/theme.yml` and read by `Core::ThemeRegistry`; adding or removing themes requires editing only YAML tokens without touching application code.
- **Focused Main-Page Carousel:** Auto-advances every 5.5 seconds with Motion.js transitions and Prev/Next + dot controls. Displayed cleanly only on the main dashboard (`/`) when signed in and on the main sign-in page (`/users/sign_in`) when signed out — keeping interior module pages uncluttered.
- **Backend-Computed Wealth & Movement Graphs:** `Dashboard::Aggregator` computes all values, percentages, and SVG polyline coordinates for the **Total Wealth & Net Worth Graph**, **MF / EPF / PPF Increase & Decrease Tracker**, and **Home Loan Principal Decrease Curve** (no client-side math).
- **Floating Toast Notification System:** Server Devise/Rails flash notices, form validation errors, and API responses appear cleanly in a floating top-right toast stack (`toast_controller.js`).
- **Strict Authentication & Per-User Isolation:** `WealthflowAuthenticable` enforces Devise login across all HTML pages (`302` redirect to `/users/sign_in`) and all `/api/*` + `/session/*` endpoints (`401 Unauthorized` JSON). Every database table is isolated by `user_id`; newly registered users start cleanly without visibility into other users' data or the primary seeded workspace (`sayan@wealthflow.in` / `storage/preview_data.json`). Optional `bcrypt` Vault PIN locking returns `401 Unauthorized` on protected APIs while locked.

---

## Quick Start

```bash
bundle install
bundle exec rails db:migrate
bundle exec rails db:seed
bundle exec rails tailwindcss:build

# Verify Packwerk modular boundaries across all 13 packages
bundle exec packwerk validate
bundle exec packwerk check

# Run RSpec test suite & Brakeman static security scan
bundle exec rspec
bundle exec brakeman -q --no-pager

# Start Rails server on port 3000
bundle exec rails server -b 0.0.0.0 -p 3000
```

**Primary Demo Workspace Credentials:**
- **Email:** `sayan@wealthflow.in`
- **Password:** `WealthFlow@2026`
- *(Or register an isolated investor account at `/users/sign_up`)*
