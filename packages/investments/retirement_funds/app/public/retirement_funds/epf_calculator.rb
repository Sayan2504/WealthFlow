# packages/investments/retirement_funds/app/public/retirement_funds/epf_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module RetirementFunds
  class EpfCalculator
    STATUTORY_EPS_WAGE_CEILING = BigDecimal("15000.00")
    EMPLOYEE_RATE = BigDecimal("0.12")
    EMPLOYER_EPF_RATE = BigDecimal("0.0367")
    EMPLOYER_EPS_RATE = BigDecimal("0.0833")

    def self.monthly_breakdown(basic_plus_da)
      wage = BigDecimal(basic_plus_da.to_s)
      employee_contrib = wage * EMPLOYEE_RATE

      # EPS is capped at statutory ceiling in standard EPFO rules unless higher pension opted
      eps_wage = [wage, STATUTORY_EPS_WAGE_CEILING].min
      eps_contrib = (eps_wage * EMPLOYER_EPS_RATE).round(2)
      employer_epf_contrib = ((wage * EMPLOYEE_RATE) - eps_contrib).round(2)

      {
        employee_share: employee_contrib.round(2),
        employer_share: employer_epf_contrib,
        pension_share: eps_contrib,
        total_monthly_saving: (employee_contrib + employer_epf_contrib).round(2)
      }
    end

    def self.calculate_total_corpus(ledgers)
      employee_total = ledgers.sum { |l| BigDecimal(l.employee_share.to_s) }
      employer_total = ledgers.sum { |l| BigDecimal(l.employer_share.to_s) }
      interest_total = ledgers.sum { |l| BigDecimal(l.interest_credited.to_s) }

      (employee_total + employer_total + interest_total).round(2)
    end
  end
end

