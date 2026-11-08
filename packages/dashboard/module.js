// packages/dashboard/module.js
// Dashboard Package: Cross-Package Aggregator & Premium Modern Fintech Command Center
const { formatINR, formatNum, formatDateDMY } = require("../core/module");
const { renderEditPencilButton } = require("../core/components");
const { summarizeMutualFunds } = require("../investments/mutual_funds/module");
const { summarizeFixedIncome } = require("../investments/fixed_income/module");
const { summarizeRetirement } = require("../investments/retirement_funds/module");
const { summarizeHealthInsurance } = require("../insurance/health_insurance/module");
const { summarizeLifeAndUlip } = require("../insurance/life_insurance/module");
const { summarizeHomeLoan } = require("../liabilities/home_loan/module");
const { summarizeBanking } = require("../banking/module");
const { calculateTaxBothRegimes } = require("../tax_planning/module");

function formatCompact(val) {
  const v = Math.abs(Number(val) || 0);
  const sign = Number(val) < 0 ? "-" : "";
  if (v >= 10000000) return `${sign}₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `${sign}₹${(v / 100000).toFixed(2)} L`;
  if (v >= 1000) return `${sign}₹${(v / 1000).toFixed(1)} K`;
  return `${sign}₹${Math.round(v)}`;
}

function calculateOverview(data) {
  const mf = summarizeMutualFunds(data);
  const { fd, rd, flexiRd } = summarizeFixedIncome(data);
  const { ppf, epf } = summarizeRetirement(data);
  const health = summarizeHealthInsurance(data);
  const { life, vehicle, homeLoanIns, ulip } = summarizeLifeAndUlip(data);
  const homeLoan = summarizeHomeLoan(data);
  const banking = summarizeBanking(data);
  const taxCalc = calculateTaxBothRegimes(data.tax_profile, data);

  const totalAssets = mf.current + fd.maturity + rd.maturity + flexiRd.maturity + epf.balance + ppf.balance + banking.accounts.totalBalance;
  const totalInvested = mf.invested + fd.principal + rd.invested + flexiRd.invested + epf.balance + ppf.contribution + banking.accounts.totalBalance;
  const totalGain = mf.gain + fd.gain + rd.gain + flexiRd.gain + ppf.interest + banking.accounts.annualInterest;
  const netWorth = totalAssets - homeLoan.outstanding_principal - banking.cards.totalUtilized;
  const netWorthWithoutRd = netWorth - rd.maturity - flexiRd.maturity;

  // Asset Allocation Percentages (across Gross Financial Assets)
  const fiTotal = fd.maturity + rd.maturity + flexiRd.maturity;
  const retTotal = ppf.balance + epf.balance;
  const mfPct = totalAssets > 0 ? Math.round((mf.current / totalAssets) * 100) : 0;
  const fiPct = totalAssets > 0 ? Math.round((fiTotal / totalAssets) * 100) : 0;
  const retPct = totalAssets > 0 ? Math.max(0, 100 - (mfPct + fiPct)) : 0;

  // Section 80C & 80D Tax Analytics
  const fyPpf = ppf.latestFyTotal || 0;
  const utilized80C = Math.min(150000, fyPpf + (ulip.paid > 0 ? Math.min(150000, ulip.paid) : 0));
  const pct80C = Math.round((utilized80C / 150000) * 100);
  const utilized80D = Math.min(50000, health.premium);
  const pct80D = Math.round((utilized80D / 50000) * 100);
  const totalTaxSaved = Math.round((utilized80C + utilized80D) * 0.312);

  return {
    mf,
    fd,
    rd,
    flexiRd,
    ppf,
    epf,
    ulip,
    homeLoan,
    netWorth,
    netWorthWithoutRd,
    totalAssets,
    totalInvested,
    totalGain,
    allocation: { mfPct, fiPct, retPct, fiTotal, retTotal },
    tax: { utilized80C, pct80C, utilized80D, pct80D, totalTaxSaved },
    health,
    life,
    vehicle,
    homeLoanIns,
    banking,
    taxCalc
  };
}

function renderOverviewPage(ov, data) {
  const loanPaidPct = ov.homeLoan.original_loan_amount > 0
    ? Math.max(0, Math.min(100, Math.round(((ov.homeLoan.original_loan_amount - ov.homeLoan.outstanding_principal) / ov.homeLoan.original_loan_amount) * 100)))
    : 0;

  // SVG Donut Stroke Dasharrays (circumference = 2 * pi * 40 ≈ 251.2)
  const c = 251.2;
  const mfDash = (ov.allocation.mfPct / 100) * c;
  const fiDash = (ov.allocation.fiPct / 100) * c;
  const retDash = (ov.allocation.retPct / 100) * c;

  return `
    <div class="space-y-8">
      <!-- Top Command Header -->
      <div class="pb-6 border-b border-slate-800/80">
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Portfolio Command Center</h1>
        <p class="text-xs text-slate-400 mt-1">
          Use the <strong class="text-slate-200">Manage →</strong> links on each card to inspect or edit holdings. All returns, durations, and maturities auto-calculate in real time.
        </p>
      </div>

      <!-- Primary 4 KPI Hero Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <!-- 1. Consolidated Net Worth -->
        <div class="glass-card relative overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:border-indigo-500/50">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Worth (After Loan)</span>
            <div class="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <div class="text-2xl font-extrabold tracking-tight text-white font-mono">${formatINR(ov.netWorth)}</div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Excl. RD: <strong class="text-slate-200 font-mono">${formatINR(ov.netWorthWithoutRd)}</strong></span>
            <span class="text-emerald-400 font-mono">Assets: ${formatCompact(ov.totalAssets)}</span>
          </div>
        </div>

        <!-- 2. Mutual Funds Card -->
        <div class="glass-card relative overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-300 border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Mutual Funds</span>
            <div class="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <div class="text-2xl font-extrabold tracking-tight text-white font-mono">${formatINR(ov.mf.current)}</div>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 font-mono">+${ov.mf.gainPct.toFixed(2)}%</span>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Invested: ${formatINR(ov.mf.invested)} • SIP: ${formatCompact(ov.mf.sip)}/m</span>
            <a href="/mutual_funds" class="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Manage →</a>
          </div>
        </div>

        <!-- 3. Fixed Income (FD & RD) Card -->
        <div class="glass-card relative overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-300 border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Fixed Income (FD & RD)</span>
            <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <div class="text-2xl font-extrabold tracking-tight text-white font-mono">${formatINR(ov.fd.maturity + ov.rd.maturity + ov.flexiRd.maturity)}</div>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 font-mono">+${formatCompact(ov.fd.gain + ov.rd.gain + ov.flexiRd.gain)}</span>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>FD: ${formatCompact(ov.fd.maturity)} • RD/Flexi: ${formatCompact(ov.rd.maturity + ov.flexiRd.maturity)}</span>
            <a href="/fixed_income" class="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Manage →</a>
          </div>
        </div>

        <!-- 4. Retirement Corpus (PPF & EPF) Card -->
        <div class="glass-card relative overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-300 border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Retirement (PPF & EPF)</span>
            <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="mt-4 flex items-baseline gap-2">
            <div class="text-2xl font-extrabold tracking-tight text-white font-mono">${formatINR(ov.ppf.balance + ov.epf.balance)}</div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>PPF: ${formatCompact(ov.ppf.balance)} • EPF: ${formatCompact(ov.epf.balance)}</span>
            <a href="/retirement" class="text-amber-400 hover:text-amber-300 font-semibold transition-colors">Manage →</a>
          </div>
        </div>

      </div>

      <!-- Second Row: Detailed Domain Breakdown Cards (FD vs RD, PPF vs EPF, Home Loan) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Fixed Deposits & Recurring Deposits Split Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Fixed & Recurring Deposits</h3>
                <p class="text-[11px] text-slate-400">Quarterly compounded bank deposits</p>
              </div>
            </div>
            <a href="/fixed_income" class="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Manage →</a>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Fixed Deposits (FD)</span>
              <span class="text-lg font-extrabold text-white font-mono mt-1 block">${formatINR(ov.fd.maturity)}</span>
              <div class="mt-2 space-y-0.5 text-[11px] text-slate-400 font-mono">
                <div class="flex justify-between"><span>Principal:</span><span class="text-slate-200">${formatCompact(ov.fd.principal)}</span></div>
                <div class="flex justify-between"><span>Gain:</span><span class="text-emerald-400">+${formatINR(ov.fd.gain)}</span></div>
                <div class="flex justify-between"><span>Avg Rate:</span><span class="text-cyan-300">${ov.fd.avgRate.toFixed(2)}%</span></div>
                <div class="flex justify-between"><span>Next Mat:</span><span class="text-slate-300">${formatDateDMY(ov.fd.nextMaturity)}</span></div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Recurring (RD)</span>
              <span class="text-lg font-extrabold text-white font-mono mt-1 block">${formatINR(ov.rd.maturity)}</span>
              <div class="mt-2 space-y-0.5 text-[11px] text-slate-400 font-mono">
                <div class="flex justify-between"><span>Invested:</span><span class="text-slate-200">${formatCompact(ov.rd.invested)}</span></div>
                <div class="flex justify-between"><span>Gain:</span><span class="text-emerald-400">+${formatINR(ov.rd.gain)}</span></div>
                <div class="flex justify-between"><span>Outflow:</span><span class="text-indigo-300">${formatCompact(ov.rd.monthly)}/m</span></div>
                <div class="flex justify-between"><span>Last End:</span><span class="text-slate-300">${formatDateDMY(ov.rd.lastEndDate)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Asset Allocation Visual Donut Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <div>
              <h3 class="text-sm font-bold text-white">Portfolio Asset Allocation</h3>
              <p class="text-[11px] text-slate-400">Distribution across ${formatINR(ov.totalAssets)} gross assets</p>
            </div>
            <span class="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-800/50">Gain: +${formatCompact(ov.totalGain)}</span>
          </div>

          <div class="flex items-center gap-6 my-auto py-2">
            <div class="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" stroke-width="12" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" stroke-width="12"
                        stroke-dasharray="${mfDash} ${c}" stroke-dashoffset="0" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" stroke-width="12"
                        stroke-dasharray="${fiDash} ${c}" stroke-dashoffset="-${mfDash}" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" stroke-width="12"
                        stroke-dasharray="${retDash} ${c}" stroke-dashoffset="-${mfDash + fiDash}" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="text-[10px] text-slate-400 uppercase">Assets</span>
                <span class="text-xs font-extrabold text-white font-mono">${formatCompact(ov.totalAssets)}</span>
              </div>
            </div>

            <div class="flex-1 space-y-2.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-slate-300"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>Mutual Funds</span>
                <span class="font-mono font-bold text-white">${ov.allocation.mfPct}% (${formatCompact(ov.mf.current)})</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-slate-300"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>FD & RD</span>
                <span class="font-mono font-bold text-white">${ov.allocation.fiPct}% (${formatCompact(ov.allocation.fiTotal)})</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-slate-300"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>PPF & EPF</span>
                <span class="font-mono font-bold text-white">${ov.allocation.retPct}% (${formatCompact(ov.allocation.retTotal)})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Home Loan Liability & Repayment Progress Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Home Loan Tracker</h3>
                <p class="text-[11px] text-slate-400">Started ${formatDateDMY(ov.homeLoan.loan_start_date)} • ${ov.homeLoan.tenure_years} Yrs @ ${ov.homeLoan.interest_rate}%</p>
              </div>
            </div>
            ${renderEditPencilButton("home_loan", null, "Edit Home Loan")}
          </div>

          <div class="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400">EMI Debit Schedule</span>
            <span class="font-mono font-semibold text-indigo-300">${ov.homeLoan.emi_day}th of every month</span>
          </div>

          <div class="space-y-2">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-[10px] uppercase text-slate-400 block">Outstanding Principal</span>
                <span class="text-xl font-extrabold text-rose-400 font-mono">${formatINR(ov.homeLoan.outstanding_principal)}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase text-slate-400 block">Monthly EMI (${ov.homeLoan.emi_day}th)</span>
                <span class="text-sm font-bold text-white font-mono">${formatINR(ov.homeLoan.monthly_emi)}/mo</span>
              </div>
            </div>

            <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-indigo-500" style="width: ${loanPaidPct}%;"></div>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400 font-mono">
              <span class="text-emerald-400">${loanPaidPct}% Principal Repaid</span>
              <span>Original: ${formatCompact(ov.homeLoan.original_loan_amount)}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Third Row: Health Insurance, Life Insurance & ULIP Protection Shield -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <!-- Health Insurance Shield Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Health Insurance Shield</h3>
                <p class="text-[11px] text-slate-400">${ov.health.count} Active Policies • Auto Expiry Tracking</p>
              </div>
            </div>
            <a href="/insurance" class="text-xs text-teal-400 hover:text-teal-300 font-semibold transition-colors">Manage →</a>
          </div>
          <div class="flex items-baseline justify-between pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">Total Sum Insured</span>
              <span class="text-xl font-black text-white font-mono">${formatINR(ov.health.sumInsured)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Annual Premium</span>
              <span class="text-sm font-bold text-teal-400 font-mono">${formatINR(ov.health.premium)}/yr</span>
            </div>
          </div>
        </div>

        <!-- Life Insurance Shield Card (Empty as requested) -->
        <div class="glass-card rounded-2xl p-6 border-slate-800">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Term Life Protection</h3>
                <p class="text-[11px] text-slate-400">${ov.life.count > 0 ? `${ov.life.count} Active Policies` : 'Pending — Add policy via Manage'}</p>
              </div>
            </div>
            <a href="/insurance" class="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors">Manage →</a>
          </div>
          <div class="flex items-baseline justify-between pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">Sum Assured</span>
              <span class="text-xl font-black text-white font-mono">${formatINR(ov.life.sumInsured)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Annual Premium</span>
              <span class="text-sm font-bold text-slate-300 font-mono">${formatINR(ov.life.premium)}/yr</span>
            </div>
          </div>
        </div>

        <!-- ULIP Investment Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">ULIP Portfolio</h3>
                <p class="text-[11px] text-slate-400">Market-linked insurance investment</p>
              </div>
            </div>
            ${renderEditPencilButton("ulip", null, "Edit ULIP")}
          </div>
          <div class="flex items-baseline justify-between pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">Current Value</span>
              <span class="text-xl font-black text-white font-mono">${formatINR(ov.ulip.value, 2)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Total Paid</span>
              <span class="text-sm font-bold text-slate-300 font-mono">${formatINR(ov.ulip.paid, 2)}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Fourth Row: Bank Accounts, Credit Cards & Income Tax Return Calculator -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <!-- Bank Accounts Summary Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Bank Accounts List</h3>
                <p class="text-[11px] text-slate-400">${ov.banking.accounts.count > 0 ? `${ov.banking.accounts.count} Active Account(s) • Liquid Savings & Current` : "No bank accounts added yet — Click Manage to add"}</p>
              </div>
            </div>
            <a href="/banking" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Manage →</a>
          </div>
          <div class="flex items-baseline justify-between pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">Total Liquid Balance</span>
              <span class="text-xl font-black text-white font-mono">${formatINR(ov.banking.accounts.totalBalance, 2)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Est. Annual Interest</span>
              <span class="text-sm font-bold text-emerald-400 font-mono">+${formatINR(ov.banking.accounts.annualInterest)}/yr</span>
            </div>
          </div>
        </div>

        <!-- Credit Cards & Credit Limits Summary Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Credit Cards & Limits</h3>
                <p class="text-[11px] text-slate-400">${ov.banking.cards.count > 0 ? `${ov.banking.cards.count} Active Card(s) • ${ov.banking.cards.utilizationPct}% Credit Utilization` : "No credit cards added yet — Click Manage to add"}</p>
              </div>
            </div>
            <a href="/banking" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Manage →</a>
          </div>
          <div class="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">Total Credit Limit</span>
              <span class="text-lg font-black text-white font-mono">${formatINR(ov.banking.cards.totalLimit)}</span>
            </div>
            <div>
              <span class="text-[11px] text-slate-400 block">Available Limit</span>
              <span class="text-lg font-black text-emerald-400 font-mono">${formatINR(ov.banking.cards.totalAvailable)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Utilized Balance</span>
              <span class="text-sm font-bold ${ov.banking.cards.totalUtilized > 0 ? "text-rose-400" : "text-slate-300"} font-mono">${formatINR(ov.banking.cards.totalUtilized, 2)}</span>
            </div>
          </div>
        </div>

        <!-- Income Tax & ITR Return Calculator Summary Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Income Tax & ITR Calculator</h3>
                <p class="text-[11px] text-slate-400">FY ${ov.taxCalc.profile.fy} • New vs Old Regime Comparison</p>
              </div>
            </div>
            <a href="/tax_calculator" class="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Manage →</a>
          </div>
          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div>
              <span class="text-[11px] text-slate-400 block">New Regime Tax</span>
              <span class="text-lg font-black text-indigo-300 font-mono">${formatINR(ov.taxCalc.newRegime.totalTax)}</span>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-slate-400 block">Old Regime Tax</span>
              <span class="text-lg font-black text-amber-300 font-mono">${formatINR(ov.taxCalc.oldRegime.totalTax)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

module.exports = {
  calculateOverview,
  renderOverviewPage
};
