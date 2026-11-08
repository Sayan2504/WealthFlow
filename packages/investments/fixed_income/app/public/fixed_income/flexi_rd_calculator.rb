# packages/investments/fixed_income/app/public/fixed_income/flexi_rd_calculator.rb
# frozen_string_literal: true

require "bigdecimal"
require "date"

module FixedIncome
  class FlexiRdCalculator
    # Flexi RD computes day-accurate compounding for irregular deposits
    def self.calculate_current_value(transactions, annual_rate, as_of_date = Date.current)
      return BigDecimal("0.0") if transactions.empty?

      r = BigDecimal(annual_rate.to_s) / 100
      n = BigDecimal("4.0") # Quarterly compound basis

      total = BigDecimal("0.0")
      transactions.each do |tx|
        days_invested = (as_of_date - tx.transaction_date).to_i
        next if days_invested <= 0

        years = BigDecimal(days_invested.to_s) / BigDecimal("365.25")
        future_val = BigDecimal(tx.amount.to_s) * ((1 + (r / n))**(n * years))
        total += future_val
      end

      total.round(2)
    end

    def self.calculate_projected_maturity(deposit_transactions:, annual_rate:, maturity_date:)
      calculate_current_value(deposit_transactions, annual_rate, maturity_date)
    end
  end
end

