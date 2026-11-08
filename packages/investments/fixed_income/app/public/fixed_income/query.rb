# packages/investments/fixed_income/app/public/fixed_income/query.rb
# frozen_string_literal: true

module FixedIncome
  class Query
    def self.total_liquid_value(user)
      accounts = DepositAccount.where(user: user)
      accounts.sum { |acc| acc.current_value || BigDecimal("0.0") }.round(2)
    end

    def self.total_invested(user)
      accounts = DepositAccount.where(user: user)
      accounts.sum { |acc| acc.total_invested || BigDecimal("0.0") }.round(2)
    end

    def self.summary_by_type(user)
      accounts = DepositAccount.where(user: user)
      {
        fd_value: accounts.fixed_deposits.sum { |a| a.current_value || 0 }.round(2),
        rd_value: accounts.recurring_deposits.sum { |a| a.current_value || 0 }.round(2),
        flexi_rd_value: accounts.flexi_rds.sum { |a| a.current_value || 0 }.round(2),
        count: accounts.count
      }
    end
  end
end

