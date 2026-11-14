# frozen_string_literal: true

module MutualFunds
  # Mutual fund SIP aggregation, unrealized P&L, and 10-year Step-Up projection engine.
  class Analytics
    def self.summarize(mutual_funds)
      mfs = Array(mutual_funds).map(&:with_indifferent_access)
      invested = mfs.sum { |f| f[:invested].to_f }
      current = mfs.sum { |f| f[:current_value].to_f }
      sip = mfs.sum { |f| f[:sip_amount].to_f }
      pnl = current - invested
      pnl_pct = invested.positive? ? ((pnl / invested) * 100.0).round(2) : 0.0

      {
        invested: invested,
        current: current,
        pnl: pnl,
        pnlPct: pnl_pct,
        sip: sip,
        count: mfs.size,
        investedInr: Core::CurrencyFormatter.format_inr(invested),
        currentInr: Core::CurrencyFormatter.format_inr(current),
        pnlInr: Core::CurrencyFormatter.format_inr(pnl),
        sipInr: Core::CurrencyFormatter.format_inr(sip)
      }
    end

    def self.sip_step_up_projection(funds, step_ups = {}, years: 10, annual_return: 0.12)
      monthly_rate = annual_return.to_f / 12.0
      flat_total = 0.0
      step_total = 0.0
      breakdown = []

      Array(funds).each do |fund|
        f = fund.with_indifferent_access
        fid = f[:id].to_s
        base_sip = [f[:sip_amount].to_f, 0.0].max
        step_val = step_ups.key?(fid) ? step_ups[fid] : (step_ups[fid.to_sym] || f[:step_up_pct])
        step_pct = [step_val.to_f, 0.0].max / 100.0

        next if base_sip <= 0.0

        fv_flat = 0.0
        fv_step = 0.0
        years.times do |yr|
          yr_sip = base_sip * ((1.0 + step_pct)**yr)
          12.times do
            fv_flat = (fv_flat + base_sip) * (1.0 + monthly_rate)
            fv_step = (fv_step + yr_sip) * (1.0 + monthly_rate)
          end
        end

        flat_total += fv_flat
        step_total += fv_step
        breakdown << {
          fund_id: f[:id],
          scheme_name: f[:scheme_name],
          base_sip: base_sip.round,
          step_up_pct: (step_pct * 100.0).round(2),
          flat_corpus: fv_flat.round,
          step_corpus: fv_step.round
        }
      end

      flat_rounded = flat_total.round
      step_rounded = step_total.round
      delta_rounded = [step_rounded - flat_rounded, 0].max

      {
        years: years,
        annual_return_pct: (annual_return * 100.0).round(1),
        flat_10y: flat_rounded,
        step_10y: step_rounded,
        delta_10y: delta_rounded,
        flat_10y_inr: Core::CurrencyFormatter.format_inr(flat_rounded),
        step_10y_inr: Core::CurrencyFormatter.format_inr(step_rounded),
        delta_10y_inr: Core::CurrencyFormatter.format_inr(delta_rounded),
        breakdown: breakdown
      }
    end
  end
end

