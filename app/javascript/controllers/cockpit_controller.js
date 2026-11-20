import { Controller } from "@hotwired/stimulus"

// Unified Stimulus Cockpit Controller bridging declarative data-action attributes
// to WealthFlow drawer, modal, PIN, confirmation, and portfolio mutation flows.
export default class extends Controller {
  openAdd(event) {
    const type = event.params?.type || event.currentTarget?.dataset?.entityType
    if (type && typeof window.openAddModal === "function") {
      window.openAddModal(type)
    }
  }

  openEdit(event) {
    const type = event.params?.type || event.currentTarget?.dataset?.entityType
    const id = event.params?.id ?? event.currentTarget?.dataset?.entityId
    if (type && typeof window.openEditModal === "function") {
      window.openEditModal(type, id)
    }
  }

  deleteItem(event) {
    const type = event.params?.type || event.currentTarget?.dataset?.entityType
    const id = event.params?.id ?? event.currentTarget?.dataset?.entityId
    const label = event.params?.label || event.currentTarget?.dataset?.entityLabel || "Record"
    if (type && typeof window.confirmDeleteItem === "function") {
      window.confirmDeleteItem(type, id, label)
    }
  }

  openAiDrawer() {
    if (typeof window.openAiAssistantDrawer === "function") {
      const q = document.getElementById("global-top-search")?.value || ""
      window.openAiAssistantDrawer(q)
    }
  }

  openOverlapDrawer(event) {
    const tab = event.params?.tab || "pairwise"
    if (typeof window.openOverlapIntelligenceDrawer === "function") {
      window.openOverlapIntelligenceDrawer(tab)
    }
  }

  openSipStepUpDrawer() {
    if (typeof window.openSipStepUpDrawer === "function") {
      window.openSipStepUpDrawer()
    }
  }

  openPinModal(event) {
    const enabled = String(event.params?.enabled) === "true"
    if (typeof window.openSecurityPinModal === "function") {
      window.openSecurityPinModal(enabled)
    }
  }

  lockSession() {
    if (typeof window.lockCockpitSession === "function") {
      window.lockCockpitSession()
    }
  }

  unlockSession(event) {
    event.preventDefault()
    if (typeof window.unlockCockpitSession === "function") {
      window.unlockCockpitSession()
    }
  }

  togglePinVisibility(event) {
    const targetId = event.params?.targetId
    if (targetId && typeof window.wfTogglePinVisibility === "function") {
      window.wfTogglePinVisibility(targetId, event.currentTarget)
    }
  }

  signOut() {
    if (typeof window.confirmSignOut === "function") {
      window.confirmSignOut()
    }
  }

  deleteAccount() {
    if (typeof window.confirmDeleteAccount === "function") {
      window.confirmDeleteAccount()
    }
  }

  closeDrawer() {
    if (typeof window.closeDrawer === "function") {
      window.closeDrawer()
    }
  }
}
