# packages/investments/fixed_income/app/public/fixed_income/fd_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module FixedIncome
  class FdCalculator
    # Maturity formula: A = P * (1 + r/n)^(n*t)
    def self.maturity_amount(principal:, annual_rate:, tenure_months:, compounding_per_year: 4)
      p = BigDecimal(principal.to_s)
      return BigDecimal("0.0") if p.zero?

      r = BigDecimal(annual_rate.to_s) / 100
      n = BigDecimal(compounding_per_year.to_s)
      t = BigDecimal(tenure_months.to_s) / 12

      maturity = p * ((1 + (r / n))**(n * t))
      maturity.round(2)
    end

    def self.interest_earned(principal:, annual_rate:, tenure_months:, compounding_per_year: 4)
      p = BigDecimal(principal.to_s)
      maturity = maturity_amount(
        principal: p,
        annual_rate: annual_rate,
        tenure_months: tenure_months,
        compounding_per_year: compounding_per_year
      )
      [maturity - p, BigDecimal("0.0")].max.round(2)
    end
  end
end

