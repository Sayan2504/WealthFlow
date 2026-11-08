// packages/investments/retirement_funds/module.js
// Retirement Funds Package: PPF & EPF Passbook Calculators, Statutory ROI Auto-Population & Modern Fintech View
const { formatINR, formatNum, formatDateDMY, groupPpfByFinancialYear } = require("../../core/module");
const { renderRowActionButtons } = require("../../core/components");

function summarizeRetirement(data) {
  const ppfGroups = groupPpfByFinancialYear((data.ppf && data.ppf.contributions) || []);
  const ppfContributions = ppfGroups.reduce((acc, g) => acc + g.totalAmount, 0);
  const ppfBalance = Number(data.ppf && data.ppf.current_balance) || ppfContributions;
  const ppfInterest = Math.max(0, ppfBalance - ppfContributions);
  const ppfRate = Number(data.ppf && data.ppf.interest_rate) || 7.10;
  const latestFyTotal = ppfGroups.length > 0 ? ppfGroups[ppfGroups.length - 1].totalAmount : 0;

  const epfEntriesSum = ((data.epf && data.epf.entries) || []).reduce(
    (acc, e) => acc + (Number(e.employee) || 0) + (Number(e.employer) || 0) + (Number(e.interest) || 0),
    0
  );
  const epfBalance = epfEntriesSum > 0 ? epfEntriesSum : (Number(data.epf && data.epf.current_balance) || 0);
  const epfRate = Number(data.epf && data.epf.interest_rate) || 8.25;

  return {
    ppf: { contribution: ppfContributions, balance: ppfBalance, interest: ppfInterest, rate: ppfRate, latestFyTotal, fyGroups: ppfGroups },
    epf: { balance: epfBalance, rate: epfRate }
  };
}

function renderRetirementPage(data, ov) {
  const ppfRate = Number(data.ppf?.interest_rate || 7.10).toFixed(2);
  const epfRate = Number(data.epf?.interest_rate || 8.25).toFixed(2);
  const epfUan = data.epf?.uan || (data.epf?.account_identifier && data.epf.account_identifier !== "EPFO-UAN" ? data.epf.account_identifier : "");

  return `
    <div class="space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Retirement Schemes (PPF & EPF)</h1>
          <p class="text-xs text-slate-400 mt-1">Statutory ROI auto-populated from Ministry of Finance (DEA) & EPFO notifications • Supports any past or present date</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="syncStatutoryRetirementRates()" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 transition-all flex items-center gap-1.5 whitespace-nowrap">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Sync Statutory ROI</span>
          </button>
          <button onclick="openModal('ppf_entry')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 whitespace-nowrap">
            + Add PPF Entry
          </button>
          <button onclick="openModal('epf_entry')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 whitespace-nowrap">
            + Add EPF Entry
          </button>
        </div>
      </div>

      <!-- 3 Summary KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Combined Retirement Corpus</span>
          <span class="text-2xl font-black text-white font-mono mt-1 block">${formatINR(ov.ppf.balance + ov.epf.balance)}</span>
          <span class="text-[11px] text-amber-400 mt-1 block">Triple Tax-Exempt (EEE) Sovereign Status</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium uppercase">PPF Current Balance</span>
            <span class="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">ROI: ${ppfRate}% (DEA MoF)</span>
          </div>
          <span class="text-2xl font-black text-amber-400 font-mono mt-1 block">${formatINR(ov.ppf.balance)}</span>
          <span class="text-[11px] text-emerald-400 mt-1 block font-mono">
            Contributed: ${formatINR(ov.ppf.contribution)} • ${Math.max(0, 150000 - (ov.ppf.latestFyTotal || 0)) > 0 ? `<span class="text-amber-300">${formatINR(Math.max(0, 150000 - (ov.ppf.latestFyTotal || 0)))} lesser than this year's ₹1.5L limit</span>` : `<span class="text-emerald-300">This year's ₹1.5L limit reached</span>`}
          </span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 font-medium uppercase">EPF Accumulated Corpus</span>
            <span class="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">ROI: ${epfRate}% (EPFO CBT)</span>
          </div>
          <span class="text-2xl font-black text-emerald-400 font-mono mt-1 block">${formatINR(ov.epf.balance)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block font-mono">${epfUan ? `UAN: <strong class="text-slate-200">${epfUan}</strong> • ` : ""}Employee + Employer Pool</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- PPF Card -->
        <div id="ppf" class="glass-card rounded-2xl p-6 border-slate-800 space-y-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 class="text-base font-bold text-white">Public Provident Fund (PPF)</h3>
              <p class="text-xs text-slate-400">Yearly totals against the ₹1.5L limit, with entry-wise breakdown • Updated: ${formatDateDMY(data.ppf.last_updated)}</p>
            </div>
            <span id="badge-ppf-roi" class="text-xs font-mono font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/40">${ppfRate}% p.a. (Auto API)</span>
          </div>

          <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll rounded-xl border border-slate-800/70">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th class="px-4 py-3">Financial Year / Entry</th>
                  <th class="px-4 py-3">Transaction Date & Note</th>
                  <th class="px-4 py-3 text-right">Contribution & Limit Status</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono">
                ${(() => {
                  const fyGroups = groupPpfByFinancialYear((data.ppf && data.ppf.contributions) || []);
                  if (fyGroups.length === 0) {
                    return `
                      <tr>
                        <td colspan="4" class="px-4 py-8 text-center font-sans text-slate-400">
                          No PPF entries recorded yet. Click <button onclick="openModal('ppf_entry')" class="text-indigo-400 hover:underline font-semibold">+ Add PPF Entry</button> to log any past or present contribution.
                        </td>
                      </tr>
                    `;
                  }
                  return fyGroups.map(grp => {
                    const isMulti = grp.entries.length > 1;
                    const singleEntry = grp.entries[0];
                    const outstanding = Math.max(0, 150000 - grp.totalAmount);
                    const clubbedHeaderRow = `
                      <tr ${isMulti ? `onclick="(function(r){var o=r.getAttribute('data-open')!=='1';r.setAttribute('data-open',o?'1':'0');var c=r.querySelector('.fy-chev');if(c)c.style.transform=o?'rotate(90deg)':'';var n=r.nextElementSibling;while(n&&n.hasAttribute('data-fy-sub')){n.classList.toggle('hidden',!o);n=n.nextElementSibling;}})(this)" data-open="0"` : ''} class="${isMulti ? 'bg-slate-900/80 border-t border-slate-700/80 cursor-pointer hover:bg-slate-800/70' : 'hover:bg-slate-850/60'}">
                        <td class="px-4 py-3 font-sans">
                          <div class="flex flex-wrap items-center gap-2">
                            ${isMulti ? `<svg class="fy-chev w-3.5 h-3.5 text-amber-300 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>` : ''}
                            <span class="font-bold text-white whitespace-nowrap">${grp.fy}</span>
                            <span class="px-2 py-0.5 rounded-full whitespace-nowrap text-[10px] font-mono font-semibold ${isMulti ? 'bg-amber-950/90 text-amber-300 border border-amber-700/60' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                              ${isMulti ? `${grp.entries.length} Entries Clubbed` : '1 Entry'}
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-3 text-slate-300">
                          ${isMulti
                            ? `<span class="text-[11px] font-sans text-amber-300/90 font-medium">Yearly total • click to view entries</span>`
                            : `<div>${formatDateDMY(singleEntry.date)}</div>${singleEntry.note ? `<div class="text-[11px] font-sans text-slate-400">${singleEntry.note}</div>` : ''}`
                          }
                        </td>
                        <td class="px-4 py-3 text-right">
                          <span class="font-extrabold ${isMulti ? 'text-amber-300 text-sm' : 'text-white'} block">${formatINR(grp.totalAmount)}</span>
                          ${outstanding > 0
                            ? `<span class="inline-block mt-0.5 text-[10px] font-sans font-semibold text-amber-300">${formatINR(outstanding)} lesser than the ₹1.5L limit</span>`
                            : `<span class="inline-block mt-0.5 text-[10px] font-mono text-emerald-400">₹1.5L limit reached</span>`
                          }
                        </td>
                        <td class="px-4 py-3 text-right font-sans whitespace-nowrap">
                          ${isMulti
                            ? `<span class="text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/80 border border-slate-700">FY Total</span>`
                            : renderRowActionButtons("ppf_entry", singleEntry.id, `${grp.fy} (${formatDateDMY(singleEntry.date)})`)
                          }
                        </td>
                      </tr>
                    `;
                    const subRows = isMulti
                      ? grp.entries.map((e, idx) => `
                          <tr data-fy-sub="1" class="hidden bg-slate-950/50 hover:bg-slate-850/50 transition-colors">
                            <td class="pl-8 pr-4 py-2.5 font-sans text-[11px] text-slate-400">
                              <span class="text-indigo-400 font-mono mr-1">↳</span> Entry #${idx + 1}${e.note ? `: <span class="text-slate-200 font-medium">${e.note}</span>` : ''}
                            </td>
                            <td class="px-4 py-2.5 text-[11px] text-slate-300">
                              ${formatDateDMY(e.date)}
                            </td>
                            <td class="px-4 py-2.5 text-right text-xs font-semibold text-slate-200">
                              ${formatINR(e.amount)}
                            </td>
                            <td class="px-4 py-2.5 text-right font-sans whitespace-nowrap">
                              ${renderRowActionButtons("ppf_entry", e.id, `${grp.fy} Entry #${idx + 1} (${formatDateDMY(e.date)} — ${formatINR(e.amount)})`)}
                            </td>
                          </tr>
                        `).join('')
                      : '';
                    return clubbedHeaderRow + subRows;
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- EPF Card -->
        <div id="epf" class="glass-card rounded-2xl p-6 border-slate-800 space-y-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-white">Employees' Provident Fund (EPF)</h3>
                ${epfUan ? `<span class="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 font-mono text-[11px]">UAN: ${epfUan}</span>` : `<span class="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/70 font-mono text-[10px]">UAN Not Set</span>`}
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Auto-Fetched EPFO CBT Statutory Rate • Supports any historical date</p>
            </div>
            <span id="badge-epf-roi" class="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40">${epfRate}% p.a. (Auto API)</span>
          </div>

          <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll rounded-xl border border-slate-800/70">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th class="px-3 py-3">Date</th>
                  <th class="px-3 py-3">Particulars</th>
                  <th class="px-3 py-3 text-right">Employee</th>
                  <th class="px-3 py-3 text-right">Employer</th>
                  <th class="px-3 py-3 text-right">Interest</th>
                  <th class="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono">
                ${(data.epf.entries || []).length === 0 ? `
                  <tr>
                    <td colspan="6" class="px-4 py-8 text-center font-sans text-slate-400">
                      No EPF passbook entries recorded yet. Click <button onclick="openModal('epf_entry')" class="text-emerald-400 hover:underline font-semibold">+ Add EPF Entry</button> for any historical or current date.
                    </td>
                  </tr>
                ` : (data.epf.entries || []).map(e => `
                  <tr class="hover:bg-slate-850/60">
                    <td class="px-3 py-3 text-slate-300">${formatDateDMY(e.date)}</td>
                    <td class="px-3 py-3 font-sans text-white">${e.description || 'Passbook Entry'}</td>
                    <td class="px-3 py-3 text-right font-bold text-white">${formatINR(e.employee)}</td>
                    <td class="px-3 py-3 text-right text-slate-300">${formatINR(e.employer)}</td>
                    <td class="px-3 py-3 text-right text-emerald-400">${formatINR(e.interest)}</td>
                    <td class="px-3 py-3 text-right font-sans whitespace-nowrap">
                      ${renderRowActionButtons("epf_entry", e.id, e.description || "EPF Entry")}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  summarizeRetirement,
  renderRetirementPage
};
