require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = ENV["CI"].present?
  config.public_file_server.headers = { "cache-control" => "public, max-age=3600" }
  config.consider_all_requests_local = true
  config.cache_store = :memory_store
  config.action_dispatch.show_exceptions = :rescuable
  config.action_controller.allow_forgery_protection = false
  config.action_mailer.delivery_method = :test
  config.action_mailer.default_url_options = { host: "example.com" }
  config.active_support.deprecation = :stderr
  config.action_controller.raise_on_missing_callback_actions = true
  config.i18n.raise_on_missing_translations = true
  config.active_job.queue_adapter = :test

  # Tests use an isolated, unencrypted data directory.
  config.x.data_dir = Rails.root.join("tmp", "test_data")
  config.x.backup_dir = Rails.root.join("tmp", "test_backups")
  config.x.documents_dir = Rails.root.join("tmp", "test_documents")
  config.x.encrypt_data = false
  config.x.legacy_data_file = Rails.root.join("tmp", "no_legacy_file.json")
end
