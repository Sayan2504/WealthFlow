// app/javascript/controllers/financial_metric_controller.js
import { Controller } from "@hotwired/stimulus"
import { animate } from "motion"

export default class extends Controller {
  static targets = ["value"]
  static values = {
    targetValue: Number,
    duration: { type: Number, default: 0.9 },
    currency: { type: String, default: "INR" }
  }

  connect() {
    this.animateEntry()
    if (this.hasValueTarget && !isNaN(this.targetValueValue)) {
      this.animateNumber()
    }
  }

  animateEntry() {
    animate(
      this.element,
      { opacity: [0, 1], y: [16, 0] },
      { duration: 0.45, easing: [0.16, 1, 0.3, 1] }
    )
  }

  animateNumber() {
    const rawEnd = this.targetValueValue
    const displayTarget = this.valueTarget

    animate(
      (progress) => {
        const current = Math.floor(progress * rawEnd)
        displayTarget.textContent = this.formatCurrency(current)
      },
      { duration: this.durationValue, easing: [0.25, 1, 0.5, 1] }
    )
  }

  formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value)
  }
}

