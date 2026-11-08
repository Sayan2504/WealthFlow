// preview_server.js — WealthFlow Modular Host Application Router & Layout Shell
// Delegates all domain calculations, queries, and view rendering to isolated Packwerk packages under packages/
const http = require("http");
const url = require("url");

const { emptyPortfolioData, loadData, saveData } = require("./packages/core/module");
const { DEFAULT_AMFI_SCHEMES, STATUTORY_RETIREMENT_RATES, fetchSchemeNavByCode } = require("./packages/core/market_api");
const { buildExcelWorkbook, buildCompleteCsv } = require("./packages/core/exporter");
const { calculateOverview, renderOverviewPage } = require("./packages/dashboard/module");
const { renderMutualFundsPage } = require("./packages/investments/mutual_funds/module");
const { renderFixedIncomePage } = require("./packages/investments/fixed_income/module");
const { renderRetirementPage } = require("./packages/investments/retirement_funds/module");
const { renderInsurancePage } = require("./packages/insurance/life_insurance/module");
const { renderBankingPage } = require("./packages/banking/module");
const { renderTaxCalculatorPage } = require("./packages/tax_planning/module");

const PORT = 3000;

function renderShell(title, activeNav, content, data) {
  const clientDataJson = JSON.stringify(data).replace(/<\//g, "<\\/");
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | WealthFlow Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            slate: { 850: '#141d2e', 925: '#0d1322', 950: '#070a13' }
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'Menlo', 'monospace']
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: dark; }
    body { font-family: 'Inter', sans-serif; background-color: #070a13; color: #f8fafc; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .glass-card { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(51, 65, 85, 0.55); }
    .card-scroll { scrollbar-width: thin; scrollbar-color: rgba(99, 102, 241, 0.45) rgba(15, 23, 42, 0.6); }
    .card-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .card-scroll::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 9999px; }
    .card-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.45); border-radius: 9999px; }
    .card-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.75); }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
  <script>
    window.TRACKER_DATA = ${clientDataJson};
  </script>

  <!-- Top Navigation Bar -->
  <header class="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <a href="/" class="flex items-center gap-2.5 group">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <span class="text-lg font-bold tracking-tight text-white block leading-none">Wealth<span class="text-indigo-400">Flow</span></span>
            <span class="text-[10px] text-slate-400 font-medium">Personal Wealth & Insurance</span>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-1 text-xs font-medium">
          <a href="/" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'dashboard' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Command Center</a>
          <a href="/mutual_funds" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'mutual_funds' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Investments</a>
          <a href="/fixed_income" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'fixed_income' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Fixed Income</a>
          <a href="/retirement" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'retirement' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Retirement</a>
          <a href="/insurance" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'insurance' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Insurance Shield</a>
          <a href="/banking" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'banking' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Banking & Cards</a>
          <a href="/tax_calculator" class="px-3.5 py-2 rounded-lg transition-colors ${activeNav === 'tax_calculator' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}">Tax Calculator</a>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <a href="/api/export_csv" class="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span>Export</span>
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>

  <!-- Modal Container -->
  <div id="modal-container" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
    <div id="modal-card" class="glass-card rounded-2xl max-w-xl w-full p-6 border border-slate-700 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 id="modal-title" class="text-lg font-bold text-white">Configure Holding</h3>
          <p class="text-[11px] text-slate-400">Returns, durations, and maturities auto-calculate in real time</p>
        </div>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded-lg hover:bg-slate-800">&times;</button>
      </div>
      <div id="modal-body"></div>
    </div>
  </div>

  <!-- Custom Form Cancel / Discard Confirmation Modal -->
  <div id="cancel-confirm-container" class="fixed inset-0 z-[60] hidden flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
    <div id="cancel-confirm-card" class="glass-card rounded-2xl max-w-md w-full p-6 border border-amber-500/30 shadow-2xl shadow-black/80 space-y-5">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Discard Form Changes?</h3>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">
            Are you sure you want to cancel and close this form? Any details you entered or modified will not be saved.
          </p>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
        <button type="button" onclick="keepEditingModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition-colors">
          Keep Editing
        </button>
        <button type="button" onclick="confirmDiscardModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Yes, Discard</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Delete Confirmation Modal -->
  <div id="confirm-container" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
    <div id="confirm-card" class="glass-card rounded-2xl max-w-md w-full p-6 border border-rose-500/30 shadow-2xl shadow-black/80 space-y-5">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Remove Portfolio Entry?</h3>
          <p id="confirm-message" class="text-xs text-slate-400 mt-1 leading-relaxed">
            Are you sure you want to remove this entry? All portfolio totals and net worth metrics will automatically recalculate.
          </p>
        </div>
      </div>
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
        <button type="button" onclick="closeConfirmModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition-colors">
          Cancel
        </button>
        <button type="button" id="confirm-delete-btn" onclick="confirmDeleteAction()" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Yes, Remove</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none"></div>

  <!-- Motion.js CDN for Hardware-Accelerated Animations -->
  <script src="https://cdn.jsdelivr.net/npm/motion@10.18.0/dist/motion.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      if (window.Motion) {
        const cards = document.querySelectorAll(".glass-card");
        Motion.animate(
          cards,
          { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] },
          { duration: 0.35, delay: Motion.stagger(0.04), easing: "ease-out" }
        );
      }
    });

    // Modern Rounded Floating Dropdown (rounded-2xl + mt-2 gap)
    function renderCustomDropdown(id, name, options, selectedValue, onChangeExpr = "") {
      const selectedOpt = options.find(o => o.value === selectedValue) || options[0];
      const itemsHtml = options.map(opt => {
        const isSelected = opt.value === selectedOpt.value;
        return \`
          <button type="button"
                  onclick="selectDropdownOption('\${id}', '\${opt.value.replace(/'/g, "\\\\'")}', '\${opt.label.replace(/'/g, "\\\\'")}', \${onChangeExpr ? "'" + onChangeExpr + "'" : "''"})"
                  data-value="\${opt.value}"
                  class="dropdown-opt w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl text-left transition-all duration-150 \${isSelected ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30' : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'}">
            <span>\${opt.label}</span>
            <svg class="check-icon w-3.5 h-3.5 \${isSelected ? 'text-white' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        \`;
      }).join('');

      return \`
        <div class="relative custom-dropdown" id="dropdown-\${id}">
          <input type="hidden" name="\${name}" id="input-\${id}" value="\${selectedOpt.value}">
          <button type="button"
                  onclick="toggleDropdown('\${id}')"
                  class="w-full flex items-center justify-between rounded-xl bg-slate-800/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white font-medium shadow-inner hover:border-slate-600 focus:outline-none focus:border-indigo-500 transition-all">
            <span id="label-\${id}" class="truncate">\${selectedOpt.label}</span>
            <svg id="chevron-\${id}" class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div id="menu-\${id}"
               class="dropdown-menu hidden absolute left-0 right-0 mt-2 z-50 origin-top rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/70 ring-1 ring-white/10 p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
            \${itemsHtml}
          </div>
        </div>
      \`;
    }

    function toggleDropdown(id) {
      const menu = document.getElementById('menu-' + id);
      const chevron = document.getElementById('chevron-' + id);
      const isHidden = menu.classList.contains('hidden');
      document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('[id^="chevron-"]').forEach(el => el.classList.remove('rotate-180', 'text-indigo-400'));
      if (isHidden) {
        menu.classList.remove('hidden');
        chevron.classList.add('rotate-180', 'text-indigo-400');
        if (window.Motion) {
          Motion.animate(menu, { opacity: [0, 1], transform: ["translateY(-6px) scale(0.97)", "translateY(0px) scale(1)"] }, { duration: 0.16, easing: "ease-out" });
        }
      }
    }

    function selectDropdownOption(id, value, label, onChangeFnName) {
      document.getElementById('input-' + id).value = value;
      document.getElementById('label-' + id).textContent = label;
      const container = document.getElementById('dropdown-' + id);
      container.querySelectorAll('.dropdown-opt').forEach(btn => {
        const check = btn.querySelector('.check-icon');
        if (btn.getAttribute('data-value') === value) {
          btn.className = 'dropdown-opt w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl text-left transition-all duration-150 bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30';
          check.classList.remove('hidden');
        } else {
          btn.className = 'dropdown-opt w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl text-left transition-all duration-150 text-slate-200 hover:bg-slate-800/90 hover:text-white';
          check.classList.add('hidden');
        }
      });
      document.getElementById('menu-' + id).classList.add('hidden');
      document.getElementById('chevron-' + id).classList.remove('rotate-180', 'text-indigo-400');
      if (onChangeFnName && window[onChangeFnName]) window[onChangeFnName]();
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('[id^="chevron-"]').forEach(el => el.classList.remove('rotate-180', 'text-indigo-400'));
      }
      if (!e.target.closest('.custom-datepicker')) {
        document.querySelectorAll('.datepicker-popover').forEach(el => el.classList.add('hidden'));
      }
    });

    // Modern Rounded Dark Glassmorphic Calendar Date Picker
    window.DP_STATE = {};
    const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    function formatDisplayDate(iso) {
      if (!iso) return "Select Date";
      const [y, m, d] = iso.split("-");
      if (!y || !m || !d) return iso;
      return \`\${d} \${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} \${y}\`;
    }

    function renderCustomDatePicker(id, name, initialIso, onChangeFnName = "") {
      const safeIso = initialIso || "2026-11-07";
      const parts = safeIso.split("-");
      const y = parseInt(parts[0], 10) || 2026;
      const m = (parseInt(parts[1], 10) || 11) - 1;
      window.DP_STATE[id] = { year: y, month: m, selected: safeIso, onChange: onChangeFnName };

      return \`
        <div class="relative custom-datepicker" id="dp-\${id}">
          <input type="hidden" name="\${name}" id="dp-input-\${id}" value="\${safeIso}">
          <button type="button"
                  onclick="toggleDatePicker('\${id}')"
                  class="w-full flex items-center justify-between rounded-xl bg-slate-800/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white font-mono shadow-inner hover:border-indigo-500/70 focus:outline-none focus:border-indigo-500 transition-all">
            <span id="dp-label-\${id}">\${formatDisplayDate(safeIso)}</span>
            <svg class="w-4 h-4 text-indigo-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <div id="dp-pop-\${id}"
               class="datepicker-popover hidden fixed w-[248px] z-[100] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/80 ring-1 ring-white/10 p-3 select-none">
          </div>
        </div>
      \`;
    }

    function buildDatePickerGrid(id) {
      const st = window.DP_STATE[id];
      const pop = document.getElementById('dp-pop-' + id);
      if (!st || !pop) return;
      const view = st.view || 'days';
      const chev = '<svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>';
      const navBtn = (dir, path) => \`<button type="button" onclick="shiftDatePickerMonth('\${id}', \${dir})" class="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-white transition-colors"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="\${path}" /></svg></button>\`;
      const pill = (label, target, active) => \`<button type="button" onclick="setDatePickerView('\${id}', '\${active ? 'days' : target}')" class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all \${active ? 'bg-indigo-600/25 border-indigo-500/60 text-indigo-200' : 'bg-slate-800/80 border-slate-700/70 text-white hover:border-indigo-500/60 hover:bg-slate-800'}">\${label}\${chev}</button>\`;
      const header = \`
        <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
          \${navBtn(-1, 'M15 19l-7-7 7-7')}
          <div class="flex items-center gap-1.5">
            \${pill(MONTH_NAMES[st.month].slice(0,3), 'months', view === 'months')}
            \${pill(String(st.year), 'years', view === 'years')}
          </div>
          \${navBtn(1, 'M9 5l7 7-7 7')}
        </div>\`;

      let body = "";
      if (view === 'months') {
        body = '<div class="grid grid-cols-3 gap-1.5 py-1">' + MONTH_NAMES.map((mn, idx) => \`
          <button type="button" onclick="setDatePickerMonthYear('\${id}', \${idx}, null)" class="py-2 rounded-xl text-xs font-semibold transition-all \${idx === st.month ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400' : 'text-slate-200 bg-slate-800/50 hover:bg-slate-800 hover:text-indigo-300'}">\${mn.slice(0,3)}</button>\`).join('') + '</div>';
      } else if (view === 'years') {
        let ys = "";
        for (let yr = 2000; yr <= 2060; yr++) {
          ys += \`<button type="button" \${yr === st.year ? 'data-sel="1"' : ''} onclick="setDatePickerMonthYear('\${id}', null, \${yr})" class="py-1.5 rounded-xl text-xs font-mono font-semibold transition-all \${yr === st.year ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400' : 'text-slate-200 bg-slate-800/50 hover:bg-slate-800 hover:text-indigo-300'}">\${yr}</button>\`;
        }
        body = \`<div class="grid grid-cols-4 gap-1.5 max-h-[168px] overflow-y-auto card-scroll pr-1 py-1" id="dp-years-\${id}">\${ys}</div>\`;
      } else {
        const firstDay = new Date(Date.UTC(st.year, st.month, 1)).getUTCDay();
        const daysInMonth = new Date(Date.UTC(st.year, st.month + 1, 0)).getUTCDate();
        const prevDays = new Date(Date.UTC(st.year, st.month, 0)).getUTCDate();
        const todayIso = new Date().toISOString().split('T')[0];
        let cells = "";
        for (let i = firstDay - 1; i >= 0; i--) {
          cells += \`<div class="h-7 flex items-center justify-center text-[10px] text-slate-600 font-mono">\${prevDays - i}</div>\`;
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = \`\${st.year}-\${String(st.month + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
          const isSel = iso === st.selected;
          const isToday = iso === todayIso;
          cells += \`<button type="button" onclick="selectDatePickerDay('\${id}', '\${iso}')" class="h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-[11px] font-mono transition-all \${isSel ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40 ring-1 ring-indigo-400' : (isToday ? 'text-indigo-300 ring-1 ring-indigo-500/40 hover:bg-slate-800' : 'text-slate-200 hover:bg-slate-800 hover:text-indigo-300')}">\${d}</button>\`;
        }
        body = \`
          <div class="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div class="grid grid-cols-7 gap-0.5">\${cells}</div>\`;
      }

      pop.innerHTML = header + body + \`
        <div class="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
          <span class="text-slate-400 font-mono">\${st.selected}</span>
          <button type="button" onclick="selectDatePickerDay('\${id}', new Date().toISOString().split('T')[0])" class="text-indigo-400 hover:text-indigo-300 font-semibold">Today</button>
        </div>\`;

      if (view === 'years') {
        const sel = pop.querySelector('[data-sel="1"]');
        const box = document.getElementById('dp-years-' + id);
        if (sel && box) box.scrollTop = sel.offsetTop - box.clientHeight / 2 + sel.clientHeight / 2;
      }
      positionDatePicker(id);
    }

    function positionDatePicker(id) {
      const pop = document.getElementById('dp-pop-' + id);
      const btn = pop && pop.parentElement.querySelector('button');
      if (!pop || !btn || pop.classList.contains('hidden')) return;
      const r = btn.getBoundingClientRect();
      const h = pop.offsetHeight;
      const w = pop.offsetWidth;
      const gap = 6;
      const spaceBelow = window.innerHeight - r.bottom - gap;
      const spaceAbove = r.top - gap;
      const openUp = spaceBelow < h && spaceAbove > spaceBelow;
      let top = openUp ? r.top - h - gap : r.bottom + gap;
      top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
      let left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      pop.style.top = top + 'px';
      pop.style.left = left + 'px';
      pop.style.transformOrigin = openUp ? 'bottom left' : 'top left';
    }

    window.addEventListener('resize', () => document.querySelectorAll('.datepicker-popover:not(.hidden)').forEach(el => positionDatePicker(el.id.replace('dp-pop-', ''))));
    window.addEventListener('scroll', () => document.querySelectorAll('.datepicker-popover:not(.hidden)').forEach(el => positionDatePicker(el.id.replace('dp-pop-', ''))), true);

    function setDatePickerView(id, view) {
      window.DP_STATE[id].view = view;
      buildDatePickerGrid(id);
    }

    function toggleDatePicker(id) {
      const pop = document.getElementById('dp-pop-' + id);
      const isHidden = pop.classList.contains('hidden');
      document.querySelectorAll('.datepicker-popover').forEach(el => el.classList.add('hidden'));
      if (isHidden) {
        window.DP_STATE[id].view = 'days';
        pop.classList.remove('hidden');
        buildDatePickerGrid(id);
        if (window.Motion) {
          Motion.animate(pop, { opacity: [0, 1], scale: [0.97, 1] }, { duration: 0.16, easing: "ease-out" });
        }
      }
    }

    function shiftDatePickerMonth(id, delta) {
      const st = window.DP_STATE[id];
      if (st.view === 'years') { st.year += delta * 12; }
      else if (st.view === 'months') { st.year += delta; }
      else {
        st.month += delta;
        if (st.month < 0) { st.month = 11; st.year -= 1; }
        if (st.month > 11) { st.month = 0; st.year += 1; }
      }
      buildDatePickerGrid(id);
    }

    function setDatePickerMonthYear(id, mVal, yVal) {
      const st = window.DP_STATE[id];
      if (mVal !== null) st.month = parseInt(mVal, 10);
      if (yVal !== null) st.year = parseInt(yVal, 10);
      st.view = 'days';
      buildDatePickerGrid(id);
    }

    function selectDatePickerDay(id, iso) {
      const st = window.DP_STATE[id];
      st.selected = iso;
      const parts = iso.split("-");
      st.year = parseInt(parts[0], 10);
      st.month = parseInt(parts[1], 10) - 1;
      document.getElementById('dp-input-' + id).value = iso;
      document.getElementById('dp-label-' + id).textContent = formatDisplayDate(iso);
      document.getElementById('dp-pop-' + id).classList.add('hidden');
      if (st.onChange && window[st.onChange]) window[st.onChange]();
    }

    function clientDuration(startStr, endStr) {
      if (!startStr || !endStr) return { years: 0, months: 0, days: 0, totalYears: 0, totalMonths: 0, text: "0 Yrs, 0 Mos, 0 Days" };
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { years: 0, months: 0, days: 0, totalYears: 0, totalMonths: 0, text: "0 Yrs, 0 Mos, 0 Days" };
      let years = end.getUTCFullYear() - start.getUTCFullYear();
      let months = end.getUTCMonth() - start.getUTCMonth();
      let days = end.getUTCDate() - start.getUTCDate();
      if (days < 0) {
        months -= 1;
        days += new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)).getUTCDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      const totalMonths = Math.max(1, Math.round(years * 12 + months + days / 30));
      const totalYears = years + months / 12 + days / 365;
      return { years, months, days, totalMonths, totalYears, text: \`\${years} Yrs, \${months} Mos, \${days} Days\` };
    }

    function updateMfPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const cur = parseFloat(form.current_value.value) || 0;
      const inv = parseFloat(form.invested_amount.value) || 0;
      const gain = cur - inv;
      const pct = inv > 0 ? ((gain / inv) * 100).toFixed(2) : "0.00";
      document.getElementById('mf-auto-gain').textContent = '₹' + gain.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('mf-auto-pct').textContent = (gain >= 0 ? '+' : '') + pct + '%';
    }

    function updateFdPreview(recomputeMaturity = true) {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const p = parseFloat(form.principal.value) || 0;
      const r = (parseFloat(form.rate.value) || 0) / 100;
      const dur = clientDuration(form.start_date.value, form.maturity_date.value);
      const start = new Date(form.start_date.value);
      const end = new Date(form.maturity_date.value);
      const exactDays = (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start)
        ? Math.round((end.getTime() - start.getTime()) / 86400000)
        : 0;
      let formulaMat = 0;
      if (p > 0) {
        if (exactDays > 0 && exactDays < 180) {
          formulaMat = Math.round(p * (1 + r * (exactDays / 365)));
        } else {
          const bankYrs = dur.years + (dur.months / 12) + (dur.days / 360);
          formulaMat = Math.round(p * Math.pow(1 + r / 4, 4 * bankYrs));
        }
      }
      if (recomputeMaturity && form.maturity_amount) {
        form.maturity_amount.value = formulaMat;
      }
      const mat = (form.maturity_amount && parseFloat(form.maturity_amount.value) > 0)
        ? Math.round(parseFloat(form.maturity_amount.value))
        : formulaMat;
      const gain = Math.max(0, mat - p);
      document.getElementById('fd-auto-dur').textContent = dur.text;
      document.getElementById('fd-auto-mat').textContent = '₹' + mat.toLocaleString('en-IN');
      document.getElementById('fd-auto-gain').textContent = '+₹' + gain.toLocaleString('en-IN');
    }

    function updateRdPreview(recomputeMaturity = true) {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const m = parseFloat(form.monthly_amount.value) || 0;
      const r = (parseFloat(form.rate.value) || 0) / 100;
      const dur = clientDuration(form.start_date.value, form.end_date.value);
      const totAmt = m * dur.totalMonths;
      let formulaMat = 0;
      for (let k = 1; k <= dur.totalMonths; k++) {
        formulaMat += m * Math.pow(1 + r / 4, 4 * (k / 12));
      }
      formulaMat = Math.round(formulaMat);
      if (recomputeMaturity && form.maturity_amount) {
        form.maturity_amount.value = formulaMat;
      }
      const mat = (form.maturity_amount && parseFloat(form.maturity_amount.value) > 0)
        ? Math.round(parseFloat(form.maturity_amount.value))
        : formulaMat;
      const gain = Math.max(0, mat - totAmt);
      document.getElementById('rd-auto-dur').textContent = dur.text;
      document.getElementById('rd-auto-tot').textContent = '₹' + totAmt.toLocaleString('en-IN');
      document.getElementById('rd-auto-mat').textContent = '₹' + mat.toLocaleString('en-IN');
      document.getElementById('rd-auto-gain').textContent = '+₹' + gain.toLocaleString('en-IN');
    }

    function updateFlexiRdPreview(recomputeMaturity = true, recomputeDeposited = false) {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const base = parseFloat(form.base_monthly.value) || 0;
      const r = (parseFloat(form.rate.value) || 0) / 100;
      const dur = clientDuration(form.start_date.value, form.end_date.value);
      const nMonths = Math.max(1, dur.totalMonths);
      if (recomputeDeposited && form.total_deposited) {
        form.total_deposited.value = base * nMonths;
      }
      const totDep = (form.total_deposited && parseFloat(form.total_deposited.value) > 0)
        ? Math.round(parseFloat(form.total_deposited.value))
        : (base * nMonths);
      const avgMonthly = totDep / nMonths;
      let formulaMat = 0;
      for (let k = 1; k <= nMonths; k++) {
        formulaMat += avgMonthly * Math.pow(1 + r / 4, 4 * (k / 12));
      }
      formulaMat = Math.round(formulaMat);
      if (recomputeMaturity && form.maturity_amount) {
        form.maturity_amount.value = formulaMat;
      }
      const mat = (form.maturity_amount && parseFloat(form.maturity_amount.value) > 0)
        ? Math.round(parseFloat(form.maturity_amount.value))
        : formulaMat;
      const gain = Math.max(0, mat - totDep);
      document.getElementById('frd-auto-dur').textContent = dur.text;
      document.getElementById('frd-auto-tot').textContent = '₹' + totDep.toLocaleString('en-IN');
      document.getElementById('frd-auto-mat').textContent = '₹' + mat.toLocaleString('en-IN');
      document.getElementById('frd-auto-gain').textContent = '+₹' + gain.toLocaleString('en-IN');
    }

    function updateInsPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const endStr = form.end_date.value;
      if (!endStr) return;
      const now = new Date();
      const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const days = Math.round((new Date(endStr).getTime() - ref.getTime()) / 86400000);
      const status = days <= 0 ? "EXPIRED" : (days <= 30 ? "DUE SOON" : "ACTIVE");
      document.getElementById('ins-auto-days').textContent = days + ' Days';
      document.getElementById('ins-auto-status').textContent = status;
    }

    function updateLoanPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const orig = parseFloat(form.original_loan_amount.value) || 0;
      const out = parseFloat(form.outstanding_principal.value) || 0;
      const rate = (parseFloat(form.interest_rate.value) || 0) / 100 / 12;
      const months = (parseFloat(form.tenure_years.value) || 0) * 12;
      let autoEmi = 0;
      if (orig > 0 && rate > 0 && months > 0) {
        const f = Math.pow(1 + rate, months);
        autoEmi = Math.round((orig * rate * f) / (f - 1));
      }
      const repaid = Math.max(0, orig - out);
      const pct = orig > 0 ? Math.round((repaid / orig) * 100) : 0;
      const emiEl = document.getElementById('hl-auto-emi');
      const repEl = document.getElementById('hl-auto-repaid');
      if (emiEl) emiEl.textContent = '₹' + autoEmi.toLocaleString('en-IN') + '/mo';
      if (repEl) repEl.textContent = '₹' + repaid.toLocaleString('en-IN') + ' (' + pct + '%)';
    }

    function clientNormalizeFy(dateStr, rawFy) {
      if (rawFy) {
        const m = String(rawFy).match(/(\d{4})/);
        if (m) {
          const sy = parseInt(m[1], 10);
          if (sy >= 1990 && sy <= 2100) return sy + " - " + (sy + 1);
        }
      }
      if (dateStr) {
        const parts = String(dateStr).split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10);
          if (y >= 1990 && mo >= 1 && mo <= 12) {
            const sy = mo >= 4 ? y : y - 1;
            return sy + " - " + (sy + 1);
          }
        }
      }
      return "2026 - 2027";
    }

    function onPpfDateChange() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const derivedFy = clientNormalizeFy(form.date.value, "");
      if (document.getElementById('dropdown-ppf-fy')) {
        selectDropdownOption('ppf-fy', derivedFy, 'FY ' + derivedFy + ' (Apr ' + derivedFy.slice(0,4) + ' – Mar ' + derivedFy.slice(-4) + ')', '');
      } else if (form.fy) {
        form.fy.value = derivedFy;
      }
      updatePpfPreview();
    }

    function updatePpfPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const bal = parseFloat(form.current_balance.value) || 0;
      const amt = parseFloat(form.amount.value) || 0;
      const selectedFy = clientNormalizeFy(form.date ? form.date.value : "", form.fy ? form.fy.value : "");
      const editId = window.CURRENT_PPF_EDIT_ID || null;
      const allContribs = (window.TRACKER_DATA.ppf && window.TRACKER_DATA.ppf.contributions) || [];
      const otherInFy = allContribs.filter(c => c.id !== editId && clientNormalizeFy(c.date, c.fy) === selectedFy);
      const otherSum = otherInFy.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const clubbedTotal = otherSum + amt;

      const otherEl = document.getElementById('ppf-auto-other');
      const clubbedEl = document.getElementById('ppf-auto-clubbed');
      const outEl = document.getElementById('ppf-auto-outstanding');
      const fyLabelEl = document.getElementById('ppf-auto-fy-label');
      const el = document.getElementById('ppf-auto-rate');
      const outstanding = Math.max(0, 150000 - clubbedTotal);

      if (fyLabelEl) fyLabelEl.textContent = selectedFy;
      if (otherEl) {
        otherEl.textContent = otherInFy.length > 0
          ? '₹' + otherSum.toLocaleString('en-IN') + ' (' + otherInFy.length + ' existing ' + (otherInFy.length === 1 ? 'entry' : 'entries') + ')'
          : '₹0 (First entry in this FY)';
      }
      if (clubbedEl) {
        clubbedEl.textContent = '₹' + clubbedTotal.toLocaleString('en-IN') + ' / ₹1,50,000';
      }
      if (outEl) {
        outEl.textContent = outstanding > 0
          ? '₹' + outstanding.toLocaleString('en-IN') + ' lesser than the ₹1.5L limit for FY ' + selectedFy
          : '₹0 (Full ₹1,50,000 Limit Completed)';
        outEl.className = outstanding > 0 ? 'font-mono font-bold text-amber-400' : 'font-mono font-bold text-emerald-400';
      }
      if (el) el.textContent = '7.10% p.a. Sovereign EEE • Corpus: ₹' + bal.toLocaleString('en-IN');
    }

    function updateBankPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const bal = parseFloat(form.current_balance.value) || 0;
      const rate = parseFloat(form.interest_rate.value) || 0;
      const estYearly = Math.round(bal * (rate / 100));
      const el = document.getElementById('bank-auto-interest');
      if (el) el.textContent = '+₹' + estYearly.toLocaleString('en-IN') + '/yr';
    }

    function updateCardPreview() {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const limit = parseFloat(form.credit_limit.value) || 0;
      const used = parseFloat(form.utilized_amount.value) || 0;
      const avail = Math.max(0, limit - used);
      const pct = limit > 0 ? ((used / limit) * 100).toFixed(1) : "0.0";
      const availEl = document.getElementById('cc-auto-avail');
      const pctEl = document.getElementById('cc-auto-pct');
      if (availEl) availEl.textContent = '₹' + avail.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (pctEl) pctEl.textContent = pct + '% Utilized';
    }

    // ========================================================
    // Real-Time Client-Side Tax & ITR Return Engine (New vs Old)
    // ========================================================
    function fmtINRClient(val) {
      return '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');
    }

    function computeClientSlabs(taxable, slabs) {
      let total = 0;
      const rows = slabs.map(s => {
        let amt = 0;
        if (taxable > s.min) {
          amt = s.max === Infinity ? (taxable - s.min) : Math.max(0, Math.min(taxable, s.max) - s.min);
        }
        const tx = Math.round(amt * (s.rate / 100));
        total += tx;
        return { label: s.label, rate: s.rate, taxableInSlab: amt, taxInSlab: tx };
      });
      return { rows, total };
    }

    function computeClientSurcharge(taxAfterRebate, taxable, isNew) {
      if (taxable <= 5000000 || taxAfterRebate <= 0) return { rate: 0, amount: 0 };
      let rate = 0;
      if (taxable > 50000000) rate = isNew ? 25 : 37;
      else if (taxable > 20000000) rate = 25;
      else if (taxable > 10000000) rate = 15;
      else if (taxable > 5000000) rate = 10;
      return { rate, amount: Math.round(taxAfterRebate * (rate / 100)) };
    }

    function clientRefundBadgeHtml(diff) {
      if (diff > 0) {
        return '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-700/60">ITR Refund: +' + fmtINRClient(diff) + '</span>';
      }
      if (diff < 0) {
        return '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/90 text-rose-400 border border-rose-700/60">Balance Tax Payable: ' + fmtINRClient(Math.abs(diff)) + '</span>';
      }
      return '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">Nil Due / Settled (₹0)</span>';
    }

    function recalcTaxLive() {
      const form = document.getElementById('tax-calc-form');
      if (!form) return;

      const fy = form.fy.value || '2025-26';
      const age = form.age_group.value || 'below_60';
      const isSalaried = form.is_salaried.value === 'true';

      const grossSalary = Math.max(0, parseFloat(form.gross_salary.value) || 0);
      const interestIncome = Math.max(0, parseFloat(form.interest_income.value) || 0);
      const rentalIncome = Math.max(0, parseFloat(form.rental_income.value) || 0);
      const otherIncome = Math.max(0, parseFloat(form.other_income.value) || 0);
      const gti = grossSalary + interestIncome + rentalIncome + otherIncome;

      // 1. New Regime
      const newStd = isSalaried ? Math.min(grossSalary, 75000) : 0;
      const newEmpNps = Math.max(0, parseFloat(form.sec_80ccd_2_employer_nps.value) || 0);
      const rentalStd = Math.round(rentalIncome * 0.30);
      const newDed = newStd + newEmpNps + rentalStd;
      const newTaxable = Math.max(0, gti - newDed);

      const newSlabs = fy === '2024-25'
        ? [
            { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000' },
            { min: 300000, max: 700000, rate: 5, label: '₹3,00,001 – ₹7,00,000' },
            { min: 700000, max: 1000000, rate: 10, label: '₹7,00,001 – ₹10,00,000' },
            { min: 1000000, max: 1200000, rate: 15, label: '₹10,00,001 – ₹12,00,000' },
            { min: 1200000, max: 1500000, rate: 20, label: '₹12,00,001 – ₹15,00,000' },
            { min: 1500000, max: Infinity, rate: 30, label: 'Above ₹15,00,000' }
          ]
        : [
            { min: 0, max: 400000, rate: 0, label: 'Up to ₹4,00,000' },
            { min: 400000, max: 800000, rate: 5, label: '₹4,00,001 – ₹8,00,000' },
            { min: 800000, max: 1200000, rate: 10, label: '₹8,00,001 – ₹12,00,000' },
            { min: 1200000, max: 1600000, rate: 15, label: '₹12,00,001 – ₹16,00,000' },
            { min: 1600000, max: 2000000, rate: 20, label: '₹16,00,001 – ₹20,00,000' },
            { min: 2000000, max: 2400000, rate: 25, label: '₹20,00,001 – ₹24,00,000' },
            { min: 2400000, max: Infinity, rate: 30, label: 'Above ₹24,00,000' }
          ];

      const newBrk = computeClientSlabs(newTaxable, newSlabs);
      const rebateLimit = fy === '2024-25' ? 700000 : 1200000;
      const maxRebate = fy === '2024-25' ? 25000 : 60000;
      let newRebate = 0;
      let newMarg = 0;
      if (newTaxable <= rebateLimit) {
        newRebate = Math.min(newBrk.total, maxRebate);
      } else if (newBrk.total > (newTaxable - rebateLimit)) {
        newMarg = newBrk.total - (newTaxable - rebateLimit);
      }
      const newAfterRebate = Math.max(0, newBrk.total - newRebate - newMarg);
      const newSur = computeClientSurcharge(newAfterRebate, newTaxable, true);
      const newCess = Math.round((newAfterRebate + newSur.amount) * 0.04);
      const newTotalTax = newAfterRebate + newSur.amount + newCess;

      // 2. Old Regime
      const oldStd = isSalaried ? Math.min(grossSalary, 50000) : 0;
      const oldPt = isSalaried ? Math.min(2500, Math.max(0, parseFloat(form.professional_tax.value) || 0)) : 0;
      const oldHra = isSalaried ? Math.max(0, parseFloat(form.hra_exemption.value) || 0) : 0;
      const old24b = Math.min(200000, Math.max(0, parseFloat(form.home_loan_interest_24b.value) || 0));
      const old80C = Math.min(150000, Math.max(0, parseFloat(form.sec_80c.value) || 0));
      const old80CCD1B = Math.min(50000, Math.max(0, parseFloat(form.sec_80ccd_1b_nps.value) || 0));
      const old80D = Math.min(100000, Math.max(0, parseFloat(form.sec_80d_health.value) || 0));
      const old80TTA = Math.min(age === 'below_60' ? 10000 : 50000, Math.max(0, parseFloat(form.sec_80tta_savings.value) || 0));
      const oldOther = Math.max(0, parseFloat(form.other_deductions_80e_80g.value) || 0);

      const oldDed = oldStd + oldPt + oldHra + old24b + old80C + old80CCD1B + newEmpNps + old80D + old80TTA + oldOther + rentalStd;
      const oldTaxable = Math.max(0, gti - oldDed);

      const baseEx = age === 'super_senior_80' ? 500000 : (age === 'senior_60_80' ? 300000 : 250000);
      const oldSlabs = age === 'super_senior_80'
        ? [
            { min: 0, max: 500000, rate: 0, label: 'Up to ₹5,00,000 (Super Senior)' },
            { min: 500000, max: 1000000, rate: 20, label: '₹5,00,001 – ₹10,00,000' },
            { min: 1000000, max: Infinity, rate: 30, label: 'Above ₹10,00,000' }
          ]
        : [
            { min: 0, max: baseEx, rate: 0, label: 'Up to ' + fmtINRClient(baseEx) },
            { min: baseEx, max: 500000, rate: 5, label: fmtINRClient(baseEx + 1) + ' – ₹5,00,000' },
            { min: 500000, max: 1000000, rate: 20, label: '₹5,00,001 – ₹10,00,000' },
            { min: 1000000, max: Infinity, rate: 30, label: 'Above ₹10,00,000' }
          ];

      const oldBrk = computeClientSlabs(oldTaxable, oldSlabs);
      const oldRebate = oldTaxable <= 500000 ? Math.min(oldBrk.total, 12500) : 0;
      const oldAfterRebate = Math.max(0, oldBrk.total - oldRebate);
      const oldSur = computeClientSurcharge(oldAfterRebate, oldTaxable, false);
      const oldCess = Math.round((oldAfterRebate + oldSur.amount) * 0.04);
      const oldTotalTax = oldAfterRebate + oldSur.amount + oldCess;

      // Taxes Paid & Refunds
      const tds = Math.max(0, parseFloat(form.tds_deducted.value) || 0);
      const adv = Math.max(0, parseFloat(form.advance_tax_paid.value) || 0);
      const paid = tds + adv;

      const newDiff = paid - newTotalTax;
      const oldDiff = paid - oldTotalTax;

      const newEff = gti > 0 ? ((newTotalTax / gti) * 100).toFixed(2) : "0.00";
      const oldEff = gti > 0 ? ((oldTotalTax / gti) * 100).toFixed(2) : "0.00";

      // Update DOM cells
      document.getElementById('tbl-new-gti').textContent = fmtINRClient(gti);
      document.getElementById('tbl-old-gti').textContent = fmtINRClient(gti);
      document.getElementById('tbl-new-std').textContent = '-' + fmtINRClient(newStd);
      document.getElementById('tbl-old-std').textContent = '-' + fmtINRClient(oldStd);
      document.getElementById('tbl-new-ded').textContent = '-' + fmtINRClient(newDed - newStd);
      document.getElementById('tbl-old-ded').textContent = '-' + fmtINRClient(oldDed - oldStd);
      document.getElementById('tbl-new-taxable').textContent = fmtINRClient(newTaxable);
      document.getElementById('tbl-old-taxable').textContent = fmtINRClient(oldTaxable);
      document.getElementById('tbl-new-slabtax').textContent = fmtINRClient(newBrk.total);
      document.getElementById('tbl-old-slabtax').textContent = fmtINRClient(oldBrk.total);
      document.getElementById('tbl-new-rebate').textContent = '-' + fmtINRClient(newRebate + newMarg);
      document.getElementById('tbl-old-rebate').textContent = '-' + fmtINRClient(oldRebate);
      document.getElementById('tbl-new-surcharge').textContent = fmtINRClient(newSur.amount) + ' (' + newSur.rate + '%)';
      document.getElementById('tbl-old-surcharge').textContent = fmtINRClient(oldSur.amount) + ' (' + oldSur.rate + '%)';
      document.getElementById('tbl-new-cess').textContent = fmtINRClient(newCess);
      document.getElementById('tbl-old-cess').textContent = fmtINRClient(oldCess);
      document.getElementById('tbl-new-totaltax').textContent = fmtINRClient(newTotalTax);
      document.getElementById('tbl-old-totaltax').textContent = fmtINRClient(oldTotalTax);
      document.getElementById('tbl-new-eff').textContent = newEff + '%';
      document.getElementById('tbl-old-eff').textContent = oldEff + '%';
      document.getElementById('tbl-new-paid').textContent = fmtINRClient(paid);
      document.getElementById('tbl-old-paid').textContent = fmtINRClient(paid);
      document.getElementById('tbl-new-outcome').innerHTML = clientRefundBadgeHtml(newDiff);
      document.getElementById('tbl-old-outcome').innerHTML = clientRefundBadgeHtml(oldDiff);

      const newNet = Math.max(0, gti - newTotalTax);
      const oldNet = Math.max(0, gti - oldTotalTax);
      document.getElementById('tbl-new-net').textContent = fmtINRClient(newNet);
      document.getElementById('tbl-old-net').textContent = fmtINRClient(oldNet);
      document.getElementById('tbl-new-monthly').textContent = fmtINRClient(Math.round(newNet / 12)) + '/mo';
      document.getElementById('tbl-old-monthly').textContent = fmtINRClient(Math.round(oldNet / 12)) + '/mo';

      // Update Banner
      document.getElementById('banner-new-tax').textContent = fmtINRClient(newTotalTax);
      document.getElementById('banner-old-tax').textContent = fmtINRClient(oldTotalTax);
      document.getElementById('rec-fy-label').textContent = fy;
      document.getElementById('slab-new-fy').textContent = 'FY ' + fy;
      document.getElementById('slab-old-age').textContent = age === 'below_60' ? '< 60 Yrs' : (age === 'senior_60_80' ? '60–80 Yrs' : '80+ Yrs');

      const recNew = newTotalTax <= oldTotalTax;
      const diffTax = Math.abs(oldTotalTax - newTotalTax);
      document.getElementById('rec-badge').textContent = recNew ? 'Recommended: New Tax Regime' : 'Recommended: Old Tax Regime';
      document.getElementById('rec-headline').textContent = diffTax > 0
        ? (recNew ? 'New Regime' : 'Old Regime') + ' saves you ' + fmtINRClient(diffTax) + ' in income tax compared to ' + (recNew ? 'Old Regime.' : 'New Regime.')
        : 'Both regimes result in identical tax liability (₹0 difference) for your current inputs.';

      // Update Slab Tables
      document.getElementById('new-slabs-tbody').innerHTML = newBrk.rows.map(s => \`
        <tr class="border-b border-slate-800/60 text-xs">
          <td class="py-2.5 text-slate-300">\${s.label}</td>
          <td class="py-2.5 text-right font-mono text-indigo-300">\${s.rate}%</td>
          <td class="py-2.5 text-right font-mono text-slate-300">\${fmtINRClient(s.taxableInSlab)}</td>
          <td class="py-2.5 text-right font-mono font-semibold text-white">\${fmtINRClient(s.taxInSlab)}</td>
        </tr>
      \`).join('');

      document.getElementById('old-slabs-tbody').innerHTML = oldBrk.rows.map(s => \`
        <tr class="border-b border-slate-800/60 text-xs">
          <td class="py-2.5 text-slate-300">\${s.label}</td>
          <td class="py-2.5 text-right font-mono text-amber-300">\${s.rate}%</td>
          <td class="py-2.5 text-right font-mono text-slate-300">\${fmtINRClient(s.taxableInSlab)}</td>
          <td class="py-2.5 text-right font-mono font-semibold text-white">\${fmtINRClient(s.taxInSlab)}</td>
        </tr>
      \`).join('');
    }

    function autoFillPortfolioDeductions(p80c, p80d, p80tta) {
      const f = document.getElementById('tax-calc-form');
      if (!f) return;
      f.sec_80c.value = p80c;
      f.sec_80d_health.value = p80d;
      f.sec_80tta_savings.value = Math.min(10000, p80tta);
      recalcTaxLive();
      showToast("Synced 80C (PPF/EPF/ULIP) & 80D (Health Insurance) from your portfolio!", "success");
    }

    async function saveTaxCalculation() {
      const form = document.getElementById('tax-calc-form');
      if (!form) return;
      const fd = new FormData(form);
      const payload = { type: 'tax_profile' };
      fd.forEach((v, k) => payload[k] = v);
      await fetch('/api/save_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("Tax profile & regime calculations saved!", "success");
    }

    // ========================================================
    // Live AMFI Mutual Fund NAV & Statutory PPF/EPF ROI Engine
    // ========================================================
    let amfiSearchTimer = null;
    async function searchAmfiFundsLive(q) {
      const box = document.getElementById('amfi-search-results');
      if (!box) return;
      if (!q || q.trim().length < 2) {
        box.classList.add('hidden');
        return;
      }
      clearTimeout(amfiSearchTimer);
      amfiSearchTimer = setTimeout(async () => {
        box.classList.remove('hidden');
        box.innerHTML = '<div class="px-3 py-2 text-xs text-slate-400">Searching AMFI API (api.mfapi.in)...</div>';
        let list = [];
        try {
          const r = await fetch('https://api.mfapi.in/mf/search?q=' + encodeURIComponent(q.trim()));
          if (r.ok) {
            list = (await r.json()).slice(0, 12);
          }
        } catch (_) {}
        if (!list.length) {
          const r2 = await fetch('/api/mf_search?q=' + encodeURIComponent(q.trim()));
          if (r2.ok) list = await r2.json();
        }
        if (!list.length) {
          box.innerHTML = '<div class="px-3 py-2 text-xs text-slate-400">No matching AMFI schemes found</div>';
          return;
        }
        box.innerHTML = list.map(item => \`
          <button type="button"
                  onclick="selectAmfiScheme('\${item.schemeCode}', '\${String(item.schemeName).replace(/'/g, "\\\\'")}' )"
                  class="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/20 text-xs text-slate-200 hover:text-white flex items-center justify-between gap-2 transition-colors">
            <span class="truncate">\${item.schemeName}</span>
            <span class="font-mono text-[10px] text-cyan-400 shrink-0">#\${item.schemeCode}</span>
          </button>
        \`).join('');
      }, 220);
    }

    async function selectAmfiScheme(code, name) {
      const box = document.getElementById('amfi-search-results');
      if (box) box.classList.add('hidden');
      const form = document.getElementById('modal-form');
      if (!form) return;
      form.scheme_code.value = code;
      if (name) form.scheme_name.value = name;
      await fetchSingleNavInModal(code);
    }

    async function fetchSingleNavInModal(explicitCode = null) {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const code = explicitCode || form.scheme_code.value.trim();
      if (!code) {
        showToast("Enter an AMFI Scheme Code or search a fund above first", "info");
        return;
      }
      const badge = document.getElementById('mf-nav-status');
      if (badge) badge.textContent = "Fetching live NAV from AMFI...";
      let navData = null;
      try {
        const res = await fetch('https://api.mfapi.in/mf/' + encodeURIComponent(code) + '/latest');
        if (res.ok) {
          const j = await res.json();
          if (j && j.data && j.data[0]) {
            navData = {
              scheme_code: String(j.meta?.scheme_code || code),
              scheme_name: j.meta?.scheme_name || form.scheme_name.value,
              amc: j.meta?.fund_house || form.amc.value,
              nav: parseFloat(j.data[0].nav) || 0,
              nav_date: j.data[0].date || ""
            };
          }
        }
      } catch (_) {}

      if (!navData) {
        const res2 = await fetch('/api/mf_nav?code=' + encodeURIComponent(code));
        if (res2.ok) navData = await res2.json();
      }

      if (navData && navData.nav > 0) {
        form.latest_nav.value = navData.nav;
        form.nav_date.value = navData.nav_date || "";
        if (navData.amc && !form.amc.value) form.amc.value = navData.amc;
        if (navData.scheme_name && !form.scheme_name.value) form.scheme_name.value = navData.scheme_name;
        if (badge) badge.textContent = "Live NAV ₹" + navData.nav + " (" + (navData.nav_date || "Latest") + ")";
        onMfNavOrUnitsChange('nav');
        showToast("Auto-populated Live NAV: ₹" + navData.nav + " (" + (navData.nav_date || "AMFI") + ")", "success");
      } else {
        if (badge) badge.textContent = "Could not find NAV for code #" + code;
      }
    }

    function onMfNavOrUnitsChange(source) {
      const form = document.getElementById('modal-form');
      if (!form) return;
      const nav = parseFloat(form.latest_nav.value) || 0;
      const units = parseFloat(form.units.value) || 0;
      const cur = parseFloat(form.current_value.value) || 0;

      if ((source === 'units' || source === 'nav') && nav > 0 && units > 0) {
        form.current_value.value = (units * nav).toFixed(2);
      } else if (source === 'nav' && nav > 0 && cur > 0 && units === 0) {
        form.units.value = (cur / nav).toFixed(4);
      } else if (source === 'current_value' && nav > 0 && cur > 0) {
        form.units.value = (cur / nav).toFixed(4);
      }
      updateMfPreview();
    }

    async function syncAllMutualFundNavs() {
      const btn = document.getElementById('btn-sync-navs');
      if (btn) btn.innerHTML = '<span>Syncing AMFI NAVs...</span>';
      const funds = window.TRACKER_DATA.mutual_funds || [];
      const updates = [];

      for (const mf of funds) {
        if (!mf.scheme_code) continue;
        let nav = 0;
        let navDate = "";
        try {
          const r = await fetch('https://api.mfapi.in/mf/' + encodeURIComponent(mf.scheme_code) + '/latest');
          if (r.ok) {
            const j = await r.json();
            if (j && j.data && j.data[0]) {
              nav = parseFloat(j.data[0].nav) || 0;
              navDate = j.data[0].date || "";
            }
          }
        } catch (_) {}
        if (!nav) {
          const r2 = await fetch('/api/mf_nav?code=' + encodeURIComponent(mf.scheme_code));
          if (r2.ok) {
            const j2 = await r2.json();
            nav = j2?.nav || 0;
            navDate = j2?.nav_date || "";
          }
        }
        if (nav > 0) {
          updates.push({ id: mf.id, scheme_code: mf.scheme_code, latest_nav: nav, nav_date: navDate });
        }
      }

      await fetch('/api/sync_navs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      showToast("Synced live AMFI NAVs for " + updates.length + " mutual fund schemes!", "success");
      setTimeout(() => location.reload(), 300);
    }

    async function syncStatutoryRetirementRates() {
      const res = await fetch('/api/statutory_rates', { method: 'POST' });
      if (res.ok) {
        const rates = await res.json();
        showToast(\`Auto-Populated Statutory ROI: PPF \${rates.ppf.rate}% p.a. (DEA) & EPF \${rates.epf.rate}% p.a. (EPFO)\`, "success");
        setTimeout(() => location.reload(), 300);
      }
    }

    let stepUpSaveTimer = null;
    function onStepUpDrag(id, rawVal, commitSave = false) {
      const pct = Math.max(0, Math.min(100, parseFloat(rawVal) || 0));
      const numEl = document.getElementById('stepup-num-' + id);
      const rangeEl = document.getElementById('stepup-range-' + id);
      const barEl = document.getElementById('stepup-bar-' + id);
      const thumbEl = document.getElementById('stepup-thumb-' + id);

      if (numEl && document.activeElement !== numEl) numEl.value = pct.toFixed(1);
      if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = pct;
      if (barEl) barEl.style.width = pct + '%';
      if (thumbEl) thumbEl.style.left = pct + '%';

      const mf = (window.TRACKER_DATA.mutual_funds || []).find(x => x.id === Number(id));
      if (mf) mf.step_up_pct = pct;

      const total = (window.TRACKER_DATA.mutual_funds || []).reduce((s, x) => s + (Number(x.step_up_pct) || 0), 0);
      const badge = document.getElementById('step-up-total-badge');
      if (badge) {
        badge.textContent = 'Total: ' + total.toFixed(1) + '%';
        badge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ' + (
          Math.abs(total - 100) < 0.05
            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
            : (total > 100 ? 'bg-rose-950/80 text-rose-400 border-rose-700/60' : 'bg-amber-950/80 text-amber-400 border-amber-700/60')
        );
      }

      if (commitSave) {
        clearTimeout(stepUpSaveTimer);
        stepUpSaveTimer = setTimeout(async () => {
          await fetch('/api/save_step_up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(id), step_up_pct: pct })
          });
          showToast('Saved Step-Up Share (' + pct.toFixed(1) + '%)', 'success');
        }, 120);
      }
    }

    function syncModalStepUpSlider(val, fromSlider = true) {
      const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
      const form = document.getElementById('modal-form');
      if (!form) return;
      if (fromSlider) {
        form.step_up_pct.value = pct.toFixed(1);
      } else {
        const sl = document.getElementById('modal-stepup-slider');
        if (sl) sl.value = pct;
      }
      const bar = document.getElementById('modal-stepup-bar');
      const thumb = document.getElementById('modal-stepup-thumb');
      if (bar) bar.style.width = pct + '%';
      if (thumb) thumb.style.left = pct + '%';
    }

    function openModal(category, editId = null) {
      const modal = document.getElementById("modal-container");
      const title = document.getElementById("modal-title");
      const body = document.getElementById("modal-body");
      modal.classList.remove("hidden");

      if (category === "mutual_fund") {
        const existing = editId ? (window.TRACKER_DATA.mutual_funds || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Mutual Fund Holding" : "Add Mutual Fund Holding";
        const catOptions = [
          { label: "Flexi Cap Equity", value: "Flexi Cap Equity" },
          { label: "Large Cap / Index Fund", value: "Large Cap / Index Fund" },
          { label: "Mid Cap Equity", value: "Mid Cap Equity" },
          { label: "Small Cap Equity", value: "Small Cap Equity" },
          { label: "Gold ETF / Gold Fund", value: "Gold ETF / Gold Fund" },
          { label: "International / Overseas FoF", value: "International / Overseas FoF" },
          { label: "ELSS (80C Tax Saver)", value: "ELSS (80C Tax Saver)" },
          { label: "Debt / Liquid Fund", value: "Debt / Liquid Fund" }
        ];
        const dropdownHtml = renderCustomDropdown("mf-cat", "category", catOptions, existing ? existing.category : "Flexi Cap Equity");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'mutual_fund', \${editId || 'null'})" class="space-y-4">
            <div class="relative p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">Auto-Populate from Live AMFI API (api.mfapi.in)</label>
                <span id="mf-nav-status" class="text-[10px] font-mono text-cyan-400">\${existing && existing.latest_nav ? 'Live NAV: ₹' + existing.latest_nav + ' (' + (existing.nav_date || 'AMFI') + ')' : 'Search or enter AMFI code'}</span>
              </div>
              <input type="text" oninput="searchAmfiFundsLive(this.value)" placeholder="Type fund name to search 40,000+ AMFI schemes (e.g. Parag Parikh Flexi Cap, SBI Gold)..." class="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
              <div id="amfi-search-results" class="hidden max-h-44 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 p-1 space-y-0.5 shadow-2xl"></div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Scheme Name</label>
                <input type="text" name="scheme_name" required value="\${existing ? existing.scheme_name : ''}" placeholder="e.g. Parag Parikh Flexi Cap Fund" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Fund House (AMC)</label>
                <input type="text" name="amc" value="\${existing ? (existing.amc || '') : ''}" placeholder="e.g. PPFAS Mutual Fund" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">AMFI Scheme Code</label>
                <div class="flex gap-1.5">
                  <input type="text" name="scheme_code" value="\${existing ? (existing.scheme_code || '') : ''}" placeholder="122639" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
                  <button type="button" onclick="fetchSingleNavInModal()" class="px-2.5 py-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[11px] font-semibold shrink-0 hover:bg-cyan-900">Fetch</button>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Live NAV / Share Rate (₹)</label>
                <input type="number" step="0.0001" name="latest_nav" oninput="onMfNavOrUnitsChange('nav')" value="\${existing ? (existing.latest_nav || '') : ''}" placeholder="Auto-fetched" class="w-full rounded-xl bg-slate-800 border border-cyan-500/40 px-3 py-2 text-cyan-300 text-xs font-mono font-bold">
                <input type="hidden" name="nav_date" value="\${existing ? (existing.nav_date || '') : ''}">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Units Held</label>
                <input type="number" step="0.0001" name="units" oninput="onMfNavOrUnitsChange('units')" value="\${existing ? (existing.units || '') : ''}" placeholder="Auto or enter units" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Asset Category</label>
                \${dropdownHtml}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Inception / Start Date</label>
                \${renderCustomDatePicker("mf-start", "start_date", existing ? existing.start_date : "2025-01-01")}
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Monthly SIP (₹)</label>
                <input type="number" step="0.01" name="sip_amount" value="\${existing ? existing.sip_amount : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Invested Capital (₹)</label>
                <input type="number" step="0.01" name="invested_amount" oninput="updateMfPreview()" required value="\${existing ? existing.invested_amount : ''}" placeholder="50000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Current Valuation (₹)</label>
                <input type="number" step="0.01" name="current_value" oninput="onMfNavOrUnitsChange('current_value')" required value="\${existing ? existing.current_value : ''}" placeholder="58500" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Step-Up Share (%)</label>
                <input type="number" step="0.5" min="0" max="100" name="step_up_pct" oninput="syncModalStepUpSlider(this.value, false)" value="\${existing ? (existing.step_up_pct || 0) : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
              <div class="flex justify-between text-[11px]">
                <span class="text-slate-400">Drag to Adjust Step-Up Allocation Share:</span>
                <span class="font-mono text-indigo-300">0% – 100%</span>
              </div>
              <div class="relative h-3 flex items-center select-none">
                <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                  <div id="modal-stepup-bar" class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" style="width: \${existing ? Math.min(100, Number(existing.step_up_pct || 0)) : 0}%;"></div>
                </div>
                <input type="range" id="modal-stepup-slider" min="0" max="100" step="0.5" value="\${existing ? (existing.step_up_pct || 0) : 0}" oninput="syncModalStepUpSlider(this.value, true)" class="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10">
                <div id="modal-stepup-thumb" class="pointer-events-none absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow -ml-2" style="left: \${existing ? Math.min(100, Number(existing.step_up_pct || 0)) : 0}%;"></div>
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">Auto-Calculated Unrealized Return:</span>
              <div class="font-mono font-bold text-emerald-400 flex items-center gap-3">
                <span id="mf-auto-gain">₹0.00</span>
                <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800" id="mf-auto-pct">0.00%</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Holding</button>
            </div>
          </form>
        \`;
        updateMfPreview();
      } else if (category === "fd") {
        const existing = editId ? (window.TRACKER_DATA.fixed_deposits || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Fixed Deposit (FD)" : "New Fixed Deposit (FD)";
        const bankDropdown = renderCustomDropdown("fd-bank", "bank", [
          { label: "State Bank of India (SBI)", value: "SBI" },
          { label: "HDFC Bank", value: "HDFC" },
          { label: "Punjab National Bank (PNB)", value: "PNB" },
          { label: "ICICI Bank", value: "ICICI" },
          { label: "Axis Bank", value: "Axis Bank" },
          { label: "Kotak Mahindra Bank", value: "Kotak" }
        ], existing ? existing.bank : "SBI");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'fd', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Institution / Bank</label>
                \${bankDropdown}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Account / Deposit Ref No</label>
                <input type="text" name="fd_no" required value="\${existing ? existing.fd_no : ''}" placeholder="e.g. FD-455888986" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Principal Amount (₹)</label>
                <input type="number" name="principal" oninput="updateFdPreview(true)" required value="\${existing ? existing.principal : ''}" placeholder="250000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Annual Rate (%)</label>
                <input type="number" step="0.01" name="rate" oninput="updateFdPreview(true)" required value="\${existing ? existing.rate : 7.10}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-cyan-300 mb-1">Maturity Value (₹)</label>
                <input type="number" step="1" name="maturity_amount" oninput="updateFdPreview(false)" required value="\${existing && existing.maturity_amount ? existing.maturity_amount : ''}" placeholder="Auto" class="w-full rounded-xl bg-slate-800 border border-cyan-500/40 px-3 py-2 text-cyan-300 text-xs font-mono font-bold">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                \${renderCustomDatePicker("fd-start", "start_date", existing ? existing.start_date : "2026-01-01", "updateFdPreview")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Maturity Date</label>
                \${renderCustomDatePicker("fd-mat", "maturity_date", existing ? existing.maturity_date : "2027-01-01", "updateFdPreview")}
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 text-xs">
              <div class="flex justify-between"><span class="text-slate-400">Auto-Calculated Tenure:</span><span id="fd-auto-dur" class="font-mono text-white font-semibold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Compounded Maturity Value:</span><span id="fd-auto-mat" class="font-mono text-cyan-400 font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Guaranteed Interest Gain:</span><span id="fd-auto-gain" class="font-mono text-emerald-400 font-bold">—</span></div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Deposit</button>
            </div>
          </form>
        \`;
        updateFdPreview(!existing || !existing.maturity_amount);
      } else if (category === "rd") {
        const existing = editId ? (window.TRACKER_DATA.recurring_deposits || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Recurring Deposit (RD)" : "New Recurring Deposit (RD)";
        const bankDropdown = renderCustomDropdown("rd-bank", "bank", [
          { label: "HDFC Bank", value: "HDFC" },
          { label: "State Bank of India (SBI)", value: "SBI" },
          { label: "ICICI Bank", value: "ICICI" },
          { label: "Punjab National Bank (PNB)", value: "PNB" }
        ], existing ? existing.bank : "HDFC");
        const purposeDropdown = renderCustomDropdown("rd-purpose", "purpose", [
          { label: "Travel & Leisure", value: "Travel" },
          { label: "Sister college fees / Education", value: "Sister college fees" },
          { label: "Wealth Accumulation", value: "Wealth Accumulation" },
          { label: "Emergency Reserve", value: "Emergency Fund" }
        ], existing ? existing.purpose : "Travel");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'rd', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Institution</label>
                \${bankDropdown}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Account No</label>
                <input type="text" name="rd_no" required value="\${existing ? existing.rd_no : ''}" placeholder="RD-50400362" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Target Goal</label>
                \${purposeDropdown}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Monthly Installment (₹)</label>
                <input type="number" name="monthly_amount" oninput="updateRdPreview(true)" required value="\${existing ? existing.monthly_amount : 10000}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Annual Rate (%)</label>
                <input type="number" step="0.01" name="rate" oninput="updateRdPreview(true)" required value="\${existing ? existing.rate : 7.00}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-indigo-300 mb-1">Maturity Value (₹)</label>
                <input type="number" step="1" name="maturity_amount" oninput="updateRdPreview(false)" required value="\${existing && existing.maturity_amount ? existing.maturity_amount : ''}" placeholder="Auto" class="w-full rounded-xl bg-slate-800 border border-indigo-500/40 px-3 py-2 text-indigo-300 text-xs font-mono font-bold">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                \${renderCustomDatePicker("rd-start", "start_date", existing ? existing.start_date : "2026-01-01", "updateRdPreview")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Maturity Date</label>
                \${renderCustomDatePicker("rd-end", "end_date", existing ? existing.end_date : "2027-01-01", "updateRdPreview")}
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 text-xs">
              <div class="flex justify-between"><span class="text-slate-400">Auto-Calculated Tenure:</span><span id="rd-auto-dur" class="font-mono text-white font-semibold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Total Capital Deposited:</span><span id="rd-auto-tot" class="font-mono text-white font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Compounded Maturity Value:</span><span id="rd-auto-mat" class="font-mono text-cyan-400 font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Interest Gain:</span><span id="rd-auto-gain" class="font-mono text-emerald-400 font-bold">—</span></div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save RD</button>
            </div>
          </form>
        \`;
        updateRdPreview(!existing || !existing.maturity_amount);
      } else if (category === "flexi_rd") {
        const existing = editId ? (window.TRACKER_DATA.flexi_rds || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Flexible Recurring Deposit (Flexi RD)" : "New Flexible Recurring Deposit (Flexi RD)";
        const bankDropdown = renderCustomDropdown("frd-bank", "bank", [
          { label: "ICICI Bank (iWish Flexi RD)", value: "ICICI" },
          { label: "State Bank of India (SBI Flexi Deposit)", value: "SBI" },
          { label: "HDFC Bank", value: "HDFC" },
          { label: "Axis Bank", value: "Axis Bank" },
          { label: "Kotak Mahindra Bank", value: "Kotak" },
          { label: "Punjab National Bank (PNB)", value: "PNB" }
        ], existing ? existing.bank : "ICICI");
        const purposeDropdown = renderCustomDropdown("frd-purpose", "purpose", [
          { label: "Flexible Goal / Surplus Parking", value: "Flexible Goal" },
          { label: "Travel & Vacation Fund", value: "Travel" },
          { label: "Emergency Buffer / Contingency", value: "Emergency Fund" },
          { label: "Festival / Annual Expense", value: "Annual Expense" },
          { label: "Wealth Accumulation", value: "Wealth Accumulation" }
        ], existing ? (existing.purpose || "Flexible Goal") : "Flexible Goal");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'flexi_rd', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Institution / Bank</label>
                \${bankDropdown}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Flexi RD Account No</label>
                <input type="text" name="rd_no" required value="\${existing ? existing.rd_no : ''}" placeholder="e.g. FLEXI-982341" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Target Goal / Purpose</label>
                \${purposeDropdown}
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Base Monthly (₹)</label>
                <input type="number" name="base_monthly" oninput="updateFlexiRdPreview(true, true)" required value="\${existing ? existing.base_monthly : 5000}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-emerald-300 mb-1">Total Deposited (₹)</label>
                <input type="number" name="total_deposited" oninput="updateFlexiRdPreview(true, false)" required value="\${existing && existing.total_deposited ? existing.total_deposited : ''}" placeholder="Variable Total" class="w-full rounded-xl bg-slate-800 border border-emerald-500/40 px-3 py-2 text-emerald-300 text-xs font-mono font-bold">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Interest Rate (%)</label>
                <input type="number" step="0.01" name="rate" oninput="updateFlexiRdPreview(true, false)" required value="\${existing ? existing.rate : 7.00}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-cyan-300 mb-1">Maturity Value (₹)</label>
                <input type="number" step="1" name="maturity_amount" oninput="updateFlexiRdPreview(false, false)" required value="\${existing && existing.maturity_amount ? existing.maturity_amount : ''}" placeholder="Auto" class="w-full rounded-xl bg-slate-800 border border-cyan-500/40 px-3 py-2 text-cyan-300 text-xs font-mono font-bold">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                \${renderCustomDatePicker("frd-start", "start_date", existing ? existing.start_date : "2026-01-01", "updateFlexiRdPreview")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Maturity Date</label>
                \${renderCustomDatePicker("frd-end", "end_date", existing ? existing.end_date : "2027-01-01", "updateFlexiRdPreview")}
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1.5 text-xs">
              <div class="flex justify-between"><span class="text-slate-400">Auto-Calculated Tenure:</span><span id="frd-auto-dur" class="font-mono text-white font-semibold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Total Flexible Capital Deposited:</span><span id="frd-auto-tot" class="font-mono text-white font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Expected Maturity Value:</span><span id="frd-auto-mat" class="font-mono text-cyan-400 font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Estimated Interest Gain:</span><span id="frd-auto-gain" class="font-mono text-emerald-400 font-bold">—</span></div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500">Save Flexi RD</button>
            </div>
          </form>
        \`;
        updateFlexiRdPreview(!existing || !existing.maturity_amount, !existing || !existing.total_deposited);
      } else if (category === "ppf_entry") {
        const existing = editId ? (window.TRACKER_DATA.ppf.contributions || []).find(x => x.id === editId) : null;
        window.CURRENT_PPF_EDIT_ID = editId || null;
        title.textContent = existing ? "Edit Individual PPF Entry" : "Record PPF Contribution (Clubbed by FY)";
        const initialDate = existing ? existing.date : "2026-11-07";
        const initialFy = clientNormalizeFy(initialDate, existing ? existing.fy : "");
        const fyOptions = [];
        for (let y = 2018; y <= 2030; y++) {
          const fyVal = y + " - " + (y + 1);
          fyOptions.push({ label: "FY " + fyVal + " (Apr " + y + " – Mar " + (y + 1) + ")", value: fyVal });
        }
        const fyDropdown = renderCustomDropdown("ppf-fy", "fy", fyOptions, initialFy, "updatePpfPreview");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'ppf_entry', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Transaction Date (Auto-selects FY)</label>
                \${renderCustomDatePicker("ppf-date", "date", initialDate, "onPpfDateChange")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Financial Year (Clubbed Group)</label>
                \${fyDropdown}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Individual Entry Amount (₹)</label>
                <input type="number" step="0.01" name="amount" oninput="updatePpfPreview()" required value="\${existing ? existing.amount : ''}" placeholder="e.g. 50000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Individual Entry Note</label>
                <input type="text" name="note" value="\${existing ? (existing.note || '') : ''}" placeholder="e.g. Installment 2 / Top-up" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Current PPF Corpus (₹)</label>
                <input type="number" step="0.01" name="current_balance" oninput="updatePpfPreview()" required value="\${window.TRACKER_DATA.ppf.current_balance || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1.5 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-400">Other Entries in <strong id="ppf-auto-fy-label" class="text-slate-200">\${initialFy}</strong>:</span>
                <span id="ppf-auto-other" class="font-mono text-slate-300">₹0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Clubbed Financial Year Total:</span>
                <span id="ppf-auto-clubbed" class="font-mono font-bold text-white">₹0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Lesser than ₹1.5L limit (this FY):</span>
                <span id="ppf-auto-outstanding" class="font-mono font-bold text-amber-400">₹1,50,000</span>
              </div>
              <div class="flex justify-between pt-1 border-t border-slate-800/80">
                <span class="text-slate-400">Statutory Rate & Corpus:</span>
                <span id="ppf-auto-rate" class="font-mono font-bold text-emerald-400">7.10% p.a. Sovereign EEE</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Entry</button>
            </div>
          </form>
        \`;
        updatePpfPreview();
      } else if (category === "epf_entry") {
        const existing = editId ? (window.TRACKER_DATA.epf.entries || []).find(x => x.id === editId) : null;
        const currentUan = (existing && existing.uan) || (window.TRACKER_DATA.epf && window.TRACKER_DATA.epf.uan) || "";
        title.textContent = existing ? "Edit EPF Passbook Entry" : "Record EPF Contribution (Any Date)";
        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'epf_entry', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">UAN (Universal Account No)</label>
                <input type="text" maxlength="12" name="uan" value="\${currentUan}" placeholder="e.g. 100982341209" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Transaction Date</label>
                \${renderCustomDatePicker("epf-date", "date", existing ? existing.date : "2026-11-07")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Particulars / Month</label>
                <input type="text" name="description" value="\${existing ? (existing.description || '') : ''}" placeholder="e.g. Monthly Salary Contribution" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Employee Share (₹)</label>
                <input type="number" step="0.01" name="employee" required value="\${existing ? existing.employee : ''}" placeholder="15000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Employer Share (₹)</label>
                <input type="number" step="0.01" name="employer" value="\${existing ? (existing.employer || 0) : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Interest Credited (₹)</label>
                <input type="number" step="0.01" name="interest" value="\${existing ? (existing.interest || 0) : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs">
              <span class="text-slate-400">Auto-Fetched EPFO Statutory Interest Rate:</span>
              <span class="font-mono font-bold text-emerald-400">8.25% p.a. (Employee + Employer Pool)</span>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Entry</button>
            </div>
          </form>
        \`;
      } else if (category === "health_insurance" || category === "life_insurance" || category === "vehicle_insurance" || category === "home_loan_insurance") {
        const isHealth = category === "health_insurance";
        const isLife = category === "life_insurance";
        const isVehicle = category === "vehicle_insurance";
        const isHomeLoanIns = category === "home_loan_insurance";
        const list = (window.TRACKER_DATA[category] || []);
        const existing = editId ? list.find(x => x.id === editId) : null;
        const labelMap = {
          health_insurance: "Health Insurance Policy",
          life_insurance: "Life Insurance Policy",
          vehicle_insurance: "Vehicle / Motor Insurance Policy",
          home_loan_insurance: "Home Loan / Property Insurance Policy"
        };
        title.textContent = (existing ? "Edit " : "Register ") + labelMap[category];
        const typeOptions = isHealth ? [
          { label: "Individual Shield", value: "Individual" },
          { label: "Family Floater", value: "Family" },
          { label: "Spouse & Self", value: "Me, Spouse" },
          { label: "Senior Citizen / Parents", value: "Parents" }
        ] : isLife ? [
          { label: "Pure Term Life Plan", value: "Pure Term Plan" },
          { label: "Whole Life Cover", value: "Whole Life" },
          { label: "Endowment Plan", value: "Endowment" }
        ] : isVehicle ? [
          { label: "Comprehensive (OD + TP)", value: "Comprehensive" },
          { label: "Zero Depreciation (Bumper-to-Bumper)", value: "Zero Dep" },
          { label: "Standalone Own Damage (OD)", value: "Standalone OD" },
          { label: "Third-Party Liability Only (TP)", value: "Third-Party" }
        ] : [
          { label: "Reducing Balance Loan Cover (MRTA)", value: "Loan Protection" },
          { label: "Level Credit Life Cover", value: "Credit Life Cover" },
          { label: "Home Structure & Fire Insurance", value: "Property Shield" },
          { label: "Bundled Loan + Property Shield", value: "Loan + Property" }
        ];
        const defaultType = typeOptions[0].value;
        const typeDropdown = renderCustomDropdown("ins-type", "policy_type", typeOptions, existing ? existing.policy_type : defaultType);
        const extraRefField = (isVehicle || isHomeLoanIns) ? \`
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">\${isVehicle ? "Vehicle Model & Registration No" : "Linked Loan Account / Property"}</label>
              <input type="text" name="asset_ref" required value="\${existing ? (existing.asset_ref || '') : ''}" placeholder="\${isVehicle ? 'e.g. WB-02-AB-1234 • Hyundai Creta' : 'e.g. SBI Home Loan • Flat 4B'}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
            </div>
        \` : "";

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, '\${category}', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Insurance Provider</label>
                <input type="text" name="insurer" required value="\${existing ? existing.insurer : ''}" placeholder="\${isVehicle ? 'e.g. ICICI Lombard / Tata AIG' : (isHomeLoanIns ? 'e.g. SBI Life / HDFC Life' : 'e.g. HDFC ERGO / Aditya Birla')}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Plan Name</label>
                <input type="text" name="policy_name" required value="\${existing ? existing.policy_name : ''}" placeholder="\${isVehicle ? 'e.g. Private Car Package Policy' : (isHomeLoanIns ? 'e.g. RinnRaksha Home Loan Cover' : 'e.g. Optima Secure')}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            \${extraRefField}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Coverage Type</label>
                \${typeDropdown}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Policy Number</label>
                <input type="text" name="policy_no" value="\${existing ? (existing.policy_no || '') : ''}" placeholder="e.g. POL-8829102" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">\${isVehicle ? "Registered Owner" : (isHomeLoanIns ? "Insured Borrower" : "Insured Members")}</label>
                <input type="text" name="insured_person" required value="\${existing ? existing.insured_person : ''}" placeholder="\${isVehicle ? 'Owner name' : 'Names of covered members'}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Nominee</label>
                <input type="text" name="nominee_person" required value="\${existing ? existing.nominee_person : ''}" placeholder="Nominee name" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">\${isVehicle ? "IDV / Sum Insured (₹)" : (isHomeLoanIns ? "Loan Cover Assured (₹)" : "Sum Assured (₹)")}</label>
                <input type="number" name="sum_insured" required value="\${existing ? existing.sum_insured : (isVehicle ? 800000 : (isHomeLoanIns ? 4000000 : 1000000))}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">\${isHomeLoanIns ? "Premium Paid (₹)" : "Annual Premium (₹)"}</label>
                <input type="number" name="annual_premium" required value="\${existing ? existing.annual_premium : ''}" placeholder="18500" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Policy Start Date</label>
                \${renderCustomDatePicker("ins-start", "start_date", existing ? existing.start_date : "2026-01-01")}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Renewal / Expiry Date</label>
                \${renderCustomDatePicker("ins-end", "end_date", existing ? existing.end_date : "2027-01-01", "updateInsPreview")}
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between text-xs">
              <span class="text-slate-400">Auto-Calculated Countdown & Status:</span>
              <div class="font-mono font-bold flex items-center gap-2">
                <span id="ins-auto-days" class="text-white">—</span>
                <span id="ins-auto-status" class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">ACTIVE</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Policy</button>
            </div>
          </form>
        \`;
        updateInsPreview();
      } else if (category === "home_loan") {
        const hl = window.TRACKER_DATA.home_loan || {};
        title.textContent = "Configure Mortgage / Home Loan";
        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'home_loan', null)" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Outstanding Principal (₹)</label>
                <input type="number" step="1" name="outstanding_principal" oninput="updateLoanPreview()" required value="\${hl.outstanding_principal || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Monthly EMI (₹)</label>
                <input type="number" step="1" name="monthly_emi" required value="\${hl.monthly_emi || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Sanctioned Loan Amount (₹)</label>
                <input type="number" step="1" name="original_loan_amount" oninput="updateLoanPreview()" required value="\${hl.original_loan_amount || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Disbursement Date</label>
                \${renderCustomDatePicker("hl-start", "loan_start_date", hl.loan_start_date || "2025-04-05")}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Tenure (Years)</label>
                <input type="number" step="1" name="tenure_years" oninput="updateLoanPreview()" required value="\${hl.tenure_years || 30}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                <input type="number" step="0.01" name="interest_rate" oninput="updateLoanPreview()" required value="\${hl.interest_rate || 7.45}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">EMI Day of Month</label>
                <input type="number" min="1" max="31" name="emi_day" required value="\${hl.emi_day || 26}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1.5 text-xs">
              <div class="flex justify-between"><span class="text-slate-400">Auto-Calculated Standard EMI:</span><span id="hl-auto-emi" class="font-mono text-cyan-400 font-bold">—</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Auto-Calculated Principal Repaid:</span><span id="hl-auto-repaid" class="font-mono text-emerald-400 font-bold">—</span></div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Loan</button>
            </div>
          </form>
        \`;
        updateLoanPreview();
      } else if (category === "ulip") {
        const u = window.TRACKER_DATA.ulip || {};
        title.textContent = "Configure ULIP Holding";
        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'ulip', null)" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Total Premiums Paid (₹)</label>
                <input type="number" step="0.01" name="total_paid" required value="\${u.total_paid || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Current Fund Value (₹)</label>
                <input type="number" step="0.01" name="current_value" required value="\${u.current_value || 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs">
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save ULIP</button>
            </div>
          </form>
        \`;
      } else if (category === "bank_account") {
        const existing = editId ? (window.TRACKER_DATA.bank_accounts || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Bank Account" : "Add Bank Account";
        const typeDropdown = renderCustomDropdown("bank-type", "account_type", [
          { label: "Savings Account", value: "Savings" },
          { label: "Salary Account", value: "Salary" },
          { label: "Current Account", value: "Current" },
          { label: "NRE / NRO Account", value: "NRE / NRO" },
          { label: "Sweep-In / Treasury Account", value: "Treasury" }
        ], existing ? existing.account_type : "Savings");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'bank_account', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Bank / Institution Name</label>
                <input type="text" name="bank_name" required value="\${existing ? existing.bank_name : ''}" placeholder="e.g. HDFC Bank / SBI / ICICI" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Account Type</label>
                \${typeDropdown}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Account Number / Masked Ref</label>
                <input type="text" name="account_no" required value="\${existing ? existing.account_no : ''}" placeholder="e.g. 501004829102" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Branch / IFSC Code</label>
                <input type="text" name="branch_ifsc" value="\${existing ? (existing.branch_ifsc || '') : ''}" placeholder="e.g. HDFC0001234 • Kolkata" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Account Holder Name</label>
                <input type="text" name="holder_name" required value="\${existing ? (existing.holder_name || '') : ''}" placeholder="e.g. Sayan Sinha" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Current Balance (₹)</label>
                <input type="number" step="0.01" name="current_balance" oninput="updateBankPreview()" required value="\${existing ? existing.current_balance : ''}" placeholder="150000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                <input type="number" step="0.01" name="interest_rate" oninput="updateBankPreview()" value="\${existing ? existing.interest_rate : 3.00}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Nominee</label>
                <input type="text" name="nominee" value="\${existing ? (existing.nominee || '') : ''}" placeholder="e.g. Sangita Sinha / Spouse" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Purpose of the Account</label>
                <input type="text" name="purpose" value="\${existing ? (existing.purpose || '') : ''}" placeholder="e.g. Primary Salary & SIP Auto-Debit" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Notes</label>
              <input type="text" name="notes" value="\${existing ? (existing.notes || existing.nominee_notes || '') : ''}" placeholder="e.g. Netbanking enabled, zero-balance salary account, linked to Demat" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between text-xs">
              <span class="text-slate-400">Auto-Calculated Annual Savings Interest:</span>
              <span id="bank-auto-interest" class="font-mono font-bold text-emerald-400">+₹0/yr</span>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500">Save Bank Account</button>
            </div>
          </form>
        \`;
        updateBankPreview();
      } else if (category === "credit_card") {
        const existing = editId ? (window.TRACKER_DATA.credit_cards || []).find(x => x.id === editId) : null;
        title.textContent = existing ? "Edit Credit Card & Limit" : "Add Credit Card & Limit";
        const netDropdown = renderCustomDropdown("cc-net", "network", [
          { label: "Visa", value: "Visa" },
          { label: "Mastercard", value: "Mastercard" },
          { label: "RuPay", value: "RuPay" },
          { label: "American Express (Amex)", value: "Amex" },
          { label: "Diners Club", value: "Diners Club" }
        ], existing ? existing.network : "Visa");

        body.innerHTML = \`
          <form id="modal-form" onsubmit="submitForm(event, 'credit_card', \${editId || 'null'})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Issuing Bank</label>
                <input type="text" name="bank_name" required value="\${existing ? existing.bank_name : ''}" placeholder="e.g. HDFC Bank / ICICI / SBI Card" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Card Name / Variant</label>
                <input type="text" name="card_name" required value="\${existing ? existing.card_name : ''}" placeholder="e.g. Regalia Gold / Infinia / Amazon Pay" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-xs font-medium text-slate-300 mb-1">Card Network</label>
                \${netDropdown}
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Last 4 Digits</label>
                <input type="text" maxlength="4" name="last4" value="\${existing ? (existing.last4 || '') : ''}" placeholder="4821" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Billing Day (1-31)</label>
                <input type="number" min="1" max="31" name="billing_day" required value="\${existing ? existing.billing_day : 12}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Payment Due Day</label>
                <input type="number" min="1" max="31" name="due_day" required value="\${existing ? existing.due_day : 2}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Total Credit Limit (₹)</label>
                <input type="number" step="1" name="credit_limit" oninput="updateCardPreview()" required value="\${existing ? existing.credit_limit : ''}" placeholder="500000" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Current Utilized / Billed (₹)</label>
                <input type="number" step="0.01" name="utilized_amount" oninput="updateCardPreview()" required value="\${existing ? existing.utilized_amount : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Reward Points Balance</label>
                <input type="number" step="1" name="reward_points" value="\${existing ? (existing.reward_points || 0) : 0}" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Annual Fee / Waiver / Associated Details</label>
              <input type="text" name="annual_fee_notes" value="\${existing ? (existing.annual_fee_notes || '') : ''}" placeholder="e.g. LTF (Lifetime Free) • Lounge Access 4/qtr" class="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-white text-xs">
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between text-xs">
              <span class="text-slate-400">Auto-Calculated Available Limit & Utilization:</span>
              <div class="font-mono font-bold flex items-center gap-3">
                <span id="cc-auto-avail" class="text-emerald-400">₹0.00</span>
                <span id="cc-auto-pct" class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">0.0% Utilized</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">Save Credit Card</button>
            </div>
          </form>
        \`;
        updateCardPreview();
      }
      window.INITIAL_MODAL_SNAPSHOT = serializeModalForm();
    }

    function serializeModalForm() {
      const form = document.getElementById("modal-form");
      if (!form) return "";
      const entries = [];
      const fd = new FormData(form);
      fd.forEach((val, key) => entries.push(key + "=" + String(val)));
      return entries.join("&");
    }

    function isModalFormDirty() {
      const current = serializeModalForm();
      return current !== (window.INITIAL_MODAL_SNAPSHOT || "");
    }

    function closeModal(force = false) {
      if (force || !isModalFormDirty()) {
        const cancelModal = document.getElementById("cancel-confirm-container");
        if (cancelModal) cancelModal.classList.add("hidden");
        document.getElementById("modal-container").classList.add("hidden");
        return;
      }
      const cancelModal = document.getElementById("cancel-confirm-container");
      const cancelCard = document.getElementById("cancel-confirm-card");
      if (cancelModal) {
        cancelModal.classList.remove("hidden");
        if (window.Motion && cancelCard) {
          Motion.animate(
            cancelCard,
            { opacity: [0, 1], transform: ["scale(0.95) translateY(8px)", "scale(1) translateY(0px)"] },
            { duration: 0.18, easing: "ease-out" }
          );
        }
      } else {
        document.getElementById("modal-container").classList.add("hidden");
      }
    }

    function keepEditingModal() {
      const cancelModal = document.getElementById("cancel-confirm-container");
      if (cancelModal) cancelModal.classList.add("hidden");
    }

    function confirmDiscardModal() {
      closeModal(true);
    }

    async function submitForm(e, type, editId) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const payload = { type, editId };
      formData.forEach((val, key) => payload[key] = val);

      await fetch('/api/save_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("Saved! Portfolio metrics recalculated.", "success");
      closeModal(true);
      setTimeout(() => location.reload(), 300);
    }

    window.PENDING_DELETE = null;

    function deleteItem(type, id, label = "") {
      window.PENDING_DELETE = { type, id };
      const container = document.getElementById("confirm-container");
      const card = document.getElementById("confirm-card");
      const msg = document.getElementById("confirm-message");
      msg.textContent = label
        ? \`Are you sure you want to remove "\${label}"? All portfolio totals and net worth metrics will automatically recalculate.\`
        : "Are you sure you want to remove this entry? All portfolio totals and net worth metrics will automatically recalculate.";
      container.classList.remove("hidden");
      if (window.Motion && card) {
        Motion.animate(card, { opacity: [0, 1], transform: ["scale(0.95) translateY(8px)", "scale(1) translateY(0px)"] }, { duration: 0.18, easing: "ease-out" });
      }
    }

    function closeConfirmModal() {
      window.PENDING_DELETE = null;
      document.getElementById("confirm-container").classList.add("hidden");
    }

    async function confirmDeleteAction() {
      if (!window.PENDING_DELETE) return;
      const { type, id } = window.PENDING_DELETE;
      closeConfirmModal();
      await fetch('/api/delete_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      showToast("Entry removed and portfolio recalculated.", "info");
      setTimeout(() => location.reload(), 250);
    }

    async function clearAllData() {
      if (!confirm("Restore default prefilled portfolio data?")) return;
      await fetch('/api/clear_data', { method: 'POST' });
      showToast("Default portfolio data restored.", "info");
      setTimeout(() => location.reload(), 300);
    }

    function showToast(message, type = "success") {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.className = "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold transition-all duration-300 " +
        (type === "success" ? "bg-indigo-950/95 text-indigo-200 border border-indigo-700" : "bg-slate-900/95 text-slate-200 border border-slate-700");
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
      setTimeout(() => {
        toast.style.transform = "translateY(6rem)";
        toast.style.opacity = "0";
      }, 3000);
    }
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const data = loadData();
  const ov = calculateOverview(data);

  if (pathname === "/api/export_excel") {
    const xls = buildExcelWorkbook(data, ov);
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="WealthFlow_Complete_Portfolio.xls"'
    });
    return res.end(xls);
  }

  if (pathname === "/api/export_csv") {
    const csv = buildCompleteCsv(data, ov);
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="WealthFlow_Complete_Portfolio.csv"'
    });
    return res.end(csv);
  }

      if (req.method === "POST" && pathname === "/api/clear_data") {
    saveData(JSON.parse(JSON.stringify(emptyPortfolioData)));
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true }));
  }

  if (pathname === "/api/statutory_rates") {
    data.ppf.interest_rate = STATUTORY_RETIREMENT_RATES.ppf.rate;
    data.epf.interest_rate = STATUTORY_RETIREMENT_RATES.epf.rate;
    saveData(data);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(STATUTORY_RETIREMENT_RATES));
  }

  if (pathname === "/api/mf_search") {
    const q = String(parsedUrl.query.q || "").toLowerCase();
    const matches = Object.entries(DEFAULT_AMFI_SCHEMES)
      .filter(([k, v]) => k.toLowerCase().includes(q) || v.official_name.toLowerCase().includes(q) || v.scheme_code.includes(q))
      .map(([, v]) => ({ schemeCode: v.scheme_code, schemeName: v.official_name }));
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(matches));
  }

  if (pathname === "/api/mf_nav") {
    const code = String(parsedUrl.query.code || "");
    fetchSchemeNavByCode(code).then(result => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result || { error: "Not found" }));
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/save_step_up") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { id, step_up_pct } = JSON.parse(body || "{}");
        const mf = (data.mutual_funds || []).find(x => x.id === Number(id));
        if (mf) {
          mf.step_up_pct = Math.max(0, Math.min(100, parseFloat(step_up_pct) || 0));
          saveData(data);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/sync_navs") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { updates } = JSON.parse(body || "{}");
        (updates || []).forEach(u => {
          const mf = (data.mutual_funds || []).find(x => x.id === Number(u.id));
          if (mf && u.latest_nav > 0) {
            const oldNav = Number(mf.latest_nav) || 0;
            if (!mf.units && oldNav > 0 && mf.current_value > 0) {
              mf.units = Number((mf.current_value / oldNav).toFixed(4));
            } else if (!mf.units && mf.current_value > 0) {
              mf.units = Number((mf.current_value / u.latest_nav).toFixed(4));
            }
            mf.latest_nav = Number(u.latest_nav);
            mf.nav_date = u.nav_date || mf.nav_date;
            if (mf.units > 0) {
              mf.current_value = Number((mf.units * mf.latest_nav).toFixed(2));
            }
          }
        });
        saveData(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/save_item") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const p = JSON.parse(body);
        const editId = p.editId ? Number(p.editId) : null;

        if (p.type === "mutual_fund") {
          const nav = parseFloat(p.latest_nav) || 0;
          const curVal = parseFloat(p.current_value) || 0;
          const units = parseFloat(p.units) || (nav > 0 && curVal > 0 ? Number((curVal / nav).toFixed(4)) : 0);
          const item = {
            id: editId || Date.now(),
            scheme_name: p.scheme_name,
            scheme_code: p.scheme_code || "",
            latest_nav: nav,
            nav_date: p.nav_date || "",
            units,
            category: p.category,
            amc: p.amc || "",
            sip_amount: parseFloat(p.sip_amount) || 0,
            start_date: p.start_date,
            current_value: curVal,
            invested_amount: parseFloat(p.invested_amount) || 0,
            step_up_pct: parseFloat(p.step_up_pct) || 0
          };
          if (editId) {
            const idx = data.mutual_funds.findIndex(x => x.id === editId);
            if (idx >= 0) data.mutual_funds[idx] = item;
          } else {
            data.mutual_funds.push(item);
          }
        } else if (p.type === "fd") {
          const item = {
            id: editId || Date.now(),
            bank: p.bank,
            fd_no: p.fd_no,
            principal: parseFloat(p.principal) || 0,
            rate: parseFloat(p.rate) || 0,
            start_date: p.start_date,
            maturity_date: p.maturity_date,
            maturity_amount: parseFloat(p.maturity_amount) || 0
          };
          if (editId) {
            const idx = data.fixed_deposits.findIndex(x => x.id === editId);
            if (idx >= 0) data.fixed_deposits[idx] = item;
          } else {
            data.fixed_deposits.push(item);
          }
        } else if (p.type === "rd") {
          const item = {
            id: editId || Date.now(),
            bank: p.bank,
            rd_no: p.rd_no,
            purpose: p.purpose,
            monthly_amount: parseFloat(p.monthly_amount) || 0,
            rate: parseFloat(p.rate) || 0,
            start_date: p.start_date,
            end_date: p.end_date,
            maturity_amount: parseFloat(p.maturity_amount) || 0
          };
          if (editId) {
            const idx = data.recurring_deposits.findIndex(x => x.id === editId);
            if (idx >= 0) data.recurring_deposits[idx] = item;
          } else {
            data.recurring_deposits.push(item);
          }
        } else if (p.type === "flexi_rd") {
          data.flexi_rds = data.flexi_rds || [];
          const item = {
            id: editId || Date.now(),
            bank: p.bank,
            rd_no: p.rd_no,
            purpose: p.purpose || "Flexible Goal",
            base_monthly: parseFloat(p.base_monthly) || 0,
            total_deposited: parseFloat(p.total_deposited) || 0,
            rate: parseFloat(p.rate) || 0,
            start_date: p.start_date,
            end_date: p.end_date,
            maturity_amount: parseFloat(p.maturity_amount) || 0
          };
          if (editId) {
            const idx = data.flexi_rds.findIndex(x => x.id === editId);
            if (idx >= 0) data.flexi_rds[idx] = item;
          } else {
            data.flexi_rds.push(item);
          }
        } else if (p.type === "ppf_entry") {
          const { normalizePpfFy } = require("./packages/core/module");
          const item = {
            id: editId || Date.now(),
            fy: normalizePpfFy(p.date, p.fy),
            date: p.date,
            note: (p.note || "").trim(),
            amount: parseFloat(p.amount) || 0
          };
          if (p.current_balance) {
            data.ppf.current_balance = parseFloat(p.current_balance) || 0;
          }
          data.ppf.last_updated = new Date().toISOString().split("T")[0];
          if (editId) {
            const idx = data.ppf.contributions.findIndex(x => x.id === editId);
            if (idx >= 0) data.ppf.contributions[idx] = item;
          } else {
            data.ppf.contributions.push(item);
          }
        } else if (p.type === "epf_entry") {
          const cleanUan = (p.uan || "").trim();
          if (cleanUan) {
            data.epf.uan = cleanUan;
            data.epf.account_identifier = cleanUan;
          }
          const item = {
            id: editId || Date.now(),
            uan: cleanUan || data.epf.uan || "",
            date: p.date,
            description: p.description || "EPF Contribution",
            employee: parseFloat(p.employee) || 0,
            employer: parseFloat(p.employer) || 0,
            interest: parseFloat(p.interest) || 0
          };
          data.epf.last_updated = new Date().toISOString().split("T")[0];
          if (editId) {
            const idx = data.epf.entries.findIndex(x => x.id === editId);
            if (idx >= 0) data.epf.entries[idx] = item;
          } else {
            data.epf.entries.push(item);
          }
          data.epf.current_balance = data.epf.entries.reduce((s, e) => s + (Number(e.employee) || 0) + (Number(e.employer) || 0) + (Number(e.interest) || 0), 0);
        } else if (p.type === "health_insurance" || p.type === "life_insurance" || p.type === "vehicle_insurance" || p.type === "home_loan_insurance") {
          const listKey = p.type;
          data[listKey] = data[listKey] || [];
          const item = {
            id: editId || Date.now(),
            insurer: p.insurer,
            policy_name: p.policy_name,
            policy_type: p.policy_type,
            asset_ref: p.asset_ref || "",
            insured_person: p.insured_person,
            nominee_person: p.nominee_person,
            sum_insured: parseFloat(p.sum_insured) || 0,
            annual_premium: parseFloat(p.annual_premium) || 0,
            policy_no: p.policy_no || "",
            start_date: p.start_date,
            end_date: p.end_date
          };
          if (editId) {
            const idx = data[listKey].findIndex(x => x.id === editId);
            if (idx >= 0) data[listKey][idx] = item;
          } else {
            data[listKey].push(item);
          }
        } else if (p.type === "home_loan") {
          data.home_loan = {
            outstanding_principal: parseFloat(p.outstanding_principal) || 0,
            monthly_emi: parseFloat(p.monthly_emi) || 0,
            original_loan_amount: parseFloat(p.original_loan_amount) || 0,
            loan_start_date: p.loan_start_date,
            tenure_years: parseFloat(p.tenure_years) || 30,
            interest_rate: parseFloat(p.interest_rate) || 7.45,
            emi_day: parseInt(p.emi_day, 10) || 26
          };
        } else if (p.type === "ulip") {
          data.ulip = {
            policy_name: "Market-Linked ULIP",
            total_paid: parseFloat(p.total_paid) || 0,
            current_value: parseFloat(p.current_value) || 0
          };
        } else if (p.type === "bank_account") {
          data.bank_accounts = data.bank_accounts || [];
          const item = {
            id: editId || Date.now(),
            bank_name: p.bank_name,
            account_type: p.account_type || "Savings",
            account_no: p.account_no || "",
            branch_ifsc: p.branch_ifsc || "",
            holder_name: p.holder_name || "",
            current_balance: parseFloat(p.current_balance) || 0,
            interest_rate: parseFloat(p.interest_rate) || 0,
            nominee: p.nominee || "",
            purpose: p.purpose || "",
            notes: p.notes || "",
            nominee_notes: p.notes || ""
          };
          if (editId) {
            const idx = data.bank_accounts.findIndex(x => x.id === editId);
            if (idx >= 0) data.bank_accounts[idx] = item;
          } else {
            data.bank_accounts.push(item);
          }
        } else if (p.type === "credit_card") {
          data.credit_cards = data.credit_cards || [];
          const item = {
            id: editId || Date.now(),
            bank_name: p.bank_name,
            card_name: p.card_name,
            network: p.network || "Visa",
            last4: p.last4 || "",
            billing_day: parseInt(p.billing_day, 10) || 1,
            due_day: parseInt(p.due_day, 10) || 15,
            credit_limit: parseFloat(p.credit_limit) || 0,
            utilized_amount: parseFloat(p.utilized_amount) || 0,
            reward_points: parseInt(p.reward_points, 10) || 0,
            annual_fee_notes: p.annual_fee_notes || ""
          };
          if (editId) {
            const idx = data.credit_cards.findIndex(x => x.id === editId);
            if (idx >= 0) data.credit_cards[idx] = item;
          } else {
            data.credit_cards.push(item);
          }
        } else if (p.type === "tax_profile") {
          data.tax_profile = {
            fy: p.fy || "2025-26",
            age_group: p.age_group || "below_60",
            preferred_regime: p.preferred_regime || "auto",
            is_salaried: p.is_salaried !== "false" && p.is_salaried !== false,
            gross_salary: parseFloat(p.gross_salary) || 0,
            interest_income: parseFloat(p.interest_income) || 0,
            rental_income: parseFloat(p.rental_income) || 0,
            other_income: parseFloat(p.other_income) || 0,
            hra_exemption: parseFloat(p.hra_exemption) || 0,
            professional_tax: parseFloat(p.professional_tax) || 0,
            home_loan_interest_24b: parseFloat(p.home_loan_interest_24b) || 0,
            sec_80c: parseFloat(p.sec_80c) || 0,
            sec_80ccd_1b_nps: parseFloat(p.sec_80ccd_1b_nps) || 0,
            sec_80ccd_2_employer_nps: parseFloat(p.sec_80ccd_2_employer_nps) || 0,
            sec_80d_health: parseFloat(p.sec_80d_health) || 0,
            sec_80tta_savings: parseFloat(p.sec_80tta_savings) || 0,
            other_deductions_80e_80g: parseFloat(p.other_deductions_80e_80g) || 0,
            tds_deducted: parseFloat(p.tds_deducted) || 0,
            advance_tax_paid: parseFloat(p.advance_tax_paid) || 0
          };
        }

        saveData(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/delete_item") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { type, id } = JSON.parse(body);
        if (type === "mutual_fund") data.mutual_funds = data.mutual_funds.filter(x => x.id !== id);
        else if (type === "fd") data.fixed_deposits = data.fixed_deposits.filter(x => x.id !== id);
        else if (type === "rd") data.recurring_deposits = data.recurring_deposits.filter(x => x.id !== id);
        else if (type === "flexi_rd") data.flexi_rds = (data.flexi_rds || []).filter(x => x.id !== id);
        else if (type === "ppf_entry") data.ppf.contributions = data.ppf.contributions.filter(x => x.id !== id);
        else if (type === "epf_entry") {
          data.epf.entries = data.epf.entries.filter(x => x.id !== id);
          data.epf.current_balance = data.epf.entries.reduce((s, e) => s + (Number(e.employee) || 0) + (Number(e.employer) || 0) + (Number(e.interest) || 0), 0);
        }
        else if (type === "health_insurance") data.health_insurance = data.health_insurance.filter(x => x.id !== id);
        else if (type === "life_insurance") data.life_insurance = data.life_insurance.filter(x => x.id !== id);
        else if (type === "vehicle_insurance") data.vehicle_insurance = (data.vehicle_insurance || []).filter(x => x.id !== id);
        else if (type === "home_loan_insurance") data.home_loan_insurance = (data.home_loan_insurance || []).filter(x => x.id !== id);
        else if (type === "bank_account") data.bank_accounts = (data.bank_accounts || []).filter(x => x.id !== id);
        else if (type === "credit_card") data.credit_cards = (data.credit_cards || []).filter(x => x.id !== id);
        saveData(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === "/mutual_funds") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Mutual Funds", "mutual_funds", renderMutualFundsPage(data, ov), data));
  }

  if (pathname === "/fixed_income") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Fixed Income", "fixed_income", renderFixedIncomePage(data, ov), data));
  }

  if (pathname === "/retirement") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Retirement Corpus", "retirement", renderRetirementPage(data, ov), data));
  }

  if (pathname === "/insurance") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Insurance Shield", "insurance", renderInsurancePage(data, ov), data));
  }

  if (pathname === "/banking") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Banking & Cards", "banking", renderBankingPage(data, ov), data));
  }

  if (pathname === "/tax_calculator") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderShell("Income Tax & ITR Calculator", "tax_calculator", renderTaxCalculatorPage(data, ov), data));
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(renderShell("Command Center", "dashboard", renderOverviewPage(ov, data), data));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WealthFlow platform running at http://localhost:${PORT}/`);
});
