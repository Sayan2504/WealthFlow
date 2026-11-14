import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  async syncNavs(event) {
    const btn = event?.currentTarget
    await this.postAndReload("/api/sync_navs", btn, (res) =>
      res.queued ? res.message : `Synced live AMFI NAVs for ${res.updated_count || 0} scheme(s)`
    )
  }

  async syncStocks(event) {
    const btn = event?.currentTarget
    await this.postAndReload("/api/sync_all_stocks", btn, (res) => res.message || "Holdings synced")
  }

  async syncRates(event) {
    const btn = event?.currentTarget
    await this.postAndReload("/api/statutory_rates", btn, (res) =>
      `Statutory rates synced (PPF ${res.ppf?.rate}%, EPF ${res.epf?.rate}%)`
    )
  }

  async postAndReload(url, btn, formatMessage) {
    if (btn) btn.disabled = true
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]')
      const headers = { "Content-Type": "application/json", Accept: "application/json" }
      if (csrfMeta) headers["X-CSRF-Token"] = csrfMeta.getAttribute("content")

      const res = await fetch(url, { method: "POST", headers, body: "{}" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)

      if (typeof window.showToast === "function") {
        window.showToast(formatMessage(json))
      }
      if (!json.queued) {
        window.location.reload()
      }
    } catch (err) {
      if (typeof window.showToast === "function") {
        window.showToast(err.message, "error")
      }
    } finally {
      if (btn) btn.disabled = false
    }
  }
}

