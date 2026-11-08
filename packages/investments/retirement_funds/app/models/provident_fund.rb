# packages/investments/retirement_funds/app/models/provident_fund.rb
# frozen_string_literal: true

class ProvidentFund < ActiveRecord::Base
  self.table_name = "provident_funds"

  belongs_to :user
  has_many :provident_fund_ledgers, dependent: :destroy

  FUND_TYPES = %w[ppf epf].freeze

  validates :fund_type, inclusion: { in: FUND_TYPES }
  validates :opening_date, presence: true
  validates :current_interest_rate, numericality: { greater_than: 0 }

  scope :ppf, -> { where(fund_type: "ppf") }
  scope :epf, -> { where(fund_type: "epf") }

  def ppf?
    fund_type == "ppf"
  end

  def epf?
    fund_type == "epf"
  end

  def total_balance
    if ppf?
      RetirementFunds::PpfCalculator.calculate_total_balance(provident_fund_ledgers, current_interest_rate)
    else
      RetirementFunds::EpfCalculator.calculate_total_corpus(provident_fund_ledgers)
    end
  end

  def employee_balance
    provident_fund_ledgers.sum(:employee_share)
  end

  def employer_balance
    provident_fund_ledgers.sum(:employer_share)
  end

  def pension_balance
    provident_fund_ledgers.sum(:pension_share)
  end

  def total_interest_credited
    provident_fund_ledgers.sum(:interest_credited)
  end
end

