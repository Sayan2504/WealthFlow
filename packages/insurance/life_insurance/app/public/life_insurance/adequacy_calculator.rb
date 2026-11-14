# frozen_string_literal: true

module LifeInsurance
  # Life protection cover adequacy (Human Life Value multiplier) and ULIP fund summary.
  class AdequacyCalculator
    def self.summarize(life_policies, ulip = {}, annual_income: 1_800_000)
      list = Array(life_policies).map(&:with_indifferent_access)
      sum_insured = list.sum { |p| p[:sum_insured].to_f }
      premium = list.sum { |p| p[:annual_premium].to_f }
      recommended_cover = annual_income.to_f * 15
      adequacy_pct = recommended_cover.positive? ? [((sum_insured / recommended_cover) * 100.0).round, 100].min : 100

      ulip_h = (ulip || {}).with_indifferent_access
      ulip_paid = ulip_h[:total_paid].to_f
      ulip_val = ulip_h[:current_value].to_f
      ulip_gain = ulip_val - ulip_paid

      {
        sumInsured: sum_insured,
        premium: premium,
        count: list.size,
        recommendedCover: recommended_cover.round,
        adequacyPct: adequacy_pct,
        ulipPaid: ulip_paid,
        ulipValue: ulip_val,
        ulipGain: ulip_gain,
        sumInsuredInr: Core::CurrencyFormatter.format_inr(sum_insured)
      }
    end
  end
end

