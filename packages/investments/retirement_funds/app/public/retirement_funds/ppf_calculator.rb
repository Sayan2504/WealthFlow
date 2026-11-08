# packages/investments/retirement_funds/app/public/retirement_funds/ppf_calculator.rb
# frozen_string_literal: true

require "bigdecimal"
require "date"

module RetirementFunds
  class PpfCalculator
    # PPF Rule: Lowest balance between the 5th and end of each month earns interest at annual_rate / 12.
    # Interest compounds annually on March 31st.
    def self.calculate_total_balance(ledgers, annual_rate)
      return BigDecimal("0.0") if ledgers.empty?

      sorted_ledgers = ledgers.sort_by(&:entry_date)
      current_balance = BigDecimal("0.0")
      fiscal_year_interest = BigDecimal("0.0")
      monthly_rate = (BigDecimal(annual_rate.to_s) / 100) / 12

      # Group by fiscal year (April 1 to March 31)
      # For each entry, update running balance
      sorted_ledgers.each do |ledger|
        amount = BigDecimal(ledger.employee_share.to_s)
        current_balance += amount

        # If deposited before 5th, it earns interest for that month
        # Monthly interest accrual
        is_before_5th = ledger.entry_date.day <= 5
        if is_before_5th
          fiscal_year_interest += (current_balance * monthly_rate)
        else
          # Earns interest starting next month
          fiscal_year_interest += ((current_balance - amount) * monthly_rate)
        end
      end

      # Add explicitly credited interest from ledgers or calculated interest
      explicit_interest = sorted_ledgers.sum { |l| BigDecimal(l.interest_credited.to_s) }
      if explicit_interest.positive?
        current_balance + explicit_interest
      else
        current_balance + fiscal_year_interest.round(2)
      end
    end

    # 15-year projection calculator for periodic annual or monthly investments
    def self.project_corpus(annual_deposit:, annual_rate: 7.1, tenure_years: 15)
      p = BigDecimal(annual_deposit.to_s)
      r = BigDecimal(annual_rate.to_s) / 100
      balance = BigDecimal("0.0")

      tenure_years.to_i.times do
        balance = (balance + p) * (1 + r)
      end

      balance.round(2)
    end
  end
end

