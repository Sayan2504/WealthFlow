# packages/insurance/health_insurance/app/public/health_insurance/query.rb
# frozen_string_literal: true

module HealthInsurance
  class Query
    def self.total_sum_assured(user)
      policies = InsurancePolicy.where(user: user, category: "health").active
      policies.sum(:sum_assured).round(2)
    end

    def self.total_annual_premium(user)
      policies = InsurancePolicy.where(user: user, category: "health").active
      policies.sum do |p|
        case p.premium_frequency
        when "monthly" then p.premium_amount * 12
        when "quarterly" then p.premium_amount * 4
        when "half_yearly" then p.premium_amount * 2
        when "annually" then p.premium_amount
        else p.premium_amount
        end
      end.round(2)
    end

    def self.policies(user)
      InsurancePolicy.where(user: user, category: "health").order(end_date: :asc)
    end
  end
end

