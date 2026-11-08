# packages/investments/fixed_income/app/models/deposit_transaction.rb
# frozen_string_literal: true

class DepositTransaction < ActiveRecord::Base
  self.table_name = "deposit_transactions"

  belongs_to :deposit_account

  TRANSACTION_TYPES = %w[installment variable_deposit interest_credit withdrawal].freeze

  validates :transaction_date, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :transaction_type, inclusion: { in: TRANSACTION_TYPES }

  scope :chronological, -> { order(transaction_date: :asc) }
end

