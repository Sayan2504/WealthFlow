# config/initializers/devise.rb
# frozen_string_literal: true

Devise.setup do |config|
  # Mailer sender configuration
  config.mailer_sender = "support@wealthflow.app"

  # Load and configure the ORM
  require "devise/orm/active_record"

  # Authentication keys
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth]

  # Stretches for password hashing
  config.stretches = Rails.env.test? ? 1 : 12

  # Password validity length
  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/

  # Recoverable settings
  config.reset_password_within = 6.hours

  # Sign out via DELETE or GET
  config.sign_out_via = :delete

  # Hotwire / Turbo integration
  config.responder.error_status = :unprocessable_entity
  config.responder.redirect_status = :see_other
end

