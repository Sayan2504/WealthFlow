// packages/investments/fixed_income/module.js
// Fixed Income Package: FD & RD Compounding Calculators & Modern Fintech View
const { computeExactDuration, formatINR, formatNum, formatDateDMY } = require("../../core/module");
const { renderRowActionButtons } = require("../../core/components");

function computeFormulaFD(principal, rate, startStr, matStr, dur) {
  if (principal <= 0) return 0;
  const r = rate / 100;
  const start = new Date(startStr);
  const end = new Date(matStr);
  const exactDays = (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start)
    ? Math.round((end.getTime() - start.getTime()) / 86400000)
    : 0;
  // Indian Bank / RBI rule: deposits under 6 months (< 180 days) earn Simple Interest (Actual/365)
  if (exactDays > 0 && exactDays < 180) {
    return Math.round(principal * (1 + r * (exactDays / 365)));
  }
  // Deposits >= 6 months compound quarterly using bank tenure (years + months/12 + days/360)
  const bankYears = dur.years + (dur.months / 12) + (dur.days / 360);
  return Math.round(principal * Math.pow(1 + r / 4, 4 * bankYears));
}

function computeDaysToMaturity(endDateStr) {
  if (!endDateStr) return { daysLeft: 0, label: "—", badgeClass: "bg-slate-800 text-slate-400 border-slate-700" };
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = String(endDateStr).split("-");
  const endUtc = parts.length === 3
    ? Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    : new Date(endDateStr).getTime();
  if (isNaN(endUtc)) return { daysLeft: 0, label: "—", badgeClass: "bg-slate-800 text-slate-400 border-slate-700" };
  const diffDays = Math.round((endUtc - todayUtc) / 86400000);
  if (diffDays < 0) {
    return {
      daysLeft: diffDays,
      label: `Matured (${Math.abs(diffDays)}d ago)`,
      badgeClass: "bg-emerald-950/90 text-emerald-300 border-emerald-700/60"
    };
  }
  if (diffDays === 0) {
    return {
      daysLeft: 0,
      label: "Matures Today!",
      badgeClass: "bg-amber-950/90 text-amber-300 border-amber-700/60"
    };
  }
  if (diffDays <= 30) {
    return {
      daysLeft: diffDays,
      label: `${diffDays} Days Left`,
      badgeClass: "bg-amber-950/90 text-amber-300 border-amber-700/60"
    };
  }
  return {
    daysLeft: diffDays,
    label: `${diffDays} Days Left`,
    badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-800/60"
  };
}

function calculateFD(fd, slabRate = 0.30) {
  const principal = Number(fd.principal) || 0;
  const rate = Number(fd.rate) || 0;
  const dur = computeExactDuration(fd.start_date, fd.maturity_date);
  const formulaMaturity = computeFormulaFD(principal, rate, fd.start_date, fd.maturity_date, dur);
  const maturity = Number(fd.maturity_amount) > 0 ? Math.round(Number(fd.maturity_amount)) : formulaMaturity;
  const gain = Math.max(0, maturity - principal);
  const countdown = computeDaysToMaturity(fd.maturity_date);
  const effectiveTaxRate = slabRate > 0 ? slabRate * 1.04 : 0;
  const tax = Math.round(gain * effectiveTaxRate);
  const postTaxGain = Math.max(0, gain - tax);
  const postTaxYield = Number((rate * (1 - effectiveTaxRate)).toFixed(2));
  return {
    principal,
    rate,
    durationText: dur.text,
    durationObj: dur,
    daysLeft: countdown.daysLeft,
    daysLeftLabel: countdown.label,
    daysLeftBadgeClass: countdown.badgeClass,
    formulaMaturity,
    maturity,
    gain,
    tax,
    postTaxGain,
    postTaxYield
  };
}

function calculateRD(rd, slabRate = 0.30) {
  const monthly = Number(rd.monthly_amount) || 0;
  const rate = Number(rd.rate) || 0;
  const dur = computeExactDuration(rd.start_date, rd.end_date);
  const nMonths = Math.max(1, Math.round(dur.years * 12 + dur.months + (dur.days / 30)));
  const totalInvested = monthly * nMonths;
  const r = rate / 100;
  let formulaMaturity = 0;
  for (let k = 1; k <= nMonths; k++) {
    formulaMaturity += monthly * Math.pow(1 + r / 4, 4 * (k / 12));
  }
  formulaMaturity = Math.round(formulaMaturity);
  const maturity = Number(rd.maturity_amount) > 0 ? Math.round(Number(rd.maturity_amount)) : formulaMaturity;
  const gain = Math.max(0, maturity - totalInvested);
  const countdown = computeDaysToMaturity(rd.end_date);
  const effectiveTaxRate = slabRate > 0 ? slabRate * 1.04 : 0;
  const tax = Math.round(gain * effectiveTaxRate);
  const postTaxGain = Math.max(0, gain - tax);
  const postTaxYield = Number((rate * (1 - effectiveTaxRate)).toFixed(2));
  return {
    monthly,
    rate,
    nMonths,
    durationText: dur.text,
    durationObj: dur,
    daysLeft: countdown.daysLeft,
    daysLeftLabel: countdown.label,
    daysLeftBadgeClass: countdown.badgeClass,
    totalInvested,
    formulaMaturity,
    maturity,
    gain,
    tax,
    postTaxGain,
    postTaxYield
  };
}

function calculateFlexiRD(frd, slabRate = 0.30) {
  const baseMonthly = Number(frd.base_monthly) || 0;
  const rate = Number(frd.rate) || 0;
  const dur = computeExactDuration(frd.start_date, frd.end_date);
  const nMonths = Math.max(1, Math.round(dur.years * 12 + dur.months + (dur.days / 30)));
  const totalDeposited = Number(frd.total_deposited) > 0 ? Number(frd.total_deposited) : (baseMonthly * nMonths);
  const r = rate / 100;
  const avgMonthly = nMonths > 0 ? (totalDeposited / nMonths) : baseMonthly;
  let formulaMaturity = 0;
  for (let k = 1; k <= nMonths; k++) {
    formulaMaturity += avgMonthly * Math.pow(1 + r / 4, 4 * (k / 12));
  }
  formulaMaturity = Math.round(formulaMaturity);
  const maturity = Number(frd.maturity_amount) > 0 ? Math.round(Number(frd.maturity_amount)) : formulaMaturity;
  const gain = Math.max(0, maturity - totalDeposited);
  const countdown = computeDaysToMaturity(frd.end_date);
  const effectiveTaxRate = slabRate > 0 ? slabRate * 1.04 : 0;
  const tax = Math.round(gain * effectiveTaxRate);
  const postTaxGain = Math.max(0, gain - tax);
  const postTaxYield = Number((rate * (1 - effectiveTaxRate)).toFixed(2));
  return {
    baseMonthly,
    totalDeposited,
    rate,
    nMonths,
    durationText: dur.text,
    durationObj: dur,
    daysLeft: countdown.daysLeft,
    daysLeftLabel: countdown.label,
    daysLeftBadgeClass: countdown.badgeClass,
    formulaMaturity,
    maturity,
    gain,
    tax,
    postTaxGain,
    postTaxYield
  };
}

function summarizeFixedIncome(data, slabRate = 0.30) {
  let fdPrincipal = 0;
  let fdMaturity = 0;
  let fdRateSum = 0;
  let nextFdMaturity = null;
  const fds = data.fixed_deposits || [];
  fds.forEach(fd => {
    const c = calculateFD(fd, slabRate);
    fdPrincipal += c.principal;
    fdMaturity += c.maturity;
    fdRateSum += c.rate;
    if (fd.maturity_date) {
      if (!nextFdMaturity || new Date(fd.maturity_date) < new Date(nextFdMaturity)) {
        nextFdMaturity = fd.maturity_date;
      }
    }
  });
  const fdInterestGain = Math.max(0, fdMaturity - fdPrincipal);
  const fdAvgRate = fds.length > 0 ? (fdRateSum / fds.length) : 0;

  let rdMonthlyOutflow = 0;
  let rdTotalInvested = 0;
  let rdExpectedMaturity = 0;
  let lastRdEndDate = null;
  let totalRdMonths = 0;
  const rds = data.recurring_deposits || [];
  rds.forEach(rd => {
    const c = calculateRD(rd, slabRate);
    rdMonthlyOutflow += c.monthly;
    rdTotalInvested += c.totalInvested;
    rdExpectedMaturity += c.maturity;
    totalRdMonths += c.nMonths;
    if (rd.end_date) {
      if (!lastRdEndDate || new Date(rd.end_date) > new Date(lastRdEndDate)) {
        lastRdEndDate = rd.end_date;
      }
    }
  });
  const rdGain = Math.max(0, rdExpectedMaturity - rdTotalInvested);

  let flexiBaseMonthly = 0;
  let flexiTotalDeposited = 0;
  let flexiExpectedMaturity = 0;
  const flexiRds = data.flexi_rds || [];
  flexiRds.forEach(frd => {
    const c = calculateFlexiRD(frd, slabRate);
    flexiBaseMonthly += c.baseMonthly;
    flexiTotalDeposited += c.totalDeposited;
    flexiExpectedMaturity += c.maturity;
  });
  const flexiGain = Math.max(0, flexiExpectedMaturity - flexiTotalDeposited);

  const totalGrossGain = fdInterestGain + rdGain + flexiGain;
  const effectiveTaxRate = slabRate > 0 ? slabRate * 1.04 : 0;
  const estimatedTax = Math.round(totalGrossGain * effectiveTaxRate);
  const postTaxGain = Math.max(0, totalGrossGain - estimatedTax);
  const postTaxYield = Number((fdAvgRate * (1 - effectiveTaxRate)).toFixed(2));

  return {
    fd: { principal: fdPrincipal, maturity: fdMaturity, gain: fdInterestGain, avgRate: fdAvgRate, nextMaturity: nextFdMaturity || "—" },
    rd: { monthly: rdMonthlyOutflow, invested: rdTotalInvested, maturity: rdExpectedMaturity, gain: rdGain, lastEndDate: lastRdEndDate || "—", totalMonths: totalRdMonths },
    flexiRd: { count: flexiRds.length, baseMonthly: flexiBaseMonthly, invested: flexiTotalDeposited, maturity: flexiExpectedMaturity, gain: flexiGain },
    postTax: {
      slabRate,
      effectiveTaxRate,
      totalGrossGain,
      estimatedTax,
      postTaxGain,
      postTaxYield
    }
  };
}

function renderFixedIncomePage(data, ov) {
  const flexi = ov.flexiRd || { count: 0, baseMonthly: 0, invested: 0, maturity: 0, gain: 0 };
  const postTaxInfo = ov.postTax || {
    slabRate: 0.30,
    effectiveTaxRate: 0.312,
    totalGrossGain: (ov.fd.gain + ov.rd.gain + flexi.gain),
    estimatedTax: Math.round((ov.fd.gain + ov.rd.gain + flexi.gain) * 0.312),
    postTaxGain: Math.max(0, Math.round((ov.fd.gain + ov.rd.gain + flexi.gain) * (1 - 0.312))),
    postTaxYield: Number((ov.fd.avgRate * 0.688).toFixed(2))
  };

  return `
    <div class="space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Fixed Income Portfolio (FD, RD & Flexi RD)</h1>
          <p class="text-xs text-slate-400 mt-1">Exact tenure duration, total invested capital, quarterly compounded maturity, and interest gains</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="openModal('fd')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 whitespace-nowrap">
            + Add Fixed Deposit (FD)
          </button>
          <button onclick="openModal('rd')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 whitespace-nowrap">
            + Add Recurring Deposit (RD)
          </button>
          <button onclick="openModal('flexi_rd')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 whitespace-nowrap">
            + Add Flexi RD
          </button>
        </div>
      </div>

      <!-- Post-Tax Interest Intelligence Hero Card -->
      <div class="glass-card p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/25 shadow-2xl relative overflow-hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Tax Intelligence</span>
              <span class="text-xs text-slate-400">Post-Tax Fixed Income Return (Section 194A / Slab Rate)</span>
            </div>
            <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
              How Much Will You Keep After Tax?
            </h2>
            <p class="text-xs text-slate-400 max-w-xl leading-relaxed">
              Interest from Bank FDs & RDs is fully taxable at your personal income tax slab rate under <em>Income from Other Sources</em>. Toggle your marginal slab below to see your net in-hand earnings after slab tax and 4% Health & Education cess.
            </p>
          </div>

          <!-- Dynamic Numbers & Slab Switcher -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shrink-0">
            <div>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Net After-Tax Interest</span>
              <span id="post-tax-interest-val" class="text-3xl font-black text-emerald-400 font-mono block mt-0.5">+${formatINR(postTaxInfo.postTaxGain)}</span>
              <div class="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                <span>Gross: <strong class="text-slate-200">+${formatINR(postTaxInfo.totalGrossGain)}</strong></span>
                <span>•</span>
                <span>Tax: <strong id="post-tax-tax-val" class="text-rose-400">-${formatINR(postTaxInfo.estimatedTax)}</strong></span>
              </div>
            </div>

            <div class="sm:border-l sm:border-slate-800 sm:pl-6 space-y-2">
              <div class="flex items-center justify-between gap-3 text-[11px]">
                <span class="text-slate-400 font-medium">Marginal Slab:</span>
                <span id="post-tax-yield-badge" class="text-cyan-300 font-mono font-bold">Yield: ${postTaxInfo.postTaxYield.toFixed(2)}% net</span>
              </div>
              <!-- Interactive Slab Buttons -->
              <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800" id="fi-slab-selector">
                <button type="button" onclick="setFiTaxSlab(0)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-400 hover:text-white transition-all">0%</button>
                <button type="button" onclick="setFiTaxSlab(5)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-400 hover:text-white transition-all">5%</button>
                <button type="button" onclick="setFiTaxSlab(10)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-400 hover:text-white transition-all">10%</button>
                <button type="button" onclick="setFiTaxSlab(15)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-400 hover:text-white transition-all">15%</button>
                <button type="button" onclick="setFiTaxSlab(20)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg text-slate-400 hover:text-white transition-all">20%</button>
                <button type="button" onclick="setFiTaxSlab(30)" class="fi-slab-btn px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-600/30 transition-all">30%</button>
              </div>
              <span class="text-[10px] text-slate-500 block text-right font-mono">+4% Health & Education cess</span>
            </div>
          </div>
        </div>
      </div>

      <script>
        window.FI_GROSS_INTEREST = ${postTaxInfo.totalGrossGain};
        window.FI_AVG_RATE = ${ov.fd.avgRate};
      </script>

      <!-- 4 KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">FD Expected Maturity</span>
          <span class="text-2xl font-black text-white font-mono mt-1 block">${formatINR(ov.fd.maturity)}</span>
          <span class="text-[11px] text-emerald-400 mt-1 block font-mono">Principal: ${formatINR(ov.fd.principal)} • Avg ${ov.fd.avgRate.toFixed(2)}%</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">FD Interest Gain</span>
          <span class="text-2xl font-black text-emerald-400 font-mono mt-1 block">+${formatINR(ov.fd.gain)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block">Next Maturity: ${formatDateDMY(ov.fd.nextMaturity)}</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">RD Expected Maturity</span>
          <span class="text-2xl font-black text-cyan-400 font-mono mt-1 block">${formatINR(ov.rd.maturity)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block">Invested: ${formatINR(ov.rd.invested)} (+${formatINR(ov.rd.gain)} gain)</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Monthly RD Outflow</span>
          <span class="text-2xl font-black text-indigo-400 font-mono mt-1 block">${formatINR(ov.rd.monthly)}/mo</span>
          <span class="text-[11px] text-slate-400 mt-1 block">Last RD Ends: ${formatDateDMY(ov.rd.lastEndDate)}</span>
        </div>
      </div>

      <!-- Fixed Deposits (FD) Modern Table Card -->
      <div id="fd" class="glass-card rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white">Fixed Deposits (FD)</h3>
            <p class="text-xs text-slate-400">Duration, Interest Gain, and Maturity Amount are auto-calculated from Start & Maturity Dates</p>
          </div>
          <span class="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/50">${(data.fixed_deposits || []).length} Active FDs</span>
        </div>
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th class="px-5 py-3.5">Bank & FD No</th>
                <th class="px-4 py-3.5 text-right">Principal</th>
                <th class="px-4 py-3.5 text-right">Rate %</th>
                <th class="px-4 py-3.5">Tenure Dates</th>
                <th class="px-4 py-3.5">Duration & Days Left</th>
                <th class="px-4 py-3.5 text-right">Auto Interest Gain</th>
                <th class="px-4 py-3.5 text-right">Auto Maturity Value</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${(data.fixed_deposits || []).length === 0 ? `
                <tr>
                  <td colspan="8" class="px-5 py-10 text-center font-sans text-slate-400">
                    No Fixed Deposits added yet. Click <button onclick="openModal('fd')" class="text-indigo-400 hover:underline font-semibold">+ Add Fixed Deposit (FD)</button> to compute exact tenure and compounded maturity.
                  </td>
                </tr>
              ` : (data.fixed_deposits || []).map(fd => {
                const c = calculateFD(fd);
                return `
                  <tr class="hover:bg-slate-850/60 transition-colors">
                    <td class="px-5 py-4 font-sans">
                      <span class="font-bold text-white">${fd.bank}</span>
                      <span class="block text-[11px] text-slate-400 font-mono">FD # ${fd.fd_no}</span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-white">${formatINR(c.principal)}</td>
                    <td class="px-4 py-4 text-right text-emerald-400 font-semibold">${c.rate}%</td>
                    <td class="px-4 py-4 text-slate-300">${formatDateDMY(fd.start_date)} → ${formatDateDMY(fd.maturity_date)}</td>
                    <td class="px-4 py-4 font-sans">
                      <div class="flex flex-col items-start gap-1">
                        <span class="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700">${c.durationText}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${c.daysLeftBadgeClass}">${c.daysLeftLabel}</span>
                      </div>
                    </td>
                    <td class="px-4 py-4 text-right font-mono">
                      <span class="text-emerald-400 font-semibold block">+${formatINR(c.gain)}</span>
                      <span class="text-[10px] text-slate-400 block fi-post-tax-cell" data-gross="${c.gain}">Net: +${formatINR(c.postTaxGain)}</span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-cyan-300">${formatINR(c.maturity)}</td>
                    <td class="px-5 py-4 text-right font-sans whitespace-nowrap">
                      ${renderRowActionButtons("fd", fd.id, fd.bank + " FD #" + fd.fd_no)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recurring Deposits (RD) Modern Table Card -->
      <div id="rd" class="glass-card rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white">Recurring Deposits (RD)</h3>
            <p class="text-xs text-slate-400">Total Invested, Duration, and Maturity Value auto-calculate from Monthly Installment & Dates</p>
          </div>
          <span class="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50">${(data.recurring_deposits || []).length} Active RDs</span>
        </div>
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th class="px-5 py-3.5">Bank & RD No</th>
                <th class="px-4 py-3.5">Goal / Purpose</th>
                <th class="px-4 py-3.5 text-right">Monthly Installment</th>
                <th class="px-4 py-3.5 text-right">Auto Total Invested</th>
                <th class="px-4 py-3.5 text-right">Rate %</th>
                <th class="px-4 py-3.5">Duration & Days Left</th>
                <th class="px-4 py-3.5 text-right">Auto Maturity Value</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${(data.recurring_deposits || []).length === 0 ? `
                <tr>
                  <td colspan="8" class="px-5 py-10 text-center font-sans text-slate-400">
                    No Recurring Deposits added yet. Click <button onclick="openModal('rd')" class="text-emerald-400 hover:underline font-semibold">+ Add Recurring Deposit (RD)</button> to start tracking monthly installments.
                  </td>
                </tr>
              ` : (data.recurring_deposits || []).map(rd => {
                const c = calculateRD(rd);
                return `
                  <tr class="hover:bg-slate-850/60 transition-colors">
                    <td class="px-5 py-4 font-sans">
                      <span class="font-bold text-white">${rd.bank}</span>
                      <span class="block text-[11px] text-slate-400 font-mono">RD # ${rd.rd_no}</span>
                    </td>
                    <td class="px-4 py-4 font-sans">
                      <span class="px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 text-[11px] font-medium">${rd.purpose}</span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-white">${formatINR(c.monthly)}/mo</td>
                    <td class="px-4 py-4 text-right text-slate-200">${formatINR(c.totalInvested)}</td>
                    <td class="px-4 py-4 text-right text-emerald-400 font-semibold">${c.rate}%</td>
                    <td class="px-4 py-4 font-sans">
                      <span class="text-slate-200 block text-[11px]">${c.durationText}</span>
                      <span class="text-[10px] text-slate-500 font-mono block">${formatDateDMY(rd.start_date)} → ${formatDateDMY(rd.end_date)}</span>
                      <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${c.daysLeftBadgeClass}">${c.daysLeftLabel}</span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-cyan-300 font-mono">
                      ${formatINR(c.maturity)}
                      <span class="block text-[10px] text-emerald-400 font-normal">+${formatINR(c.gain)} gain</span>
                      <span class="block text-[10px] text-slate-400 font-normal fi-post-tax-cell" data-gross="${c.gain}">Net: +${formatINR(c.postTaxGain)}</span>
                    </td>
                    <td class="px-5 py-4 text-right font-sans whitespace-nowrap">
                      ${renderRowActionButtons("rd", rd.id, rd.bank + " RD #" + rd.rd_no)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Flexible Recurring Deposits (Flexi RD) Modern Table Card -->
      <div id="flexi-rd" class="glass-card rounded-2xl overflow-hidden">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white">Flexible Recurring Deposits (Flexi RD)</h3>
            <p class="text-xs text-slate-400">Variable installment RDs (SBI Flexi Deposit, ICICI iWish, HDFC/Kotak Flexi RD) with ad-hoc top-ups and quarterly compounding</p>
          </div>
          <span class="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/50">${(data.flexi_rds || []).length} Active Flexi RDs</span>
        </div>
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th class="px-5 py-3.5">Bank & Flexi RD No</th>
                <th class="px-4 py-3.5">Goal / Purpose</th>
                <th class="px-4 py-3.5 text-right">Base Monthly</th>
                <th class="px-4 py-3.5 text-right">Total Deposited</th>
                <th class="px-4 py-3.5 text-right">Rate %</th>
                <th class="px-4 py-3.5">Duration & Days Left</th>
                <th class="px-4 py-3.5 text-right">Auto Maturity Value</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${(data.flexi_rds || []).length === 0 ? `
                <tr>
                  <td colspan="8" class="px-5 py-10 text-center font-sans text-slate-400">
                    No Flexi Recurring Deposits added yet. Click <button onclick="openModal('flexi_rd')" class="text-cyan-400 hover:underline font-semibold">+ Add Flexi RD</button> to add a flexible recurring deposit.
                  </td>
                </tr>
              ` : (data.flexi_rds || []).map(frd => {
                const c = calculateFlexiRD(frd);
                return `
                  <tr class="hover:bg-slate-850/60 transition-colors">
                    <td class="px-5 py-4 font-sans">
                      <span class="font-bold text-white">${frd.bank}</span>
                      <span class="block text-[11px] text-slate-400 font-mono">Flexi RD # ${frd.rd_no}</span>
                    </td>
                    <td class="px-4 py-4 font-sans">
                      <span class="px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 text-[11px] font-medium">${frd.purpose || "Flexible Goal"}</span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-white">${formatINR(c.baseMonthly)}/mo</td>
                    <td class="px-4 py-4 text-right text-slate-200">${formatINR(c.totalDeposited)}</td>
                    <td class="px-4 py-4 text-right text-emerald-400 font-semibold">${c.rate}%</td>
                    <td class="px-4 py-4 font-sans">
                      <span class="text-slate-200 block text-[11px]">${c.durationText}</span>
                      <span class="text-[10px] text-slate-500 font-mono">${formatDateDMY(frd.start_date)} → ${formatDateDMY(frd.end_date)}</span>
                       <span class="block mt-1"><span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${c.daysLeftBadgeClass}">${c.daysLeftLabel}</span></span>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-cyan-300 font-mono">
                      ${formatINR(c.maturity)}
                      <span class="block text-[10px] text-emerald-400 font-normal">+${formatINR(c.gain)} gain</span>
                      <span class="block text-[10px] text-slate-400 font-normal fi-post-tax-cell" data-gross="${c.gain}">Net: +${formatINR(c.postTaxGain)}</span>
                    </td>
                    <td class="px-5 py-4 text-right font-sans whitespace-nowrap">
                      ${renderRowActionButtons("flexi_rd", frd.id, frd.bank + " Flexi RD #" + frd.rd_no)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  calculateFD,
  calculateRD,
  calculateFlexiRD,
  summarizeFixedIncome,
  renderFixedIncomePage
};
