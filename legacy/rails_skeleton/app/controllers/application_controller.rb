# app/controllers/application_controller.rb
# frozen_string_literal: true

class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name, :annual_income, :base_currency])
    devise_parameter_sanitizer.permit(:account_update, keys: [:name, :annual_income, :base_currency])
  end
end
