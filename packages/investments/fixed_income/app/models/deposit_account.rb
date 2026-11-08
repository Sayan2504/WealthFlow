# packages/investments/fixed_income/app/models/deposit_account.rb
# frozen_string_literal: true

class DepositAccount < ActiveRecord::Base
  self.table_name = "deposit_accounts"

  belongs_to :user
  has_many :deposit_transactions, dependent: :destroy

  ACCOUNT_TYPES = %w[fixed_deposit recurring_deposit flexi_rd].freeze
  COMPOUNDING_FREQUENCIES = %w[monthly quarterly half_yearly yearly].freeze

  validates :institution_name, presence: true
  validates :account_type, inclusion: { in: ACCOUNT_TYPES }
  validates :interest_rate, presence: true, numericality: { greater_than: 0 }
  validates :start_date, presence: true
  validates :maturity_date, presence: true

  scope :fixed_deposits, -> { where(account_type: "fixed_deposit") }
  scope :recurring_deposits, -> { where(account_type: "recurring_deposit") }
  scope :flexi_rds, -> { where(account_type: "flexi_rd") }
  scope :active, -> { where("maturity_date >= ?", Date.current) }

  def fixed_deposit?
    account_type == "fixed_deposit"
  end

  def recurring_deposit?
    account_type == "recurring_deposit"
  end

  def flexi_rd?
    account_type == "flexi_rd"
  end

  def tenure_months
    return 0 unless start_date && maturity_date

    ((maturity_date.year - start_date.year) * 12) + (maturity_date.month - start_date.month)
  end

  def maturity_amount
    case account_type
    when "fixed_deposit"
      FixedIncome::FdCalculator.maturity_amount(
        principal: principal_amount,
        annual_rate: interest_rate,
        tenure_months: tenure_months,
        compounding_per_year: compounding_times_per_year
      )
    when "recurring_deposit"
      FixedIncome::RdCalculator.maturity_amount(
        monthly_installment: monthly_installment,
        annual_rate: interest_rate,
        tenure_months: tenure_months
      )
    when "flexi_rd"
      FixedIncome::FlexiRdCalculator.calculate_projected_maturity(
        deposit_transactions: deposit_transactions,
        annual_rate: interest_rate,
        maturity_date: maturity_date
      )
    else
      principal_amount
    end
  end

  def current_value
    case account_type
    when "fixed_deposit"
      elapsed_months = [((Date.current.year - start_date.year) * 12) + (Date.current.month - start_date.month), 0].max
      FixedIncome::FdCalculator.maturity_amount(
        principal: principal_amount,
        annual_rate: interest_rate,
        tenure_months: elapsed_months,
        compounding_per_year: compounding_times_per_year
      )
    when "recurring_deposit", "flexi_rd"
      FixedIncome::FlexiRdCalculator.calculate_current_value(
        deposit_transactions,
        interest_rate,
        Date.current
      )
    end
  end

  def total_invested
    if fixed_deposit?
      principal_amount
    else
      deposit_transactions.sum(:amount)
    end
  end

  def interest_earned
    [current_value - total_invested, 0].max
  end

  private

  def compounding_times_per_year
    case compounding_frequency
    when "monthly" then 12
    when "quarterly" then 4
    when "half_yearly" then 2
    when "yearly" then 1
    else 4
    end
  end
end

