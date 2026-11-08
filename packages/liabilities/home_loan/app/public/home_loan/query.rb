# packages/liabilities/home_loan/app/public/home_loan/query.rb
# frozen_string_literal: true

module HomeLoan
  class Query
    def self.summary_for(user)
      loan = HomeLoan::LoanAccount.find_by(user_id: user.id)
      return { outstanding_principal: 0, monthly_emi: 0, original_loan_amount: 0, tenure_years: 0, interest_rate: 0 } unless loan

      {
        outstanding_principal: loan.outstanding_principal,
        monthly_emi: loan.monthly_emi,
        original_loan_amount: loan.original_loan_amount,
        loan_start_date: loan.loan_start_date,
        tenure_years: loan.tenure_years,
        interest_rate: loan.interest_rate
      }
    end
  end
end

