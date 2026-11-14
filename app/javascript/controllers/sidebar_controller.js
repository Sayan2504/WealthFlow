import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["drawer", "backdrop"]

  connect() {
    this.hideTimer = null
    this.resetClosedImmediate()
  }

  disconnect() {
    if (this.hideTimer) clearTimeout(this.hideTimer)
  }

  open() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
      if (window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          this.backdropTarget,
          { opacity: [0, 1] },
          { duration: 0.42, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
        )
      }
    }
    if (this.hasDrawerTarget) {
      this.drawerTarget.classList.remove("-translate-x-full")
      if (window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          this.drawerTarget,
          [{ transform: "translate3d(-100%, 0, 0)" }, { transform: "translate3d(0%, 0, 0)" }],
          { duration: 0.36, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
        )
      }
    }
  }

  close() {
    if (!this.hasDrawerTarget) return
    const isMobile = window.innerWidth < 1024
    const wasOpen = isMobile && !this.drawerTarget.classList.contains("-translate-x-full")

    if (wasOpen && window.Motion && typeof window.Motion.animate === "function") {
      if (this.hideTimer) clearTimeout(this.hideTimer)
      if (this.hasBackdropTarget) {
        window.Motion.animate(
          this.backdropTarget,
          { opacity: [1, 0] },
          { duration: 0.38, easing: [0.22, 1, 0.36, 1] }
        )
      }
      window.Motion.animate(
        this.drawerTarget,
        { x: ["0%", "-100%"] },
        { duration: 0.42, easing: [0.32, 0, 0.67, 0] }
      )
      this.hideTimer = setTimeout(() => {
        this.resetClosedImmediate()
        this.hideTimer = null
      }, 420)
    } else {
      this.resetClosedImmediate()
    }
  }

  resetClosedImmediate() {
    if (this.hasDrawerTarget && window.innerWidth < 1024) {
      this.drawerTarget.classList.add("-translate-x-full")
    }
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.add("hidden")
    }
  }
}

