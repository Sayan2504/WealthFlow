# packages/core/app/public/core/financial_math.rb
# frozen_string_literal: true

require "bigdecimal"
require "date"

module Core
  class FinancialMath
    # Precision epsilon for Newton-Raphson
    EPSILON = BigDecimal("0.0000001")
    MAX_ITERATIONS = 100

    # Compound interest: A = P * (1 + r/n)^(n*t)
    def self.compound_interest(principal:, annual_rate_pct:, tenure_years:, compounding_frequency: 4)
      p = BigDecimal(principal.to_s)
      r = BigDecimal(annual_rate_pct.to_s) / 100
      n = BigDecimal(compounding_frequency.to_s)
      t = BigDecimal(tenure_years.to_s)

      (p * ((1 + (r / n))**(n * t))).round(2)
    end

    # Compound Annual Growth Rate (CAGR)
    # CAGR = (Ending Value / Beginning Value) ^ (1 / years) - 1
    def self.cagr(beginning_value:, ending_value:, tenure_years:)
      bv = BigDecimal(beginning_value.to_s)
      ev = BigDecimal(ending_value.to_s)
      t = BigDecimal(tenure_years.to_s)

      return BigDecimal("0.0") if bv.zero? || t.zero?

      growth_ratio = ev / bv
      cagr_decimal = (growth_ratio.to_f**(1.0 / t.to_f)) - 1.0
      (BigDecimal(cagr_decimal.to_s) * 100).round(2)
    end

    # Absolute Return = ((Current Value - Invested) / Invested) * 100
    def self.absolute_return(invested_amount:, current_value:)
      inv = BigDecimal(invested_amount.to_s)
      cur = BigDecimal(current_value.to_s)

      return BigDecimal("0.0") if inv.zero?

      (((cur - inv) / inv) * 100).round(2)
    end

    # Extended Internal Rate of Return (XIRR) via Newton-Raphson
    # cash_flows: array of hashes [ { date: Date, amount: -10000 }, { date: Date, amount: 15000 } ]
    def self.xirr(cash_flows, guess: 0.1)
      return BigDecimal("0.0") if cash_flows.nil? || cash_flows.size < 2

      # Validate at least one positive and one negative cash flow
      amounts = cash_flows.map { |cf| BigDecimal(cf[:amount].to_s) }
      has_negative = amounts.any?(&:negative?)
      has_positive = amounts.any?(&:positive?)
      return BigDecimal("0.0") unless has_negative && has_positive

      # Sort chronologically
      sorted_flows = cash_flows.sort_by { |cf| cf[:date] }
      start_date = sorted_flows.first[:date]

      r = BigDecimal(guess.to_s)

      MAX_ITERATIONS.times do
        f_value = BigDecimal("0.0")
        f_derivative = BigDecimal("0.0")

        sorted_flows.each do |cf|
          amount = BigDecimal(cf[:amount].to_s)
          days_diff = BigDecimal((cf[:date] - start_date).to_i.to_s)
          time_in_years = days_diff / BigDecimal("365.0")

          base = 1 + r
          next if base <= 0

          # Cash flow discounted at rate r
          discount_factor = base.to_f**time_in_years.to_f
          f_value += amount / BigDecimal(discount_factor.to_s)

          # Derivative of discounted cash flow
          if time_in_years.positive?
            d_factor = (base.to_f**(time_in_years.to_f + 1.0))
            f_derivative -= (time_in_years * amount) / BigDecimal(d_factor.to_s)
          end
        end

        break if f_derivative.abs < EPSILON

        step = f_value / f_derivative
        r -= step

        return (r * 100).round(2) if step.abs < EPSILON
      end

      (r * 100).round(2)
    rescue StandardError
      BigDecimal("0.0")
    end
  end
end

