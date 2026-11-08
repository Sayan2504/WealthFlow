# app/controllers/insurance_policies_controller.rb
# frozen_string_literal: true

class InsurancePoliciesController < ApplicationController
  def new
    @policy = current_user.insurance_policies.new(
      category: params[:category] || "health",
      start_date: Date.current,
      end_date: Date.current + 1.year,
      premium_frequency: "annually"
    )
  end

  def create
    @policy = current_user.insurance_policies.new(policy_params)

    if @policy.save
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to root_path, notice: "#{@policy.category.titleize} insurance policy registered." }
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    @policy = current_user.insurance_policies.find(params[:id])
    @policy.destroy

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to root_path, notice: "Policy removed." }
    end
  end

  private

  def policy_params
    params.require(:insurance_policy).permit(
      :category, :policy_type, :provider_name, :policy_number,
      :sum_assured, :premium_amount, :premium_frequency, :start_date, :end_date
    )
  end
end

