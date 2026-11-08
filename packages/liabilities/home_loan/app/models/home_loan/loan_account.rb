# packages/liabilities/home_loan/app/models/home_loan/loan_account.rb
# frozen_string_literal: true

module HomeLoan
  class LoanAccount < ApplicationRecord
    self.table_name = "home_loans"

    belongs_to :user
    validates :outstanding_principal, :original_loan_amount, :monthly_emi, numericality: { greater_than_or_equal_to: 0 }
    validates :interest_rate, numericality: { greater_than: 0, less_than: 30 }
  end
end

