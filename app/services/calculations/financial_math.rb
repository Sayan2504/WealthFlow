# frozen_string_literal: true

module Calculations
  # Thin adapter delegating financial math primitives to Core::FinancialMath.
  class FinancialMath
    class << self
      delegate :compute_exact_duration,
               :compute_days_to_maturity,
               :calculate_fd,
               :calculate_rd,
               :calculate_flexi_rd,
               :calculate_post_tax_interest,
               :calculate_standard_emi,
               :calculate_policy_status,
               :parse_date,
               to: Core::FinancialMath
    end
  end
end
