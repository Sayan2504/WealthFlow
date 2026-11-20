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

    def self.simulate_prepayment(home_loan_data, lump_sum: 0, extra_monthly_emi: 0)
      summary = summarize(home_loan_data)
      out = summary[:outstanding_principal].to_f
      rate = summary[:interest_rate].to_f
      base_emi = summary[:monthly_emi].to_f
      lump = [0.0, lump_sum.to_f].max
      extra_emi = [0.0, extra_monthly_emi.to_f].max

      base_months, base_interest = amortize_schedule(out, rate, base_emi)
      new_principal = [0.0, out - lump].max
      accel_months, accel_interest = amortize_schedule(new_principal, rate, base_emi + extra_emi)

      months_saved = [0, base_months - accel_months].max
      interest_saved = [0.0, (base_interest - accel_interest).round].max

      {
        outstanding_principal: out,
        lump_sum: lump.round,
        extra_monthly_emi: extra_emi.round,
        baseline_months: base_months,
        accelerated_months: accel_months,
        months_saved: months_saved,
        years_saved: (months_saved / 12.0).round(1),
        baseline_interest: base_interest.round,
        accelerated_interest: accel_interest.round,
        interest_saved: interest_saved.round,
        baseline_interest_inr: Core::CurrencyFormatter.format_inr(base_interest.round),
        accelerated_interest_inr: Core::CurrencyFormatter.format_inr(accel_interest.round),
        interest_saved_inr: Core::CurrencyFormatter.format_inr(interest_saved.round),
        lump_sum_inr: Core::CurrencyFormatter.format_inr(lump.round),
        extra_emi_inr: Core::CurrencyFormatter.format_inr(extra_emi.round)
      }
    end

    def self.amortize_schedule(principal, annual_rate, monthly_emi)
      bal = principal.to_f
      return [0, 0.0] if bal <= 0 || monthly_emi.to_f <= 0

      r = (annual_rate.to_f / 100.0) / 12.0
      min_emi = bal * r
      eff_emi = [monthly_emi.to_f, min_emi + 500.0].max
      months = 0
      total_interest = 0.0

      while bal > 1.0 && months < 600
        months += 1
        interest_for_month = bal * r
        total_interest += interest_for_month
        principal_component = eff_emi - interest_for_month
        break if principal_component <= 0

        bal = [0.0, bal - principal_component].max
      end

      [months, total_interest]
    end
    private_class_method :amortize_schedule
  end
end

