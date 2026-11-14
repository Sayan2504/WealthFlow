# frozen_string_literal: true

class PagesController < ApplicationController
  helper WealthflowHelper
  before_action :load_portfolio

  def dashboard
    @active_nav = "dashboard"
    @upcoming_fds = Array(@data[:fixed_deposits]).map do |fd|
      calc = Calculations::FinancialMath.calculate_fd(
        principal: fd[:principal],
        rate: fd[:rate],
        start_date: fd[:start_date],
        maturity_date: fd[:maturity_date],
        custom_maturity_amount: fd[:maturity_amount],
        tax_rate: @slab_rate
      )
      { raw: fd, calc: calc }
    end.sort_by { |x| x[:calc][:days_left] }

    all_policies = [
      *Array(@data[:health_insurance]).map { |p| p.merge(category_label: "Health") },
      *Array(@data[:life_insurance]).map { |p| p.merge(category_label: "Life") },
      *Array(@data[:vehicle_insurance]).map { |p| p.merge(category_label: "Vehicle") },
      *Array(@data[:home_loan_insurance]).map { |p| p.merge(category_label: "Home Loan") }
    ]
    @upcoming_policies = all_policies.map do |p|
      st = Calculations::FinancialMath.calculate_policy_status(p[:end_date])
      { raw: p, status: st }
    end.sort_by { |x| x[:status][:days_to_expiry] }
  end

  def mutual_funds
    @active_nav = "mutual_funds"
    @funds = Array(@data[:mutual_funds])
    @matrix = Calculations::MutualFundsOverlapService.calculate_portfolio_overlap_matrix(@funds)
    @consolidated = Calculations::MutualFundsOverlapService.calculate_consolidated_holdings(@funds)
    @default_pairwise = if @funds.size >= 2
                          Calculations::MutualFundsOverlapService.calculate_pairwise_overlap(@funds[0], @funds[1])
                        end
  end

  def fixed_income
    @active_nav = "fixed_income"
    @fds = Array(@data[:fixed_deposits]).map do |fd|
      calc = Calculations::FinancialMath.calculate_fd(
        principal: fd[:principal],
        rate: fd[:rate],
        start_date: fd[:start_date],
        maturity_date: fd[:maturity_date],
        custom_maturity_amount: fd[:maturity_amount],
        tax_rate: @slab_rate
      )
      { raw: fd, calc: calc }
    end

    @rds = Array(@data[:recurring_deposits]).map do |rd|
      calc = Calculations::FinancialMath.calculate_rd(
        monthly_amount: rd[:monthly_amount],
        rate: rd[:rate],
        start_date: rd[:start_date],
        end_date: rd[:end_date],
        custom_maturity_amount: rd[:maturity_amount],
        tax_rate: @slab_rate
      )
      { raw: rd, calc: calc }
    end

    @flexi_rds = Array(@data[:flexi_rds]).map do |frd|
      calc = Calculations::FinancialMath.calculate_flexi_rd(
        base_monthly: frd[:base_monthly],
        total_deposited: frd[:total_deposited],
        rate: frd[:rate],
        start_date: frd[:start_date],
        end_date: frd[:end_date],
        custom_maturity_amount: frd[:maturity_amount],
        tax_rate: @slab_rate
      )
      { raw: frd, calc: calc }
    end
  end

  def retirement
    @active_nav = "retirement"
    @ppf = @data[:ppf] || {}
    @epf = @data[:epf] || {}
    @ulip = @data[:ulip] || {}
    @ppf_groups = @ov.dig(:ppf, :fyGroups) || []
    @epf_entries = Array(@epf[:entries])
    @statutory = Market::AmfiService::STATUTORY_RETIREMENT_RATES
  end

  def insurance
    @active_nav = "insurance"
    @health_policies = enrich_policies(@data[:health_insurance])
    @life_policies = enrich_policies(@data[:life_insurance])
    @vehicle_policies = enrich_policies(@data[:vehicle_insurance])
    @home_loan_policies = enrich_policies(@data[:home_loan_insurance])
  end

  def home_loan
    @active_nav = "home_loan"
    @home_loan = @ov[:homeLoan]
    @home_loan_policies = enrich_policies(@data[:home_loan_insurance])
  end

  def banking
    @active_nav = "banking"
    @accounts = Array(@data[:bank_accounts])
    @cards = Array(@data[:credit_cards]).map do |card|
      { raw: card, metrics: Calculations::DashboardAggregator.calculate_credit_card_metrics(card) }
    end
  end

  def tax_calculator
    @active_nav = "tax_calculator"
    @tax_calc = @ov[:taxCalc]
    @tax_profile = @tax_calc[:profile]
    @new_regime = @tax_calc[:newRegime]
    @old_regime = @tax_calc[:oldRegime]
  end

  private

  def load_portfolio
    profile = Portfolio::ActiveRecordBridge.available? ? PortfolioProfile.for_user(current_user) : nil
    @pin_enabled = profile&.pin_enabled? || false
    @session_locked = @pin_enabled && session[:wealthflow_locked] == true

    @data = Portfolio::Repository.load_raw
    @slab_rate = params[:slab].present? ? params[:slab].to_f : (session[:fi_tax_slab].nil? ? 0.30 : session[:fi_tax_slab].to_f)
    @ov = Calculations::DashboardAggregator.calculate_overview(@data, slab_rate: @slab_rate)
  end

  def enrich_policies(list)
    Array(list).map do |p|
      { raw: p, status: Calculations::FinancialMath.calculate_policy_status(p[:end_date]) }
    end
  end
end

