import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["slide", "dot", "tab", "counter"]
  static values = {
    index: { type: Number, default: 0 },
    interval: { type: Number, default: 5500 }
  }

  connect() {
    this.isPaused = false
    this._anims = []
    this.showSlide(this.indexValue, false, 1)
    this.startTimer()
  }

  disconnect() {
    this.stopTimer()
    this._cancelSlideAnimations()
  }

  next() {
    const count = this.slideTargets.length
    if (!count) return
    const prevIdx = this.indexValue
    this.indexValue = (prevIdx + 1) % count
    this.showSlide(this.indexValue, true, 1, prevIdx)
    if (!this.isPaused) this.startTimer()
  }

  prev() {
    const count = this.slideTargets.length
    if (!count) return
    const prevIdx = this.indexValue
    this.indexValue = (prevIdx - 1 + count) % count
    this.showSlide(this.indexValue, true, -1, prevIdx)
    if (!this.isPaused) this.startTimer()
  }

  goTo(event) {
    const idx = Number(event.currentTarget.getAttribute("data-index") || 0)
    if (Number.isNaN(idx) || idx === this.indexValue) return
    const prevIdx = this.indexValue
    const dir = idx > prevIdx ? 1 : -1
    this.indexValue = idx
    this.showSlide(idx, true, dir, prevIdx)
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

  _cancelSlideAnimations() {
    if (!this._anims) return
    this._anims.forEach((a) => {
      try { a.cancel() } catch (_) {}
    })
    this._anims = []
  }

  showSlide(activeIdx, animateTransition, direction = 1, prevIdx = null) {
    this._cancelSlideAnimations()

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const shouldAnimate = animateTransition && !reduceMotion && prevIdx !== null && prevIdx !== activeIdx

    this.slideTargets.forEach((slide, i) => {
      slide.classList.remove("absolute", "inset-0", "pointer-events-none")
      slide.style.willChange = ""

      if (i === activeIdx) {
        slide.classList.remove("hidden")
        if (shouldAnimate) {
          slide.style.willChange = "transform, opacity"
          const anim = slide.animate(
            [
              { opacity: 0, transform: `translate3d(${direction * 48}px, 0, 0) scale(0.985)` },
              { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
            ],
            { duration: 680, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
          )
          anim.onfinish = () => {
            slide.style.willChange = ""
            try { anim.cancel() } catch (_) {}
          }
          this._anims.push(anim)
        }
      } else if (shouldAnimate && i === prevIdx) {
        slide.classList.remove("hidden")
        slide.classList.add("absolute", "inset-0", "pointer-events-none")
        slide.style.willChange = "transform, opacity"
        const anim = slide.animate(
          [
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
            { opacity: 0, transform: `translate3d(${-direction * 48}px, 0, 0) scale(0.985)` }
          ],
          { duration: 580, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
        )
        anim.onfinish = () => {
          slide.classList.add("hidden")
          slide.classList.remove("absolute", "inset-0", "pointer-events-none")
          slide.style.willChange = ""
          try { anim.cancel() } catch (_) {}
        }
        this._anims.push(anim)
      } else {
        slide.classList.add("hidden")
      }
    })

    let activeDot = null
    this.dotTargets.forEach((dot, i) => {
      const active = i === activeIdx
      if (active) activeDot = dot
      dot.className = active
        ? "h-1.5 w-6 rounded-full bg-indigo-400 transition-[width,background-color] duration-250 cursor-pointer"
        : "h-1.5 w-2 rounded-full bg-slate-600 hover:bg-slate-400 transition-[width,background-color] duration-250 cursor-pointer"
    })
    if (animateTransition && activeDot && window.Motion && typeof window.Motion.waveGroup === "function") {
      window.Motion.waveGroup(this.dotTargets, activeDot)
    }

    let activeTab = null
    this.tabTargets.forEach((tab, i) => {
      const active = i === activeIdx
      if (active) activeTab = tab
      tab.className = active
        ? "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white shadow-sm transition-colors duration-200 cursor-pointer"
        : "px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors duration-200 cursor-pointer"
    })
    if (animateTransition && activeTab && window.Motion && typeof window.Motion.waveGroup === "function") {
      window.Motion.waveGroup(this.tabTargets, activeTab)
    }

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
