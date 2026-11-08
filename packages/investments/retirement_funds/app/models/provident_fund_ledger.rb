# packages/investments/retirement_funds/app/models/provident_fund_ledger.rb
# frozen_string_literal: true

class ProvidentFundLedger < ActiveRecord::Base
  self.table_name = "provident_fund_ledgers"

  belongs_to :provident_fund

  validates :entry_date, presence: true

  scope :chronological, -> { order(entry_date: :asc) }

  def total_contribution
    (employee_share || 0) + (employer_share || 0)
  end
end

