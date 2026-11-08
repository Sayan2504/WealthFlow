# packages/liabilities/home_loan/app/public/home_loan/emi_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module HomeLoan
  class EmiCalculator
    # Standard Reducing-Balance EMI Formula:
    # EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    def self.monthly_emi(principal:, annual_rate:, tenure_years:)
      p = BigDecimal(principal.to_s)
      return BigDecimal("0.0") if p.zero? || tenure_years.to_i <= 0

      r = BigDecimal(annual_rate.to_s) / 100 / 12
      n = tenure_years.to_i * 12
      factor = (1 + r)**n
      ((p * r * factor) / (factor - 1)).round(0)
    end
  end
end

