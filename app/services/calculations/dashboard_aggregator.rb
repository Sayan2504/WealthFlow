# frozen_string_literal: true

module Calculations
  # Thin adapter delegating consolidated overview calculations to Dashboard::Aggregator.
  class DashboardAggregator
    class << self
      delegate :calculate_overview,
               :compute_overview,
               :summarize_mutual_funds,
               :summarize_fixed_income,
               :summarize_retirement,
               :summarize_policy_group,
               :summarize_home_loan,
               :calculate_credit_card_metrics,
               :summarize_banking,
               to: Dashboard::Aggregator
    end
  end
end
