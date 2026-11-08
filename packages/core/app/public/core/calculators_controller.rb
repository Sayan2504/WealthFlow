# app/controllers/calculators_controller.rb
# frozen_string_literal: true

class CalculatorsController < ApplicationController
  def index
    # Calculator hub
  end

  # POST /calculators/fd
  def fd
    @principal = BigDecimal(params[:principal].presence || "100000")
    @rate = BigDecimal(params[:rate].presence || "7.10")
    @tenure_months = params[:tenure_months].presence&.to_i || 36

    @maturity_amount = FixedIncome::FdCalculator.maturity_amount(
      principal: @principal,
      annual_rate: @rate,
      tenure_months: @tenure_months
    )
    @interest_earned = FixedIncome::FdCalculator.interest_earned(
      principal: @principal,
      annual_rate: @rate,
      tenure_months: @tenure_months
    )

    respond_to do |format|
      format.turbo_stream
      format.html { render partial: "calculators/fd_result" }
    end
  end

  # POST /calculators/rd
  def rd
    @monthly_installment = BigDecimal(params[:monthly_installment].presence || "10000")
    @rate = BigDecimal(params[:rate].presence || "7.00")
    @tenure_months = params[:tenure_months].presence&.to_i || 36

    @maturity_amount = FixedIncome::RdCalculator.maturity_amount(
      monthly_installment: @monthly_installment,
      annual_rate: @rate,
      tenure_months: @tenure_months
    )
    @total_invested = FixedIncome::RdCalculator.total_invested(
      monthly_installment: @monthly_installment,
      tenure_months: @tenure_months
    )
    @interest_earned = FixedIncome::RdCalculator.interest_earned(
      monthly_installment: @monthly_installment,
      annual_rate: @rate,
      tenure_months: @tenure_months
    )

    respond_to do |format|
      format.turbo_stream
      format.html { render partial: "calculators/rd_result" }
    end
  end

  # POST /calculators/sip
  def sip
    @monthly_investment = BigDecimal(params[:monthly_investment].presence || "10000")
    @expected_cagr = BigDecimal(params[:expected_cagr].presence || "12.0")
    @tenure_years = params[:tenure_years].presence&.to_i || 10

    @future_value = MutualFunds::PerformanceCalculator.sip_future_value(
      monthly_investment: @monthly_investment,
      expected_cagr_pct: @expected_cagr,
      tenure_years: @tenure_years
    )
    @invested_amount = MutualFunds::PerformanceCalculator.sip_invested_amount(
      monthly_investment: @monthly_investment,
      tenure_years: @tenure_years
    )
    @wealth_gain = MutualFunds::PerformanceCalculator.sip_wealth_gain(
      monthly_investment: @monthly_investment,
      expected_cagr_pct: @expected_cagr,
      tenure_years: @tenure_years
    )

    respond_to do |format|
      format.turbo_stream
      format.html { render partial: "calculators/sip_result" }
    end
  end

  # POST /calculators/epf
  def epf
    @basic_salary = BigDecimal(params[:basic_salary].presence || "50000")
    @breakdown = RetirementFunds::EpfCalculator.monthly_breakdown(@basic_salary)

    respond_to do |format|
      format.turbo_stream
      format.html { render partial: "calculators/epf_result" }
    end
  end
end

