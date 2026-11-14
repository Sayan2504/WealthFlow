# frozen_string_literal: true

module WealthflowHelper
  def format_inr(val, decimals = 0)
    Formatting::IndianFormatter.format_inr(val, decimals)
  end

  def format_num(val, decimals = 0)
    Formatting::IndianFormatter.format_num(val, decimals)
  end

  def format_compact(val)
    Formatting::IndianFormatter.format_compact(val)
  end

  def format_date_dmy(iso_str, blank_fallback = "—")
    Formatting::IndianFormatter.format_date_dmy(iso_str, blank_fallback)
  end

  def nav_link_active?(path)
    return current_page?(root_path) if path == "/"

    request.path == path || request.path.start_with?("#{path}/")
  end

  def render_edit_pencil_button(onclick:, title: "Edit")
    <<~HTML.strip.html_safe
      <button type="button" onclick="#{ERB::Util.html_escape(onclick)}" title="#{ERB::Util.html_escape(title)}" aria-label="#{ERB::Util.html_escape(title)}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-all">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
        </svg>
      </button>
    HTML
  end

  def render_delete_bin_button(onclick:, title: "Delete")
    <<~HTML.strip.html_safe
      <button type="button" onclick="#{ERB::Util.html_escape(onclick)}" title="#{ERB::Util.html_escape(title)}" aria-label="#{ERB::Util.html_escape(title)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    HTML
  end

  def render_row_action_buttons(edit_onclick: nil, delete_onclick: nil, edit_title: "Edit", delete_title: "Delete")
    parts = []
    parts << render_edit_pencil_button(onclick: edit_onclick, title: edit_title) if edit_onclick.present?
    parts << render_delete_bin_button(onclick: delete_onclick, title: delete_title) if delete_onclick.present?
    "<div class=\"inline-flex items-center justify-end gap-1\">#{parts.join}</div>".html_safe
  end

  def render_custom_dropdown(id:, name: nil, value: nil, options: [], onchange: nil, button_class: nil)
    norm_options = options.map do |opt|
      if opt.is_a?(Array)
        { label: opt[0].to_s, value: opt[1].to_s }
      elsif opt.is_a?(Hash)
        { label: (opt[:label] || opt["label"] || opt[:value] || opt["value"]).to_s, value: (opt[:value] || opt["value"]).to_s }
      else
        { label: opt.to_s, value: opt.to_s }
      end
    end

    selected = norm_options.find { |o| o[:value] == value.to_s } || norm_options.first || { label: "Select...", value: "" }
    btn_cls = button_class.presence || "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/50 text-sm text-slate-100 transition-colors"
    esc_id = ERB::Util.html_escape(id)
    esc_name = ERB::Util.html_escape(name || id)

    options_html = norm_options.map do |opt|
      active = opt[:value] == selected[:value]
      active_cls = active ? "bg-indigo-500/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
      <<~HTML
        <button type="button" data-value="#{ERB::Util.html_escape(opt[:value])}" onclick="wfSelectDropdownOption('#{esc_id}', '#{ERB::Util.html_escape(opt[:value].gsub("'", "\\\\'"))}', '#{ERB::Util.html_escape(opt[:label].gsub("'", "\\\\'"))}')" class="w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between #{active_cls}">
          <span class="truncate">#{ERB::Util.html_escape(opt[:label])}</span>
          #{active ? '<span class="text-indigo-400 text-[10px]">●</span>' : ''}
        </button>
      HTML
    end.join

    <<~HTML.html_safe
      <div class="relative wf-dropdown" id="dd-wrap-#{esc_id}" data-onchange="#{ERB::Util.html_escape(onchange.to_s)}">
        <input type="hidden" id="#{esc_id}" name="#{esc_name}" value="#{ERB::Util.html_escape(selected[:value])}">
        <button type="button" id="dd-btn-#{esc_id}" onclick="wfToggleDropdown('#{esc_id}')" class="#{btn_cls}">
          <span id="dd-label-#{esc_id}" class="truncate">#{ERB::Util.html_escape(selected[:label])}</span>
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="dd-menu-#{esc_id}" class="hidden absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl p-1.5 space-y-0.5 backdrop-blur-xl">
          #{options_html}
        </div>
      </div>
    HTML
  end

  def render_pairwise_overlap_html(result)
    res = (result || {}).with_indifferent_access
    fa = res[:fundA] || {}
    fb = res[:fundB] || {}
    pct = res[:overlapPercentage].to_f
    uniq_a = res[:uniquenessA].to_f
    uniq_b = res[:uniquenessB].to_f
    common = Array(res[:commonStocks])

    badge_cls = if pct >= 40
                  "bg-rose-950/80 text-rose-300 border-rose-700/60"
                elsif pct >= 15
                  "bg-amber-950/80 text-amber-300 border-amber-700/60"
                else
                  "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                end

    verdict = if pct >= 40
                "High Redundancy — Consider consolidating overlapping schemes"
              elsif pct >= 15
                "Moderate Overlap — Partial duplication across top holdings"
              else
                "Well Diversified — Low portfolio overlap between selected schemes"
              end

    rows_html = if common.any?
                  common.map do |c|
                    cs = c.with_indifferent_access
                    <<~HTML
                      <tr class="border-t border-slate-800/70 hover:bg-slate-800/30 transition-colors">
                        <td class="py-2.5 px-3">
                          <div class="font-medium text-slate-100 text-xs">#{ERB::Util.html_escape(cs[:stock])}</div>
                          <div class="text-[10px] text-slate-400">#{ERB::Util.html_escape(cs[:ticker])} • #{ERB::Util.html_escape(cs[:sector])}</div>
                        </td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs text-slate-300">#{Kernel.format('%.2f', cs[:fundAWeight].to_f)}%</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs text-slate-300">#{Kernel.format('%.2f', cs[:fundBWeight].to_f)}%</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs font-semibold text-indigo-300">#{Kernel.format('%.2f', cs[:overlapWeight].to_f)}%</td>
                      </tr>
                    HTML
                  end.join
                else
                  '<tr><td colspan="4" class="py-6 text-center text-xs text-slate-400">Zero common underlying stocks between these two schemes.</td></tr>'
                end

    <<~HTML.html_safe
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5">
            <div class="text-[11px] uppercase tracking-wider text-slate-400">Portfolio Overlap</div>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-2xl font-bold font-mono text-white">#{Kernel.format('%.2f', pct)}%</span>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full border #{badge_cls}">#{common.size} common</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">#{ERB::Util.html_escape(verdict)}</div>
          </div>
          <div class="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5">
            <div class="text-[11px] uppercase tracking-wider text-slate-400 truncate">#{ERB::Util.html_escape(fa[:scheme_name].presence || 'Fund A')}</div>
            <div class="mt-1 text-xl font-bold font-mono text-emerald-300">#{Kernel.format('%.2f', uniq_a)}% Unique</div>
            <div class="text-[11px] text-slate-400 mt-1">#{fa[:stocksCount].to_i} disclosed stocks</div>
          </div>
          <div class="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5">
            <div class="text-[11px] uppercase tracking-wider text-slate-400 truncate">#{ERB::Util.html_escape(fb[:scheme_name].presence || 'Fund B')}</div>
            <div class="mt-1 text-xl font-bold font-mono text-cyan-300">#{Kernel.format('%.2f', uniq_b)}% Unique</div>
            <div class="text-[11px] text-slate-400 mt-1">#{fb[:stocksCount].to_i} disclosed stocks</div>
          </div>
        </div>
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80">
                <th class="py-2.5 px-3 font-medium">Overlapping Holding</th>
                <th class="py-2.5 px-3 font-medium text-right">Scheme A %</th>
                <th class="py-2.5 px-3 font-medium text-right">Scheme B %</th>
                <th class="py-2.5 px-3 font-medium text-right">Min Overlap %</th>
              </tr>
            </thead>
            <tbody>#{rows_html}</tbody>
          </table>
        </div>
      </div>
    HTML
  end
end

