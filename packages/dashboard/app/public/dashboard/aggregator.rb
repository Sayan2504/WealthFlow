# packages/dashboard/app/public/dashboard/aggregator.rb
# frozen_string_literal: true

module Dashboard
  class Aggregator
    def self.snapshot_for(user)
      mf_val       = MutualFunds::Query.current_valuation(user)
      mf_inv       = MutualFunds::Query.total_invested(user)
      mf_profit    = MutualFunds::Query.total_unrealized_profit(user)
      mf_xirr      = MutualFunds::Query.overall_xirr(user)

      deposits_val = FixedIncome::Query.total_liquid_value(user)
      deposits_inv = FixedIncome::Query.total_invested(user)
      dep_breakdown = FixedIncome::Query.summary_by_type(user)

      ppf_val      = RetirementFunds::Query.ppf_balance(user)
      epf_val      = RetirementFunds::Query.epf_balance(user)
      retirement_val = ppf_val + epf_val

      total_net_worth = mf_val + deposits_val + retirement_val
      total_invested  = mf_inv + deposits_inv + retirement_val
      total_returns   = [total_net_worth - total_invested, BigDecimal("0.0")].max

      health_cover = HealthInsurance::Query.total_sum_assured(user)
      life_cover   = LifeInsurance::Query.total_sum_assured(user)
      health_prem  = HealthInsurance::Query.total_annual_premium(user)
      life_prem    = LifeInsurance::Query.total_annual_premium(user)

      # Assume average annual benchmark income or calculate adequacy
      benchmark_annual_income = BigDecimal("1500000.00") # 15 Lakh INR default baseline
      adequacy_pct = LifeInsurance::AdequacyCalculator.adequacy_ratio(
        current_life_cover: life_cover,
        annual_income: benchmark_annual_income
      )
      adequacy_status = LifeInsurance::AdequacyCalculator.coverage_health_status(adequacy_pct)

      # Asset allocation percentages
      allocation = if total_net_worth.positive?
                     {
                       mutual_funds_pct: ((mf_val / total_net_worth) * 100).round(1),
                       fixed_income_pct: ((deposits_val / total_net_worth) * 100).round(1),
                       retirement_pct: ((retirement_val / total_net_worth) * 100).round(1)
                     }
                   else
                     { mutual_funds_pct: 0, fixed_income_pct: 0, retirement_pct: 0 }
                   end

      {
        net_worth: total_net_worth,
        total_invested: total_invested,
        total_returns: total_returns,
        overall_xirr: mf_xirr,
        breakdown: {
          mutual_funds: { current: mf_val, invested: mf_inv, gain: mf_profit, xirr: mf_xirr },
          fixed_income: { current: deposits_val, invested: deposits_inv, types: dep_breakdown },
          retirement: { total: retirement_val, ppf: ppf_val, epf: epf_val }
        },
        allocation: allocation,
        insurance: {
          health_cover: health_cover,
          health_annual_premium: health_prem,
          life_cover: life_cover,
          life_annual_premium: life_prem,
          adequacy_ratio: adequacy_pct,
          adequacy_status: adequacy_status
        }
      }
    end
  end
end

