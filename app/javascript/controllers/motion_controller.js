import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    staggerDelay: { type: Number, default: 0.045 },
    duration: { type: Number, default: 0.54 }
  }

  connect() {
    if (!window.Motion || typeof window.Motion.animate !== "function") return

    const items = Array.from(this.element.querySelectorAll("[data-motion-item]"))
    const targets = items.length ? items : [this.element]

    window.Motion.animate(
      targets,
      { opacity: [0, 1], y: [14, 0] },
      {
        duration: this.durationValue,
        delay: items.length > 1 ? window.Motion.stagger(this.staggerDelayValue) : 0,
        easing: [0.16, 1, 0.3, 1],
        clearOnFinish: true
      }
    )
  }
}

