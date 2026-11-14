import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.abortController = null
    this.reqSeq = 0
    window.__wfStimulusFiSlabActive = true
    window.setFiTaxSlab = (slabRate) => this.applySlab(slabRate)

    const activeBtn = document.querySelector(".fi-slab-btn.bg-indigo-600")
    if (activeBtn && window.Motion && typeof window.Motion.glidePill === "function") {
      const group = activeBtn.closest(".wf-glide-group")
      if (group) window.Motion.glidePill(group, activeBtn, { animate: false })
    }
  }

  disconnect() {
    if (this.abortController) this.abortController.abort()
  }

  select(event) {
    const slabRate = Number(event.currentTarget.getAttribute("data-slab") || 0)
    this.applySlab(slabRate)
  }

  async applySlab(slabRate) {
    const slab = Number(slabRate || 0)

    const slabBtns = Array.from(document.querySelectorAll(".fi-slab-btn"))
    let activeBtn = null
    slabBtns.forEach((btn) => {
      const match = Math.abs(Number(btn.getAttribute("data-slab")) - slab) < 0.001
      if (match) activeBtn = btn
      btn.className =
        "fi-slab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors duration-200 " +
        (match
          ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/25"
          : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-indigo-500/50")
    })
    if (activeBtn && window.Motion) {
      const group = activeBtn.closest(".wf-glide-group")
      if (group && typeof window.Motion.glidePill === "function") {
        window.Motion.glidePill(group, activeBtn)
      }
      if (typeof window.Motion.waveGroup === "function") {
        window.Motion.waveGroup(slabBtns, activeBtn)
      }
    }

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
      const res = await fetch("/api/fixed_income/slab_preview", {
        method: "POST",
        headers,
        body: JSON.stringify({ slab }),
        signal: this.abortController.signal
      })
      if (!res.ok) return
      const json = await res.json()
      if (seq !== this.reqSeq || !json.postTax) return

      this.renderBackendSummary(json.postTax, json.rows || {})
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Slab preview API error:", err)
      }
    }
  }

  renderBackendSummary(postTax, rows) {
    const taxEl = document.getElementById("fi-tax-deducted")
    const effEl = document.getElementById("fi-effective-tax-label")
    const netEl = document.getElementById("fi-post-tax-interest")
    const yieldEl = document.getElementById("fi-post-tax-yield")

    if (taxEl) taxEl.textContent = postTax.estimatedTaxInr || "₹0"
    if (effEl) effEl.textContent = `Effective Rate: ${postTax.effectiveTaxPct || "0.00"}%`
    if (netEl) netEl.textContent = postTax.postTaxGainInr || "₹0"
    if (yieldEl) yieldEl.textContent = `${postTax.postTaxYieldPct || "0.00%"} p.a.`

    const updatedCells = []
    document.querySelectorAll(".fi-post-tax-cell").forEach((cell) => {
      const key = cell.getAttribute("data-row-key")
      const rowData = key ? rows[key] : null
      if (!rowData) return
      cell.innerHTML = `${this.esc(rowData.post_tax_gain_inr)}<div class="text-[10px] text-slate-400">(${this.esc(rowData.post_tax_yield_pct)} net)</div>`
      updatedCells.push(cell)
    })

    if (window.Motion && typeof window.Motion.wave === "function") {
      const targets = [taxEl, netEl, yieldEl, ...updatedCells].filter(Boolean)
      if (targets.length) {
        window.Motion.wave(targets, { opacity: [0.55, 1], y: [5, 0], step: 0.035, duration: 0.44 })
      }
    }
  }

  esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }
}
