# packages/investments/mutual_funds/app/public/mutual_funds/query.rb
# frozen_string_literal: true

module MutualFunds
  class Query
    def self.current_valuation(user)
      holdings = MutualFundHolding.where(user: user)
      holdings.sum { |h| h.current_value || BigDecimal("0.0") }.round(2)
    end

    def self.total_invested(user)
      MutualFundHolding.where(user: user).sum(:invested_amount).round(2)
    end

    def self.total_unrealized_profit(user)
      [current_valuation(user) - total_invested(user), BigDecimal("0.0")].max.round(2)
    end

    def self.overall_xirr(user)
      holdings = MutualFundHolding.where(user: user).includes(:mutual_fund_transactions)
      cash_flows = []

      holdings.each do |holding|
        holding.mutual_fund_transactions.each do |tx|
          cash_flows << {
            date: tx.transaction_date,
            amount: tx.transaction_type == "redemption" ? tx.amount : -tx.amount
          }
        end

        cur_val = holding.current_value
        if cur_val.positive?
          cash_flows << {
            date: Date.current,
            amount: cur_val
          }
        end
      end

      Core::FinancialMath.xirr(cash_flows)
    end
  end
end

