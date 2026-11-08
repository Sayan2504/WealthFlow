// app/javascript/controllers/modal_controller.js
import { Controller } from "@hotwired/stimulus"
import { animate } from "motion"

export default class extends Controller {
  static targets = ["dialog", "panel", "backdrop"]

  open() {
    this.dialogTarget.classList.remove("hidden")
    
    // Animate backdrop fade
    animate(this.backdropTarget, { opacity: [0, 1] }, { duration: 0.25 })
    
    // Animate drawer slide in from right
    animate(
      this.panelTarget,
      { x: ["100%", "0%"] },
      { duration: 0.35, easing: [0.16, 1, 0.3, 1] }
    )
  }

  close() {
    // Animate drawer slide out
    animate(
      this.panelTarget,
      { x: ["0%", "100%"] },
      { duration: 0.25, easing: "ease-in" }
    )

    animate(
      this.backdropTarget,
      { opacity: [1, 0] },
      { duration: 0.25 }
    ).finished.then(() => {
      this.dialogTarget.classList.add("hidden")
    })
  }

  handleBackdropClick(event) {
    if (event.target === this.backdropTarget) {
      this.close()
    }
  }
}

