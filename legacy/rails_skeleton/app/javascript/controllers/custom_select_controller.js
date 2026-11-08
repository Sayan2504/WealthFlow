// app/javascript/controllers/custom_select_controller.js
import { Controller } from "@hotwired/stimulus"
import { animate } from "motion"

export default class extends Controller {
  static targets = ["input", "label", "menu", "chevron", "option"]

  connect() {
    this.isOpen = false
    this.outsideClickHandler = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this.outsideClickHandler)
  }

  toggle(event) {
    event.stopPropagation()
    this.isOpen ? this.close() : this.open()
  }

  open() {
    this.isOpen = true
    this.menuTarget.classList.remove("hidden")
    this.chevronTarget.classList.add("rotate-180")
    animate(
      this.menuTarget,
      { opacity: [0, 1], y: [-6, 0], scale: [0.97, 1] },
      { duration: 0.18, easing: "ease-out" }
    )
  }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    this.chevronTarget.classList.remove("rotate-180")
    this.menuTarget.classList.add("hidden")
  }

  select(event) {
    event.stopPropagation()
    const btn = event.currentTarget
    const value = btn.dataset.value
    const label = btn.dataset.label

    this.inputTarget.value = value
    this.labelTarget.textContent = label

    this.optionTargets.forEach((opt) => {
      const isSelected = opt.dataset.value === value
      opt.classList.toggle("bg-indigo-600/20", isSelected)
      opt.classList.toggle("text-indigo-300", isSelected)
      const check = opt.querySelector("[data-check]")
      if (check) check.classList.toggle("opacity-100", isSelected)
      if (check) check.classList.toggle("opacity-0", !isSelected)
    })

    this.close()
  }

  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
}

