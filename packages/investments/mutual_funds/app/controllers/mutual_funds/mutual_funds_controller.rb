# app/controllers/mutual_funds_controller.rb
# frozen_string_literal: true

class MutualFundsController < ApplicationController
  def new
    @mutual_fund = current_user.mutual_fund_holdings.new
  end

  def create
    @mutual_fund = current_user.mutual_fund_holdings.new(mutual_fund_params)

    if @mutual_fund.save
      # Automatically create initial purchase transaction
      if @mutual_fund.invested_amount.positive? && @mutual_fund.units.positive?
        nav = @mutual_fund.latest_nav.presence || (@mutual_fund.invested_amount / @mutual_fund.units)
        @mutual_fund.mutual_fund_transactions.create!(
          transaction_date: @mutual_fund.nav_date || Date.current,
          transaction_type: "lump_sum",
          amount: @mutual_fund.invested_amount,
          units: @mutual_fund.units,
          nav_applied: nav
        )
      end

      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "Mutual fund holding added successfully." }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    @mutual_fund = current_user.mutual_fund_holdings.find(params[:id])
    @mutual_fund.destroy

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to root_path, notice: "Mutual fund holding removed." }
    end
  end

  # POST /mutual_funds/sync_nav
  def sync_nav
    result = MutualFunds::AmfiNavService.sync_all_holdings(current_user)

    notice_msg = if result[:total_updated].to_i.positive?
                   "AMFI NAV Sync Complete: #{result[:total_updated]} schemes updated to latest valuations."
                 else
                   "AMFI NAV sync checked. Values are current or waiting for market NAV publication."
                 end

    respond_to do |format|
      format.turbo_stream do
        @mutual_funds = current_user.mutual_fund_holdings.order(invested_amount: :desc)
        @snapshot = Dashboard::Aggregator.snapshot_for(current_user)
        flash.now[:notice] = notice_msg
        render "mutual_funds/sync_nav"
      end
      format.html { redirect_to root_path, notice: notice_msg }
    end
  end

  private

  def mutual_fund_params
    params.require(:mutual_fund_holding).permit(
      :scheme_name, :folio_number, :category, :units, :invested_amount, :latest_nav, :nav_date
    )
  end
end
