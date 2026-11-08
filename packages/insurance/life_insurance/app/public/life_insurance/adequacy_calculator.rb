# packages/insurance/life_insurance/app/public/life_insurance/adequacy_calculator.rb
# frozen_string_literal: true

require "bigdecimal"

module LifeInsurance
  class AdequacyCalculator
    # Human Life Value (HLV) standard metric: 15-20x annual income or income-replacement model
    RECOMMENDED_INCOME_MULTIPLIER = 15

    def self.target_coverage(annual_income:, outstanding_liabilities: 0)
      income = BigDecimal(annual_income.to_s)
      liabilities = BigDecimal(outstanding_liabilities.to_s)

      (income * RECOMMENDED_INCOME_MULTIPLIER) + liabilities
    end

    def self.adequacy_ratio(current_life_cover:, annual_income:, outstanding_liabilities: 0)
      target = target_coverage(annual_income: annual_income, outstanding_liabilities: outstanding_liabilities)
      return BigDecimal("0.0") if target.zero?

      cover = BigDecimal(current_life_cover.to_s)
      ((cover / target) * 100).round(1)
    end

    def self.coverage_health_status(ratio)
      r = BigDecimal(ratio.to_s)
      if r >= 100
        { status: :optimal, label: "Optimal Cover", color: "emerald" }
      elsif r >= 60
        { status: :moderate, label: "Moderate Cover", color: "amber" }
      else
        { status: :underinsured, label: "Underinsured", color: "rose" }
      end
    end
  end
end

