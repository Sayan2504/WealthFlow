// packages/investments/mutual_funds/module.js
// Mutual Funds Package: Portfolio Aggregator, Live AMFI NAV Sync, Gain/Return Engine,
// Underlying Stock Holdings Breakdown & Pairwise Portfolio Overlap Intelligence
const { formatINR, formatNum, formatDateDMY } = require("../../core/module");
const { renderRowActionButtons } = require("../../core/components");
const {
  getHoldingsForFund,
  calculatePairwiseOverlap,
  calculatePortfolioOverlapMatrix,
  calculateConsolidatedHoldings
} = require("./overlap");

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
  const funds = (data.mutual_funds || []).map(mf => ({
    ...mf,
    holdings: (mf.holdings && mf.holdings.length > 0) ? mf.holdings : getHoldingsForFund(mf)
  }));

  const stepUpRows = funds;
  const totalStepUpPct = stepUpRows.reduce((s, m) => s + (Number(m.step_up_pct) || 0), 0);
  const totalBadgeClass = Math.abs(totalStepUpPct - 100) < 0.05
    ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/60"
    : (totalStepUpPct > 100 ? "bg-rose-950/80 text-rose-400 border-rose-700/60" : "bg-amber-950/80 text-amber-400 border-amber-700/60");

  const overlapMatrix = calculatePortfolioOverlapMatrix(funds);
  const consolidated = calculateConsolidatedHoldings(funds);

  // Compute average non-diagonal overlap %
  let overlapSum = 0;
  let overlapCount = 0;
  for (let i = 0; i < overlapMatrix.matrix.length; i++) {
    for (let j = i + 1; j < overlapMatrix.matrix[i].length; j++) {
      overlapSum += overlapMatrix.matrix[i][j];
      overlapCount++;
    }
  }
  const avgOverlap = overlapCount > 0 ? Number((overlapSum / overlapCount).toFixed(1)) : 0;

  return `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Mutual Funds Portfolio</h1>
          <p class="text-xs text-slate-400 mt-1">Direct growth portfolios with live AMFI NAV tracking, stock holding disclosures, and portfolio overlap intelligence</p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <button type="button" onclick="openOverlapIntelligenceDrawer()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-950/50">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span>Stock Overlap Intelligence</span>
          </button>
          <button type="button" onclick="openSipStepUpDrawer()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-violet-300 bg-violet-950/80 hover:bg-violet-900 border border-violet-700/60 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-950/50">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span>SIP Step-Up Allocation</span>
          </button>
          <button type="button" id="btn-fetch-actual-stocks" onclick="syncAllActualFundStocks()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            <span>Fetch Actual Stocks (Google)</span>
          </button>
          <button type="button" id="btn-sync-navs" onclick="syncAllMutualFundNavs()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950/40">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Sync Live NAVs</span>
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
          <span class="text-[11px] text-slate-500 mt-1 block">Across ${funds.length} active schemes</span>
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

      <!-- Associated Intelligence Banners (Triggers Slide-Over Drawers) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Banner 1: Stock Overlap Intelligence -->
        <div class="glass-card p-5 rounded-2xl border-slate-800 flex items-center justify-between gap-4 group hover:border-indigo-500/40 transition-colors">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white uppercase tracking-wider">Portfolio Stock Overlap</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Avg: ${avgOverlap}% Overlap
              </span>
            </div>
            <p class="text-xs text-slate-400">
              ${avgOverlap < 15 ? 'Well Diversified! Minimal stock duplication across equity schemes.' : 'Moderate Overlap across core large-cap holdings.'}
            </p>
          </div>
          <button type="button" onclick="openOverlapIntelligenceDrawer()" class="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all group-hover:scale-105">
            <span>Analyze Overlap</span>
            <span>→</span>
          </button>
        </div>

        <!-- Banner 2: Underlying Equities & Disclosures -->
        <div class="glass-card p-5 rounded-2xl border-slate-800 flex items-center justify-between gap-4 group hover:border-emerald-500/40 transition-colors">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white uppercase tracking-wider">Underlying Stock Exposure</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                ${consolidated.length} Unique Equities
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Verified from official monthly AMC factsheets & Google portfolio disclosures.
            </p>
          </div>
          <button type="button" onclick="openOverlapIntelligenceDrawer('consolidated')" class="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all group-hover:scale-105">
            <span>View Holdings</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Main Investments Table Card -->
      <div class="glass-card rounded-2xl overflow-hidden border-slate-800">
        <div class="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-bold text-white">Investments & Schemes</h3>
            <p class="text-xs text-slate-400">Live AMFI NAV feeds, invested capital, unit balances, and constituent stock holdings</p>
          </div>
          <span class="text-xs font-mono text-indigo-400 bg-indigo-950/70 px-3 py-1 rounded-full border border-indigo-800/50 self-start sm:self-auto">${funds.length} Active Schemes</span>
        </div>

        <div class="overflow-x-auto max-h-[520px] overflow-y-auto card-scroll">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th class="px-5 py-3.5">Scheme & AMC</th>
                <th class="px-3 py-3.5">Constituent Stocks</th>
                <th class="px-3 py-3.5 text-right">Live NAV & Units</th>
                <th class="px-3 py-3.5 text-right">Monthly SIP</th>
                <th class="px-3 py-3.5 text-right">Invested</th>
                <th class="px-3 py-3.5 text-right">Current Value</th>
                <th class="px-3 py-3.5 text-right">Gain / Return</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${funds.length === 0 ? `
                <tr>
                  <td colspan="8" class="px-5 py-10 text-center font-sans text-slate-400">
                    No mutual fund schemes registered yet. Click <button onclick="openModal('mutual_fund')" class="text-indigo-400 hover:underline font-semibold">+ Add Scheme</button> to add your first fund.
                  </td>
                </tr>
              ` : funds.map(mf => {
                const gain = (mf.current_value || 0) - (mf.invested_amount || 0);
                const gainPct = mf.invested_amount > 0 ? ((gain / mf.invested_amount) * 100).toFixed(2) : "0.00";
                const nav = Number(mf.latest_nav) || 0;
                const units = Number(mf.units) || (nav > 0 ? Number((mf.current_value / nav).toFixed(3)) : 0);
                const holdingsList = mf.holdings || [];
                const topHoldings = holdingsList.slice(0, 2);
                return `
                  <tr class="hover:bg-slate-850/60 transition-colors">
                    <td class="px-5 py-4 font-sans">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-white">${mf.scheme_name}</span>
                        ${mf.scheme_code ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] border border-slate-700">AMFI #${mf.scheme_code}</span>` : ""}
                      </div>
                      <span class="text-[11px] text-slate-400 block mt-0.5">${mf.amc || 'Direct Growth'} • ${mf.category}</span>
                    </td>
                    <td class="px-3 py-4 font-sans">
                      <div class="space-y-1">
                        <button type="button"
                                onclick="openFundHoldingsDrawer(${mf.id})"
                                class="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all group shadow-sm">
                          <svg class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          <span>${holdingsList.length} Stocks</span>
                          <span class="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                        <div class="flex flex-wrap gap-1 max-w-[200px]">
                          ${topHoldings.map(h => `
                            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50" title="${h.stock} (${h.weight}%)">
                              ${h.ticker || h.stock.slice(0, 6)} <span class="text-indigo-400 font-bold">${h.weight}%</span>
                            </span>
                          `).join('')}
                          ${holdingsList.length > 2 ? `<span class="text-[9px] text-slate-500 font-mono">+${holdingsList.length - 2} more</span>` : ''}
                        </div>
                      </div>
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
    </div>
  `;
}

function renderPairwiseOverlapHtml(overlap) {
  if (!overlap) {
    return `
      <div class="p-8 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        Please select two mutual funds to compute pairwise stock overlap.
      </div>
    `;
  }

  const pct = overlap.overlapPercentage;
  let statusBadge = "";
  let statusAdvice = "";
  if (pct === 0) {
    statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">0.0% Overlap — Completely Uncorrelated</span>`;
    statusAdvice = "Perfect diversification! These two funds hold zero overlapping stocks (e.g. Pure Gold vs Domestic Equity).";
  } else if (pct < 15) {
    statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">Low Overlap (${pct}%) — Excellent Diversification</span>`;
    statusAdvice = "Excellent complement! Both schemes add meaningful unique asset or stock exposure without redundant duplication.";
  } else if (pct <= 30) {
    statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/80">Moderate Overlap (${pct}%) — Balanced Co-existence</span>`;
    statusAdvice = "Healthy co-existence. While they share core bluechip anchors, over 70% of each portfolio is uniquely distinct.";
  } else {
    statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">High Overlap (${pct}%) — Redundant Duplication</span>`;
    statusAdvice = "High holding overlap. Over a third of your capital in these funds buys the exact same underlying companies. Consider consolidating.";
  }

  return `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Pairwise Stock Overlap</span>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-3xl font-black font-mono ${pct > 30 ? 'text-rose-400' : (pct > 15 ? 'text-cyan-300' : 'text-emerald-400')}">${pct.toFixed(2)}%</span>
            <span class="text-[10px] text-slate-400">weighted</span>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5">
            <div class="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 rounded-full" style="width: ${Math.min(100, pct)}%;"></div>
          </div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-800/80">
          ${statusBadge}
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Common Equities</span>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-3xl font-black font-mono text-white">${overlap.commonStocksCount}</span>
            <span class="text-[10px] text-slate-400">shared stocks</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">
            Fund A (${overlap.fundA.stocksCount} stocks) • Fund B (${overlap.fundB.stocksCount} stocks)
          </p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Fund A Uniqueness:</span>
          <span class="font-mono font-bold text-indigo-300">${overlap.uniquenessA.toFixed(1)}%</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Portfolio Intelligence</span>
          <p class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
            ${statusAdvice}
          </p>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Fund B Uniqueness:</span>
          <span class="font-mono font-bold text-indigo-300">${overlap.uniquenessB.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <!-- Common Stocks Breakdown Table -->
    <div class="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <h4 class="text-xs font-bold text-white uppercase tracking-wider">
          Overlapping Constituent Stocks (${overlap.commonStocks.length})
        </h4>
        <span class="text-[10px] text-slate-400 font-mono">Overlap = Σ min(Weight A, Weight B)</span>
      </div>

      ${overlap.commonStocks.length === 0 ? `
        <div class="p-8 text-center text-slate-500 text-xs font-sans">
          No common stock holdings detected between <strong>${overlap.fundA.scheme_name}</strong> and <strong>${overlap.fundB.scheme_name}</strong>.
        </div>
      ` : `
        <div class="overflow-x-auto card-scroll max-h-72 overflow-y-auto">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th class="px-4 py-2.5">Stock / Company</th>
                <th class="px-2.5 py-2.5">Sector</th>
                <th class="px-2.5 py-2.5 text-right">${overlap.fundA.scheme_name.split(' ')[0]} ${overlap.fundA.scheme_name.split(' ')[1] || ''}</th>
                <th class="px-2.5 py-2.5 text-right">${overlap.fundB.scheme_name.split(' ')[0]} ${overlap.fundB.scheme_name.split(' ')[1] || ''}</th>
                <th class="px-2.5 py-2.5 text-right">Overlap Contrib</th>
                <th class="px-4 py-2.5">Weight Comparison</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              ${overlap.commonStocks.map(s => `
                <tr class="hover:bg-slate-900/50 transition-colors">
                  <td class="px-4 py-2.5 font-sans">
                    <div class="flex items-center gap-1.5">
                      <span class="font-semibold text-white">${s.stock}</span>
                      <span class="font-mono text-[9px] text-cyan-400 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">${s.ticker}</span>
                    </div>
                  </td>
                  <td class="px-2.5 py-2.5 font-sans text-slate-400 text-[11px]">${s.sector}</td>
                  <td class="px-2.5 py-2.5 text-right text-slate-300 font-bold">${s.fundAWeight.toFixed(1)}%</td>
                  <td class="px-2.5 py-2.5 text-right text-slate-300 font-bold">${s.fundBWeight.toFixed(1)}%</td>
                  <td class="px-2.5 py-2.5 text-right font-black text-cyan-300 text-xs">+${s.overlapWeight.toFixed(1)}%</td>
                  <td class="px-4 py-2.5 font-sans">
                    <div class="space-y-1 w-28">
                      <div class="flex items-center gap-1 text-[9px]">
                        <span class="text-indigo-400 w-8 shrink-0 truncate">A</span>
                        <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full bg-indigo-500 rounded-full" style="width: ${Math.min(100, s.fundAWeight * 8)}%;"></div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1 text-[9px]">
                        <span class="text-cyan-400 w-8 shrink-0 truncate">B</span>
                        <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full bg-cyan-400 rounded-full" style="width: ${Math.min(100, s.fundBWeight * 8)}%;"></div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

module.exports = {
  summarizeMutualFunds,
  renderMutualFundsPage,
  renderPairwiseOverlapHtml
};
