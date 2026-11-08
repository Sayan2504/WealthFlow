# config/application.rb
# frozen_string_literal: true

require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"

Bundler.require(*Rails.groups)

module WealthFlow
  class Application < Rails::Application
    config.load_defaults 8.1

    # Autoload Global ViewComponents
    config.view_component.view_component_path = "app/components"

    # Autoload Modular Packwerk Packages (Models, Controllers, Jobs, Services, Public APIs)
    package_autoload_paths = Dir.glob(
      Rails.root.join("packages", "**", "app", "{models,controllers,jobs,services,public,components}")
    )
    config.autoload_paths += package_autoload_paths
    config.eager_load_paths += package_autoload_paths

    # Register Package View Paths so each Packwerk package renders its own isolated templates
    Dir.glob(Rails.root.join("packages", "**", "app", "views")).each do |view_path|
      config.paths["app/views"].unshift(view_path)
    end

    # Primary timezone and currency conventions
    config.time_zone = "Asia/Kolkata"
    config.active_record.default_timezone = :local
  end
end
