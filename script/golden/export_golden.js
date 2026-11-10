// script/golden/export_golden.js
//
// Phase 0 of the Rails migration: capture the outputs of the legacy Node calculators
// so the Ruby ports can be verified against them (spec/fixtures/golden/*.json).
//
// Usage:  ./script/golden/export_golden.sh   (or: node script/golden/export_golden.js)
//
// Reads storage/preview_data.json directly (does NOT call loadData(), which would
// hit the network and rewrite the file). Time-dependent fields (days-left countdowns)
// are stripped so the fixtures stay stable.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const outDir = path.join(root, "spec", "fixtures", "golden");
fs.mkdirSync(outDir, { recursive: true });

const data = JSON.parse(fs.readFileSync(path.join(root, "storage", "preview_data.json"), "utf8"));
const { computeExactDuration, groupPpfByFinancialYear, normalizePpfFy } = require(path.join(root, "packages/core/module"));
const fi = require(path.join(root, "packages/investments/fixed_income/module"));

const TIME_DEPENDENT = ["daysLeft", "daysLeftLabel", "daysLeftBadgeClass"];
const stable = (obj) => {
  const copy = { ...obj };
  TIME_DEPENDENT.forEach((k) => delete copy[k]);
  return copy;
};

// Synthetic edge cases, in addition to the real portfolio rows.
const syntheticFds = [
  { principal: 100000, rate: 7.1, start_date: "2026-01-01", maturity_date: "2026-04-01" }, // < 180 days → simple interest
  { principal: 100000, rate: 7.1, start_date: "2024-01-31", maturity_date: "2026-03-01" }, // month-end borrow
  { principal: 250000, rate: 0, start_date: "2025-01-01", maturity_date: "2027-01-01" },   // zero rate
  { principal: 0, rate: 7, start_date: "2025-01-01", maturity_date: "2027-01-01" },        // zero principal
  { principal: 50000, rate: 6.5, start_date: "2027-01-01", maturity_date: "2025-01-01" },  // inverted dates
  { principal: 100000, rate: 7.5, start_date: "2024-02-29", maturity_date: "2029-02-28", maturity_amount: 145000 } // custom maturity
];
const syntheticRds = [
  { monthly_amount: 5000, rate: 6.8, start_date: "2025-01-10", end_date: "2027-01-10" },
  { monthly_amount: 2500, rate: 7.25, start_date: "2024-05-31", end_date: "2025-03-15" },
  { monthly_amount: 1000, rate: 0, start_date: "2025-01-01", end_date: "2025-01-05" }
];
const syntheticFlexi = [
  { base_monthly: 3000, total_deposited: 0, rate: 6.9, start_date: "2025-01-01", end_date: "2026-12-31" },
  { base_monthly: 3000, total_deposited: 85000, rate: 6.9, start_date: "2025-01-01", end_date: "2026-12-31" }
];

const durationCases = [
  ["2024-01-01", "2026-01-01"], ["2024-01-31", "2024-03-01"], ["2024-02-29", "2025-02-28"],
  ["2025-03-15", "2025-03-14"], ["", "2025-01-01"], ["2023-12-31", "2024-01-01"]
].map(([s, e]) => ({ start: s, end: e, result: computeExactDuration(s, e) }));

const golden = {
  generated_at: new Date().toISOString(),
  source: "packages/investments/fixed_income/module.js",
  duration_cases: durationCases,
  fixed_deposits: [...(data.fixed_deposits || []), ...syntheticFds].map((fd) => ({ input: fd, output: stable(fi.calculateFD(fd)) })),
  recurring_deposits: [...(data.recurring_deposits || []), ...syntheticRds].map((rd) => ({ input: rd, output: stable(fi.calculateRD(rd)) })),
  flexi_rds: [...(data.flexi_rds || []), ...syntheticFlexi].map((f) => ({ input: f, output: stable(fi.calculateFlexiRD(f)) })),
  summary: {
    input: { fixed_deposits: data.fixed_deposits, recurring_deposits: data.recurring_deposits, flexi_rds: data.flexi_rds },
    output: fi.summarizeFixedIncome(data)
  },
  ppf_fy_cases: [
    ["2026-03-31", null], ["2026-04-01", null], ["2025-06-10", "FY 2025-26"], ["", null]
  ].map(([d, fy]) => ({ date: d, fy, result: normalizePpfFy(d, fy) })),
  ppf_groups: groupPpfByFinancialYear((data.ppf && data.ppf.contributions) || [])
};

fs.writeFileSync(path.join(outDir, "fixed_income.json"), JSON.stringify(golden, null, 2));
console.log(`Wrote ${path.relative(root, path.join(outDir, "fixed_income.json"))}`);
