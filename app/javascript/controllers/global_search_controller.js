import { Controller } from "@hotwired/stimulus"

// Top Search Bar Controller supporting two clear modes:
// 1. "search" — Navigates directly to matching portfolio pages (/fixed_income, /mutual_funds, /retirement, etc.) or shows "No match found".
// 2. "ai" — Sends the query straight into the right-side WealthFlow AI Drawer (#right-drawer).
export default class extends Controller {
  static targets = ["input", "panel", "list", "spinner", "modeBtn"]
  static values = {
    mode: { type: String, default: "search" }
  }

  connect() {
    this.debounceTimer = null
    this.abortController = null
    this.activeIdx = -1
    this.onDocClick = (e) => {
      if (!this.element.contains(e.target)) this.hidePanel()
    }
    this.onGlobalKey = (e) => {
      if ((e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) ||
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault()
        if (this.hasInputTarget) {
          this.inputTarget.focus()
          this.inputTarget.select()
          if (this.modeValue === "search") {
            this.performSearch(this.inputTarget.value)
          }
        }
      }
    }
    document.addEventListener("click", this.onDocClick)
    document.addEventListener("keydown", this.onGlobalKey)
    this.syncModeUi()
  }

  disconnect() {
    clearTimeout(this.debounceTimer)
    if (this.abortController) this.abortController.abort()
    document.removeEventListener("click", this.onDocClick)
    document.removeEventListener("keydown", this.onGlobalKey)
  }

  setMode(event) {
    const clickedBtn = event.currentTarget
    const newMode = clickedBtn?.dataset?.searchMode || "search"
    this.modeValue = newMode
    this.syncModeUi()

    if (window.Motion) {
      if (clickedBtn && typeof window.Motion.waveGroup === "function") {
        window.Motion.waveGroup(this.modeBtnTargets, clickedBtn)
      }
      if (this.hasInputTarget && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          this.inputTarget,
          { opacity: [0.55, 1], x: [5, 0] },
          { duration: 0.24, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
        )
      }
    }

    if (newMode === "ai") {
      this.hidePanel()
      if (this.hasInputTarget) this.inputTarget.focus()
    } else if (this.hasInputTarget) {
      this.inputTarget.focus()
      this.performSearch(this.inputTarget.value)
    }
  }

  syncModeUi() {
    const isAi = this.modeValue === "ai"
    this.modeBtnTargets.forEach((btn) => {
      const active = btn.dataset.searchMode === this.modeValue
      btn.setAttribute("aria-pressed", String(active))
      btn.className = active
        ? "px-2 py-1 rounded-md text-[10px] font-semibold bg-indigo-600 text-white transition-colors cursor-pointer"
        : "px-2 py-1 rounded-md text-[10px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
    })
    if (this.hasInputTarget) {
      this.inputTarget.placeholder = isAi
        ? "Ask AI anything about your portfolio & press Enter..."
        : "Search FD, MF, PPF, Home Loan, Bank, Insurance, Tax..."
    }
  }

  onFocus() {
    if (this.modeValue === "search") {
      this.performSearch(this.inputTarget.value)
    }
  }

  onInput() {
    if (this.modeValue === "ai") {
      this.hidePanel()
      return
    }
    clearTimeout(this.debounceTimer)
    const query = this.inputTarget.value
    this.debounceTimer = setTimeout(() => this.performSearch(query), 150)
  }

  openAiFromInput() {
    const query = String(this.inputTarget?.value || "").trim()
    this.hidePanel()
    if (typeof window.openAiAssistantDrawer === "function") {
      window.openAiAssistantDrawer(query)
    }
  }

  onKeydown(event) {
    if (event.key === "Escape") {
      this.hidePanel()
      this.inputTarget.blur()
      return
    }

    if (this.modeValue === "ai") {
      if (event.key === "Enter") {
        event.preventDefault()
        this.openAiFromInput()
      }
      return
    }

    const items = this.hasListTarget ? Array.from(this.listTarget.querySelectorAll("a[data-search-result]")) : []

    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault()
      this.activeIdx = (this.activeIdx + 1) % items.length
      this.highlightActive(items)
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault()
      this.activeIdx = (this.activeIdx - 1 + items.length) % items.length
      this.highlightActive(items)
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (items.length) {
        const chosen = this.activeIdx >= 0 && items[this.activeIdx] ? items[this.activeIdx] : items[0]
        chosen.click()
      } else {
        this.performSearch(this.inputTarget.value)
      }
    }
  }

  highlightActive(items) {
    items.forEach((el, idx) => {
      el.classList.toggle("bg-indigo-600/25", idx === this.activeIdx)
      el.classList.toggle("border-indigo-500/40", idx === this.activeIdx)
    })
  }

  async performSearch(rawQuery) {
    const query = String(rawQuery || "").trim()
    if (this.abortController) this.abortController.abort()
    this.abortController = new AbortController()

    if (this.hasSpinnerTarget) this.spinnerTarget.classList.remove("hidden")

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
        signal: this.abortController.signal
      })
      if (!res.ok) return
      const json = await res.json()
      this.renderResults(json, query)
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err)
      }
    } finally {
      if (this.hasSpinnerTarget) this.spinnerTarget.classList.add("hidden")
    }
  }

  renderResults(json, query) {
    if (!this.hasListTarget || !this.hasPanelTarget) return
    this.activeIdx = -1

    const results = Array.isArray(json.results) ? json.results : []
    if (!results.length) {
      this.listTarget.innerHTML = `
        <div class="px-4 py-6 text-center space-y-2">
          <div class="text-xs font-semibold text-slate-300">No match found</div>
          <div class="text-[11px] text-slate-400">No portfolio record or page matched "${this.esc(query)}".</div>
          <button type="button" data-action="click->global-search#openAiFromInput"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors cursor-pointer">
            Ask AI in Drawer instead
          </button>
        </div>
      `
    } else {
      this.listTarget.innerHTML = results
        .map((r) => `
          <a href="${this.esc(r.url)}" data-search-result="1" data-action="click->global-search#hidePanel"
             class="block px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800/80 hover:border-slate-700/70 transition-colors">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold shrink-0">${this.esc(r.category)}</span>
                <span class="text-xs font-semibold text-white truncate">${this.esc(r.title)}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${r.value ? `<span class="text-xs font-mono font-bold text-emerald-300">${this.esc(r.value)}</span>` : `<span class="text-[10px] text-slate-400">${this.esc(r.badge)}</span>`}
                <span class="text-[10px] text-indigo-300">&rarr;</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5">${this.esc(r.subtitle)}</div>
          </a>
        `)
        .join("")
    }

    this.panelTarget.classList.remove("hidden")
    if (window.Motion && typeof window.Motion.animate === "function") {
      window.Motion.animate(
        this.panelTarget,
        { opacity: [0, 1], y: [-10, 0], scale: [0.98, 1] },
        { duration: 0.42, easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
      )
      const resultLinks = Array.from(this.listTarget.querySelectorAll("a[data-search-result]"))
      if (resultLinks.length) {
        window.Motion.animate(
          resultLinks,
          { opacity: [0, 1], y: [8, 0] },
          { duration: 0.38, delay: window.Motion.stagger(0.035), easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
        )
      }
    }
  }

  hidePanel() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.add("hidden")
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
