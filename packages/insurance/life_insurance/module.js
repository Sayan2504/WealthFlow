// packages/insurance/life_insurance/module.js
// Life Insurance & ULIP Package: Adequacy Summary & Modern Protection Shield View
const { formatINR, formatNum, formatDateDMY } = require("../../core/module");
const { renderEditPencilButton, renderRowActionButtons } = require("../../core/components");
const { calculatePolicyStatus } = require("../health_insurance/module");

function summarizeLifeAndUlip(data) {
  let lifeSumInsured = 0;
  let lifeAnnualPremium = 0;
  (data.life_insurance || []).forEach(l => {
    lifeSumInsured += Number(l.sum_insured) || 0;
    lifeAnnualPremium += Number(l.annual_premium) || 0;
  });

  let vehicleIdv = 0;
  let vehiclePremium = 0;
  (data.vehicle_insurance || []).forEach(v => {
    vehicleIdv += Number(v.sum_insured) || 0;
    vehiclePremium += Number(v.annual_premium) || 0;
  });

  let homeLoanInsCover = 0;
  let homeLoanInsPremium = 0;
  (data.home_loan_insurance || []).forEach(h => {
    homeLoanInsCover += Number(h.sum_insured) || 0;
    homeLoanInsPremium += Number(h.annual_premium) || 0;
  });

  const ulipPaid = Number(data.ulip && data.ulip.total_paid) || 0;
  const ulipValue = Number(data.ulip && data.ulip.current_value) || 0;

  return {
    life: { sumInsured: lifeSumInsured, premium: lifeAnnualPremium, count: (data.life_insurance || []).length },
    vehicle: { sumInsured: vehicleIdv, premium: vehiclePremium, count: (data.vehicle_insurance || []).length },
    homeLoanIns: { sumInsured: homeLoanInsCover, premium: homeLoanInsPremium, count: (data.home_loan_insurance || []).length },
    ulip: { paid: ulipPaid, value: ulipValue, gain: ulipValue - ulipPaid }
  };
}

// 1 card => full width, 2 => 50/50, 3+ => thirds (wrapping into new rows)
function policyGridCols(n) {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
}

function renderInsurancePage(data, ov) {
  const veh = ov.vehicle || { sumInsured: 0, premium: 0, count: (data.vehicle_insurance || []).length };
  const hli = ov.homeLoanIns || { sumInsured: 0, premium: 0, count: (data.home_loan_insurance || []).length };
  return `
    <div class="space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a href="/" class="text-xs text-indigo-400 hover:text-indigo-300">← Back to Command Center</a>
          </div>
          <h1 class="text-3xl font-extrabold text-white">Insurance & Risk Protection Shield</h1>
          <p class="text-xs text-slate-400 mt-1">Health, Term Life, Vehicle (Motor), Home Loan Protection, and ULIP policies with automated renewal countdowns</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="openModal('health_insurance')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-600/30 whitespace-nowrap">
            + Add Health Policy
          </button>
          <button onclick="openModal('life_insurance')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 whitespace-nowrap">
            + Add Life Policy
          </button>
          <button onclick="openModal('vehicle_insurance')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 whitespace-nowrap">
            + Add Vehicle Policy
          </button>
          <button onclick="openModal('home_loan_insurance')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/30 whitespace-nowrap">
            + Add Home Loan Insurance
          </button>
        </div>
      </div>

      <!-- KPI Row (5 Cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Health Shield Cover</span>
          <span class="text-2xl font-black text-teal-400 font-mono mt-1 block">${formatINR(ov.health.sumInsured)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block">${ov.health.count} Active • ${formatINR(ov.health.premium)}/yr</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Term Life Cover</span>
          <span class="text-2xl font-black text-white font-mono mt-1 block">${formatINR(ov.life.sumInsured)}</span>
          <span class="text-[11px] text-indigo-400 mt-1 block">${ov.life.count > 0 ? `${ov.life.count} Active • ${formatINR(ov.life.premium)}/yr` : 'Pending — Add policy'}</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Vehicle Cover (IDV)</span>
          <span class="text-2xl font-black text-cyan-400 font-mono mt-1 block">${formatINR(veh.sumInsured)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block">${veh.count > 0 ? `${veh.count} Active • ${formatINR(veh.premium)}/yr` : '0 Vehicle Policies'}</span>
        </div>
        <div class="glass-card p-5 rounded-2xl">
          <span class="text-xs text-slate-400 font-medium uppercase block">Home Loan Protection</span>
          <span class="text-2xl font-black text-amber-400 font-mono mt-1 block">${formatINR(hli.sumInsured)}</span>
          <span class="text-[11px] text-slate-400 mt-1 block">${hli.count > 0 ? `${hli.count} Active • ${formatINR(hli.premium)}/yr` : '0 Loan Cover Policies'}</span>
        </div>
        <div class="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 font-medium uppercase block">ULIP Current Value</span>
            <span class="text-2xl font-black text-purple-400 font-mono mt-1 block">${formatINR(ov.ulip.value, 2)}</span>
            <span class="text-[11px] text-slate-400 mt-1 block">Paid: ${formatINR(ov.ulip.paid, 2)}</span>
          </div>
          ${renderEditPencilButton("ulip", null, "Edit ULIP")}
        </div>
      </div>

      <!-- Health Insurance Policies Grid -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-white">Health Insurance Policies (${(data.health_insurance || []).length})</h3>
          <span class="text-xs text-slate-400">Days to Expiry & Renewal Status auto-calculate from End Date</span>
        </div>

        ${(data.health_insurance && data.health_insurance.length > 0) ? `
          <div class="grid ${policyGridCols((data.health_insurance || []).length)} gap-5 max-h-[460px] overflow-y-auto pr-1 card-scroll">
            ${data.health_insurance.map(pol => {
              const st = calculatePolicyStatus(pol);
              return `
                <div class="glass-card rounded-2xl p-6 border-slate-800 hover:border-teal-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          ${pol.policy_type}
                        </span>
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${st.status === 'OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                          Renewal: ${st.status} (${st.daysToExpiry} days)
                        </span>
                      </div>
                      <h4 class="text-base font-bold text-white">${pol.policy_name}</h4>
                      <p class="text-xs text-slate-400">${pol.insurer} ${pol.policy_no ? `• <span class="font-mono text-slate-300">#${pol.policy_no}</span>` : ''}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-[10px] text-slate-400 uppercase block">Sum Insured</span>
                      <span class="text-lg font-extrabold text-white font-mono">${formatINR(pol.sum_insured)}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs">
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Insured Members</span>
                      <span class="text-slate-200 font-medium">${pol.insured_person}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Nominee</span>
                      <span class="text-slate-200 font-medium">${pol.nominee_person}</span>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400">Premium: </span>
                      <span class="font-mono font-bold text-white">${formatINR(pol.annual_premium)}/yr</span>
                      <span class="text-slate-500 mx-1.5">•</span>
                      <span class="text-slate-400 font-mono">${formatDateDMY(pol.start_date)} → ${formatDateDMY(pol.end_date)}</span>
                    </div>
                    ${renderRowActionButtons("health_insurance", pol.id, pol.policy_name + " (" + pol.insurer + ")")}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="glass-card rounded-2xl p-10 text-center space-y-3 border-dashed border-slate-800">
            <h4 class="text-sm font-bold text-white">No Health Insurance Policies Added Yet</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Add individual, family floater, parental, or corporate health covers to track sum insured and automated renewal countdowns.</p>
            <button onclick="openModal('health_insurance')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500">
              + Add Health Policy
            </button>
          </div>
        `}
      </div>

      <!-- Life Insurance Policies Section -->
      <div class="space-y-4">
        <h3 class="text-base font-bold text-white">Life Insurance Policies (${(data.life_insurance || []).length})</h3>
        ${(data.life_insurance && data.life_insurance.length > 0) ? `
          <div class="grid ${policyGridCols((data.life_insurance || []).length)} gap-5 max-h-[460px] overflow-y-auto pr-1 card-scroll">
            ${data.life_insurance.map(pol => {
              const st = calculatePolicyStatus(pol);
              return `
                <div class="glass-card rounded-2xl p-6 border-slate-800 space-y-4">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${pol.policy_type}</span>
                      <h4 class="text-base font-bold text-white mt-1.5">${pol.policy_name}</h4>
                      <p class="text-xs text-slate-400">${pol.insurer}</p>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] text-slate-400 uppercase block">Sum Assured</span>
                      <span class="text-lg font-extrabold text-white font-mono">${formatINR(pol.sum_insured)}</span>
                    </div>
                  </div>
                  <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span class="font-mono text-slate-300">Premium: ${formatINR(pol.annual_premium)}/yr • ${st.daysToExpiry}d left (${st.status})</span>
                    ${renderRowActionButtons("life_insurance", pol.id, pol.policy_name + " (" + pol.insurer + ")")}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="glass-card rounded-2xl p-10 text-center space-y-3 border-dashed border-slate-800">
            <div class="w-11 h-11 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h4 class="text-sm font-bold text-white">No Term Life Insurance Policies Added Yet</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Add a term life protection policy to monitor sum assured adequacy and policy renewal dates.</p>
            <button onclick="openModal('life_insurance')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500">
              + Register Life Insurance Policy
            </button>
          </div>
        `}
      </div>

      <!-- Vehicle Insurance Policies Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-white">Vehicle / Motor Insurance Policies (${(data.vehicle_insurance || []).length})</h3>
          <span class="text-xs text-slate-400">Car & Two-Wheeler Comprehensive, Zero-Dep, and Third-Party policies</span>
        </div>
        ${(data.vehicle_insurance && data.vehicle_insurance.length > 0) ? `
          <div class="grid ${policyGridCols((data.vehicle_insurance || []).length)} gap-5 max-h-[460px] overflow-y-auto pr-1 card-scroll">
            ${data.vehicle_insurance.map(pol => {
              const st = calculatePolicyStatus(pol);
              return `
                <div class="glass-card rounded-2xl p-6 border-slate-800 hover:border-cyan-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          ${pol.policy_type || "Comprehensive"}
                        </span>
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${st.status === 'OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                          Renewal: ${st.status} (${st.daysToExpiry} days)
                        </span>
                      </div>
                      <h4 class="text-base font-bold text-white">${pol.policy_name}</h4>
                      <p class="text-xs text-slate-400">${pol.insurer} ${pol.policy_no ? `• <span class="font-mono text-slate-300">#${pol.policy_no}</span>` : ''}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-[10px] text-slate-400 uppercase block">IDV / Sum Insured</span>
                      <span class="text-lg font-extrabold text-cyan-300 font-mono">${formatINR(pol.sum_insured)}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs">
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Vehicle / Reg. No</span>
                      <span class="text-slate-200 font-mono font-medium">${pol.asset_ref || "—"}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Owner & Nominee</span>
                      <span class="text-slate-200 font-medium">${pol.insured_person}${pol.nominee_person ? ` • Nominee: ${pol.nominee_person}` : ""}</span>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400">Premium: </span>
                      <span class="font-mono font-bold text-white">${formatINR(pol.annual_premium)}/yr</span>
                      <span class="text-slate-500 mx-1.5">•</span>
                      <span class="text-slate-400 font-mono">${formatDateDMY(pol.start_date)} → ${formatDateDMY(pol.end_date)}</span>
                    </div>
                    ${renderRowActionButtons("vehicle_insurance", pol.id, pol.policy_name + " (" + (pol.asset_ref || pol.insurer) + ")")}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="glass-card rounded-2xl p-8 text-center space-y-3 border-dashed border-slate-800">
            <h4 class="text-sm font-bold text-white">No Vehicle Insurance Policies Added Yet</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Track your Car or Two-Wheeler Comprehensive, Zero-Depreciation, and Third-Party insurance with IDV and expiry alerts.</p>
            <button onclick="openModal('vehicle_insurance')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500">
              + Add Vehicle Insurance Policy
            </button>
          </div>
        `}
      </div>

      <!-- Home Loan Insurance Policies Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-white">Home Loan Protection & Property Insurance (${(data.home_loan_insurance || []).length})</h3>
          <span class="text-xs text-slate-400">Mortgage protection cover (MRTA / Credit Life) & structure/property insurance</span>
        </div>
        ${(data.home_loan_insurance && data.home_loan_insurance.length > 0) ? `
          <div class="grid ${policyGridCols((data.home_loan_insurance || []).length)} gap-5 max-h-[460px] overflow-y-auto pr-1 card-scroll">
            ${data.home_loan_insurance.map(pol => {
              const st = calculatePolicyStatus(pol);
              return `
                <div class="glass-card rounded-2xl p-6 border-slate-800 hover:border-amber-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          ${pol.policy_type || "Loan Protection"}
                        </span>
                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${st.status === 'OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                          Status: ${st.status} (${st.daysToExpiry} days)
                        </span>
                      </div>
                      <h4 class="text-base font-bold text-white">${pol.policy_name}</h4>
                      <p class="text-xs text-slate-400">${pol.insurer} ${pol.policy_no ? `• <span class="font-mono text-slate-300">#${pol.policy_no}</span>` : ''}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="text-[10px] text-slate-400 uppercase block">Loan Cover Assured</span>
                      <span class="text-lg font-extrabold text-amber-300 font-mono">${formatINR(pol.sum_insured)}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs">
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Linked Loan / Property</span>
                      <span class="text-slate-200 font-medium">${pol.asset_ref || "Primary Home Loan"}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-500 uppercase block">Insured Borrower & Nominee</span>
                      <span class="text-slate-200 font-medium">${pol.insured_person}${pol.nominee_person ? ` • Nominee: ${pol.nominee_person}` : ""}</span>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400">Premium: </span>
                      <span class="font-mono font-bold text-white">${formatINR(pol.annual_premium)}</span>
                      <span class="text-slate-500 mx-1.5">•</span>
                      <span class="text-slate-400 font-mono">${formatDateDMY(pol.start_date)} → ${formatDateDMY(pol.end_date)}</span>
                    </div>
                    ${renderRowActionButtons("home_loan_insurance", pol.id, pol.policy_name + " (" + pol.insurer + ")")}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="glass-card rounded-2xl p-8 text-center space-y-3 border-dashed border-slate-800">
            <h4 class="text-sm font-bold text-white">No Home Loan Insurance Policies Added Yet</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Add your Home Loan Protection (Credit Life / MRTA) or Property Structure Insurance policy linked to your mortgage.</p>
            <button onclick="openModal('home_loan_insurance')" class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500">
              + Add Home Loan Insurance
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

module.exports = {
  summarizeLifeAndUlip,
  renderInsurancePage
};
