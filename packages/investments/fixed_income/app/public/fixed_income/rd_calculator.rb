# packages/investments/fixed_income/app/public/fixed_income/rd_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module FixedIncome
  class RdCalculator
    # Standard RD maturity calculation using quarterly compounding on monthly deposits:
    # M = P * (1 + r/4)^(4 * t/12) for each month t from 1 to N
    def self.maturity_amount(monthly_installment:, annual_rate:, tenure_months:)
      p = BigDecimal(monthly_installment.to_s)
      return BigDecimal("0.0") if p.zero?

      r = BigDecimal(annual_rate.to_s) / 100
      n = BigDecimal("4.0") # Standard quarterly compounding
      months = tenure_months.to_i

      total = BigDecimal("0.0")
      (1..months).each do |m|
        # Deposit stays for (months - m + 1) months
        tenure_fraction = BigDecimal((months - m + 1).to_s) / 12
        future_value = p * ((1 + (r / n))**(n * tenure_fraction))
        total += future_value
      end

      total.round(2)
    end

    def self.total_invested(monthly_installment:, tenure_months:)
      (BigDecimal(monthly_installment.to_s) * tenure_months.to_i).round(2)
    end

    def self.interest_earned(monthly_installment:, annual_rate:, tenure_months:)
      total_mat = maturity_amount(
        monthly_installment: monthly_installment,
        annual_rate: annual_rate,
        tenure_months: tenure_months
      )
      invested = total_invested(
        monthly_installment: monthly_installment,
        tenure_months: tenure_months
      )
      [total_mat - invested, BigDecimal("0.0")].max.round(2)
    end
  end
end

