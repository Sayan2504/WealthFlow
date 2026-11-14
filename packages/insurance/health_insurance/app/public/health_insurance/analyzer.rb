# frozen_string_literal: true

module HealthInsurance
  # Health policy coverage sum, annual premium burden, and expiry alerts.
  class Analyzer
    def self.summarize(policies)
      list = Array(policies).map(&:with_indifferent_access)
      expiring = list.count do |p|
        %w[EXPIRED DUE\ SOON].include?(Core::FinancialMath.calculate_policy_status(p[:end_date])[:status])
      end

      sum_insured = list.sum { |p| p[:sum_insured].to_f }
      premium = list.sum { |p| p[:annual_premium].to_f }

      {
        sumInsured: sum_insured,
        premium: premium,
        count: list.size,
        alertsCount: expiring,
        sumInsuredInr: Core::CurrencyFormatter.format_inr(sum_insured),
        premiumInr: Core::CurrencyFormatter.format_inr(premium)
      }
    end
  end
end

