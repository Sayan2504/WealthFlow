# frozen_string_literal: true

module Calculations
  # Thin adapter delegating PPF/EPF calculations to RetirementFunds::Calculator.
  class RetirementCalculator
    PPF_LIMIT = RetirementFunds::Calculator::PPF_LIMIT

    class << self
      delegate :normalize_ppf_fy, :group_ppf_by_financial_year, to: RetirementFunds::Calculator
    end
  end
end
