# app/controllers/deposit_transactions_controller.rb
# frozen_string_literal: true

class DepositTransactionsController < ApplicationController
  def create
    @deposit_account = current_user.deposit_accounts.find(params[:deposit_account_id])
    @transaction = @deposit_account.deposit_transactions.new(transaction_params)

    if @transaction.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "Transaction recorded." }
      end
    else
      redirect_to root_path, alert: "Failed to record transaction."
    end
  end

  private

  def transaction_params
    params.require(:deposit_transaction).permit(:transaction_date, :amount, :transaction_type)
  end
end

