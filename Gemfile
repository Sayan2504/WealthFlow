source "https://rubygems.org"

ruby ">= 3.3.0"

gem "rails", "~> 8.1.4", ">= 8.1.4.1"
gem "propshaft"
gem "sqlite3", ">= 2.1"
gem "puma", ">= 5.0"
gem "importmap-rails"
gem "turbo-rails"
gem "stimulus-rails"
gem "tailwindcss-rails"
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Rails 8 database-backed jobs + recurring scheduler
gem "solid_queue"

gem "bootsnap", require: false

# --- WealthFlow ---
gem "view_component", "~> 3.21"   # the only UI component layer
gem "chartkick"                   # Chart.js charts
gem "groupdate"                   # time series grouping for charts
gem "bcrypt", "~> 3.1"            # has_secure_password (login / PIN)
gem "rack-attack"                 # throttling & abuse protection
gem "lograge"                     # structured, one-line request logs
gem "csv"

group :development, :test do
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"
  gem "bundler-audit", require: false
  gem "brakeman", require: false
  gem "rubocop-rails-omakase", require: false
  gem "rspec-rails", "~> 7.0"
end

group :development do
  gem "web-console"
end

group :test do
  gem "capybara"
end
