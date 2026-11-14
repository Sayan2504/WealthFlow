/* WealthFlow Pure Rails Client Interactivity Engine */
(function () {
  "use strict";

  if (window.__wfClientInitialized) return;
  window.__wfClientInitialized = true;

  let activeModalState = null;
  let calendarState = { inputId: null, year: new Date().getFullYear(), month: new Date().getMonth() };

  // ---------------------------------------------------------------------------
  // Formatting & Safety Helpers
  // ---------------------------------------------------------------------------
  function escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNum(val, decimals = 0) {
    let n = Number(val);
    if (!Number.isFinite(n)) n = 0;
    return n.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatInr(val, decimals = 0) {
    let n = Number(val);
    if (!Number.isFinite(n)) n = 0;
    const sign = n < 0 ? "-" : "";
    return sign + "₹" + formatNum(Math.abs(n), decimals);
  }

  function formatDateDmy(isoStr) {
    const s = String(isoStr || "").trim();
    const parts = s.split("-");
    if (parts.length !== 3) return s || "—";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function todayIso() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute("content") : "";
  }

  async function apiJson(url, options = {}) {
    const headers = Object.assign(
      { "Content-Type": "application/json", Accept: "application/json" },
      csrfToken() ? { "X-CSRF-Token": csrfToken() } : {},
      options.headers || {}
    );
    const res = await fetch(url, Object.assign({}, options, { headers }));
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch (_) {
      json = { success: false, error: "Invalid server response" };
    }
    if (!res.ok) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json;
  }

  // ---------------------------------------------------------------------------
  // Toast & Confirm Dialogs
  // ---------------------------------------------------------------------------
  function showToast(msg, variant = "success") {
    if (typeof window.__wfPushToast === "function") {
      window.__wfPushToast(msg, variant);
      return;
    }

    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const isError = variant === "error" || variant === "alert";
    const el = document.createElement("div");
    el.setAttribute("role", isError ? "alert" : "status");
    el.className = "wf-toast pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-xs font-medium max-w-sm " +
      (isError ? "bg-rose-950/95 border-rose-500/60 text-rose-100 wf-toast-error" : "bg-slate-900/95 border-emerald-500/50 text-white wf-toast-success");
    const dot = document.createElement("span");
    dot.className = "mt-1 w-2 h-2 rounded-full shrink-0 " + (isError ? "bg-rose-400" : "bg-emerald-400");
    const span = document.createElement("span");
    span.className = "flex-1 leading-relaxed";
    span.textContent = String(msg || "");
    el.appendChild(dot);
    el.appendChild(span);
    stack.appendChild(el);
    setTimeout(() => el.remove(), isError ? 5000 : 3500);
  }
  window.showToast = showToast;

  let activeConfirmCleanup = null;

  function closeConfirmDialog() {
    if (typeof activeConfirmCleanup === "function") {
      activeConfirmCleanup();
      activeConfirmCleanup = null;
    }
    const existing = document.getElementById("wf-inline-confirm-pane");
    if (existing) existing.remove();
  }

  function positionConfirmPane(pane, anchorEl) {
    const pad = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = pane.getBoundingClientRect();

    if (anchorEl && anchorEl.isConnected) {
      const a = anchorEl.getBoundingClientRect();
      if (a.width > 0 || a.height > 0) {
        let left = a.right - rect.width;
        if (left < pad) left = a.left;
        left = Math.max(pad, Math.min(left, vw - rect.width - pad));

        const spaceBelow = vh - a.bottom - pad;
        const spaceAbove = a.top - pad;
        let top;
        if (spaceBelow >= rect.height + 8 || spaceBelow >= spaceAbove) {
          top = Math.min(a.bottom + 8, vh - rect.height - pad);
        } else {
          top = Math.max(pad, a.top - rect.height - 8);
        }
        pane.style.left = `${Math.round(left)}px`;
        pane.style.top = `${Math.round(top)}px`;
        return;
      }
    }

    pane.style.left = `${Math.round(Math.max(pad, (vw - rect.width) / 2))}px`;
    pane.style.top = `${Math.round(Math.max(pad, (vh - rect.height) / 2))}px`;
  }

  function openConfirmDialog(title, message, onProceed, options = {}) {
    closeConfirmDialog();

    const confirmLabel = options.confirmLabel || "Confirm";
    const step2Prompt = options.step2Prompt || "Please confirm again to complete this action.";
    const rawEventTarget = typeof window.event !== "undefined" && window.event && window.event.target instanceof Element
      ? window.event.target.closest("button, a, [role='button']") || window.event.target
      : null;
    const anchorEl = options.anchorEl || rawEventTarget || (document.activeElement instanceof Element ? document.activeElement : null);

    const pane = document.createElement("div");
    pane.id = "wf-inline-confirm-pane";
    pane.setAttribute("role", "alertdialog");
    pane.setAttribute("aria-modal", "false");
    pane.className = "fixed z-[75] w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-slate-900/95 border border-slate-700/90 shadow-2xl p-4 backdrop-blur-xl";
    pane.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(pane);

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeConfirmDialog();
    };
    const onDocClick = (e) => {
      if (!pane.contains(e.target) && (!anchorEl || !anchorEl.contains(e.target))) {
        closeConfirmDialog();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const clickTimer = setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);

    activeConfirmCleanup = () => {
      clearTimeout(clickTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onDocClick);
    };

    pane.innerHTML = `
      <div class="rounded-xl bg-rose-950/60 border border-rose-500/35 p-3.5 flex items-start gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <div class="space-y-1 min-w-0">
          <div class="text-[10px] font-bold uppercase tracking-wider text-rose-300">Warning</div>
          <div class="text-xs font-bold text-white">${escHtml(title || "Confirm Action")}</div>
          <p class="text-[11px] text-slate-300 leading-relaxed">${escHtml(message)}</p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 mt-3">
        <button type="button" id="wf-confirm-cancel-btn" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer">Cancel</button>
        <button type="button" id="wf-confirm-final-btn" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer">${escHtml(confirmLabel)}</button>
      </div>
    `;
    positionConfirmPane(pane, anchorEl);
    pane.querySelector("#wf-confirm-cancel-btn").onclick = () => closeConfirmDialog();
    const finalBtn = pane.querySelector("#wf-confirm-final-btn");
    finalBtn.onclick = async () => {
      finalBtn.disabled = true;
      try {
        await onProceed();
      } finally {
        finalBtn.disabled = false;
        closeConfirmDialog();
      }
    };

    if (typeof pane.animate === "function") {
      pane.animate(
        [
          { opacity: 0, transform: "translateY(6px) scale(0.95)" },
          { opacity: 1, transform: "translateY(0) scale(1)" }
        ],
        { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
  }

  window.confirmSignOut = function () {
    openConfirmDialog(
      "Sign Out of WealthFlow",
      "Warning: You are about to sign out of your WealthFlow cockpit. Any unsaved drawer edits will be discarded.",
      () => {
        const form = document.getElementById("wf-signout-form");
        if (form) form.requestSubmit();
      },
      {
        confirmLabel: "Confirm Sign Out",
        step2Prompt: "Are you sure you want to end your current session and sign out?"
      }
    );
  };

  window.confirmDeleteAccount = function () {
    openConfirmDialog(
      "Delete Account Permanently",
      "Warning: Deleting your account will permanently erase your login and all isolated financial records.",
      () => {
        const form = document.getElementById("wf-delete-account-form");
        if (form) form.requestSubmit();
      },
      {
        confirmLabel: "Yes, Delete Account",
        step2Prompt: "Final confirmation: This account and all portfolio data cannot be recovered."
      }
    );
  };

  window.confirmDeleteItem = function (type, id, label) {
    openConfirmDialog(
      "Delete Record",
      `Warning: Are you sure you want to permanently remove "${label}" from your portfolio?`,
      async () => {
        try {
          await apiJson("/api/delete_item", {
            method: "POST",
            body: JSON.stringify({ type, id })
          });
          showToast(`Deleted "${label}"`);
          window.location.reload();
        } catch (err) {
          showToast(err.message, "error");
        }
      },
      {
        confirmLabel: "Yes, Delete Permanently",
        step2Prompt: `Final confirmation: Permanently delete "${label}"? This action cannot be undone.`
      }
    );
  };

  window.confirmClearAllData = function () {
    openConfirmDialog(
      "Reset All Portfolio Data?",
      "Warning: This clears all saved investments, deposits, insurance policies and bank accounts back to an empty slate.",
      async () => {
        try {
          await apiJson("/api/clear_data", { method: "POST", body: "{}" });
          showToast("Portfolio reset complete");
          window.location.href = "/";
        } catch (err) {
          showToast(err.message, "error");
        }
      },
      {
        confirmLabel: "Confirm Reset",
        step2Prompt: "Final confirmation: All portfolio entries in this workspace will be cleared."
      }
    );
  };

  window.closeConfirmDialog = closeConfirmDialog;

  // ---------------------------------------------------------------------------
  // Custom Dropdowns
  // ---------------------------------------------------------------------------
  window.wfToggleDropdown = function (id, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const targetMenu = document.getElementById(`dd-menu-${id}`);
    if (!targetMenu) return;
    const isHidden = targetMenu.classList.contains("hidden");
    document.querySelectorAll('[id^="dd-menu-"]').forEach((m) => m.classList.add("hidden"));
    if (isHidden) {
      targetMenu.classList.remove("hidden");
      if (window.Motion && typeof window.Motion.animate === "function") {
        window.Motion.animate(
          targetMenu,
          { opacity: [0, 1], y: [-6, 0], scale: [0.985, 1] },
          { duration: 0.38, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
        );
      }
    }
  };

  window.wfSelectDropdownOption = function (id, val, label) {
    const input = document.getElementById(id);
    const labelEl = document.getElementById(`dd-label-${id}`);
    const menu = document.getElementById(`dd-menu-${id}`);
    const wrap = document.getElementById(`dd-wrap-${id}`);

    if (input) input.value = val;
    if (labelEl) labelEl.textContent = label;
    if (menu) {
      menu.querySelectorAll("button[data-value]").forEach((btn) => {
        const match = btn.getAttribute("data-value") === String(val);
        btn.className =
          "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between " +
          (match ? "bg-indigo-500/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-slate-800/90 hover:text-white");
      });
      menu.classList.add("hidden");
    }

    const onChangeExpr = wrap ? wrap.getAttribute("data-onchange") : "";
    if (onChangeExpr) {
      try {
        new Function(onChangeExpr)();
      } catch (e) {
        console.error("Dropdown onchange error:", e);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Custom Drawer Calendar Datepicker (Container-relative inside #drawer-panel)
  // ---------------------------------------------------------------------------
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function ensureCalendarPopover() {
    let pop = document.getElementById("wf-calendar-popover");
    const host = document.getElementById("drawer-panel") || document.body;
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "wf-calendar-popover";
      pop.className = "hidden absolute z-[90] w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3.5 text-slate-100";
      pop.addEventListener("click", (e) => e.stopPropagation());
    }
    if (pop.parentElement !== host) {
      host.appendChild(pop);
    }
    return pop;
  }

  window.openCalendarPicker = function (inputId, triggerEl, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const input = document.getElementById(inputId);
    const pop = ensureCalendarPopover();
    const host = document.getElementById("drawer-panel") || document.body;
    if (!input || !pop) return;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input.value || "").trim());
    if (match) {
      calendarState.year = Number(match[1]);
      calendarState.month = Number(match[2]) - 1;
    } else {
      const now = new Date();
      calendarState.year = now.getFullYear();
      calendarState.month = now.getMonth();
    }
    calendarState.inputId = inputId;

    const anchor = triggerEl || input;
    const aRect = anchor.getBoundingClientRect();
    const hRect = host.getBoundingClientRect();

    let top = aRect.bottom - hRect.top + 6;
    let left = aRect.left - hRect.left;
    if (left + 288 > hRect.width - 12) {
      left = Math.max(12, hRect.width - 300);
    }
    if (top + 290 > hRect.height && aRect.top - hRect.top > 290) {
      top = Math.max(8, aRect.top - hRect.top - 295);
    }

    pop.style.top = `${Math.round(top)}px`;
    pop.style.left = `${Math.round(left)}px`;
    pop.classList.remove("hidden");
    renderCalendarGrid();
    if (window.Motion && typeof window.Motion.animate === "function") {
      window.Motion.animate(
        pop,
        { opacity: [0, 1], y: [-6, 0], scale: [0.985, 1] },
        { duration: 0.38, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
      );
    }
  };

  window.wfCalendarNav = function (deltaMonth, deltaYear, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    calendarState.month += deltaMonth;
    calendarState.year += deltaYear;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year -= 1;
    } else if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year += 1;
    }
    renderCalendarGrid();
  };

  window.wfCalendarPick = function (isoStr, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const input = document.getElementById(calendarState.inputId);
    if (input) {
      input.value = isoStr;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const pop = document.getElementById("wf-calendar-popover");
    if (pop) pop.classList.add("hidden");
  };

  function renderCalendarGrid() {
    const pop = document.getElementById("wf-calendar-popover");
    const input = document.getElementById(calendarState.inputId);
    if (!pop) return;

    const y = calendarState.year;
    const m = calendarState.month;
    const selected = input ? String(input.value || "").trim() : "";
    const today = todayIso();

    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let dayCells = "";
    for (let i = 0; i < firstDow; i++) {
      dayCells += `<div></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = iso === selected;
      const isToday = iso === today;
      const cls = isSelected
        ? "bg-indigo-600 text-white font-bold shadow"
        : isToday
        ? "bg-slate-800 text-indigo-300 border border-indigo-500/50 font-semibold"
        : "text-slate-300 hover:bg-slate-800";
      dayCells += `<button type="button" onclick="wfCalendarPick('${iso}', event)" class="h-8 w-full rounded-lg text-xs font-mono transition-colors ${cls}">${d}</button>`;
    }

    pop.innerHTML = `
      <div class="flex items-center justify-between gap-1 mb-2.5">
        <button type="button" onclick="wfCalendarNav(0, -1, event)" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300" title="Previous Year">&laquo;</button>
        <button type="button" onclick="wfCalendarNav(-1, 0, event)" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300" title="Previous Month">&lsaquo;</button>
        <div class="text-xs font-bold text-white px-2 text-center">${MONTHS[m]} ${y}</div>
        <button type="button" onclick="wfCalendarNav(1, 0, event)" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300" title="Next Month">&rsaquo;</button>
        <button type="button" onclick="wfCalendarNav(0, 1, event)" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300" title="Next Year">&raquo;</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500 mb-1">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>
      <div class="grid grid-cols-7 gap-1">${dayCells}</div>
      <div class="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800 text-[11px]">
        <button type="button" onclick="wfCalendarPick('${today}', event)" class="text-indigo-300 hover:text-indigo-200 font-medium">Today</button>
        <button type="button" onclick="wfCalendarPick('', event)" class="text-slate-400 hover:text-slate-200">Clear</button>
      </div>
    `;
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".wf-dropdown")) {
      document.querySelectorAll('[id^="dd-menu-"]').forEach((m) => m.classList.add("hidden"));
    }
    const calPop = document.getElementById("wf-calendar-popover");
    if (calPop && !calPop.classList.contains("hidden")) {
      if (!e.target.closest("#wf-calendar-popover") && !e.target.closest("[data-cal-trigger]")) {
        calPop.classList.add("hidden");
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Unified Slide-Over Drawer (Forms, Confirmations, AI Assistant & Diagnostics)
  // ---------------------------------------------------------------------------
  let drawerHideTimer = null;
  let isClosingDrawer = false;
  let activeDrawerAnims = [];

  function cancelDrawerAnimations() {
    while (activeDrawerAnims.length) {
      const a = activeDrawerAnims.pop();
      if (a && typeof a.cancel === "function") a.cancel();
    }
  }

  function animateMotionUpdate(el, opts = {}) {
    if (!el || !window.Motion || typeof window.Motion.animate !== "function") return;
    window.Motion.animate(
      el,
      { opacity: [0.35, 1], y: [6, 0] },
      { duration: opts.duration || 0.42, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
    );
  }

  function openDrawer(title, subtitle, bodyHtml, options = {}) {
    const drawer = document.getElementById("right-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    const panel = document.getElementById("drawer-panel");
    const headerEl = document.getElementById("drawer-header");
    const titleEl = document.getElementById("drawer-title");
    const subEl = document.getElementById("drawer-subtitle");
    const bodyEl = document.getElementById("drawer-body");
    const footerEl = document.getElementById("drawer-footer");
    const submitBtn = document.getElementById("drawer-submit-btn");
    if (!drawer || !panel) return;

    const wasClosed = drawer.classList.contains("hidden") || isClosingDrawer;
    isClosingDrawer = false;

    if (drawerHideTimer) {
      clearTimeout(drawerHideTimer);
      drawerHideTimer = null;
    }
    cancelDrawerAnimations();

    titleEl.textContent = title;
    subEl.textContent = subtitle || "";
    bodyEl.innerHTML = bodyHtml;

    if (footerEl && submitBtn) {
      const mode = options.footerMode || "none";
      if (mode === "none") {
        footerEl.classList.add("hidden");
        submitBtn.onclick = null;
      } else {
        footerEl.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = options.submitLabel || (mode === "confirm" ? "Confirm" : "Save Changes");
        submitBtn.className =
          mode === "confirm"
            ? "wf-cta-solid px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/25 transition-colors cursor-pointer"
            : "wf-cta-solid px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-colors cursor-pointer";
        submitBtn.onclick = mode === "confirm" && typeof options.onConfirm === "function"
          ? () => options.onConfirm(submitBtn)
          : () => submitModalForm();
      }
    }

    drawer.classList.remove("hidden");
    backdrop.classList.remove("opacity-0");
    backdrop.classList.add("opacity-100");
    panel.classList.remove("translate-x-full");
    panel.classList.add("translate-x-0");

    if (window.Motion && typeof window.Motion.animate === "function") {
      if (wasClosed) {
        activeDrawerAnims.push(
          window.Motion.animate(
            backdrop,
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 0.52, easing: [0.22, 1, 0.36, 1] }
          )
        );
        activeDrawerAnims.push(
          window.Motion.animate(
            panel,
            [
              { transform: "translate3d(100%, 0, 0)" },
              { transform: "translate3d(0%, 0, 0)" }
            ],
            { duration: 0.68, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
          )
        );
        if (bodyEl) {
          activeDrawerAnims.push(
            window.Motion.animate(
              bodyEl,
              [
                { opacity: 0.72, transform: "translate3d(0, 8px, 0)" },
                { opacity: 1, transform: "translate3d(0, 0, 0)" }
              ],
              { duration: 0.48, delay: 0.16, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
            )
          );
        }
      } else if (bodyEl) {
        activeDrawerAnims.push(
          window.Motion.animate(
            bodyEl,
            [
              { opacity: 0.65, transform: "translate3d(0, 6px, 0)" },
              { opacity: 1, transform: "translate3d(0, 0, 0)" }
            ],
            { duration: 0.38, easing: [0.22, 1, 0.36, 1], clearOnFinish: true }
          )
        );
      }
    }
  }

  window.closeDrawer = function () {
    const drawer = document.getElementById("right-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    const panel = document.getElementById("drawer-panel");
    const footerEl = document.getElementById("drawer-footer");
    const pop = document.getElementById("wf-calendar-popover");
    if (pop) pop.classList.add("hidden");
    activeModalState = null;
    if (!drawer || !panel || drawer.classList.contains("hidden")) return;

    if (drawerHideTimer) {
      clearTimeout(drawerHideTimer);
      drawerHideTimer = null;
    }
    cancelDrawerAnimations();
    isClosingDrawer = true;

    if (footerEl) footerEl.classList.add("hidden");

    const finishClose = () => {
      if (!isClosingDrawer) return;
      drawer.classList.add("hidden");
      backdrop.classList.add("opacity-0");
      backdrop.classList.remove("opacity-100");
      panel.classList.add("translate-x-full");
      panel.classList.remove("translate-x-0");
      cancelDrawerAnimations();
      isClosingDrawer = false;
      if (drawerHideTimer) {
        clearTimeout(drawerHideTimer);
        drawerHideTimer = null;
      }
    };

    if (window.Motion && typeof window.Motion.animate === "function") {
      const bgAnim = window.Motion.animate(
        backdrop,
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 0.46, easing: [0.22, 1, 0.36, 1] }
      );
      const panelAnim = window.Motion.animate(
        panel,
        [
          { transform: "translate3d(0%, 0, 0)" },
          { transform: "translate3d(100%, 0, 0)" }
        ],
        { duration: 0.56, easing: [0.22, 1, 0.36, 1], fill: "forwards" }
      );
      activeDrawerAnims.push(bgAnim, panelAnim);
      if (panelAnim && panelAnim.finished) {
        panelAnim.finished.then(finishClose).catch(finishClose);
      }
      drawerHideTimer = setTimeout(finishClose, 620);
    } else {
      isClosingDrawer = false;
      backdrop.classList.add("opacity-0");
      backdrop.classList.remove("opacity-100");
      panel.classList.add("translate-x-full");
      panel.classList.remove("translate-x-0");
      drawer.classList.add("hidden");
    }
  };

  window.openAiAssistantDrawer = function (initialQuery = "") {
    const q = String(initialQuery || "").trim();
    openDrawer(
      "WealthFlow AI Assistant",
      "Ask any question about your portfolio — 100% backend-computed insights",
      `
        <div class="space-y-4">
          <form onsubmit="event.preventDefault(); submitAiDrawerQuery();" class="flex items-center gap-2">
            <input
              id="ai-drawer-input"
              type="text"
              value="${escHtml(q)}"
              placeholder="Ask about net worth, post-tax FD yield, SIP step-up, PPF, tax..."
              class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            >
            <button
              type="submit"
              class="wf-cta-solid px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0 cursor-pointer"
            >Ask</button>
          </form>

          <div id="ai-drawer-prompts" class="flex flex-wrap gap-1.5"></div>
          <div id="ai-drawer-answer" class="text-xs text-slate-300">Loading AI insights...</div>
          <div id="ai-drawer-matches" class="space-y-1.5"></div>
        </div>
      `,
      { footerMode: "none" }
    );
    submitAiDrawerQuery(q);
  };

  window.submitAiDrawerQuery = async function (overrideQuery) {
    const input = document.getElementById("ai-drawer-input");
    const promptsEl = document.getElementById("ai-drawer-prompts");
    const answerEl = document.getElementById("ai-drawer-answer");
    const matchesEl = document.getElementById("ai-drawer-matches");
    if (!answerEl) return;

    const query = String(overrideQuery !== undefined ? overrideQuery : (input?.value || "")).trim();
    if (input && overrideQuery !== undefined) input.value = query;
    answerEl.innerHTML = `<div class="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-xs text-slate-400">Analyzing your portfolio via backend engine...</div>`;

    try {
      const json = await apiJson(`/api/search?q=${encodeURIComponent(query)}`);
      const prompts = Array.isArray(json.quick_prompts) ? json.quick_prompts : [];
      if (promptsEl) {
        promptsEl.innerHTML = prompts
          .map((p) => `
            <button type="button" onclick="submitAiDrawerQuery('${escHtml(p).replace(/'/g, "\\'")}')"
              class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer">
              ${escHtml(p)}
            </button>
          `)
          .join("");
      }

      const ai = json.ai_insight;
      if (ai && ai.answer) {
        answerEl.innerHTML = `
          <div class="rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900/90 border border-indigo-500/35 p-5 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="inline-block px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-bold uppercase text-indigo-300">${escHtml(ai.badge || "AI Insight")}</span>
                <h4 class="text-sm font-bold text-white mt-1.5">${escHtml(ai.title)}</h4>
              </div>
              ${ai.metric ? `<div class="text-sm font-mono font-bold text-emerald-300 shrink-0">${escHtml(ai.metric)}</div>` : ""}
            </div>
            <p class="text-xs text-slate-200 leading-relaxed">${escHtml(ai.answer)}</p>
            ${ai.url ? `<div class="pt-1"><a href="${escHtml(ai.url)}" onclick="closeDrawer()" class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200">Go to module &rarr;</a></div>` : ""}
          </div>
        `;
      } else {
        answerEl.innerHTML = `<div class="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-xs text-slate-400">No direct insight available for this query.</div>`;
      }
      animateMotionUpdate(answerEl);

      if (matchesEl) {
        const results = Array.isArray(json.results) ? json.results.slice(0, 6) : [];
        if (results.length) {
          matchesEl.innerHTML = `
            <div class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 pt-2">Related Portfolio Pages &amp; Records</div>
            ${results.map((r) => `
              <a href="${escHtml(r.url)}" onclick="closeDrawer()" class="block px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 transition-colors">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-semibold text-white">${escHtml(r.title)}</span>
                  <span class="text-[11px] font-mono text-emerald-300">${escHtml(r.value || r.badge || "")}</span>
                </div>
                <div class="text-[11px] text-slate-400 truncate mt-0.5">${escHtml(r.subtitle)}</div>
              </a>
            `).join("")}
          `;
          animateMotionUpdate(matchesEl);
        } else {
          matchesEl.innerHTML = "";
        }
      }
    } catch (err) {
      answerEl.innerHTML = `<div class="rounded-xl bg-rose-950/70 border border-rose-500/30 p-4 text-xs text-rose-300">${escHtml(err.message)}</div>`;
    }
  };

  window.openOverlapIntelligenceDrawer = async function (initialTab = "pairwise") {
    const funds = (window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || [];
    if (funds.length < 2) {
      showToast("Add at least 2 mutual funds to inspect portfolio overlap", "error");
      return;
    }

    const optionsA = funds.map((f, i) => `<option value="${escHtml(f.id)}" ${i === 0 ? "selected" : ""}>${escHtml(f.scheme_name)}</option>`).join("");
    const optionsB = funds.map((f, i) => `<option value="${escHtml(f.id)}" ${i === 1 ? "selected" : ""}>${escHtml(f.scheme_name)}</option>`).join("");

    openDrawer(
      "Mutual Fund Overlap Intelligence",
      "Cross-scheme equity overlap & diversification diagnostics",
      `
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] uppercase text-slate-400 mb-1">Scheme A</label>
              <select id="drawer-ov-a" onchange="refreshDrawerOverlap()" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white">${optionsA}</select>
            </div>
            <div>
              <label class="block text-[11px] uppercase text-slate-400 mb-1">Scheme B</label>
              <select id="drawer-ov-b" onchange="refreshDrawerOverlap()" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white">${optionsB}</select>
            </div>
          </div>
          <div id="drawer-ov-result" class="text-xs text-slate-400">Computing overlap...</div>
        </div>
      `
    );
    refreshDrawerOverlap();
  };

  window.refreshDrawerOverlap = async function () {
    const idA = document.getElementById("drawer-ov-a")?.value;
    const idB = document.getElementById("drawer-ov-b")?.value;
    const out = document.getElementById("drawer-ov-result");
    if (!idA || !idB || !out) return;

    try {
      const res = await apiJson(`/api/mutual_funds/overlap?fund_a_id=${encodeURIComponent(idA)}&fund_b_id=${encodeURIComponent(idB)}`);
      out.innerHTML = res.html || "<div class='text-slate-400'>No overlap data</div>";
      animateMotionUpdate(out);
    } catch (err) {
      out.innerHTML = `<div class="text-rose-400">${escHtml(err.message)}</div>`;
    }
  };

  window.openSipStepUpDrawer = function () {
    const funds = (window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || [];
    if (!funds.length) {
      showToast("Add a mutual fund scheme first", "error");
      return;
    }

    const rows = funds
      .map((f) => {
        const sip = Number(f.sip_amount || 0);
        const step = Number(f.step_up_pct || 0);
        return `
          <div class="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold text-xs text-white">${escHtml(f.scheme_name)}</div>
              <span class="text-xs font-mono text-indigo-300">Current SIP: ${formatInr(sip)}/mo</span>
            </div>
            <div class="flex items-center gap-3">
              <input type="range" min="0" max="50" step="2.5" value="${step}" data-stepup-fund="${escHtml(f.id)}" data-sip="${sip}" oninput="onStepUpDrag(this)" class="flex-1 accent-indigo-500">
              <span id="stepup-label-${escHtml(f.id)}" class="w-16 text-right font-mono text-xs font-bold text-cyan-300">${step}%/yr</span>
            </div>
          </div>
        `;
      })
      .join("");

    openDrawer(
      "SIP Annual Step-Up Simulator",
      "Adjust annual % step-up per fund & see 10-year compounding impact (12% p.a. illustrative)",
      `
        <div class="space-y-4">
          <div id="stepup-projection-box" class="rounded-xl bg-gradient-to-r from-indigo-950/60 to-emerald-950/40 border border-indigo-500/30 p-4 grid grid-cols-2 gap-3 text-xs"></div>
          <div class="space-y-3">${rows}</div>
          <button type="button" onclick="saveStepUpChanges()" class="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Save Step-Up Plan to Portfolio
          </button>
        </div>
      `
    );
    recomputeStepUpProjection();
  };

  window.onStepUpDrag = function (el) {
    const fid = el.getAttribute("data-stepup-fund");
    const label = document.getElementById(`stepup-label-${fid}`);
    if (label) label.textContent = `${el.value}%/yr`;
    recomputeStepUpProjection();
  };

  async function recomputeStepUpProjection() {
    const sliders = document.querySelectorAll("input[data-stepup-fund]");
    const box = document.getElementById("stepup-projection-box");
    if (!box) return;

    const stepUps = {};
    sliders.forEach((s) => {
      stepUps[s.getAttribute("data-stepup-fund")] = Number(s.value || 0);
    });

    try {
      const res = await apiJson("/api/mutual_funds/sip_projection", {
        method: "POST",
        body: JSON.stringify({ step_ups: stepUps })
      });
      if (res && res.html) {
        box.innerHTML = res.html;
        animateMotionUpdate(box);
      }
    } catch (err) {
      box.innerHTML = `<div class="col-span-2 text-xs text-rose-400">${escHtml(err.message)}</div>`;
    }
  }

  window.saveStepUpChanges = async function () {
    const stepUps = {};
    document.querySelectorAll("input[data-stepup-fund]").forEach((s) => {
      stepUps[s.getAttribute("data-stepup-fund")] = Number(s.value || 0);
    });
    try {
      await apiJson("/api/save_step_up", {
        method: "POST",
        body: JSON.stringify({ step_ups: stepUps })
      });
      showToast("SIP step-up plan saved");
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.openFundHoldingsDrawer = function (fundId) {
    const funds = (window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || [];
    const fund = funds.find((f) => String(f.id) === String(fundId));
    if (!fund) {
      showToast("Mutual fund not found", "error");
      return;
    }

    const holdings = Array.isArray(fund.holdings) ? fund.holdings : [];
    const rows = holdings
      .map(
        (h) => `
      <tr class="border-b border-slate-800/70">
        <td class="py-2 pr-2">
          <div class="font-medium text-white">${escHtml(h.stock)}</div>
          <div class="text-[10px] text-slate-400">${escHtml(h.ticker)} • ${escHtml(h.sector)}</div>
        </td>
        <td class="py-2 px-2 text-right font-mono text-indigo-300">${formatNum(h.weight, 2)}%</td>
        <td class="py-2 pl-2 text-right">
          <button type="button" onclick="deleteStockHolding('${escHtml(fund.id)}', '${escHtml(h.ticker)}')" class="text-rose-400 hover:text-rose-300 text-[11px]">Remove</button>
        </td>
      </tr>
    `
      )
      .join("");

    openDrawer(
      fund.scheme_name,
      `Code: ${fund.scheme_code || "—"} • Source: ${fund.holdings_source || "Factsheet Disclosure"}`,
      `
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-slate-300 font-semibold">${holdings.length} Underlying Disclosed Holdings</span>
            <button type="button" onclick="fetchFundLiveStocks('${escHtml(fund.id)}')" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30">
              Refresh Official Holdings
            </button>
          </div>

          <div class="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2">
            <div class="text-[11px] uppercase font-semibold text-slate-400">Add / Update Custom Stock Holding</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input id="add-stk-name" placeholder="Stock name" class="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white">
              <input id="add-stk-ticker" placeholder="Ticker (e.g. HDFCBANK)" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white">
              <input id="add-stk-weight" type="number" step="0.1" placeholder="Weight %" class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white">
            </div>
            <div class="flex items-center justify-between gap-2">
              <input id="add-stk-sector" placeholder="Sector (optional)" class="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white">
              <button type="button" onclick="addManualStockHolding('${escHtml(fund.id)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">Add Stock</button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                  <th class="py-2 pr-2">Holding</th>
                  <th class="py-2 px-2 text-right">Weight %</th>
                  <th class="py-2 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="3" class="py-6 text-center text-slate-500">No holdings recorded yet.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `
    );
  };

  window.fetchFundLiveStocks = async function (fundId) {
    const fund = ((window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || []).find((f) => String(f.id) === String(fundId));
    const schemeCode = fund ? fund.scheme_code || "" : "";
    const schemeName = fund ? fund.scheme_name || "" : "";
    try {
      const res = await apiJson("/api/fetch_live_stocks", {
        method: "POST",
        body: JSON.stringify({ fund_id: fundId, scheme_code: schemeCode, scheme_name: schemeName })
      });
      if (fund && Array.isArray(res.holdings)) {
        fund.holdings = res.holdings;
        fund.holdings_source = res.source;
      }
      showToast(`Synced ${res.holdings_count || 0} holdings`);
      openFundHoldingsDrawer(fundId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.addManualStockHolding = async function (fundId) {
    const stock = document.getElementById("add-stk-name")?.value.trim();
    const ticker = document.getElementById("add-stk-ticker")?.value.trim();
    const weight = Number(document.getElementById("add-stk-weight")?.value || 0);
    const sector = document.getElementById("add-stk-sector")?.value.trim() || "Equity";
    if (!stock || weight <= 0) {
      showToast("Enter valid stock name and weight %", "error");
      return;
    }
    try {
      const res = await apiJson("/api/add_stock", {
        method: "POST",
        body: JSON.stringify({ fund_id: fundId, stock, ticker, sector, weight })
      });
      const fund = ((window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || []).find((f) => String(f.id) === String(fundId));
      if (fund && Array.isArray(res.holdings)) fund.holdings = res.holdings;
      showToast(`Added ${stock}`);
      openFundHoldingsDrawer(fundId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.deleteStockHolding = async function (fundId, ticker) {
    try {
      const res = await apiJson("/api/delete_stock", {
        method: "POST",
        body: JSON.stringify({ fund_id: fundId, ticker })
      });
      const fund = ((window.TRACKER_DATA && window.TRACKER_DATA.mutual_funds) || []).find((f) => String(f.id) === String(fundId));
      if (fund && Array.isArray(res.holdings)) fund.holdings = res.holdings;
      showToast(`Removed ${ticker}`);
      openFundHoldingsDrawer(fundId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // Mutual Fund & Retirement Actions
  // ---------------------------------------------------------------------------
  window.compareSelectedFundsOverlap = async function () {
    const fundAId = document.getElementById("overlap-fund-a")?.value;
    const fundBId = document.getElementById("overlap-fund-b")?.value;
    const box = document.getElementById("pairwise-overlap-container");
    if (!fundAId || !fundBId || !box) return;

    box.innerHTML = `<div class="py-8 text-center text-xs text-slate-400">Calculating stock overlap...</div>`;
    try {
      const res = await apiJson(`/api/mutual_funds/overlap?fund_a_id=${encodeURIComponent(fundAId)}&fund_b_id=${encodeURIComponent(fundBId)}`);
      box.innerHTML = res.html || "";
    } catch (err) {
      box.innerHTML = `<div class="py-6 text-center text-xs text-rose-400">${escHtml(err.message)}</div>`;
    }
  };

  window.syncAllMutualFundNavs = async function () {
    const btn = document.getElementById("sync-navs-btn");
    if (btn) btn.disabled = true;
    try {
      const res = await apiJson("/api/sync_navs", { method: "POST", body: "{}" });
      showToast(`Synced live AMFI NAVs for ${res.updated_count || 0} scheme(s)`);
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.syncAllMutualFundStocks = async function () {
    try {
      const res = await apiJson("/api/sync_all_stocks", { method: "POST", body: "{}" });
      showToast(res.message || "Holdings synced");
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.syncStatutoryRetirementRates = async function () {
    const btn = document.getElementById("sync-statutory-btn");
    if (btn) btn.disabled = true;
    try {
      const res = await apiJson("/api/statutory_rates", { method: "POST", body: "{}" });
      showToast(`Statutory rates synced (PPF ${res.ppf.rate}%, EPF ${res.epf.rate}%)`);
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Fixed Income Tax Slab Switcher (Server-Calculated via Backend API)
  // ---------------------------------------------------------------------------
  window.setFiTaxSlab = async function (slabRate) {
    const slab = Number(slabRate || 0);

    const slabBtns = Array.from(document.querySelectorAll(".fi-slab-btn"));
    let activeBtn = null;
    slabBtns.forEach((btn) => {
      const match = Number(btn.getAttribute("data-slab")) === slab;
      if (match) activeBtn = btn;
      btn.className =
        "fi-slab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors duration-200 " +
        (match
          ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/25"
          : "bg-slate-900/80 text-slate-300 border-slate-700 hover:border-indigo-500/50");
    });
    if (activeBtn && window.Motion) {
      const group = activeBtn.closest(".wf-glide-group");
      if (group && typeof window.Motion.glidePill === "function") {
        window.Motion.glidePill(group, activeBtn);
      }
      if (typeof window.Motion.waveGroup === "function") {
        window.Motion.waveGroup(slabBtns, activeBtn);
      }
    }

    try {
      const json = await apiJson("/api/fixed_income/slab_preview", {
        method: "POST",
        body: JSON.stringify({ slab })
      });
      if (!json || !json.postTax) return;
      const pt = json.postTax;
      const taxEl = document.getElementById("fi-tax-deducted");
      const effEl = document.getElementById("fi-effective-tax-label");
      const netEl = document.getElementById("fi-post-tax-interest");
      const yieldEl = document.getElementById("fi-post-tax-yield");

      if (taxEl) taxEl.textContent = pt.estimatedTaxInr || "₹0";
      if (effEl) effEl.textContent = `Effective Rate: ${pt.effectiveTaxPct || "0.00"}%`;
      if (netEl) netEl.textContent = pt.postTaxGainInr || "₹0";
      if (yieldEl) yieldEl.textContent = `${pt.postTaxYieldPct || "0.00%"} p.a.`;

      const rows = json.rows || {};
      const updatedCells = [];
      document.querySelectorAll(".fi-post-tax-cell").forEach((cell) => {
        const key = cell.getAttribute("data-row-key");
        const rowData = key ? rows[key] : null;
        if (!rowData) return;
        cell.innerHTML = `${escHtml(rowData.post_tax_gain_inr)}<div class="text-[10px] text-slate-400">(${escHtml(rowData.post_tax_yield_pct)} net)</div>`;
        updatedCells.push(cell);
      });
      if (window.Motion && typeof window.Motion.animate === "function") {
        const animatedTargets = [taxEl, netEl, yieldEl, ...updatedCells].filter(Boolean);
        if (animatedTargets.length) {
          window.Motion.animate(
            animatedTargets,
            { opacity: [0.35, 1], y: [6, 0] },
            { duration: 0.45, delay: window.Motion.stagger(0.025), easing: [0.16, 1, 0.3, 1], clearOnFinish: true }
          );
        }
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // Modal Builders & CRUD Engine (All 13+ Entity Types)
  // ---------------------------------------------------------------------------
  function fieldInput(id, label, val, opts = {}) {
    const type = opts.type || "text";
    const placeholder = opts.placeholder || "";
    const step = opts.step || (type === "number" ? "any" : "");
    const extraAttr = opts.oninput ? `oninput="${opts.oninput}"` : "";

    if (type === "date") {
      return `
        <div>
          <label for="m-${id}" class="block text-[11px] font-medium text-slate-400 mb-1">${escHtml(label)}</label>
          <div class="flex items-center gap-1.5">
            <input id="m-${id}" name="${escHtml(id)}" type="text" value="${escHtml(val || "")}" placeholder="YYYY-MM-DD" ${extraAttr} class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none">
            <button type="button" data-cal-trigger="1" onclick="openCalendarPicker('m-${id}', this, event)" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 transition-colors shrink-0" title="Open Calendar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    if (type === "select") {
      const optionsHtml = (opts.options || [])
        .map((o) => {
          const ov = Array.isArray(o) ? o[1] : o;
          const ol = Array.isArray(o) ? o[0] : o;
          return `<option value="${escHtml(ov)}" ${String(val) === String(ov) ? "selected" : ""}>${escHtml(ol)}</option>`;
        })
        .join("");
      return `
        <div>
          <label for="m-${id}" class="block text-[11px] font-medium text-slate-400 mb-1">${escHtml(label)}</label>
          <select id="m-${id}" name="${escHtml(id)}" ${extraAttr} class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white focus:border-indigo-500 focus:outline-none">
            ${optionsHtml}
          </select>
        </div>
      `;
    }

    return `
      <div class="${opts.fullWidth ? "sm:col-span-2" : ""}">
        <label for="m-${id}" class="block text-[11px] font-medium text-slate-400 mb-1">${escHtml(label)}</label>
        <input id="m-${id}" name="${escHtml(id)}" type="${type}" ${step ? `step="${step}"` : ""} value="${escHtml(val == null ? "" : val)}" placeholder="${escHtml(placeholder)}" ${extraAttr} class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs ${type === "number" ? "font-mono" : ""} text-white focus:border-indigo-500 focus:outline-none">
      </div>
    `;
  }

  function findRecordForEdit(type, id) {
    const d = window.TRACKER_DATA || {};
    const numId = Number(id);
    switch (type) {
      case "mutual_fund":
        return (d.mutual_funds || []).find((x) => Number(x.id) === numId);
      case "fd":
        return (d.fixed_deposits || []).find((x) => Number(x.id) === numId);
      case "rd":
        return (d.recurring_deposits || []).find((x) => Number(x.id) === numId);
      case "flexi_rd":
        return (d.flexi_rds || []).find((x) => Number(x.id) === numId);
      case "ppf_contribution":
        return ((d.ppf && d.ppf.contributions) || []).find((x) => Number(x.id) === numId);
      case "ppf_balance":
        return d.ppf || {};
      case "epf_entry":
        return ((d.epf && d.epf.entries) || []).find((x) => Number(x.id) === numId);
      case "epf_balance":
        return d.epf || {};
      case "ulip":
        return d.ulip || {};
      case "home_loan":
        return d.home_loan || {};
      case "health_insurance":
      case "life_insurance":
      case "vehicle_insurance":
      case "home_loan_insurance":
        return (d[type] || []).find((x) => Number(x.id) === numId);
      case "bank_account":
        return (d.bank_accounts || []).find((x) => Number(x.id) === numId);
      case "credit_card":
        return (d.credit_cards || []).find((x) => Number(x.id) === numId);
      default:
        return null;
    }
  }

  window.openAddModal = function (type) {
    openEntityModal(type, null);
  };

  window.openEditModal = function (type, id) {
    const rec = findRecordForEdit(type, id);
    openEntityModal(type, rec || { id });
  };

  function openEntityModal(type, record) {
    const rec = record || {};
    const isEdit = Boolean(record && (rec.id || ["ppf_balance", "epf_balance", "ulip", "home_loan"].includes(type)));
    activeModalState = { type, id: rec.id || null };

    let title = "Add Record";
    let subtitle = "Saved atomically to portfolio repository";
    let formHtml = "";

    if (type === "mutual_fund") {
      title = isEdit ? "Edit Mutual Fund Scheme" : "Add Mutual Fund Scheme";
      subtitle = "Search AMFI catalog or fill scheme NAV & SIP details manually";
      formHtml = `
        <div class="rounded-xl bg-slate-950/70 border border-slate-800 p-3 space-y-2">
          <div class="text-[11px] uppercase font-semibold text-indigo-300">Live AMFI Scheme Search</div>
          <div class="flex gap-2">
            <input id="mf-search-q" type="text" placeholder="Type scheme name (e.g. Parag Parikh, HDFC Nifty, SBI Gold)..." oninput="searchAmfiFundsLive(this.value)" class="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white">
          </div>
          <div id="mf-search-results" class="max-h-36 overflow-y-auto space-y-1 text-xs"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("scheme_name", "Scheme Name", rec.scheme_name, { fullWidth: true, placeholder: "Parag Parikh Flexi Cap Fund" })}
          ${fieldInput("scheme_code", "AMFI Scheme Code", rec.scheme_code, { placeholder: "122639" })}
          ${fieldInput("category", "Category", rec.category || "Flexi Cap Equity", { type: "select", options: ["Large Cap Index", "Flexi Cap Equity", "Mid Cap Equity", "Small Cap Equity", "International / Overseas FoF", "Gold Fund ETF EoF", "ELSS Tax Saver", "Debt / Liquid"] })}
          ${fieldInput("amc", "AMC / Fund House", rec.amc, { placeholder: "PPFAS Mutual Fund" })}
          ${fieldInput("sip_amount", "Monthly SIP (₹)", rec.sip_amount || 0, { type: "number" })}
          ${fieldInput("start_date", "SIP Start Date", rec.start_date || todayIso(), { type: "date" })}
          ${fieldInput("step_up_pct", "Annual Step-Up %", rec.step_up_pct || 0, { type: "number" })}
          ${fieldInput("latest_nav", "Latest NAV (₹)", rec.latest_nav || "", { type: "number" })}
          ${fieldInput("invested_amount", "Invested Amount (₹)", rec.invested_amount || 0, { type: "number" })}
          ${fieldInput("current_value", "Current Value (₹)", rec.current_value || 0, { type: "number" })}
          ${fieldInput("units", "Total Units (auto if blank)", rec.units || "", { type: "number" })}
        </div>
      `;
    } else if (type === "fd") {
      title = isEdit ? "Edit Fixed Deposit" : "Add Fixed Deposit (FD)";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("bank", "Bank / Institution", rec.bank, { placeholder: "SBI / HDFC / PNB" })}
          ${fieldInput("fd_no", "FD Account / Receipt No", rec.fd_no)}
          ${fieldInput("principal", "Principal Amount (₹)", rec.principal || "", { type: "number", oninput: "previewDepositMath('fd')" })}
          ${fieldInput("rate", "Interest Rate (% p.a.)", rec.rate || "", { type: "number", oninput: "previewDepositMath('fd')" })}
          ${fieldInput("start_date", "Start Date", rec.start_date || todayIso(), { type: "date", oninput: "previewDepositMath('fd')" })}
          ${fieldInput("maturity_date", "Maturity Date", rec.maturity_date || "", { type: "date", oninput: "previewDepositMath('fd')" })}
          ${fieldInput("maturity_amount", "Custom Maturity Override (Optional)", rec.maturity_amount || "", { type: "number", fullWidth: true, placeholder: "Leave blank for exact quarterly compounding formula" })}
        </div>
        <div id="deposit-live-preview" class="rounded-xl bg-emerald-950/35 border border-emerald-500/30 p-3 text-xs text-slate-300"></div>
      `;
    } else if (type === "rd") {
      title = isEdit ? "Edit Recurring Deposit" : "Add Recurring Deposit (RD)";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("bank", "Bank / Institution", rec.bank)}
          ${fieldInput("rd_no", "RD Account No", rec.rd_no)}
          ${fieldInput("purpose", "Goal / Purpose", rec.purpose, { fullWidth: true })}
          ${fieldInput("monthly_amount", "Monthly Installment (₹)", rec.monthly_amount || "", { type: "number", oninput: "previewDepositMath('rd')" })}
          ${fieldInput("rate", "Interest Rate (% p.a.)", rec.rate || "", { type: "number", oninput: "previewDepositMath('rd')" })}
          ${fieldInput("start_date", "Start Date", rec.start_date || todayIso(), { type: "date", oninput: "previewDepositMath('rd')" })}
          ${fieldInput("end_date", "Maturity / End Date", rec.end_date || "", { type: "date", oninput: "previewDepositMath('rd')" })}
          ${fieldInput("maturity_amount", "Custom Maturity Override (Optional)", rec.maturity_amount || "", { type: "number", fullWidth: true })}
        </div>
        <div id="deposit-live-preview" class="rounded-xl bg-indigo-950/35 border border-indigo-500/30 p-3 text-xs text-slate-300"></div>
      `;
    } else if (type === "flexi_rd") {
      title = isEdit ? "Edit Flexi RD" : "Add Flexi Recurring Deposit";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("bank", "Bank / Institution", rec.bank)}
          ${fieldInput("rd_no", "Flexi RD Account No", rec.rd_no)}
          ${fieldInput("purpose", "Goal / Purpose", rec.purpose, { fullWidth: true })}
          ${fieldInput("base_monthly", "Base Monthly Commitment (₹)", rec.base_monthly || "", { type: "number", oninput: "previewDepositMath('flexi_rd')" })}
          ${fieldInput("total_deposited", "Total Deposited So Far (₹)", rec.total_deposited || "", { type: "number", oninput: "previewDepositMath('flexi_rd')" })}
          ${fieldInput("rate", "Interest Rate (% p.a.)", rec.rate || "", { type: "number", oninput: "previewDepositMath('flexi_rd')" })}
          ${fieldInput("start_date", "Start Date", rec.start_date || todayIso(), { type: "date", oninput: "previewDepositMath('flexi_rd')" })}
          ${fieldInput("end_date", "Maturity Date", rec.end_date || "", { type: "date", oninput: "previewDepositMath('flexi_rd')" })}
          ${fieldInput("maturity_amount", "Custom Maturity Override (Optional)", rec.maturity_amount || "", { type: "number" })}
        </div>
        <div id="deposit-live-preview" class="rounded-xl bg-violet-950/35 border border-violet-500/30 p-3 text-xs text-slate-300"></div>
      `;
    } else if (type === "ppf_contribution") {
      title = isEdit ? "Edit PPF Contribution" : "Add PPF Deposit";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("date", "Transaction Date", rec.date || todayIso(), { type: "date" })}
          ${fieldInput("amount", "Deposit Amount (₹)", rec.amount || "", { type: "number" })}
          ${fieldInput("note", "Note / Remarks", rec.note || "", { fullWidth: true })}
        </div>
      `;
    } else if (type === "ppf_balance") {
      title = "Update PPF Balance & Account";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("account_identifier", "PPF Account Label", rec.account_identifier || "PPF-SOVEREIGN")}
          ${fieldInput("current_balance", "Current PPF Passbook Balance (₹)", rec.current_balance || 0, { type: "number" })}
          ${fieldInput("last_updated", "Passbook Sync Date", rec.last_updated || todayIso(), { type: "date" })}
        </div>
      `;
    } else if (type === "epf_entry") {
      title = isEdit ? "Edit EPF Entry" : "Add EPF Passbook Entry";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("date", "Entry Date", rec.date || todayIso(), { type: "date" })}
          ${fieldInput("description", "Particulars", rec.description || "Monthly EPF Contribution")}
          ${fieldInput("employee", "Employee Share (₹)", rec.employee || 0, { type: "number" })}
          ${fieldInput("employer", "Employer Share (₹)", rec.employer || 0, { type: "number" })}
          ${fieldInput("interest", "Interest Credited (₹)", rec.interest || 0, { type: "number", fullWidth: true })}
        </div>
      `;
    } else if (type === "epf_balance") {
      title = "Update EPF UAN & Balance";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("uan", "UAN / EPF Account ID", rec.uan || rec.account_identifier || "EPFO-UAN")}
          ${fieldInput("current_balance", "Total EPF Balance (₹)", rec.current_balance || 0, { type: "number" })}
          ${fieldInput("last_updated", "Last Updated", rec.last_updated || todayIso(), { type: "date" })}
        </div>
      `;
    } else if (type === "ulip") {
      title = "Update ULIP Policy Valuation";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("policy_name", "Policy Name", rec.policy_name || "Market-Linked ULIP", { fullWidth: true })}
          ${fieldInput("total_paid", "Total Premiums Paid (₹)", rec.total_paid || 0, { type: "number" })}
          ${fieldInput("current_value", "Current Fund Value (₹)", rec.current_value || 0, { type: "number" })}
        </div>
      `;
    } else if (type === "home_loan") {
      title = "Update Home Loan / Mortgage";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("original_loan_amount", "Sanctioned Loan Amount (₹)", rec.original_loan_amount || 0, { type: "number" })}
          ${fieldInput("outstanding_principal", "Outstanding Principal (₹)", rec.outstanding_principal || 0, { type: "number" })}
          ${fieldInput("monthly_emi", "Actual Monthly EMI (₹)", rec.monthly_emi || 0, { type: "number" })}
          ${fieldInput("interest_rate", "Interest Rate (% p.a.)", rec.interest_rate || 7.45, { type: "number" })}
          ${fieldInput("tenure_years", "Tenure (Years)", rec.tenure_years || 20, { type: "number" })}
          ${fieldInput("emi_day", "EMI Debit Day of Month", rec.emi_day || 26, { type: "number" })}
          ${fieldInput("loan_start_date", "Loan Start Date", rec.loan_start_date || todayIso(), { type: "date", fullWidth: true })}
        </div>
      `;
    } else if (["health_insurance", "life_insurance", "vehicle_insurance", "home_loan_insurance"].includes(type)) {
      const titles = {
        health_insurance: "Health Insurance Policy",
        life_insurance: "Life / Term Policy",
        vehicle_insurance: "Vehicle Insurance Policy",
        home_loan_insurance: "Home Loan Protection Policy"
      };
      title = `${isEdit ? "Edit" : "Add"} ${titles[type]}`;
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("insurer", "Insurer Company", rec.insurer)}
          ${fieldInput("policy_name", "Plan / Policy Name", rec.policy_name)}
          ${fieldInput("policy_type", "Plan Type", rec.policy_type || "Individual")}
          ${fieldInput("asset_ref", "Linked Loan / Vehicle / Asset", rec.asset_ref)}
          ${fieldInput("insured_person", "Insured Member(s)", rec.insured_person)}
          ${fieldInput("nominee_person", "Nominee Name", rec.nominee_person)}
          ${fieldInput("sum_insured", "Sum Insured / IDV (₹)", rec.sum_insured || "", { type: "number" })}
          ${fieldInput("annual_premium", "Annual Premium (₹)", rec.annual_premium || "", { type: "number" })}
          ${fieldInput("policy_no", "Policy Number", rec.policy_no, { fullWidth: true })}
          ${fieldInput("start_date", "Policy Start Date", rec.start_date || todayIso(), { type: "date" })}
          ${fieldInput("end_date", "Policy Expiry Date", rec.end_date || "", { type: "date" })}
        </div>
      `;
    } else if (type === "bank_account") {
      title = isEdit ? "Edit Bank Account" : "Add Bank Account";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("bank_name", "Bank Name", rec.bank_name)}
          ${fieldInput("account_type", "Account Type", rec.account_type || "Savings", { type: "select", options: ["Savings", "Salary", "Current", "Joint Savings", "NRE / NRO"] })}
          ${fieldInput("account_no", "Account Number", rec.account_no)}
          ${fieldInput("branch_ifsc", "IFSC Code", rec.branch_ifsc)}
          ${fieldInput("holder_name", "Account Holder Name", rec.holder_name || "Sayan Sinha")}
          ${fieldInput("current_balance", "Current Balance (₹)", rec.current_balance || 0, { type: "number" })}
          ${fieldInput("interest_rate", "Savings Interest Rate (%)", rec.interest_rate || 2.5, { type: "number" })}
          ${fieldInput("nominee", "Nominee Name & Relation", rec.nominee)}
          ${fieldInput("purpose", "Account Purpose", rec.purpose)}
          ${fieldInput("notes", "Additional Notes", rec.notes)}
        </div>
      `;
    } else if (type === "credit_card") {
      title = isEdit ? "Edit Credit Card" : "Add Credit Card";
      formHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldInput("bank_name", "Issuing Bank", rec.bank_name)}
          ${fieldInput("card_name", "Card Variant Name", rec.card_name)}
          ${fieldInput("network", "Card Network", rec.network || "Visa", { type: "select", options: ["Visa", "Mastercard", "RuPay", "Amex", "Diners"] })}
          ${fieldInput("last4", "Last 4 Digits", rec.last4, { placeholder: "4242" })}
          ${fieldInput("credit_limit", "Total Credit Limit (₹)", rec.credit_limit || 0, { type: "number" })}
          ${fieldInput("utilized_amount", "Current Utilized (₹)", rec.utilized_amount || 0, { type: "number" })}
          ${fieldInput("billing_day", "Billing Day (1–31)", rec.billing_day || 1, { type: "number" })}
          ${fieldInput("due_day", "Payment Due Day (1–31)", rec.due_day || 15, { type: "number" })}
          ${fieldInput("reward_points", "Reward Points", rec.reward_points || 0, { type: "number" })}
          ${fieldInput("annual_fee_notes", "Annual Fee / Waiver Notes", rec.annual_fee_notes)}
        </div>
      `;
    }

    openDrawer(
      title,
      subtitle,
      `<form id="modal-entity-form" onsubmit="event.preventDefault(); submitModalForm();">${formHtml}</form>`,
      { footerMode: "save", submitLabel: "Save Changes" }
    );

    if (["fd", "rd", "flexi_rd"].includes(type)) {
      previewDepositMath(type);
    }
  }

  window.closeModal = function () {
    closeDrawer();
  };

  let depositPreviewTimer = null;
  window.previewDepositMath = function (type) {
    const box = document.getElementById("deposit-live-preview");
    if (!box) return;
    const val = (id) => document.getElementById(`m-${id}`)?.value || "";
    const sStr = val("start_date");
    const eStr = type === "fd" ? val("maturity_date") : val("end_date");
    if (!sStr || !eStr) {
      box.textContent = "Enter valid start date, maturity date, and interest rate for instant maturity & post-tax preview.";
      return;
    }

    clearTimeout(depositPreviewTimer);
    depositPreviewTimer = setTimeout(async () => {
      try {
        const res = await apiJson("/api/fixed_income/deposit_preview", {
          method: "POST",
          body: JSON.stringify({
            type,
            deposit: {
              principal: val("principal"),
              monthly_amount: val("monthly_amount"),
              base_monthly: val("base_monthly"),
              total_deposited: val("total_deposited"),
              rate: val("rate"),
              start_date: val("start_date"),
              maturity_date: val("maturity_date"),
              end_date: val("end_date"),
              maturity_amount: val("maturity_amount")
            }
          })
        });
        if (res && res.html) {
          box.innerHTML = res.html;
          animateMotionUpdate(box);
        }
      } catch (_err) {
        box.textContent = "Calculating preview via backend API...";
      }
    }, 120);
  };

  let mfSearchTimer = null;
  window.searchAmfiFundsLive = function (q) {
    if (mfSearchTimer) clearTimeout(mfSearchTimer);
    mfSearchTimer = setTimeout(async () => {
      const box = document.getElementById("mf-search-results");
      if (!box) return;
      if (!String(q || "").trim()) {
        box.innerHTML = "";
        return;
      }
      try {
        const res = await apiJson(`/api/mf_search?q=${encodeURIComponent(q)}`);
        const items = res.schemes || res.results || [];
        if (!items.length) {
          box.innerHTML = `<div class="text-slate-500 px-2 py-1">No AMFI matches found</div>`;
          return;
        }
        box.innerHTML = items
          .slice(0, 8)
          .map(
            (s) => `
          <button type="button" data-code="${escHtml(s.schemeCode)}" data-name="${escHtml(s.schemeName)}" onclick="selectAmfiScheme(this.getAttribute('data-code'), this.getAttribute('data-name'))" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600/25 border border-slate-800 flex items-center justify-between gap-2">
            <span class="truncate text-slate-200">${escHtml(s.schemeName)}</span>
            <span class="font-mono text-[10px] text-indigo-300 shrink-0">${escHtml(s.schemeCode)}</span>
          </button>
        `
          )
          .join("");
      } catch (err) {
        box.innerHTML = `<div class="text-rose-400 px-2 py-1">${escHtml(err.message)}</div>`;
      }
    }, 220);
  };

  window.selectAmfiScheme = async function (code, name) {
    const codeInput = document.getElementById("m-scheme_code");
    const nameInput = document.getElementById("m-scheme_name");
    if (codeInput) codeInput.value = code;
    if (nameInput) nameInput.value = name;
    const box = document.getElementById("mf-search-results");
    if (box) box.innerHTML = `<div class="text-emerald-300 px-2 py-1">Fetching live NAV for ${escHtml(code)}...</div>`;

    try {
      const nav = await apiJson(`/api/mf_nav?scheme_code=${encodeURIComponent(code)}`);
      const navEl = document.getElementById("m-latest_nav");
      const amcEl = document.getElementById("m-amc");
      if (navEl && nav.nav) navEl.value = nav.nav;
      if (amcEl && nav.amc) amcEl.value = nav.amc;
      if (box) box.innerHTML = `<div class="text-emerald-400 px-2 py-1">Synced NAV ₹${nav.nav} (${escHtml(nav.nav_date || "")})</div>`;
    } catch (_) {
      if (box) box.innerHTML = "";
    }
  };

  window.submitModalForm = async function () {
    if (!activeModalState) return;
    if (activeModalState.type === "__security_pin") {
      return submitSecurityPinForm(false);
    }
    const form = document.getElementById("modal-entity-form");
    const btn = document.getElementById("drawer-submit-btn");
    if (!form) return;

    const payload = {};
    if (activeModalState.id) payload.id = activeModalState.id;

    form.querySelectorAll("input[name], select[name]").forEach((el) => {
      payload[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });

    if (btn) btn.disabled = true;
    try {
      await apiJson("/api/save_item", {
        method: "POST",
        body: JSON.stringify({ type: activeModalState.type, payload })
      });
      showToast("Saved successfully");
      closeModal();
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Income Tax Comparison Engine (100% Backend Calculated via /api/tax_preview)
  // ---------------------------------------------------------------------------
  function numInput(id) {
    return Number(document.getElementById(id)?.value || 0);
  }

  function readTaxProfileFromDom() {
    return {
      fy: document.getElementById("tax_fy")?.value || "2025-26",
      age_group: document.getElementById("tax_age_group")?.value || "below_60",
      preferred_regime: document.getElementById("tax_preferred_regime")?.value || "auto",
      is_salaried: Boolean(document.getElementById("tax_is_salaried")?.checked),
      gross_salary: numInput("tax_gross_salary"),
      interest_income: numInput("tax_interest_income"),
      rental_income: numInput("tax_rental_income"),
      other_income: numInput("tax_other_income"),
      hra_exemption: numInput("tax_hra_exemption"),
      professional_tax: numInput("tax_professional_tax"),
      home_loan_interest_24b: numInput("tax_home_loan_interest_24b"),
      sec_80c: numInput("tax_sec_80c"),
      sec_80ccd_1b_nps: numInput("tax_sec_80ccd_1b_nps"),
      sec_80ccd_2_employer_nps: numInput("tax_sec_80ccd_2_employer_nps"),
      sec_80d_health: numInput("tax_sec_80d_health"),
      sec_80tta_savings: numInput("tax_sec_80tta_savings"),
      other_deductions_80e_80g: numInput("tax_other_deductions_80e_80g"),
      tds_deducted: numInput("tax_tds_deducted"),
      advance_tax_paid: numInput("tax_advance_tax_paid")
    };
  }

  window.recalcTaxLive = async function () {
    const tbody = document.getElementById("tax-comparison-tbody");
    if (!tbody) return;

    try {
      const json = await apiJson("/api/tax_preview", {
        method: "POST",
        body: JSON.stringify({ payload: readTaxProfileFromDom() })
      });
      if (!json || !json.taxCalc) return;

      const tc = json.taxCalc;
      const nr = tc.newRegime || {};
      const or = tc.oldRegime || {};
      const rec = String(tc.recommendedRegime || "new").toUpperCase();

      const headlineEl = document.getElementById("tax-rec-headline");
      const subEl = document.getElementById("tax-rec-sub");
      const heroNew = document.getElementById("hero-new-tax");
      const heroOld = document.getElementById("hero-old-tax");

      if (headlineEl) headlineEl.textContent = `${rec} REGIME saves ${tc.taxSavingsInr || "₹0"}`;
      if (subEl) subEl.innerHTML = `Gross Income: <span class="font-mono font-semibold">${escHtml(tc.grossTotalIncomeInr || "₹0")}</span> • Taxes Paid (TDS + Adv): <span class="font-mono">${escHtml(tc.totalTaxesPaidInr || "₹0")}</span>`;
      if (heroNew) heroNew.textContent = nr.totalTaxInr || "₹0";
      if (heroOld) heroOld.textContent = or.totalTaxInr || "₹0";

      const nrRef = Number(nr.refundOrPayable || 0);
      const orRef = Number(or.refundOrPayable || 0);

      tbody.innerHTML = `
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Gross Total Income</td><td class="py-2.5 px-3 text-right text-white">${escHtml(tc.grossTotalIncomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-white">${escHtml(tc.grossTotalIncomeInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Standard &amp; Eligible Deductions</td><td class="py-2.5 px-3 text-right text-emerald-300">-${escHtml(nr.totalDeductionsInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-300">-${escHtml(or.totalDeductionsInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60 bg-slate-900/40"><td class="py-2.5 pr-3 font-sans font-semibold text-white">Net Taxable Income</td><td class="py-2.5 px-3 text-right font-bold text-white">${escHtml(nr.taxableIncomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right font-bold text-white">${escHtml(or.taxableIncomeInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Slab Tax (Before 87A Rebate)</td><td class="py-2.5 px-3 text-right text-slate-200">${escHtml(nr.slabTaxInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-slate-200">${escHtml(or.slabTaxInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Sec 87A Rebate &amp; Marginal Relief</td><td class="py-2.5 px-3 text-right text-emerald-400">-${escHtml(nr.rebatePlusReliefInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-400">-${escHtml(or.rebatePlusReliefInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Surcharge + 4% Health &amp; Edu Cess</td><td class="py-2.5 px-3 text-right text-slate-300">${escHtml(nr.surchargePlusCessInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-slate-300">${escHtml(or.surchargePlusCessInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-700 bg-indigo-950/25"><td class="py-3 pr-3 font-sans font-bold text-white">Total Tax Liability</td><td class="py-3 px-3 text-right font-bold text-base text-indigo-300">${escHtml(nr.totalTaxInr || "₹0")}</td><td class="py-3 pl-3 text-right font-bold text-base text-amber-300">${escHtml(or.totalTaxInr || "₹0")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Effective Tax Rate</td><td class="py-2.5 px-3 text-right text-slate-200">${escHtml(nr.effectiveRateLabel || "0.00%")}</td><td class="py-2.5 pl-3 text-right text-slate-200">${escHtml(or.effectiveRateLabel || "0.00%")}</td></tr>
        <tr class="border-b border-slate-800/60"><td class="py-2.5 pr-3 font-sans text-slate-300">Monthly Post-Tax Take-Home</td><td class="py-2.5 px-3 text-right text-emerald-300">${escHtml(nr.monthlyTakeHomeInr || "₹0")}</td><td class="py-2.5 pl-3 text-right text-emerald-300">${escHtml(or.monthlyTakeHomeInr || "₹0")}</td></tr>
        <tr><td class="py-2.5 pr-3 font-sans text-slate-300">ITR Refund (+) / Tax Payable (-)</td><td class="py-2.5 px-3 text-right font-semibold ${nrRef >= 0 ? "text-emerald-400" : "text-rose-400"}">${escHtml(nr.refundOrPayableInr || "₹0")}</td><td class="py-2.5 pl-3 text-right font-semibold ${orRef >= 0 ? "text-emerald-400" : "text-rose-400"}">${escHtml(or.refundOrPayableInr || "₹0")}</td></tr>
      `;

      const slabsContainer = document.getElementById("tax-slabs-container");
      if (slabsContainer) {
        const renderSlabCard = (title, cls, rows) => `
          <div class="glass-card rounded-2xl p-4">
            <h3 class="text-xs font-bold uppercase tracking-wider ${cls} mb-3">${title}</h3>
            <table class="w-full text-left text-[11px] font-mono">
              <thead><tr class="text-slate-400 border-b border-slate-800"><th class="py-1.5">Slab</th><th class="py-1.5 text-right">Rate</th><th class="py-1.5 text-right">Tax</th></tr></thead>
              <tbody>
                ${(rows || []).map((s) => `<tr class="border-b border-slate-800/50"><td class="py-1.5 font-sans text-slate-300">${escHtml(s.label)}</td><td class="py-1.5 text-right text-slate-400">${s.rate}%</td><td class="py-1.5 text-right text-white">${escHtml(s.taxInSlabInr || "₹0")}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        `;
        slabsContainer.innerHTML =
          renderSlabCard("New Regime Slab Breakdown", "text-indigo-300", nr.slabs) +
          renderSlabCard("Old Regime Slab Breakdown", "text-amber-300", or.slabs);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.saveTaxProfile = async function () {
    const btn = document.getElementById("save-tax-profile-btn");
    if (btn) btn.disabled = true;
    try {
      const payload = readTaxProfileFromDom();
      await apiJson("/api/save_item", {
        method: "POST",
        body: JSON.stringify({ type: "tax_profile", payload })
      });
      showToast("Tax profile saved to portfolio");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Security PIN Lock Controls
  // ---------------------------------------------------------------------------
  const EYE_OPEN_SVG = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
  const EYE_SLASH_SVG = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>`;

  window.wfTogglePinVisibility = function (inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    if (btnEl) {
      btnEl.setAttribute("aria-pressed", String(isHidden));
      btnEl.setAttribute("aria-label", isHidden ? "Hide PIN" : "Show PIN");
      btnEl.innerHTML = isHidden ? EYE_SLASH_SVG : EYE_OPEN_SVG;
    }
  };

  function pinFieldHtml(id, label, placeholder, autocomplete = "off") {
    return `
      <div>
        <label for="${id}" class="block text-[11px] text-slate-400 mb-1">${label}</label>
        <div class="relative flex items-center">
          <input type="password" id="${id}" autocomplete="${autocomplete}" placeholder="${escHtml(placeholder)}"
            class="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none">
          <button type="button" onclick="wfTogglePinVisibility('${id}', this)"
            aria-label="Show PIN" aria-pressed="false" data-no-motion-press
            class="absolute right-2 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
            ${EYE_OPEN_SVG}
          </button>
        </div>
      </div>
    `;
  }

  window.openSecurityPinModal = function (pinEnabled) {
    activeModalState = { type: "__security_pin", pinEnabled: Boolean(pinEnabled) };
    const title = pinEnabled ? "Change Security PIN" : "Set Cockpit Security PIN";
    const subtitle = "Protected by bcrypt (PortfolioProfile) and Rack::Attack rate limiting";

    openDrawer(
      title,
      subtitle,
      `
        <form id="pin-settings-form" onsubmit="event.preventDefault(); submitSecurityPinForm(false);" class="space-y-3">
          ${pinEnabled ? pinFieldHtml("pin-current", "Old PIN", "Enter your current PIN", "current-password") : ""}
          ${pinFieldHtml("pin-new", "New PIN (min 4 chars)", "Enter new 4+ character PIN", "new-password")}
          ${pinFieldHtml("pin-confirm", "Confirm New PIN", "Re-enter new PIN", "new-password")}
          ${pinEnabled ? `<div class="pt-1"><button type="button" onclick="submitSecurityPinForm(true)" class="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer">Remove Security PIN</button></div>` : ""}
        </form>
      `,
      { footerMode: "save", submitLabel: pinEnabled ? "Update PIN" : "Enable PIN" }
    );
  };

  window.submitSecurityPinForm = async function (clearPin = false) {
    const currentInput = document.getElementById("pin-current");
    const newInput = document.getElementById("pin-new");
    const confirmInput = document.getElementById("pin-confirm");

    const current_pin = currentInput?.value || "";
    const pin = newInput?.value || "";
    const pin_confirmation = confirmInput?.value || "";

    if (activeModalState?.pinEnabled && !current_pin.trim()) {
      showToast("Please enter your Old PIN", "error");
      currentInput?.focus();
      return;
    }

    if (!clearPin) {
      if (pin.trim().length < 4) {
        showToast("New PIN must be at least 4 characters", "error");
        newInput?.focus();
        return;
      }
      if (pin.trim() !== pin_confirmation.trim()) {
        showToast("New PIN and Confirm New PIN do not match", "error");
        confirmInput?.focus();
        return;
      }
    }

    try {
      const res = await apiJson("/session/pin", {
        method: "POST",
        body: JSON.stringify({ current_pin, pin, pin_confirmation, clear: clearPin })
      });
      showToast(res.message || "PIN updated");
      closeModal();
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.lockCockpitSession = async function () {
    try {
      await apiJson("/session/lock", { method: "POST", body: "{}" });
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  window.unlockCockpitSession = async function () {
    const pin = document.getElementById("unlock-pin-input")?.value || "";
    try {
      await apiJson("/session/unlock", { method: "POST", body: JSON.stringify({ pin }) });
      window.location.reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };
})();
