# frozen_string_literal: true

module WealthflowAuthenticable
  extend ActiveSupport::Concern

  included do
    before_action :enforce_user_authentication!
    before_action :bind_current_user
    after_action :clear_current_user
  end

  private

  def enforce_user_authentication!
    return if devise_controller?

    unless user_signed_in?
      if api_or_json_request?
        render json: { ok: false, error: "Authentication required. Please sign in." }, status: :unauthorized
      else
        authenticate_user!
      end
    end
  end

  def bind_current_user
    Current.user = current_user
  end

  def clear_current_user
    Current.reset
  end

  def api_or_json_request?
    request.path.start_with?("/api/", "/session/") || request.format.json?
  end
end
