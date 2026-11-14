import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    staggerDelay: { type: Number, default: 0.045 },
    duration: { type: Number, default: 0.54 }
  }

  connect() {
    if (!window.Motion || typeof window.Motion.animate !== "function") return

    const items = Array.from(this.element.querySelectorAll("[data-motion-item]")).filter(
      (el) => !el.classList.contains("glass-card")
    )
    if (!items.length) return

    window.Motion.animate(
      items,
      { opacity: [0.85, 1], y: [8, 0] },
      {
        duration: 0.34,
        delay: items.length > 1 ? window.Motion.stagger(0.025) : 0,
        easing: [0.22, 1, 0.36, 1],
        clearOnFinish: true
      }
    )
  }
}

