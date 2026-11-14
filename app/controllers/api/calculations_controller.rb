# frozen_string_literal: true

module Api
  class CalculationsController < ApplicationController
    protect_from_forgery with: :null_session
    before_action :require_unlocked_session!

    VALID_SLABS = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30].freeze

    # POST /api/fixed_income/slab_preview
    def slab_preview
      raw_slab = params[:slab].to_f
      slab = VALID_SLABS.min_by { |s| (s - raw_slab).abs }
      session[:fi_tax_slab] = slab

      data = Portfolio::Repository.instance.read(user: current_user)
      summary = FixedIncome::Calculator.summarize(data, slab_rate: slab)

      render json: {
        ok: true,
        slabRate: slab,
        postTax: summary[:postTax],
        rows: summary[:rows]
      }
    end

    # POST /api/fixed_income/deposit_preview
    def deposit_preview
      deposit_type = params[:type].to_s
      raw_slab = session[:fi_tax_slab].nil? ? 0.30 : session[:fi_tax_slab].to_f
      input_params = params[:deposit].is_a?(ActionController::Parameters) ? params[:deposit].to_unsafe_h : params.to_unsafe_h

      preview = FixedIncome::Calculator.preview_deposit(
        type: deposit_type,
        params: input_params,
        slab_rate: raw_slab
      )

      invested_label = deposit_type == "fd" ? "Principal" : "Total Invested"
      html = <<~HTML
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>Tenure: <strong class="text-white font-mono">#{ERB::Util.html_escape(preview[:duration_text])}</strong></span>
          <span>#{invested_label}: <strong class="text-slate-200 font-mono">#{ERB::Util.html_escape(preview[:invested_inr])}</strong></span>
          <span>Maturity: <strong class="text-emerald-300 font-mono">#{ERB::Util.html_escape(preview[:maturity_inr])}</strong></span>
          <span>Gross Interest: <strong class="text-cyan-300 font-mono">+#{ERB::Util.html_escape(preview[:gain_inr])}</strong></span>
          <span>Post-Tax Net: <strong class="text-teal-300 font-mono">+#{ERB::Util.html_escape(preview[:post_tax_gain_inr])}</strong></span>
        </div>
      HTML

      render json: {
        ok: true,
        preview: preview,
        html: html
      }
    end

    # POST /api/mutual_funds/sip_projection
    def sip_projection
      data = Portfolio::Repository.instance.read(user: current_user)
      funds = Array(data[:mutual_funds])
      raw_steps = params[:step_ups].is_a?(ActionController::Parameters) ? params[:step_ups].to_unsafe_h : {}

      projection = MutualFunds::Analytics.sip_step_up_projection(funds, raw_steps)

      html = <<~HTML
        <div>
          <div class="text-slate-400">#{projection[:years]}-Yr Flat SIP Corpus</div>
          <div class="text-lg font-bold font-mono text-slate-200 mt-0.5">#{ERB::Util.html_escape(projection[:flat_10y_inr])}</div>
        </div>
        <div>
          <div class="text-emerald-300">#{projection[:years]}-Yr Step-Up Corpus (+#{ERB::Util.html_escape(projection[:delta_10y_inr])})</div>
          <div class="text-lg font-bold font-mono text-emerald-300 mt-0.5">#{ERB::Util.html_escape(projection[:step_10y_inr])}</div>
        </div>
      HTML

      render json: {
        ok: true,
        projection: projection,
        html: html
      }
    end

    private

    def require_unlocked_session!
      return unless Portfolio::ActiveRecordBridge.available?

      profile = PortfolioProfile.for_user(current_user)
      return unless profile&.pin_enabled? && session[:wealthflow_locked] == true

      render json: { ok: false, error: "Cockpit is locked. Unlock with your PIN first." }, status: :unauthorized
    end
  end
end
