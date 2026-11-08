// packages/investments/mutual_funds/module.js
// Mutual Funds Package: Portfolio Aggregator, Live AMFI NAV Sync, Gain/Return Engine & Modern Fintech View
const { formatINR, formatNum, formatDateDMY } = require("../../core/module");
const { renderRowActionButtons } = require("../../core/components");

function summarizeMutualFunds(data) {
  let current = 0;
  let invested = 0;
  let sip = 0;
  (data.mutual_funds || []).forEach(mf => {
    current += Number(mf.current_value) || 0;
    invested += Number(mf.invested_amount) || 0;
    sip += Number(mf.sip_amount) || 0;
  });
  const gain = current - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
  return { current, invested, sip, gain, gainPct };
}

function renderMutualFundsPage(data, ov) {
  const stepUpRows = data.mutual_funds || [];
  const totalStepUpPct = stepUpRows.reduce((s, m) => s + (Number(m.step_up_pct) || 0), 0);
  const totalBadgeClass = Math.abs(totalStepUpPct - 100) < 0.05
    ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/60"
    : (totalStepUpPct > 100 ? "bg-rose-950/80 text-rose-400 border-rose-700/60" : "bg-amber-950/80 text-amber-400 border-amber-700/60");
  return `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Mutual Funds Portfolio</h1>
          <p class="text-xs text-slate-400 mt-1">Equity, Index, Gold ETF & Overseas schemes with live AMFI NAV auto-population, unit tracking, and SIP Step-Up allocation</p>
        </div>
        <div class="flex items-center gap-2.5">
          <button type="button" id="btn-sync-navs" onclick="syncAllMutualFundNavs()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950/40">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Sync Live AMFI NAVs</span>
          </button>
          <button onclick="openModal('mutual_fund')" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30">
            + Add Scheme
          </button>
        </div>
      </div>

      <!-- 4 Modern KPI Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Current Valuation</span>
          <span class="text-2xl font-black text-white font-mono mt-1 block">${formatINR(ov.mf.current, 2)}</span>
          <span class="text-[11px] text-emerald-400 mt-1 block font-mono">+${ov.mf.gainPct.toFixed(2)}% overall return</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Total Invested</span>
          <span class="text-2xl font-black text-slate-200 font-mono mt-1 block">${formatINR(ov.mf.invested, 2)}</span>
          <span class="text-[11px] text-slate-500 mt-1 block">Across ${(data.mutual_funds || []).length} active funds</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Absolute Gain</span>
          <span class="text-2xl font-black ${ov.mf.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-mono mt-1 block">${ov.mf.gain >= 0 ? '+' : ''}${formatINR(ov.mf.gain, 2)}</span>
          <span class="text-[11px] text-indigo-400 mt-1 block">Auto-computed from Live NAV × Units</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Monthly SIP Outflow</span>
          <span class="text-2xl font-black text-indigo-400 font-mono mt-1 block">${formatINR(ov.mf.sip)}/mo</span>
          <span class="text-[11px] text-slate-400 mt-1 block">Automated monthly investments</span>
        </div>
      </div>

      <!-- Holdings Table + Step-Up Sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div class="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white">Investments</h3>
              <p class="text-[11px] text-slate-400">NAVs auto-populate via AMFI API (api.mfapi.in) • Click Pencil icon to edit or search any AMFI scheme</p>
            </div>
            <span class="text-xs font-mono text-indigo-400 bg-indigo-950/70 px-2.5 py-1 rounded-lg border border-indigo-800/50">${(data.mutual_funds || []).length} Schemes</span>
          </div>
          <div class="overflow-x-auto max-h-[440px] overflow-y-auto card-scroll">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th class="px-5 py-3.5">Fund & AMC</th>
                  <th class="px-3 py-3.5 text-right">Live NAV & Units</th>
                  <th class="px-3 py-3.5 text-right">Monthly SIP</th>
                  <th class="px-3 py-3.5 text-right">Invested</th>
                  <th class="px-3 py-3.5 text-right">Current Value</th>
                  <th class="px-3 py-3.5 text-right">Gain / Return</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono">
                ${(data.mutual_funds || []).length === 0 ? `
                  <tr>
                    <td colspan="7" class="px-5 py-10 text-center font-sans text-slate-400">
                      No mutual fund schemes added yet. Click <button onclick="openModal('mutual_fund')" class="text-indigo-400 hover:underline font-semibold">+ Add Scheme</button> to register your first fund.
                    </td>
                  </tr>
                ` : (data.mutual_funds || []).map(mf => {
                  const gain = (mf.current_value || 0) - (mf.invested_amount || 0);
                  const gainPct = mf.invested_amount > 0 ? ((gain / mf.invested_amount) * 100).toFixed(2) : "0.00";
                  const nav = Number(mf.latest_nav) || 0;
                  const units = Number(mf.units) || (nav > 0 ? Number((mf.current_value / nav).toFixed(3)) : 0);
                  return `
                    <tr class="hover:bg-slate-850/60 transition-colors">
                      <td class="px-5 py-4 font-sans">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-white">${mf.scheme_name}</span>
                          ${mf.scheme_code ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] border border-slate-700">AMFI #${mf.scheme_code}</span>` : ""}
                        </div>
                        <span class="text-[11px] text-slate-400 block mt-0.5">${mf.amc || 'Direct Growth'} • ${mf.category}</span>
                      </td>
                      <td class="px-3 py-4 text-right">
                        <span class="text-cyan-300 font-bold block">${nav > 0 ? `₹${nav.toFixed(4)}` : "—"}</span>
                        <span class="text-[10px] text-slate-400 block">${units > 0 ? `${units.toFixed(3)} units` : ""}${mf.nav_date ? ` • ${mf.nav_date}` : ""}</span>
                      </td>
                      <td class="px-3 py-4 text-right text-slate-300">${mf.sip_amount > 0 ? formatINR(mf.sip_amount) : '—'}</td>
                      <td class="px-3 py-4 text-right text-slate-300">${formatINR(mf.invested_amount, 2)}</td>
                      <td class="px-3 py-4 text-right font-bold text-white">${formatINR(mf.current_value, 2)}</td>
                      <td class="px-3 py-4 text-right ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold">
                        ${gain >= 0 ? '+' : ''}${formatNum(gain, 2)}
                        <span class="block text-[10px]">(${gain >= 0 ? '+' : ''}${gainPct}%)</span>
                      </td>
                      <td class="px-5 py-4 text-right font-sans whitespace-nowrap">
                        ${renderRowActionButtons("mutual_fund", mf.id, mf.scheme_name)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Interactive Draggable SIP Step-Up Allocation Card -->
        <div class="glass-card rounded-2xl p-6 border-slate-800 space-y-5 self-start">
          <div class="pb-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-white">SIP Step-Up Allocation</h3>
              <p class="text-[11px] text-slate-400">Drag any bar or enter % to adjust step-up share</p>
            </div>
            <span id="step-up-total-badge" class="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${totalBadgeClass}">
              Total: ${totalStepUpPct.toFixed(1)}%
            </span>
          </div>
          <div class="space-y-4 max-h-[380px] overflow-y-auto pr-1 card-scroll">
            ${stepUpRows.length === 0 ? `
              <p class="text-xs text-slate-500 py-4 text-center">Add a mutual fund scheme to configure your SIP Step-Up distribution.</p>
            ` : stepUpRows.map(m => {
              const pct = Number(m.step_up_pct || 0);
              return `
                <div class="space-y-2 group" data-stepup-id="${m.id}">
                  <div class="flex items-center justify-between text-xs gap-2">
                    <span class="text-slate-200 font-medium truncate" title="${m.scheme_name}">${m.scheme_name}</span>
                    <div class="flex items-center gap-1 shrink-0">
                      <input type="number" min="0" max="100" step="0.5"
                             id="stepup-num-${m.id}"
                             value="${pct.toFixed(1)}"
                             oninput="onStepUpDrag(${m.id}, this.value, false)"
                             onchange="onStepUpDrag(${m.id}, this.value, true)"
                             class="w-16 text-right font-mono font-bold text-indigo-300 bg-slate-900/90 border border-slate-700/80 focus:border-indigo-500 rounded-lg px-2 py-0.5 text-xs focus:outline-none">
                      <span class="font-mono text-xs text-indigo-400 font-bold">%</span>
                    </div>
                  </div>
                  <div class="relative h-3 flex items-center select-none">
                    <div class="w-full h-2.5 rounded-full bg-slate-800/90 overflow-hidden border border-slate-700/60">
                      <div id="stepup-bar-${m.id}" class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-75" style="width: ${Math.min(100, Math.max(0, pct))}%;"></div>
                    </div>
                    <input type="range" min="0" max="100" step="0.5"
                           id="stepup-range-${m.id}"
                           value="${pct}"
                           oninput="onStepUpDrag(${m.id}, this.value, false)"
                           onchange="onStepUpDrag(${m.id}, this.value, true)"
                           class="stepup-slider absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                           title="Drag to adjust ${m.scheme_name} Step-Up %">
                    <div id="stepup-thumb-${m.id}"
                         class="pointer-events-none absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-lg shadow-indigo-500/50 -ml-2 transition-transform group-hover:scale-110"
                         style="left: ${Math.min(100, Math.max(0, pct))}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  summarizeMutualFunds,
  renderMutualFundsPage
};
