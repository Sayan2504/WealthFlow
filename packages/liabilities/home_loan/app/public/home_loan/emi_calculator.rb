# frozen_string_literal: true

module HomeLoan
  # Mortgage EMI computation, principal repaid ratio, and amortization status.
  class EmiCalculator
    def self.summarize(home_loan_data)
      hl = (home_loan_data || {}).with_indifferent_access
      orig = hl[:original_loan_amount].to_f
      out = hl[:outstanding_principal].to_f
      tenure = hl[:tenure_years].to_f
      rate = hl[:interest_rate].to_f
      auto_emi = Core::FinancialMath.calculate_standard_emi(principal: orig, annual_rate: rate, tenure_years: tenure)
      monthly_emi = hl[:monthly_emi].to_f.positive? ? hl[:monthly_emi].to_f : auto_emi
      repaid = [0.0, orig - out].max
      repaid_pct = orig.positive? ? ((repaid / orig) * 100.0).round : 0

      {
        outstanding_principal: out,
        monthly_emi: monthly_emi,
        auto_emi: auto_emi,
        original_loan_amount: orig,
        principal_repaid: repaid,
        repaid_pct: repaid_pct,
        loan_start_date: hl[:loan_start_date].to_s,
        tenure_years: tenure,
        interest_rate: rate,
        emi_day: (hl[:emi_day].to_i.positive? ? hl[:emi_day].to_i : 26),
        outstandingInr: Core::CurrencyFormatter.format_inr(out),
        emiInr: Core::CurrencyFormatter.format_inr(monthly_emi)
      }
    end
  end
end

