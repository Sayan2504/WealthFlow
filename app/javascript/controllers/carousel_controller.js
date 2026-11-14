import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["slide", "dot", "tab", "counter"]
  static values = {
    index: { type: Number, default: 0 },
    interval: { type: Number, default: 5500 }
  }

  connect() {
    this.isPaused = false
    this.showSlide(this.indexValue, false)
    this.startTimer()
  }

  disconnect() {
    this.stopTimer()
  }

  next() {
    const count = this.slideTargets.length
    if (!count) return
    this.indexValue = (this.indexValue + 1) % count
    this.showSlide(this.indexValue, true)
    if (!this.isPaused) this.startTimer()
  }

  prev() {
    const count = this.slideTargets.length
    if (!count) return
    this.indexValue = (this.indexValue - 1 + count) % count
    this.showSlide(this.indexValue, true)
    if (!this.isPaused) this.startTimer()
  }

  goTo(event) {
    const idx = Number(event.currentTarget.getAttribute("data-index") || 0)
    if (Number.isNaN(idx)) return
    this.indexValue = idx
    this.showSlide(idx, true)
    if (!this.isPaused) this.startTimer()
  }

  pause() {
    this.isPaused = true
    this.stopTimer()
  }

  resume() {
    this.isPaused = false
    this.startTimer()
  }

  showSlide(activeIdx, animateTransition) {
    this.slideTargets.forEach((slide, i) => {
      const active = i === activeIdx
      slide.classList.toggle("hidden", !active)
      if (active && animateTransition && window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          slide,
          { opacity: [0, 1], x: [28, 0], scale: [0.985, 1] },
          { duration: 0.58, easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
        )
      }
    })

    this.dotTargets.forEach((dot, i) => {
      const active = i === activeIdx
      dot.className = active
        ? "h-1.5 w-6 rounded-full bg-indigo-400 transition-all duration-300 cursor-pointer"
        : "h-1.5 w-2 rounded-full bg-slate-600 hover:bg-slate-400 transition-all duration-300 cursor-pointer"
      if (active && animateTransition && window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          dot,
          { scale: [0.9, 1.05, 1] },
          { duration: 0.44, easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
        )
      }
    })

    this.tabTargets.forEach((tab, i) => {
      const active = i === activeIdx
      tab.className = active
        ? "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white shadow-sm transition-all duration-300 cursor-pointer"
        : "px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all duration-300 cursor-pointer"
      if (active && animateTransition && window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          tab,
          { scale: [0.9, 1.05, 1] },
          { duration: 0.44, easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
        )
      }
    })

    if (this.hasCounterTarget && this.slideTargets.length) {
      this.counterTarget.textContent = `${activeIdx + 1} / ${this.slideTargets.length}`
    }
  }

  startTimer() {
    this.stopTimer()
    if (this.slideTargets.length <= 1) return
    this.timer = setInterval(() => this.next(), this.intervalValue)
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
