// packages/banking/module.js
// Banking & Credit Cards Package: Bank Accounts List & Credit Cards List with Limits, Utilization & Full CRUD
const { formatINR, formatNum } = require("../core/module");
const { renderRowActionButtons } = require("../core/components");

function calculateCreditCardMetrics(card) {
  const limit = Number(card.credit_limit) || 0;
  const utilized = Number(card.utilized_amount) || 0;
  const available = Math.max(0, limit - utilized);
  const utilizationPct = limit > 0 ? Number(((utilized / limit) * 100).toFixed(1)) : 0;

  let statusLabel = "Optimal";
  let badgeClass = "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
  let barClass = "bg-emerald-500";
  if (utilizationPct > 70) {
    statusLabel = "High Utilization";
    badgeClass = "bg-rose-950/80 text-rose-400 border-rose-800/60";
    barClass = "bg-rose-500";
  } else if (utilizationPct > 30) {
    statusLabel = "Moderate";
    badgeClass = "bg-amber-950/80 text-amber-400 border-amber-800/60";
    barClass = "bg-amber-500";
  }

  return {
    limit,
    utilized,
    available,
    utilizationPct,
    statusLabel,
    badgeClass,
    barClass
  };
}

function summarizeBanking(data) {
  const accounts = data.bank_accounts || [];
  const cards = data.credit_cards || [];

  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  const annualInterest = Math.round(
    accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0) * ((Number(a.interest_rate) || 0) / 100), 0)
  );

  const totalLimit = cards.reduce((sum, c) => sum + (Number(c.credit_limit) || 0), 0);
  const totalUtilized = cards.reduce((sum, c) => sum + (Number(c.utilized_amount) || 0), 0);
  const totalAvailable = Math.max(0, totalLimit - totalUtilized);
  const utilizationPct = totalLimit > 0 ? Number(((totalUtilized / totalLimit) * 100).toFixed(1)) : 0;
  const totalRewardPoints = cards.reduce((sum, c) => sum + (Number(c.reward_points) || 0), 0);

  return {
    accounts: {
      count: accounts.length,
      totalBalance,
      annualInterest
    },
    cards: {
      count: cards.length,
      totalLimit,
      totalUtilized,
      totalAvailable,
      utilizationPct,
      totalRewardPoints
    }
  };
}

function renderBankingPage(data, ov) {
  const accounts = data.bank_accounts || [];
  const cards = data.credit_cards || [];
  const b = ov.banking || summarizeBanking(data);

      const accountRows = accounts.length > 0
    ? accounts.map(acc => {
        const bal = Number(acc.current_balance) || 0;
        const rate = Number(acc.interest_rate) || 0;
        const estYearlyInterest = Math.round(bal * (rate / 100));
        const nomineeVal = acc.nominee || "";
        const purposeVal = acc.purpose || "";
        const notesVal = acc.notes || acc.nominee_notes || "";
        return `
          <tr class="hover:bg-slate-800/50 transition-colors">
            <td class="px-5 py-4">
              <div class="font-semibold text-white text-sm">${acc.bank_name}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${acc.branch_ifsc || "Primary Branch"}</div>
            </td>
            <td class="px-4 py-4">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/90 text-cyan-300 border border-cyan-800/60">
                ${acc.account_type || "Savings"}
              </span>
            </td>
            <td class="px-4 py-4 font-mono text-xs text-slate-200">${acc.account_no || "—"}</td>
            <td class="px-4 py-4 text-xs text-slate-300">
              <div class="font-medium text-white">${acc.holder_name || "Self"}</div>
              <div class="text-[11px] text-indigo-300 mt-0.5">Nominee: <span class="text-slate-200 font-medium">${nomineeVal || "—"}</span></div>
            </td>
            <td class="px-4 py-4 text-xs">
              ${purposeVal ? `<div class="font-medium text-cyan-300">${purposeVal}</div>` : ""}
              ${notesVal ? `<div class="text-[11px] text-slate-400 ${purposeVal ? 'mt-0.5' : ''}">${notesVal}</div>` : (!purposeVal ? `<span class="text-slate-500">—</span>` : "")}
            </td>
            <td class="px-4 py-4 text-right font-mono text-xs text-cyan-300">${rate.toFixed(2)}% p.a.</td>
            <td class="px-4 py-4 text-right font-mono text-xs text-emerald-400">+${formatINR(estYearlyInterest)}/yr</td>
            <td class="px-4 py-4 text-right font-mono font-bold text-white text-sm">${formatINR(bal, 2)}</td>
            <td class="px-5 py-4 text-right">
              ${renderRowActionButtons("bank_account", acc.id, `${acc.bank_name} (${acc.account_no || acc.account_type})`)}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="9" class="px-6 py-10 text-center">
          <div class="max-w-sm mx-auto space-y-2">
            <div class="text-sm font-semibold text-slate-300">No Bank Accounts Added Yet</div>
            <p class="text-xs text-slate-500">Click <strong class="text-cyan-400">+ Add Bank Account</strong> to add your savings, salary, or current accounts with balances and associated details.</p>
          </div>
        </td>
      </tr>
    `;

  const cardRows = cards.length > 0
    ? cards.map(card => {
        const m = calculateCreditCardMetrics(card);
        return `
          <tr class="hover:bg-slate-800/50 transition-colors">
            <td class="px-5 py-4">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-white text-sm">${card.bank_name} — ${card.card_name}</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-800/60 font-mono text-[10px]">${card.network || "Visa"}</span>
                ${card.last4 ? `<span class="font-mono text-slate-300">•••• ${card.last4}</span>` : ""}
                ${card.annual_fee_notes ? `<span>• ${card.annual_fee_notes}</span>` : ""}
              </div>
            </td>
            <td class="px-4 py-4 font-mono text-xs text-slate-300">
              <div>Bill: <strong class="text-white">${card.billing_day || 1}</strong> of mo</div>
              <div class="text-[11px] text-amber-300">Due: <strong>${card.due_day || 15}</strong> of mo</div>
            </td>
            <td class="px-4 py-4 text-right font-mono font-semibold text-white">${formatINR(m.limit)}</td>
            <td class="px-4 py-4 text-right font-mono font-semibold ${m.utilized > 0 ? "text-rose-400" : "text-slate-300"}">${formatINR(m.utilized, 2)}</td>
            <td class="px-4 py-4 text-right font-mono font-bold text-emerald-400">${formatINR(m.available, 2)}</td>
            <td class="px-4 py-4">
              <div class="flex items-center justify-between text-[11px] font-mono mb-1">
                <span class="px-2 py-0.5 rounded-full border ${m.badgeClass}">${m.utilizationPct}% (${m.statusLabel})</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full ${m.barClass}" style="width: ${Math.min(100, m.utilizationPct)}%;"></div>
              </div>
            </td>
            <td class="px-4 py-4 text-right font-mono text-xs text-amber-300">${formatNum(card.reward_points || 0)} pts</td>
            <td class="px-5 py-4 text-right">
              ${renderRowActionButtons("credit_card", card.id, `${card.bank_name} ${card.card_name}`)}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="8" class="px-6 py-10 text-center">
          <div class="max-w-sm mx-auto space-y-2">
            <div class="text-sm font-semibold text-slate-300">No Credit Cards Added Yet</div>
            <p class="text-xs text-slate-500">Click <strong class="text-indigo-400">+ Add Credit Card</strong> to track credit limits, available limits, billing/due dates, and credit utilization ratios.</p>
          </div>
        </td>
      </tr>
    `;

  const overallCardBadge = b.cards.utilizationPct > 70
    ? "bg-rose-950/80 text-rose-400 border-rose-800/60"
    : (b.cards.utilizationPct > 30 ? "bg-amber-950/80 text-amber-400 border-amber-800/60" : "bg-emerald-950/80 text-emerald-400 border-emerald-800/60");

  return `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Bank Accounts & Credit Cards</h1>
          <p class="text-xs text-slate-400 mt-1">Manage liquid bank balances, IFSC/account details, credit card limits, billing cycles, and real-time utilization</p>
        </div>
        <div class="flex items-center gap-2.5">
          <button onclick="openModal('bank_account')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20 transition-all">
            + Add Bank Account
          </button>
          <button onclick="openModal('credit_card')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
            + Add Credit Card
          </button>
        </div>
      </div>

      <!-- 4 Summary KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="glass-card rounded-2xl p-5 border-slate-800">
          <span class="text-xs text-slate-400 uppercase font-semibold">Total Liquid Bank Balance</span>
          <div class="text-2xl font-black text-white font-mono mt-2">${formatINR(b.accounts.totalBalance, 2)}</div>
          <span class="text-[11px] text-cyan-400 mt-1 block">${b.accounts.count} Active Bank Account(s)</span>
        </div>

        <div class="glass-card rounded-2xl p-5 border-slate-800">
          <span class="text-xs text-slate-400 uppercase font-semibold">Est. Annual Savings Interest</span>
          <div class="text-2xl font-black text-emerald-400 font-mono mt-2">+${formatINR(b.accounts.annualInterest)}/yr</div>
          <span class="text-[11px] text-slate-400 mt-1 block">Auto-calculated from account rates</span>
        </div>

        <div class="glass-card rounded-2xl p-5 border-slate-800">
          <span class="text-xs text-slate-400 uppercase font-semibold">Total Credit Card Limit</span>
          <div class="text-2xl font-black text-white font-mono mt-2">${formatINR(b.cards.totalLimit)}</div>
          <span class="text-[11px] text-emerald-400 mt-1 block font-mono">Available: ${formatINR(b.cards.totalAvailable)}</span>
        </div>

        <div class="glass-card rounded-2xl p-5 border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400 uppercase font-semibold">Card Outstanding / Utilized</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${overallCardBadge}">${b.cards.utilizationPct}% Used</span>
          </div>
          <div class="text-2xl font-black ${b.cards.totalUtilized > 0 ? "text-rose-400" : "text-white"} font-mono mt-2">${formatINR(b.cards.totalUtilized, 2)}</div>
          <span class="text-[11px] text-slate-400 mt-1 block">${b.cards.count} Active Card(s) • ${formatNum(b.cards.totalRewardPoints)} Reward Pts</span>
        </div>
      </div>

      <!-- Section 1: Bank Accounts List -->
      <div class="glass-card rounded-2xl border-slate-800 overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-white">Bank Accounts List</h2>
            <p class="text-xs text-slate-400">Savings, Salary, Current & NRE/NRO accounts with IFSC, interest rate, and liquid balances</p>
          </div>
          <button onclick="openModal('bank_account')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/60 transition-colors">
            + Add Account
          </button>
        </div>
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
              <tr class="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                <th class="px-5 py-3.5">Bank & Branch / IFSC</th>
                <th class="px-4 py-3.5">Type</th>
                <th class="px-4 py-3.5">Account Number</th>
                <th class="px-4 py-3.5">Holder & Nominee</th>
                <th class="px-4 py-3.5">Purpose & Notes</th>
                <th class="px-4 py-3.5 text-right">Interest Rate</th>
                <th class="px-4 py-3.5 text-right">Est. Annual Interest</th>
                <th class="px-4 py-3.5 text-right">Current Balance</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-xs">
              ${accountRows}
            </tbody>
            ${accounts.length > 0 ? `
              <tfoot>
                <tr class="bg-slate-900/90 border-t-2 border-slate-700 font-mono text-xs font-bold text-white">
                  <td class="px-5 py-4" colspan="6">TOTAL BANK LIQUIDITY (${accounts.length} Accounts)</td>
                  <td class="px-4 py-4 text-right text-emerald-400">+${formatINR(b.accounts.annualInterest)}/yr</td>
                  <td class="px-4 py-4 text-right text-cyan-400 text-sm">${formatINR(b.accounts.totalBalance, 2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ""}
          </table>
        </div>
      </div>

      <!-- Section 2: Credit Cards List with Limits & Utilization -->
      <div class="glass-card rounded-2xl border-slate-800 overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-white">Credit Cards List & Credit Limits</h2>
            <p class="text-xs text-slate-400">Track sanctioned credit limits, current utilized balance, available limit, billing cycle dates, and utilization ratio</p>
          </div>
          <button onclick="openModal('credit_card')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800/60 transition-colors">
            + Add Credit Card
          </button>
        </div>
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto card-scroll">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
              <tr class="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                <th class="px-5 py-3.5">Card & Network Details</th>
                <th class="px-4 py-3.5">Billing & Due Cycle</th>
                <th class="px-4 py-3.5 text-right">Total Credit Limit</th>
                <th class="px-4 py-3.5 text-right">Current Utilized</th>
                <th class="px-4 py-3.5 text-right">Available Limit (Auto)</th>
                <th class="px-4 py-3.5">Utilization Ratio (Auto)</th>
                <th class="px-4 py-3.5 text-right">Reward Points</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-xs">
              ${cardRows}
            </tbody>
            ${cards.length > 0 ? `
              <tfoot>
                <tr class="bg-slate-900/90 border-t-2 border-slate-700 font-mono text-xs font-bold text-white">
                  <td class="px-5 py-4" colspan="2">TOTAL CREDIT LINE (${cards.length} Cards)</td>
                  <td class="px-4 py-4 text-right text-white">${formatINR(b.cards.totalLimit)}</td>
                  <td class="px-4 py-4 text-right text-rose-400">${formatINR(b.cards.totalUtilized, 2)}</td>
                  <td class="px-4 py-4 text-right text-emerald-400">${formatINR(b.cards.totalAvailable, 2)}</td>
                  <td class="px-4 py-4 text-indigo-300">${b.cards.utilizationPct}% Overall Utilization</td>
                  <td class="px-4 py-4 text-right text-amber-300">${formatNum(b.cards.totalRewardPoints)} pts</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ""}
          </table>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  calculateCreditCardMetrics,
  summarizeBanking,
  renderBankingPage
};

