# app/controllers/deposit_accounts_controller.rb
# frozen_string_literal: true

class DepositAccountsController < ApplicationController
  def new
    @deposit_account = current_user.deposit_accounts.new(
      account_type: params[:type] || "fixed_deposit",
      start_date: Date.current,
      maturity_date: Date.current + 3.years,
      compounding_frequency: "quarterly"
    )
  end

  def create
    @deposit_account = current_user.deposit_accounts.new(deposit_account_params)

    if @deposit_account.save
      # If recurring deposit or flexi rd, create initial transaction if installment given
      if @deposit_account.recurring_deposit? && @deposit_account.monthly_installment.to_f.positive?
        @deposit_account.deposit_transactions.create!(
          transaction_date: @deposit_account.start_date,
          amount: @deposit_account.monthly_installment,
          transaction_type: "installment"
        )
      elsif @deposit_account.flexi_rd? && @deposit_account.principal_amount.to_f.positive?
        @deposit_account.deposit_transactions.create!(
          transaction_date: @deposit_account.start_date,
          amount: @deposit_account.principal_amount,
          transaction_type: "variable_deposit"
        )
      end

      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "#{@deposit_account.account_type.titleize} added successfully." }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    @deposit_account = current_user.deposit_accounts.find(params[:id])
    @deposit_account.destroy

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to root_path, notice: "Deposit account removed." }
    end
  end

  private

  def deposit_account_params
    params.require(:deposit_account).permit(
      :institution_name, :account_type, :principal_amount, :monthly_installment,
      :interest_rate, :compounding_frequency, :start_date, :maturity_date, :tax_saving
    )
  end
end

