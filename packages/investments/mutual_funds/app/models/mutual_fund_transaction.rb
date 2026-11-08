# packages/investments/mutual_funds/app/models/mutual_fund_transaction.rb
# frozen_string_literal: true

class MutualFundTransaction < ActiveRecord::Base
  self.table_name = "mutual_fund_transactions"

  belongs_to :mutual_fund_holding

  TRANSACTION_TYPES = %w[sip lump_sum redemption dividend].freeze

  validates :transaction_date, presence: true
  validates :transaction_type, inclusion: { in: TRANSACTION_TYPES }
  validates :amount, numericality: { greater_than: 0 }
  validates :units, numericality: { greater_than: 0 }
  validates :nav_applied, numericality: { greater_than: 0 }

  scope :chronological, -> { order(transaction_date: :asc) }
end

