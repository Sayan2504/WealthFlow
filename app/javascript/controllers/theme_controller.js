import { Controller } from "@hotwired/stimulus"

// Config-driven Theme Switcher Controller
// Reads available theme keys & modes from theme.yml via data-theme-modes-value.
export default class extends Controller {
  static targets = ["button"]
  static values = {
    default: { type: String, default: "midnight" },
    modes: { type: Object, default: { midnight: "dark", solstice: "light", aurora: "dark" } }
  }

  connect() {
    let saved = localStorage.getItem("wf_theme") || this.defaultValue
    if (saved === "light" && !this.modesValue[saved]) {
      saved = "solstice"
    }
    if (saved === "dark" && !this.modesValue[saved]) {
      saved = this.defaultValue
    }
    this.applyTheme(saved, false)
  }

  select(event) {
    const clickedBtn = event.currentTarget
    const theme = clickedBtn?.dataset?.themeValue || this.defaultValue

    const commitTheme = () => this.applyTheme(theme, true)
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (typeof document.startViewTransition === "function" && !reduced) {
      document.documentElement.classList.add("wf-theme-curtain")
      const vt = document.startViewTransition(() => commitTheme())
      if (vt && vt.finished) {
        vt.finished.finally(() => document.documentElement.classList.remove("wf-theme-curtain"))
      } else {
        setTimeout(() => document.documentElement.classList.remove("wf-theme-curtain"), 850)
      }
    } else {
      commitTheme()
    }

    if (window.Motion && typeof window.Motion.waveGroup === "function") {
      window.Motion.waveGroup(this.buttonTargets, clickedBtn)
    }
  }

  applyTheme(themeName, persist = true) {
    const available = this.modesValue || {}
    const validTheme = available[themeName] ? themeName : this.defaultValue
    const mode = available[validTheme] === "light" ? "light" : "dark"

    document.documentElement.dataset.theme = validTheme
    document.documentElement.dataset.mode = mode
    document.documentElement.style.colorScheme = mode

    if (persist) {
      localStorage.setItem("wf_theme", validTheme)
    }

    let activeBtn = null
    this.buttonTargets.forEach((btn) => {
      const isActive = btn.dataset.themeValue === validTheme
      if (isActive) activeBtn = btn
      btn.setAttribute("aria-pressed", String(isActive))
      btn.classList.toggle("wf-theme-btn-active", isActive)
    })

    if (activeBtn && window.Motion && typeof window.Motion.glidePill === "function") {
      const group = activeBtn.closest(".wf-glide-group")
      if (group) {
        window.Motion.glidePill(group, activeBtn, { animate: persist })
      }
    }
  }
}
