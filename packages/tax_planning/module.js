// packages/tax_planning/module.js
// Comprehensive Indian Income Tax & ITR Refund Calculator (New Regime vs Old Regime)
// Supports FY 2025-26 (AY 2026-27) & FY 2024-25 (AY 2025-26), Slab-by-Slab Breakdown,
// Section 87A Rebate, Marginal Relief, Surcharge, 4% Cess, Take-Home Salary & ITR Refund / Payable
const { formatINR, groupPpfByFinancialYear } = require("../core/module");
const { renderCustomDropdownComponent } = require("../core/components");

function defaultTaxProfile(data) {
  // Auto-detect portfolio 80C & 80D & Savings Interest if available
  const ppfGroups = groupPpfByFinancialYear((data?.ppf?.contributions) || []);
  const fyPpf = ppfGroups.length > 0 ? ppfGroups[ppfGroups.length - 1].totalAmount : 0;
  const epfEmployee = ((data?.epf?.entries) || []).reduce((s, e) => s + (Number(e.employee) || 0), 0);
  const ulipPaid = Number(data?.ulip?.total_paid) || 0;
  const portfolio80C = Math.min(150000, Math.round(fyPpf + Math.min(150000, epfEmployee) + ulipPaid));

  const healthPrem = (data?.health_insurance || []).reduce((s, p) => s + (Number(p.annual_premium) || 0), 0);
  const portfolio80D = Math.min(75000, Math.round(healthPrem));

  const fdGain = (data?.fixed_deposits || []).reduce((s, fd) => s + Math.round((Number(fd.principal) || 0) * ((Number(fd.rate) || 0) / 100)), 0);
  const bankInt = (data?.bank_accounts || []).reduce((s, b) => s + Math.round((Number(b.current_balance) || 0) * ((Number(b.interest_rate) || 0) / 100)), 0);

  return {
    fy: "2025-26",
    age_group: "below_60", // below_60 | senior_60_80 | super_senior_80
    preferred_regime: "auto", // auto | new | old
    is_salaried: true,
    // Incomes
    gross_salary: 0,
    interest_income: 0,
    rental_income: 0,
    other_income: 0,
    // Exemptions & Deductions
    hra_exemption: 0,
    professional_tax: 2400,
    home_loan_interest_24b: 0,
    sec_80c: portfolio80C,
    sec_80ccd_1b_nps: 0,
    sec_80ccd_2_employer_nps: 0,
    sec_80d_health: portfolio80D,
    sec_80tta_savings: Math.min(10000, bankInt),
    other_deductions_80e_80g: 0,
    // Taxes Already Paid (for Return / Refund Calculation)
    tds_deducted: 0,
    advance_tax_paid: 0
  };
}

function computeSlabBreakdown(taxableIncome, slabs) {
  const rows = [];
  let totalSlabTax = 0;

  for (const s of slabs) {
    const min = s.min;
    const max = s.max;
    const rate = s.rate;
    let taxableInSlab = 0;
    if (taxableIncome > min) {
      taxableInSlab = max === Infinity ? (taxableIncome - min) : Math.max(0, Math.min(taxableIncome, max) - min);
    }
    const taxInSlab = Math.round(taxableInSlab * (rate / 100));
    totalSlabTax += taxInSlab;
    rows.push({
      label: s.label,
      rate,
      taxableInSlab,
      taxInSlab
    });
  }

  return { rows, totalSlabTax };
}

function computeSurcharge(taxAfterRebate, taxableIncome, isNewRegime) {
  if (taxableIncome <= 5000000 || taxAfterRebate <= 0) return { rate: 0, amount: 0 };
  let rate = 0;
  if (taxableIncome > 50000000) rate = isNewRegime ? 25 : 37;
  else if (taxableIncome > 20000000) rate = 25;
  else if (taxableIncome > 10000000) rate = 15;
  else if (taxableIncome > 5000000) rate = 10;
  return { rate, amount: Math.round(taxAfterRebate * (rate / 100)) };
}

function calculateTaxBothRegimes(rawProfile, data) {
  const p = { ...defaultTaxProfile(data), ...(rawProfile || {}) };

  const grossSalary = Math.max(0, Number(p.gross_salary) || 0);
  const interestIncome = Math.max(0, Number(p.interest_income) || 0);
  const rentalIncome = Math.max(0, Number(p.rental_income) || 0);
  const otherIncome = Math.max(0, Number(p.other_income) || 0);
  const grossTotalIncome = grossSalary + interestIncome + rentalIncome + otherIncome;

  const isSalaried = p.is_salaried !== false && p.is_salaried !== "false";
  const fy = p.fy || "2025-26";
  const ageGroup = p.age_group || "below_60";

  // ==========================================
  // 1. NEW TAX REGIME (Section 115BAC)
  // ==========================================
  const newStdDeduction = isSalaried ? Math.min(grossSalary, 75000) : 0;
  const newEmployerNps = Math.max(0, Number(p.sec_80ccd_2_employer_nps) || 0);
  const newRentalStdDed = Math.round(rentalIncome * 0.30); // 30% standard deduction u/s 24(a) on let-out property
  const newTotalDeductions = newStdDeduction + newEmployerNps + newRentalStdDed;
  const newTaxableIncome = Math.max(0, grossTotalIncome - newTotalDeductions);

  const newSlabs = fy === "2024-25"
    ? [
        { min: 0, max: 300000, rate: 0, label: "Up to ₹3,00,000" },
        { min: 300000, max: 700000, rate: 5, label: "₹3,00,001 – ₹7,00,000" },
        { min: 700000, max: 1000000, rate: 10, label: "₹7,00,001 – ₹10,00,000" },
        { min: 1000000, max: 1200000, rate: 15, label: "₹10,00,001 – ₹12,00,000" },
        { min: 1200000, max: 1500000, rate: 20, label: "₹12,00,001 – ₹15,00,000" },
        { min: 1500000, max: Infinity, rate: 30, label: "Above ₹15,00,000" }
      ]
    : [
        { min: 0, max: 400000, rate: 0, label: "Up to ₹4,00,000" },
        { min: 400000, max: 800000, rate: 5, label: "₹4,00,001 – ₹8,00,000" },
        { min: 800000, max: 1200000, rate: 10, label: "₹8,00,001 – ₹12,00,000" },
        { min: 1200000, max: 1600000, rate: 15, label: "₹12,00,001 – ₹16,00,000" },
        { min: 1600000, max: 2000000, rate: 20, label: "₹16,00,001 – ₹20,00,000" },
        { min: 2000000, max: 2400000, rate: 25, label: "₹20,00,001 – ₹24,00,000" },
        { min: 2400000, max: Infinity, rate: 30, label: "Above ₹24,00,000" }
      ];

  const newBreakdown = computeSlabBreakdown(newTaxableIncome, newSlabs);
  const newRebateThreshold = fy === "2024-25" ? 700000 : 1200000;
  const newMaxRebate = fy === "2024-25" ? 25000 : 60000;

  let newRebate87A = 0;
  let newMarginalRelief = 0;
  if (newTaxableIncome <= newRebateThreshold) {
    newRebate87A = Math.min(newBreakdown.totalSlabTax, newMaxRebate);
  } else {
    // Marginal relief: tax cannot exceed income above rebate threshold
    const excessIncome = newTaxableIncome - newRebateThreshold;
    if (newBreakdown.totalSlabTax > excessIncome) {
      newMarginalRelief = newBreakdown.totalSlabTax - excessIncome;
    }
  }

  const newTaxAfterRebate = Math.max(0, newBreakdown.totalSlabTax - newRebate87A - newMarginalRelief);
  const newSurcharge = computeSurcharge(newTaxAfterRebate, newTaxableIncome, true);
  const newCess = Math.round((newTaxAfterRebate + newSurcharge.amount) * 0.04);
  const newTotalTax = newTaxAfterRebate + newSurcharge.amount + newCess;

  // ==========================================
  // 2. OLD TAX REGIME
  // ==========================================
  const oldStdDeduction = isSalaried ? Math.min(grossSalary, 50000) : 0;
  const oldProfTax = isSalaried ? Math.min(2500, Math.max(0, Number(p.professional_tax) || 0)) : 0;
  const oldHra = isSalaried ? Math.max(0, Number(p.hra_exemption) || 0) : 0;
  const oldHomeLoan24b = Math.min(200000, Math.max(0, Number(p.home_loan_interest_24b) || 0));
  const old80C = Math.min(150000, Math.max(0, Number(p.sec_80c) || 0));
  const old80CCD1B = Math.min(50000, Math.max(0, Number(p.sec_80ccd_1b_nps) || 0));
  const old80CCD2 = Math.max(0, Number(p.sec_80ccd_2_employer_nps) || 0);
  const old80D = Math.min(100000, Math.max(0, Number(p.sec_80d_health) || 0));
  const old80TTA = Math.min(ageGroup === "below_60" ? 10000 : 50000, Math.max(0, Number(p.sec_80tta_savings) || 0));
  const oldOtherDed = Math.max(0, Number(p.other_deductions_80e_80g) || 0);
  const oldRentalStdDed = Math.round(rentalIncome * 0.30);

  const oldTotalDeductions =
    oldStdDeduction +
    oldProfTax +
    oldHra +
    oldHomeLoan24b +
    old80C +
    old80CCD1B +
    old80CCD2 +
    old80D +
    old80TTA +
    oldOtherDed +
    oldRentalStdDed;

  const oldTaxableIncome = Math.max(0, grossTotalIncome - oldTotalDeductions);

  const basicExemptionLimit = ageGroup === "super_senior_80" ? 500000 : (ageGroup === "senior_60_80" ? 300000 : 250000);
  const oldSlabs = ageGroup === "super_senior_80"
    ? [
        { min: 0, max: 500000, rate: 0, label: "Up to ₹5,00,000 (Super Senior)" },
        { min: 500000, max: 1000000, rate: 20, label: "₹5,00,001 – ₹10,00,000" },
        { min: 1000000, max: Infinity, rate: 30, label: "Above ₹10,00,000" }
      ]
    : [
        { min: 0, max: basicExemptionLimit, rate: 0, label: `Up to ${formatINR(basicExemptionLimit)}` },
        { min: basicExemptionLimit, max: 500000, rate: 5, label: `${formatINR(basicExemptionLimit + 1)} – ₹5,00,000` },
        { min: 500000, max: 1000000, rate: 20, label: "₹5,00,001 – ₹10,00,000" },
        { min: 1000000, max: Infinity, rate: 30, label: "Above ₹10,00,000" }
      ];

  const oldBreakdown = computeSlabBreakdown(oldTaxableIncome, oldSlabs);
  const oldRebate87A = oldTaxableIncome <= 500000 ? Math.min(oldBreakdown.totalSlabTax, 12500) : 0;
  const oldTaxAfterRebate = Math.max(0, oldBreakdown.totalSlabTax - oldRebate87A);
  const oldSurcharge = computeSurcharge(oldTaxAfterRebate, oldTaxableIncome, false);
  const oldCess = Math.round((oldTaxAfterRebate + oldSurcharge.amount) * 0.04);
  const oldTotalTax = oldTaxAfterRebate + oldSurcharge.amount + oldCess;

  // ==========================================
  // 3. TAXES PAID & ITR REFUND / PAYABLE
  // ==========================================
  const tdsDeducted = Math.max(0, Number(p.tds_deducted) || 0);
  const advanceTaxPaid = Math.max(0, Number(p.advance_tax_paid) || 0);
  const totalTaxesPaid = tdsDeducted + advanceTaxPaid;

  // Difference: Positive = Refund Due to User, Negative = Additional Tax Payable
  const newRefundOrPayable = totalTaxesPaid - newTotalTax;
  const oldRefundOrPayable = totalTaxesPaid - oldTotalTax;

  const recommendedRegime = newTotalTax <= oldTotalTax ? "new" : "old";
  const taxSavings = Math.abs(oldTotalTax - newTotalTax);
  const activeRegime = p.preferred_regime === "new" || p.preferred_regime === "old" ? p.preferred_regime : recommendedRegime;

  const newEffectiveRate = grossTotalIncome > 0 ? Number(((newTotalTax / grossTotalIncome) * 100).toFixed(2)) : 0;
  const oldEffectiveRate = grossTotalIncome > 0 ? Number(((oldTotalTax / grossTotalIncome) * 100).toFixed(2)) : 0;

  return {
    profile: p,
    grossTotalIncome,
    totalTaxesPaid,
    recommendedRegime,
    activeRegime,
    taxSavings,
    newRegime: {
      stdDeduction: newStdDeduction,
      totalDeductions: newTotalDeductions,
      taxableIncome: newTaxableIncome,
      slabs: newBreakdown.rows,
      slabTax: newBreakdown.totalSlabTax,
      rebate87A: newRebate87A,
      marginalRelief: newMarginalRelief,
      taxAfterRebate: newTaxAfterRebate,
      surcharge: newSurcharge,
      cess: newCess,
      totalTax: newTotalTax,
      effectiveRate: newEffectiveRate,
      netPostTaxIncome: Math.max(0, grossTotalIncome - newTotalTax),
      monthlyTakeHome: Math.round(Math.max(0, grossTotalIncome - newTotalTax) / 12),
      refundOrPayable: newRefundOrPayable
    },
    oldRegime: {
      stdDeduction: oldStdDeduction,
      totalDeductions: oldTotalDeductions,
      taxableIncome: oldTaxableIncome,
      slabs: oldBreakdown.rows,
      slabTax: oldBreakdown.totalSlabTax,
      rebate87A: oldRebate87A,
      marginalRelief: 0,
      taxAfterRebate: oldTaxAfterRebate,
      surcharge: oldSurcharge,
      cess: oldCess,
      totalTax: oldTotalTax,
      effectiveRate: oldEffectiveRate,
      netPostTaxIncome: Math.max(0, grossTotalIncome - oldTotalTax),
      monthlyTakeHome: Math.round(Math.max(0, grossTotalIncome - oldTotalTax) / 12),
      refundOrPayable: oldRefundOrPayable
    }
  };
}

function renderRefundBadge(diff) {
  if (diff > 0) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-700/60">ITR Refund: +${formatINR(diff)}</span>`;
  }
  if (diff < 0) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/90 text-rose-400 border border-rose-700/60">Balance Tax Payable: ${formatINR(Math.abs(diff))}</span>`;
  }
  return `<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">Nil Due / Settled (₹0)</span>`;
}

function renderTaxCalculatorPage(data, ov) {
  const t = ov.taxCalc || calculateTaxBothRegimes(data.tax_profile, data);
  const p = t.profile;
  const nr = t.newRegime;
  const or = t.oldRegime;

  // Portfolio auto-fill values for quick reference
  const fyPpf = ((data?.ppf?.contributions) || []).slice(-1)[0]?.amount || 0;
  const epfEmployee = ((data?.epf?.entries) || []).reduce((s, e) => s + (Number(e.employee) || 0), 0);
  const ulipPaid = Number(data?.ulip?.total_paid) || 0;
  const portfolio80C = Math.min(150000, Math.round(fyPpf + Math.min(150000, epfEmployee) + ulipPaid));
  const portfolio80D = Math.min(100000, Math.round((data?.health_insurance || []).reduce((s, x) => s + (Number(x.annual_premium) || 0), 0)));
  const portfolioSavingsInt = Math.round((data?.bank_accounts || []).reduce((s, b) => s + (Number(b.current_balance) || 0) * ((Number(b.interest_rate) || 0) / 100), 0));

  const newSlabsHtml = nr.slabs.map(s => `
    <tr class="border-b border-slate-800/60 text-xs">
      <td class="py-2.5 text-slate-300">${s.label}</td>
      <td class="py-2.5 text-right font-mono text-indigo-300">${s.rate}%</td>
      <td class="py-2.5 text-right font-mono text-slate-300">${formatINR(s.taxableInSlab)}</td>
      <td class="py-2.5 text-right font-mono font-semibold text-white">${formatINR(s.taxInSlab)}</td>
    </tr>
  `).join("");

  const oldSlabsHtml = or.slabs.map(s => `
    <tr class="border-b border-slate-800/60 text-xs">
      <td class="py-2.5 text-slate-300">${s.label}</td>
      <td class="py-2.5 text-right font-mono text-amber-300">${s.rate}%</td>
      <td class="py-2.5 text-right font-mono text-slate-300">${formatINR(s.taxableInSlab)}</td>
      <td class="py-2.5 text-right font-mono font-semibold text-white">${formatINR(s.taxInSlab)}</td>
    </tr>
  `).join("");

  return `
    <div class="space-y-8">
      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Income Tax & ITR Return Calculator</h1>
          <p class="text-xs text-slate-400 mt-1">
            Side-by-side <strong class="text-indigo-300">New Tax Regime (u/s 115BAC)</strong> vs <strong class="text-amber-300">Old Tax Regime</strong> engine with automatic slab calculation, Section 87A rebate, marginal relief, 4% cess, and ITR refund / payable calculation
          </p>
        </div>
        <div class="flex items-center gap-2.5">
          <button type="button" onclick="autoFillPortfolioDeductions(${portfolio80C}, ${portfolio80D}, ${portfolioSavingsInt})"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-700/60 transition-colors">
            Sync 80C / 80D from Portfolio
          </button>
          <button type="button" onclick="saveTaxCalculation()"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all">
            Save Tax Profile
          </button>
        </div>
      </div>

      <!-- Recommendation & Summary Banner -->
      <div id="tax-recommendation-banner" class="glass-card rounded-2xl p-5 border border-indigo-500/40 bg-gradient-to-r from-indigo-950/50 via-slate-900/90 to-emerald-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-400" id="rec-badge">
                ${t.recommendedRegime === "new" ? "Recommended: New Tax Regime" : "Recommended: Old Tax Regime"}
              </span>
              <span class="text-[11px] font-mono text-slate-400">• FY <span id="rec-fy-label">${p.fy}</span></span>
            </div>
            <p class="text-sm font-bold text-white mt-0.5" id="rec-headline">
              ${t.taxSavings > 0
                ? `${t.recommendedRegime === "new" ? "New Regime" : "Old Regime"} saves you ${formatINR(t.taxSavings)} in income tax compared to ${t.recommendedRegime === "new" ? "Old Regime" : "New Regime"}.`
                : "Both regimes result in identical tax liability (₹0 difference) for your current inputs."}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-4 text-right font-mono">
          <div>
            <span class="text-[10px] uppercase text-slate-400 block">New Regime Tax</span>
            <span class="text-lg font-extrabold text-indigo-300" id="banner-new-tax">${formatINR(nr.totalTax)}</span>
          </div>
          <div class="h-8 w-px bg-slate-800"></div>
          <div>
            <span class="text-[10px] uppercase text-slate-400 block">Old Regime Tax</span>
            <span class="text-lg font-extrabold text-amber-300" id="banner-old-tax">${formatINR(or.totalTax)}</span>
          </div>
        </div>
      </div>

      <!-- Main Grid: Left = Income & Deductions Form | Right = Real-Time Regime Comparison & Return Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- LEFT COLUMN (5 cols): Interactive Income, Deductions & TDS Inputs -->
        <form id="tax-calc-form" onsubmit="event.preventDefault(); saveTaxCalculation();" class="lg:col-span-5 space-y-6">

          <!-- 1. Assessment Settings -->
          <div class="glass-card relative z-20 rounded-2xl p-5 border-slate-800 space-y-4">
            <h2 class="text-sm font-bold text-white uppercase tracking-wider text-indigo-300">1. Assessment Year & Taxpayer Profile</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Financial Year (FY)</label>
                ${renderCustomDropdownComponent("tax-fy", "fy", [
                  { label: "FY 2025-26 (AY 2026-27) — Latest", value: "2025-26" },
                  { label: "FY 2024-25 (AY 2025-26)", value: "2024-25" }
                ], p.fy || "2025-26", "recalcTaxLive")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Age Category</label>
                ${renderCustomDropdownComponent("tax-age", "age_group", [
                  { label: "Below 60 yrs (General)", value: "below_60" },
                  { label: "60 to 80 yrs (Senior Citizen)", value: "senior_60_80" },
                  { label: "Above 80 yrs (Super Senior)", value: "super_senior_80" }
                ], p.age_group || "below_60", "recalcTaxLive")}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Employment Type</label>
                ${renderCustomDropdownComponent("tax-salaried", "is_salaried", [
                  { label: "Salaried / Pensioner (Std Ded)", value: "true" },
                  { label: "Business / Self-Employed", value: "false" }
                ], p.is_salaried !== false ? "true" : "false", "recalcTaxLive")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Selected Regime for Return</label>
                ${renderCustomDropdownComponent("tax-regime-pref", "preferred_regime", [
                  { label: "Auto-Select Best Regime", value: "auto" },
                  { label: "New Tax Regime (115BAC)", value: "new" },
                  { label: "Old Tax Regime", value: "old" }
                ], p.preferred_regime || "auto", "recalcTaxLive")}
              </div>
            </div>
          </div>

          <!-- 2. Annual Income Inputs -->
          <div class="glass-card rounded-2xl p-5 border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase tracking-wider text-emerald-400">2. Annual Income Details (₹)</h2>
              <span class="text-[11px] font-mono text-slate-400">Applies to Both Regimes</span>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Gross Annual Salary / Income (Before Standard Deduction)</label>
                <input type="number" step="1" name="gross_salary" id="in-gross-salary" oninput="recalcTaxLive()" value="${p.gross_salary}" placeholder="e.g. 1800000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-slate-300 mb-1">Interest Income (FD/SB)</label>
                  <input type="number" step="1" name="interest_income" id="in-interest" oninput="recalcTaxLive()" value="${p.interest_income}" placeholder="0" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-300 mb-1">Rental Income (Annual)</label>
                  <input type="number" step="1" name="rental_income" id="in-rental" oninput="recalcTaxLive()" value="${p.rental_income}" placeholder="0" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-300 mb-1">Other Taxable Income</label>
                  <input type="number" step="1" name="other_income" id="in-other" oninput="recalcTaxLive()" value="${p.other_income}" placeholder="0" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Exemptions & Deductions -->
          <div class="glass-card rounded-2xl p-5 border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase tracking-wider text-amber-400">3. Exemptions & Tax Deductions (₹)</h2>
              <span class="text-[10px] text-slate-400">Std Ded (₹75k New / ₹50k Old) is auto-applied</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">HRA & Sec 10 Exemptions (Old)</label>
                <input type="number" step="1" name="hra_exemption" id="in-hra" oninput="recalcTaxLive()" value="${p.hra_exemption}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Home Loan Interest u/s 24b (Max 2L)</label>
                <input type="number" step="1" name="home_loan_interest_24b" id="in-24b" oninput="recalcTaxLive()" value="${p.home_loan_interest_24b}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Sec 80C (PPF/EPF/ELSS, Max 1.5L)</label>
                <input type="number" step="1" name="sec_80c" id="in-80c" oninput="recalcTaxLive()" value="${p.sec_80c}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Sec 80D Health Ins. (Max 1L)</label>
                <input type="number" step="1" name="sec_80d_health" id="in-80d" oninput="recalcTaxLive()" value="${p.sec_80d_health}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Sec 80CCD(1B) Self NPS (Max 50k)</label>
                <input type="number" step="1" name="sec_80ccd_1b_nps" id="in-nps-self" oninput="recalcTaxLive()" value="${p.sec_80ccd_1b_nps}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-medium text-indigo-300 mb-1">Sec 80CCD(2) Employer NPS (Both!)</label>
                <input type="number" step="1" name="sec_80ccd_2_employer_nps" id="in-nps-emp" oninput="recalcTaxLive()" value="${p.sec_80ccd_2_employer_nps}" class="w-full rounded-xl bg-slate-800 border border-indigo-500/40 px-3 py-2 text-xs text-white font-mono">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Prof. Tax (Max 2.5k)</label>
                <input type="number" step="1" name="professional_tax" id="in-pt" oninput="recalcTaxLive()" value="${p.professional_tax}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">80TTA/TTB Savings Int</label>
                <input type="number" step="1" name="sec_80tta_savings" id="in-80tta" oninput="recalcTaxLive()" value="${p.sec_80tta_savings}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">80E / 80G / Others</label>
                <input type="number" step="1" name="other_deductions_80e_80g" id="in-other-ded" oninput="recalcTaxLive()" value="${p.other_deductions_80e_80g}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-mono">
              </div>
            </div>
          </div>

          <!-- 4. Taxes Already Paid (Form 16 TDS / Advance Tax) for Return / Refund Calculation -->
          <div class="glass-card rounded-2xl p-5 border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase tracking-wider text-cyan-400">4. Taxes Paid (TDS & Advance Tax)</h2>
              <span class="text-[10px] text-slate-400">Calculates ITR Refund or Tax Due</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">TDS Deducted (Form 16 / 26AS)</label>
                <input type="number" step="1" name="tds_deducted" id="in-tds" oninput="recalcTaxLive()" value="${p.tds_deducted}" placeholder="0" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Advance / Self-Assessment Tax</label>
                <input type="number" step="1" name="advance_tax_paid" id="in-adv-tax" oninput="recalcTaxLive()" value="${p.advance_tax_paid}" placeholder="0" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white font-mono">
              </div>
            </div>
          </div>

        </form>

        <!-- RIGHT COLUMN (7 cols): Side-by-Side Regime Comparison & Slab Breakdown -->
        <div class="lg:col-span-7 space-y-6">

          <!-- Side-by-Side Regime Comparison Table -->
          <div class="glass-card rounded-2xl border-slate-800 overflow-hidden shadow-2xl">
            <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-white">New Regime vs Old Regime — Complete Tax & Return Sheet</h2>
                <p class="text-xs text-slate-400">Every formula updates instantaneously as you enter your income or deductions</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/70">
                    <th class="px-5 py-3.5">Tax Computation Particular</th>
                    <th class="px-5 py-3.5 text-right text-indigo-300">New Tax Regime (115BAC)</th>
                    <th class="px-5 py-3.5 text-right text-amber-300">Old Tax Regime</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-xs font-mono">
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans font-medium text-slate-300">Gross Total Income (Salary + Interest + Rental + Other)</td>
                    <td class="px-5 py-3 text-right text-white font-bold" id="tbl-new-gti">${formatINR(t.grossTotalIncome)}</td>
                    <td class="px-5 py-3 text-right text-white font-bold" id="tbl-old-gti">${formatINR(t.grossTotalIncome)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Less: Standard Deduction u/s 16(ia)</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-new-std">-${formatINR(nr.stdDeduction)}</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-old-std">-${formatINR(or.stdDeduction)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Less: Chapter VI-A, HRA, Sec 24(b) & Employer NPS Deductions</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-new-ded">-${formatINR(nr.totalDeductions - nr.stdDeduction)}</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-old-ded">-${formatINR(or.totalDeductions - or.stdDeduction)}</td>
                  </tr>
                  <tr class="bg-slate-900/80 font-bold text-white">
                    <td class="px-5 py-3.5 font-sans">Net Taxable Income</td>
                    <td class="px-5 py-3.5 text-right text-indigo-300 text-sm" id="tbl-new-taxable">${formatINR(nr.taxableIncome)}</td>
                    <td class="px-5 py-3.5 text-right text-amber-300 text-sm" id="tbl-old-taxable">${formatINR(or.taxableIncome)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-300">Income Tax on Slabs (Before Rebate)</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-new-slabtax">${formatINR(nr.slabTax)}</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-old-slabtax">${formatINR(or.slabTax)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Less: Rebate u/s 87A & Marginal Relief</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-new-rebate">-${formatINR(nr.rebate87A + nr.marginalRelief)}</td>
                    <td class="px-5 py-3 text-right text-emerald-400" id="tbl-old-rebate">-${formatINR(or.rebate87A)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Add: Surcharge (if Net Taxable > ₹50 Lakh)</td>
                    <td class="px-5 py-3 text-right text-slate-300" id="tbl-new-surcharge">${formatINR(nr.surcharge.amount)} (${nr.surcharge.rate}%)</td>
                    <td class="px-5 py-3 text-right text-slate-300" id="tbl-old-surcharge">${formatINR(or.surcharge.amount)} (${or.surcharge.rate}%)</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Add: Health & Education Cess @ 4%</td>
                    <td class="px-5 py-3 text-right text-slate-300" id="tbl-new-cess">${formatINR(nr.cess)}</td>
                    <td class="px-5 py-3 text-right text-slate-300" id="tbl-old-cess">${formatINR(or.cess)}</td>
                  </tr>
                  <tr class="bg-slate-900/95 border-t-2 border-slate-700 font-extrabold text-sm">
                    <td class="px-5 py-4 font-sans text-white">Total Income Tax Liability</td>
                    <td class="px-5 py-4 text-right text-indigo-400" id="tbl-new-totaltax">${formatINR(nr.totalTax)}</td>
                    <td class="px-5 py-4 text-right text-amber-400" id="tbl-old-totaltax">${formatINR(or.totalTax)}</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-400">Effective Tax Rate (%)</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-new-eff">${nr.effectiveRate.toFixed(2)}%</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-old-eff">${or.effectiveRate.toFixed(2)}%</td>
                  </tr>
                  <tr class="hover:bg-slate-800/40">
                    <td class="px-5 py-3 font-sans text-slate-300">Less: Taxes Already Paid (TDS + Advance Tax)</td>
                    <td class="px-5 py-3 text-right text-cyan-400" id="tbl-new-paid">${formatINR(t.totalTaxesPaid)}</td>
                    <td class="px-5 py-3 text-right text-cyan-400" id="tbl-old-paid">${formatINR(t.totalTaxesPaid)}</td>
                  </tr>
                  <tr class="bg-slate-900/90">
                    <td class="px-5 py-4 font-sans font-bold text-white">ITR Return Outcome (Refund or Balance Tax Due)</td>
                    <td class="px-5 py-4 text-right" id="tbl-new-outcome">${renderRefundBadge(nr.refundOrPayable)}</td>
                    <td class="px-5 py-4 text-right" id="tbl-old-outcome">${renderRefundBadge(or.refundOrPayable)}</td>
                  </tr>
                  <tr class="bg-slate-950/80">
                    <td class="px-5 py-3.5 font-sans font-semibold text-emerald-400">Net Annual Post-Tax Income (In-Hand)</td>
                    <td class="px-5 py-3.5 text-right text-emerald-400 font-bold" id="tbl-new-net">${formatINR(nr.netPostTaxIncome)}</td>
                    <td class="px-5 py-3.5 text-right text-emerald-400 font-bold" id="tbl-old-net">${formatINR(or.netPostTaxIncome)}</td>
                  </tr>
                  <tr class="bg-slate-950/80">
                    <td class="px-5 py-3 font-sans text-slate-400">Estimated Monthly Post-Tax Take-Home</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-new-monthly">${formatINR(nr.monthlyTakeHome)}/mo</td>
                    <td class="px-5 py-3 text-right text-slate-200" id="tbl-old-monthly">${formatINR(or.monthlyTakeHome)}/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Slab-by-Slab Breakdown Cards (New vs Old) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- New Regime Slab Table -->
            <div class="glass-card rounded-2xl p-5 border-slate-800">
              <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400">New Regime Slab Breakdown</h3>
                <span class="text-[11px] font-mono text-slate-400" id="slab-new-fy">FY ${p.fy}</span>
              </div>
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                    <th class="pb-2">Income Slab</th>
                    <th class="pb-2 text-right">Rate</th>
                    <th class="pb-2 text-right">Taxable</th>
                    <th class="pb-2 text-right">Tax</th>
                  </tr>
                </thead>
                <tbody id="new-slabs-tbody">
                  ${newSlabsHtml}
                </tbody>
              </table>
            </div>

            <!-- Old Regime Slab Table -->
            <div class="glass-card rounded-2xl p-5 border-slate-800">
              <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400">Old Regime Slab Breakdown</h3>
                <span class="text-[11px] font-mono text-slate-400" id="slab-old-age">${p.age_group === "below_60" ? "< 60 Yrs" : (p.age_group === "senior_60_80" ? "60–80 Yrs" : "80+ Yrs")}</span>
              </div>
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                    <th class="pb-2">Income Slab</th>
                    <th class="pb-2 text-right">Rate</th>
                    <th class="pb-2 text-right">Taxable</th>
                    <th class="pb-2 text-right">Tax</th>
                  </tr>
                </thead>
                <tbody id="old-slabs-tbody">
                  ${oldSlabsHtml}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

module.exports = {
  defaultTaxProfile,
  calculateTaxBothRegimes,
  renderTaxCalculatorPage
};

