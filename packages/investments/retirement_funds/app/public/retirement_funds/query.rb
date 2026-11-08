# packages/investments/retirement_funds/app/public/retirement_funds/query.rb
# frozen_string_literal: true

module RetirementFunds
  class Query
    def self.balance(user)
      funds = ProvidentFund.where(user: user).includes(:provident_fund_ledgers)
      funds.sum { |f| f.total_balance || BigDecimal("0.0") }.round(2)
    end

    def self.ppf_balance(user)
      funds = ProvidentFund.where(user: user, fund_type: "ppf").includes(:provident_fund_ledgers)
      funds.sum { |f| f.total_balance || BigDecimal("0.0") }.round(2)
    end

    def self.epf_balance(user)
      funds = ProvidentFund.where(user: user, fund_type: "epf").includes(:provident_fund_ledgers)
      funds.sum { |f| f.total_balance || BigDecimal("0.0") }.round(2)
    end

    def self.epf_pension_balance(user)
      funds = ProvidentFund.where(user: user, fund_type: "epf").includes(:provident_fund_ledgers)
      funds.sum { |f| f.pension_balance || BigDecimal("0.0") }.round(2)
    end
  end
end

