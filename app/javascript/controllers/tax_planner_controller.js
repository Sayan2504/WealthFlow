import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.abortController = null
    this.reqSeq = 0
    window.__wfStimulusTaxPlannerActive = true
    window.recalcTaxLive = () => this.recalc()
  }

  disconnect() {
    if (this.abortController) this.abortController.abort()
  }

  async recalc() {
    const tbody = document.getElementById("tax-comparison-tbody")
    if (!tbody) return

    const payload = this.readProfile()
    const seq = ++this.reqSeq
    if (this.abortController) this.abortController.abort()
    this.abortController = new AbortController()

    const csrfMeta = document.querySelector('meta[name="csrf-token"]')
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
    if (csrfMeta) headers["X-CSRF-Token"] = csrfMeta.getAttribute("content")

    try {
      const res = await fetch("/api/tax_preview", {
        method: "POST",
        headers,
        body: JSON.stringify({ payload }),
        signal: this.abortController.signal
      })
      if (!res.ok) return
      const json = await res.json()
      if (seq !== this.reqSeq || !json.taxCalc) return
      this.renderResult(json.taxCalc)
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Tax preview error:", err)
      }
    }
  }

  readProfile() {
    const val = (id) => document.getElementById(id)?.value
    return {
      fy: val("tax_fy") || "2025-26",
      age_group: val("tax_age_group") || "below_60",
      preferred_regime: val("tax_preferred_regime") || "auto",
      is_salaried: Boolean(document.getElementById("tax_is_salaried")?.checked),
      gross_salary: Number(val("tax_gross_salary") || 0),
      interest_income: Number(val("tax_interest_income") || 0),
      rental_income: Number(val("tax_rental_income") || 0),
      other_income: Number(val("tax_other_income") || 0),
      hra_exemption: Number(val("tax_hra_exemption") || 0),
      professional_tax: Number(val("tax_professional_tax") || 0),
      home_loan_interest_24b: Number(val("tax_home_loan_interest_24b") || 0),
      sec_80c: Number(val("tax_sec_80c") || 0),
      sec_80ccd_1b_nps: Number(val("tax_sec_80ccd_1b_nps") || 0),
      sec_80ccd_2_employer_nps: Number(val("tax_sec_80ccd_2_employer_nps") || 0),
      sec_80d_health: Number(val("tax_sec_80d_health") || 0),
      sec_80tta_savings: Number(val("tax_sec_80tta_savings") || 0),
      other_deductions_80e_80g: Number(val("tax_other_deductions_80e_80g") || 0),
      tds_deducted: Number(val("tax_tds_deducted") || 0),
      advance_tax_paid: Number(val("tax_advance_tax_paid") || 0)
    }
  }

  renderResult(tc) {
    const nr = tc.newRegime || {}
    const or = tc.oldRegime || {}
    const rec = String(tc.recommendedRegime || "new").toUpperCase()

    const headlineEl = document.getElementById("tax-rec-headline")
    const subEl = document.getElementById("tax-rec-sub")
    const heroNew = document.getElementById("hero-new-tax")
    const heroOld = document.getElementById("hero-old-tax")
    const tbody = document.getElementById("tax-comparison-tbody")

    if (headlineEl) headlineEl.textContent = `${rec} REGIME saves ${this.escHtml(tc.taxSavingsInr || "₹0")}`
    if (subEl) {
      subEl.innerHTML = `Gross Income: <span class="font-mono font-semibold">${this.escHtml(tc.grossTotalIncomeInr || "₹0")}</span> • Taxes Paid (TDS + Adv): <span class="font-mono">${this.escHtml(tc.totalTaxesPaidInr || "₹0")}</span>`
    }
    if (heroNew) heroNew.textContent = nr.totalTaxInr || "₹0"
    if (heroOld) heroOld.textContent = or.totalTaxInr || "₹0"

    if (tbody) {
      const nrRef = Number(nr.refundOrPayable || 0)
      const orRef = Number(or.refundOrPayable || 0)

      tbody.innerHTML = `
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Gross Total Income</td><td class="py-2.5 px-3 text-right text-white">${this.escHtml(tc.grossTotalIncomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-white">${this.escHtml(tc.grossTotalIncomeInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Standard &amp; Eligible Deductions</td><td class="py-2.5 px-3 text-right text-emerald-300">-${this.escHtml(nr.totalDeductionsInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-300">-${this.escHtml(or.totalDeductionsInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60 bg-slate-900/40"><td class="py-2.5 pr-3 font-sans font-semibold text-white">Net Taxable Income</td><td class="py-2.5 px-3 text-right font-bold text-white">${this.escHtml(nr.taxableIncomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right font-bold text-white">${this.escHtml(or.taxableIncomeInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Slab Tax (Before 87A Rebate)</td><td class="py-2.5 px-3 text-right text-slate-200">${this.escHtml(nr.slabTaxInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-slate-200">${this.escHtml(or.slabTaxInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Sec 87A Rebate &amp; Marginal Relief</td><td class="py-2.5 px-3 text-right text-emerald-400">-${this.escHtml(nr.rebatePlusReliefInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-400">-${this.escHtml(or.rebatePlusReliefInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Surcharge + 4% Health &amp; Edu Cess</td><td class="py-2.5 px-3 text-right text-slate-300">${this.escHtml(nr.surchargePlusCessInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-slate-300">${this.escHtml(or.surchargePlusCessInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-700 bg-indigo-950/25"><td class="py-3 pr-3 font-sans font-bold text-white">Total Tax Liability</td><td class="py-3 px-3 text-right font-bold text-base text-indigo-300">${this.escHtml(nr.totalTaxInr || "₹0")}</td><td class="py-3 pl-3 text-right font-bold text-base text-amber-300">${this.escHtml(or.totalTaxInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Effective Tax Rate</td><td class="py-2.5 px-3 text-right text-slate-200">${this.escHtml(nr.effectiveRateLabel || "0.00%")}</td><td class="py-2.5 pl-3 text-right text-slate-200">${this.escHtml(or.effectiveRateLabel || "0.00%")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Monthly Post-Tax Take-Home</td><td class="py-2.5 px-3 text-right text-emerald-300">${this.escHtml(nr.monthlyTakeHomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-300">${this.escHtml(or.monthlyTakeHomeInr || "₹0")}</td></tr>
        <tr><td class="py-2.5 pr-3 font-sans text-slate-300">ITR Refund (+) / Tax Payable (-)</td><td class="py-2.5 px-3 text-right font-semibold ${nrRef >= 0 ? "text-emerald-400" : "text-rose-400"}">${this.escHtml(nr.refundOrPayableInr || "₹0")}</td><td class="py-2.5 pl-3 text-right font-semibold ${orRef >= 0 ? "text-emerald-400" : "text-rose-400"}">${this.escHtml(or.refundOrPayableInr || "₹0")}</td></tr>
      `
    }

    const slabsContainer = document.getElementById("tax-slabs-container")
    if (slabsContainer) {
      const renderCard = (title, cls, rows) => `
        <div class="glass-card rounded-2xl p-4">
          <h3 class="text-xs font-bold uppercase tracking-wider ${cls} mb-3">${title}</h3>
          <table class="w-full text-left text-[11px] font-mono">
            <thead><tr class="text-slate-400 border-b border-slate-800"><th class="py-1.5">Slab</th><th class="py-1.5 text-right">Rate</th><th class="py-1.5 text-right">Tax</th></tr></thead>
            <tbody>
              ${(rows || []).map((s) => `<tr class="border-b border-slate-800/50"><td class="py-1.5 font-sans text-slate-300">${this.escHtml(s.label)}</td><td class="py-1.5 text-right text-slate-400">${s.rate}%</td><td class="py-1.5 text-right text-white">${this.escHtml(s.taxInSlabInr || "₹0")}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `
      slabsContainer.innerHTML =
        renderCard("New Regime Slab Breakdown", "text-indigo-300", nr.slabs) +
        renderCard("Old Regime Slab Breakdown", "text-amber-300", or.slabs)
    }

    if (window.Motion && typeof window.Motion.animate === "function" && heroNew && heroOld) {
      window.Motion.animate(
        [heroNew, heroOld],
        { opacity: [0.65, 1], y: [4, 0] },
        { duration: 0.28, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
      )
    }
  }

  escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }
}
