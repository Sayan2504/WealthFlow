import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    staggerDelay: { type: Number, default: 25 },
    duration: { type: Number, default: 340 }
  }

  connect() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const items = Array.from(this.element.querySelectorAll("[data-motion-item]")).filter(
      (el) => !el.classList.contains("glass-card")
    )
    if (!items.length) return

    items.forEach((el, idx) => {
      if (typeof el.animate === "function") {
        const anim = el.animate(
          [
            { opacity: 0.85, transform: "translate3d(0, 8px, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" }
          ],
          {
            duration: this.durationValue,
            delay: items.length > 1 ? idx * this.staggerDelayValue : 0,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both"
          }
        )
        anim.onfinish = () => {
          try { anim.cancel() } catch (_) {}
        }
      }
    })
  }
}
