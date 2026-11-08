# packages/investments/mutual_funds/app/models/mutual_fund_holding.rb
# frozen_string_literal: true

class MutualFundHolding < ActiveRecord::Base
  self.table_name = "mutual_fund_holdings"

  belongs_to :user
  has_many :mutual_fund_transactions, dependent: :destroy

  CATEGORIES = %w[equity_large_cap equity_mid_cap equity_small_cap flexi_cap debt hybrid elss index gold_etf].freeze

  validates :scheme_name, presence: true
  validates :category, inclusion: { in: CATEGORIES }
  validates :units, numericality: { greater_than_or_equal_to: 0 }
  validates :invested_amount, numericality: { greater_than_or_equal_to: 0 }

  scope :positive_holdings, -> { where("units > 0") }

  def current_value
    (units * (latest_nav || 0)).round(2)
  end

  def absolute_return
    return BigDecimal("0.0") if invested_amount.zero?

    Core::FinancialMath.absolute_return(
      invested_amount: invested_amount,
      current_value: current_value
    )
  end

  def xirr
    cash_flows = mutual_fund_transactions.map do |tx|
      {
        date: tx.transaction_date,
        amount: tx.transaction_type == "redemption" ? tx.amount : -tx.amount
      }
    end

    # Terminal valuation cash flow as of today
    if current_value.positive?
      cash_flows << {
        date: Date.current,
        amount: current_value
      }
    end

    Core::FinancialMath.xirr(cash_flows)
  end
end

