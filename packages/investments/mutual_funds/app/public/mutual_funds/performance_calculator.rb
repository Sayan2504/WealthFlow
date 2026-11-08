# packages/investments/mutual_funds/app/public/mutual_funds/performance_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module MutualFunds
  class PerformanceCalculator
    def self.sip_future_value(monthly_investment:, expected_cagr_pct:, tenure_years:)
      p = BigDecimal(monthly_investment.to_s)
      return BigDecimal("0.0") if p.zero?

      i = (BigDecimal(expected_cagr_pct.to_s) / 100) / 12
      n = tenure_years.to_i * 12

      # FV = P * [ ((1 + i)^n - 1) / i ] * (1 + i)
      future_val = p * ((((1 + i)**n) - 1) / i) * (1 + i)
      future_val.round(2)
    end

    def self.sip_invested_amount(monthly_investment:, tenure_years:)
      (BigDecimal(monthly_investment.to_s) * tenure_years.to_i * 12).round(2)
    end

    def self.sip_wealth_gain(monthly_investment:, expected_cagr_pct:, tenure_years:)
      fv = sip_future_value(
        monthly_investment: monthly_investment,
        expected_cagr_pct: expected_cagr_pct,
        tenure_years: tenure_years
      )
      inv = sip_invested_amount(
        monthly_investment: monthly_investment,
        tenure_years: tenure_years
      )
      [fv - inv, BigDecimal("0.0")].max.round(2)
    end
  end
end

