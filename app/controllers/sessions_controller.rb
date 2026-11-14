# frozen_string_literal: true

class SessionsController < ApplicationController
  def set_pin
    body = parsed_body
    pin = (body["pin"] || params[:pin]).to_s.strip
    has_confirmation = body.key?("pin_confirmation") || params.key?(:pin_confirmation)
    pin_confirmation = (body["pin_confirmation"] || params[:pin_confirmation]).to_s.strip
    current_pin = (body["current_pin"] || params[:current_pin]).to_s.strip
    clear_flag = body["clear"] == true || body["clear"].to_s == "true" || params[:clear].to_s == "true"

    profile = PortfolioProfile.current

    if profile.pin_enabled? && !profile.authenticate_pin(current_pin)
      return render json: { success: false, error: "Old PIN is incorrect" }, status: :unauthorized
    end

    if clear_flag
      profile.update!(pin_digest: nil)
      session.delete(:wealthflow_locked)
      return render json: { success: true, pin_enabled: false, locked: false, message: "Security PIN removed." }
    end

    if pin.length < 4
      return render json: { success: false, error: "PIN must be at least 4 characters" }, status: :unprocessable_entity
    end

    if has_confirmation && pin != pin_confirmation
      return render json: { success: false, error: "New PIN and Confirm New PIN do not match" }, status: :unprocessable_entity
    end

    profile.pin = pin
    profile.pin_confirmation = has_confirmation ? pin_confirmation : pin
    profile.save!
    session[:wealthflow_locked] = false

    render json: { success: true, pin_enabled: true, locked: false, message: "Security PIN updated." }
  end

  def lock
    profile = PortfolioProfile.current
    unless profile.pin_enabled?
      return render json: { success: false, error: "Set a security PIN before locking" }, status: :unprocessable_entity
    end

    session[:wealthflow_locked] = true
    render json: { success: true, locked: true, message: "WealthFlow cockpit locked." }
  end

  def unlock
    body = parsed_body
    pin = (body["pin"] || params[:pin]).to_s.strip
    profile = PortfolioProfile.current

    if !profile.pin_enabled? || profile.authenticate_pin(pin)
      session[:wealthflow_locked] = false
      render json: { success: true, locked: false, message: "Unlocked successfully." }
    else
      render json: { success: false, error: "Invalid security PIN" }, status: :unauthorized
    end
  end

  private

  def parsed_body
    raw = request.raw_post.to_s.strip
    if raw.present? && request.content_type.to_s.include?("json")
      JSON.parse(raw)
    else
      params.to_unsafe_h
    end
  rescue JSON::ParserError
    params.to_unsafe_h
  end
end

