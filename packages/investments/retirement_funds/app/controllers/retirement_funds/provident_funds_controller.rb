# app/controllers/provident_funds_controller.rb
# frozen_string_literal: true

class ProvidentFundsController < ApplicationController
  def new
    @provident_fund = current_user.provident_funds.new(
      fund_type: params[:type] || "ppf",
      opening_date: Date.current,
      current_interest_rate: (params[:type] == "epf" ? 8.25 : 7.10)
    )
  end

  def create
    @provident_fund = current_user.provident_funds.new(provident_fund_params)

    if @provident_fund.save
      initial_deposit = params[:initial_deposit].to_f
      if initial_deposit.positive?
        if @provident_fund.ppf?
          @provident_fund.provident_fund_ledgers.create!(
            entry_date: @provident_fund.opening_date,
            employee_share: initial_deposit,
            interest_credited: 0.0
          )
        else
          breakdown = RetirementFunds::EpfCalculator.monthly_breakdown(initial_deposit)
          @provident_fund.provident_fund_ledgers.create!(
            entry_date: @provident_fund.opening_date,
            employee_share: breakdown[:employee_share],
            employer_share: breakdown[:employer_share],
            pension_share: breakdown[:pension_share]
          )
        end
      end

      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "#{@provident_fund.fund_type.upcase} account added." }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def provident_fund_params
    params.require(:provident_fund).permit(
      :fund_type, :account_identifier, :opening_date, :current_interest_rate,
      :employee_monthly_contribution, :employer_monthly_contribution
    )
  end
end

