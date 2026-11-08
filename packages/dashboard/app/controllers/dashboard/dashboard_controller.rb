# app/controllers/dashboard_controller.rb
# frozen_string_literal: true

class DashboardController < ApplicationController
  def index
    @snapshot = Dashboard::Aggregator.snapshot_for(current_user)

    # Holdings and accounts for tabbed drill-down tables
    @mutual_funds = current_user.mutual_fund_holdings.order(invested_amount: :desc)
    @deposit_accounts = current_user.deposit_accounts.order(start_date: :desc)
    @provident_funds = current_user.provident_funds.includes(:provident_fund_ledgers)
    @health_policies = HealthInsurance::Query.policies(current_user)
    @life_policies = LifeInsurance::Query.policies(current_user)

    # Initial default values for inline interactive calculator
    @calc_principal = 200_000
    @calc_rate = 7.10
    @calc_tenure_months = 36
    @calc_maturity = FixedIncome::FdCalculator.maturity_amount(
      principal: @calc_principal,
      annual_rate: @calc_rate,
      tenure_months: @calc_tenure_months
    )
    @calc_interest = FixedIncome::FdCalculator.interest_earned(
      principal: @calc_principal,
      annual_rate: @calc_rate,
      tenure_months: @calc_tenure_months
    )
  end
end

