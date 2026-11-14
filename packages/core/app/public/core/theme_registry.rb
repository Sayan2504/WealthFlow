# frozen_string_literal: true

require "yaml"

module Core
  # Loads UI themes from root theme.yml so themes can be added or removed
  # purely via configuration without touching views or Stimulus controllers.
  class ThemeRegistry
    CONFIG_PATH = Rails.root.join("theme.yml")

    class << self
      def all
        config.fetch("themes", {}).transform_keys(&:to_s)
      end

      def default_key
        key = config["default_theme"].to_s
        return key if all.key?(key)

        all.keys.first || "midnight"
      end

      def default_mode
        mode_for(default_key)
      end

      def keys
        all.keys
      end

      def mode_for(key)
        all.dig(key.to_s, "mode").to_s == "light" ? "light" : "dark"
      end

      def modes_map
        all.transform_values { |cfg| cfg["mode"].to_s == "light" ? "light" : "dark" }
      end

      def css_variables_stylesheet
        blocks = all.map do |key, cfg|
          tokens = cfg["tokens"] || {}
          next if tokens.empty?

          safe_key = key.gsub(/[^a-zA-Z0-9_-]/, "")
          props = tokens.map do |token_key, val|
            css_var = "--wf-#{token_key.to_s.tr('_', '-')}"
            safe_val = val.to_s.gsub(/[;{}<>]/, "")
            "  #{css_var}: #{safe_val};"
          end.join("\n")

          selector = key == default_key ? ":root, html[data-theme=\"#{safe_key}\"]" : "html[data-theme=\"#{safe_key}\"]"
          "#{selector} {\n#{props}\n}"
        end.compact

        blocks.join("\n")
      end

      private

      def config
        return {} unless File.exist?(CONFIG_PATH)

        YAML.safe_load_file(CONFIG_PATH, aliases: true) || {}
      end
    end
  end
end

