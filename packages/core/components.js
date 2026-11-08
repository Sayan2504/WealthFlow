// packages/core/components.js
// Reusable ViewComponents for WealthFlow: ActionButtonsComponent, DatePickerComponent, CustomSelectComponent, DeleteConfirmModalComponent

function renderEditPencilButton(category, id = null, title = "Edit") {
  const idArg = id !== null && id !== undefined ? `, ${id}` : "";
  return `<button type="button" onclick="openModal('${category}'${idArg})" title="${title}" class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors inline-flex items-center justify-center">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  </button>`;
}

function renderDeleteBinButton(category, id, label = "Entry") {
  const safeLabel = String(label || "Entry").replace(/'/g, "\\'").replace(/"/g, "&quot;");
  return `<button type="button" onclick="deleteItem('${category}', ${id}, '${safeLabel}')" title="Remove" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors inline-flex items-center justify-center">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>`;
}

function renderRowActionButtons(category, id, label = "Entry") {
  return `<div class="inline-flex items-center justify-end gap-1.5">
    ${renderEditPencilButton(category, id, "Edit " + label)}
    ${renderDeleteBinButton(category, id, label)}
  </div>`;
}

function renderCustomDropdownComponent(id, name, options, selectedValue, onChangeFnName = "") {
  const strSelected = String(selectedValue ?? "");
  const selectedOpt = options.find(o => String(o.value) === strSelected) || options[0];
  const itemsHtml = options.map(opt => {
    const isSelected = String(opt.value) === String(selectedOpt.value);
    const escVal = String(opt.value).replace(/'/g, "\\'");
    const escLabel = String(opt.label).replace(/'/g, "\\'");
    const fnArg = onChangeFnName ? `'${onChangeFnName}'` : "''";
    return `
      <button type="button"
              onclick="selectDropdownOption('${id}', '${escVal}', '${escLabel}', ${fnArg})"
              data-value="${opt.value}"
              class="dropdown-opt w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl text-left transition-all duration-150 ${isSelected ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30' : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'}">
        <span>${opt.label}</span>
        <svg class="check-icon w-3.5 h-3.5 ${isSelected ? 'text-white' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    `;
  }).join("");

  return `
    <div class="relative custom-dropdown" id="dropdown-${id}">
      <input type="hidden" name="${name}" id="input-${id}" value="${selectedOpt.value}">
      <button type="button"
              onclick="toggleDropdown('${id}')"
              class="w-full flex items-center justify-between rounded-xl bg-slate-800/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white font-medium shadow-inner hover:border-slate-600 focus:outline-none focus:border-indigo-500 transition-all">
        <span id="label-${id}" class="truncate">${selectedOpt.label}</span>
        <svg id="chevron-${id}" class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div id="menu-${id}"
           class="dropdown-menu hidden absolute left-0 right-0 mt-2 z-50 origin-top rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/70 ring-1 ring-white/10 p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
        ${itemsHtml}
      </div>
    </div>
  `;
}

module.exports = {
  renderEditPencilButton,
  renderDeleteBinButton,
  renderRowActionButtons,
  renderCustomDropdownComponent
};

