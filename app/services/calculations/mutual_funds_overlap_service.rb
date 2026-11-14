# frozen_string_literal: true

module Calculations
  # Thin adapter delegating mutual fund stock overlap logic to MutualFunds::OverlapAnalyzer.
  class MutualFundsOverlapService
    FUND_HOLDINGS_CATALOG = MutualFunds::OverlapAnalyzer::FUND_HOLDINGS_CATALOG
    GENERIC_DEFAULT_HOLDINGS = MutualFunds::OverlapAnalyzer::GENERIC_DEFAULT_HOLDINGS

    class << self
      delegate :holdings_for,
               :holdings_for_fund,
               :fetch_live_stocks,
               :calculate_pairwise_overlap,
               :calculate_portfolio_overlap_matrix,
               :calculate_consolidated_holdings,
               :portfolio_aggregate_holdings,
               :default_holdings_for_unknown,
               to: MutualFunds::OverlapAnalyzer
    end
  end
end
