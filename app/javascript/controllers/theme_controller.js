import { Controller } from "@hotwired/stimulus"

// Config-driven Theme Switcher Controller
// Reads available theme keys & modes from theme.yml via data-theme-modes-value.
export default class extends Controller {
  static targets = ["button"]
  static values = {
    default: { type: String, default: "midnight" },
    modes: { type: Object, default: { midnight: "dark", light: "light", aurora: "dark" } }
  }

  connect() {
    let saved = localStorage.getItem("wf_theme") || this.defaultValue
    if (saved === "dark" && !this.modesValue[saved]) {
      saved = this.defaultValue
    }
    this.applyTheme(saved, false)
  }

  select(event) {
    const clickedBtn = event.currentTarget
    const theme = clickedBtn?.dataset?.themeValue || this.defaultValue
    this.applyTheme(theme, true)

    if (window.Motion) {
      if (typeof window.Motion.waveGroup === "function") {
        window.Motion.waveGroup(this.buttonTargets, clickedBtn)
      }
      if (typeof window.Motion.wave === "function") {
        window.Motion.wave("main .glass-card", { opacity: [0.88, 1], y: [6, 0], step: 0.04, duration: 0.52 })
      }
    }

    if (window.Motion) {
      if (typeof window.Motion.waveGroup === "function") {
        window.Motion.waveGroup(this.buttonTargets, clickedBtn)
      }
      if (typeof window.Motion.wave === "function") {
        window.Motion.wave("main .glass-card", { opacity: [0.88, 1], y: [6, 0], step: 0.04, duration: 0.52 })
      }
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

    this.buttonTargets.forEach((btn) => {
      const isActive = btn.dataset.themeValue === validTheme
      btn.setAttribute("aria-pressed", String(isActive))
      btn.classList.toggle("wf-theme-btn-active", isActive)
    })
  }
}
