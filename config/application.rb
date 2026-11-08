require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "active_support/core_ext/numeric/bytes"
require "active_support/core_ext/numeric/time"

Bundler.require(*Rails.groups)

module Wealthflow
  class Application < Rails::Application
    config.load_defaults 8.1

    config.autoload_lib(ignore: %w[assets tasks])
    config.generators.system_tests = nil

    # --- Locale & time -------------------------------------------------
    config.time_zone = "Asia/Kolkata"
    config.i18n.default_locale = :en
    config.i18n.available_locales = [ :en ]
    config.i18n.fallbacks = true
    # Raise on missing translations in dev/test so a missing key never ships.
    config.i18n.load_path += Dir[Rails.root.join("config/locales/**/*.{rb,yml}")]

    # --- Financial data (JSON files behind ActiveModel records) ---------
    # Every profile owns one JSON file inside this directory.
    config.x.data_dir = Rails.root.join("storage", "data")
    config.x.backup_dir = Rails.root.join("storage", "backups")
    config.x.documents_dir = Rails.root.join("storage", "documents")
    config.x.encrypt_data = true
    config.x.legacy_data_file = Rails.root.join("storage", "preview_data.json")

    # --- Security -------------------------------------------------------
    config.x.session_idle_timeout = 30.minutes
    config.x.max_failed_logins = 5
    config.x.lockout_period = 15.minutes
    config.x.max_upload_bytes = 10.megabytes

    # --- Errors rendered by our own controller --------------------------
    config.exceptions_app = routes

    # --- Jobs -----------------------------------------------------------
    config.active_job.queue_adapter = :solid_queue
    config.x.catch_up_after = 20.hours
  end
end
