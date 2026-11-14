import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    messages: { type: Array, default: [] }
  }

  connect() {
    window.__wfPushToast = (message, variant = "success") => this.spawn(message, variant)

    const initial = Array.isArray(this.messagesValue) ? this.messagesValue : []
    initial.forEach((entry, index) => {
      if (!entry || !entry.message) return
      setTimeout(() => this.spawn(entry.message, entry.variant || "success"), index * 140)
    })
  }

  disconnect() {
    if (window.__wfPushToast) {
      delete window.__wfPushToast
    }
  }

  spawn(message, variant = "success") {
    const text = String(message || "").trim()
    if (!text) return

    const isError = variant === "error" || variant === "alert"
    const isInfo = variant === "info"

    const toastEl = document.createElement("div")
    toastEl.setAttribute("role", isError ? "alert" : "status")
    toastEl.className = [
      "wf-toast pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-xs font-medium max-w-sm",
      isError
        ? "bg-rose-950/95 border-rose-500/60 text-rose-100 wf-toast-error"
        : isInfo
          ? "bg-indigo-950/95 border-indigo-500/60 text-indigo-100 wf-toast-info"
          : "bg-slate-900/95 border-emerald-500/50 text-white wf-toast-success"
    ].join(" ")

    const dot = document.createElement("span")
    dot.className = `mt-1 w-2 h-2 rounded-full shrink-0 ${
      isError ? "bg-rose-400" : isInfo ? "bg-cyan-400" : "bg-emerald-400"
    }`

    const msgSpan = document.createElement("span")
    msgSpan.className = "flex-1 leading-relaxed"
    msgSpan.textContent = text

    const closeBtn = document.createElement("button")
    closeBtn.type = "button"
    closeBtn.setAttribute("aria-label", "Dismiss notification")
    closeBtn.className = "ml-1 p-0.5 rounded opacity-75 hover:opacity-100 cursor-pointer shrink-0"
    closeBtn.innerHTML = "&times;"
    closeBtn.addEventListener("click", () => this.dismiss(toastEl))

    toastEl.appendChild(dot)
    toastEl.appendChild(msgSpan)
    toastEl.appendChild(closeBtn)
    this.element.appendChild(toastEl)

    if (window.Motion && typeof window.Motion.animate === "function") {
      window.Motion.animate(
        toastEl,
        { opacity: [0, 1], x: [24, 0], scale: [0.96, 1] },
        { duration: 0.46, easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
      )
    }

    const duration = isError ? 5200 : 3600
    setTimeout(() => this.dismiss(toastEl), duration)
  }

  dismiss(toastEl) {
    if (!toastEl || !toastEl.parentNode) return
    if (window.Motion && typeof window.Motion.animate === "function") {
      const anim = window.Motion.animate(
        toastEl,
        { opacity: [1, 0], x: [0, 20] },
        { duration: 0.36, easing: [0.32, 0, 0.67, 0] }
      )
      if (anim && anim.finished) {
        anim.finished.then(() => toastEl.remove()).catch(() => toastEl.remove())
        return
      }
    }
    toastEl.remove()
  }
}

