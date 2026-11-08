# app/controllers/provident_fund_ledgers_controller.rb
# frozen_string_literal: true

class ProvidentFundLedgersController < ApplicationController
  def create
    @provident_fund = current_user.provident_funds.find(params[:provident_fund_id])
    @ledger = @provident_fund.provident_fund_ledgers.new(ledger_params)

    if @ledger.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "Passbook entry recorded." }
      end
    else
      redirect_to root_path, alert: "Failed to record entry."
    end
  end

  private

  def ledger_params
    params.require(:provident_fund_ledger).permit(
      :entry_date, :employee_share, :employer_share, :pension_share, :interest_credited
    )
  end
end

