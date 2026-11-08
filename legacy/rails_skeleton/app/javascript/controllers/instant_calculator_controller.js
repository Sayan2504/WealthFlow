// app/javascript/controllers/instant_calculator_controller.js
import { Controller } from "@hotwired/stimulus"
import { animate } from "motion"

export default class extends Controller {
  static targets = [
    "principalInput", "principalDisplay",
    "rateInput", "rateDisplay",
    "tenureInput", "tenureDisplay",
    "maturityResult", "interestResult", "investedResult"
  ]

  connect() {
    this.recalculate()
  }

  updatePrincipal(event) {
    if (this.hasPrincipalDisplayTarget) {
      this.principalDisplayTarget.textContent = this.formatCurrency(event.target.value)
    }
    this.recalculate()
  }

  updateRate(event) {
    if (this.hasRateDisplayTarget) {
      this.rateDisplayTarget.textContent = `${parseFloat(event.target.value).toFixed(2)}%`
    }
    this.recalculate()
  }

  updateTenure(event) {
    if (this.hasTenureDisplayTarget) {
      const months = parseInt(event.target.value)
      const years = (months / 12).toFixed(1)
      this.tenureDisplayTarget.textContent = `${months} mo (${years} yrs)`
    }
    this.recalculate()
  }

  recalculate() {
    const p = parseFloat(this.principalInputTarget.value) || 0
    const r = (parseFloat(this.rateInputTarget.value) || 0) / 100
    const months = parseInt(this.tenureInputTarget.value) || 0
    const t = months / 12
    const n = 4 // Quarterly compounding

    // A = P * (1 + r/n)^(n*t)
    const maturity = p * Math.pow(1 + (r / n), n * t)
    const interest = Math.max(0, maturity - p)

    if (this.hasMaturityResultTarget) {
      this.maturityResultTarget.textContent = this.formatCurrency(Math.round(maturity))
      animate(this.maturityResultTarget, { scale: [1.03, 1] }, { duration: 0.2 })
    }

    if (this.hasInterestResultTarget) {
      this.interestResultTarget.textContent = this.formatCurrency(Math.round(interest))
    }

    if (this.hasInvestedResultTarget) {
      this.investedResultTarget.textContent = this.formatCurrency(Math.round(p))
    }
  }

  formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value)
  }
}

