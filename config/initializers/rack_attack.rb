# frozen_string_literal: true

Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

Rack::Attack.throttle("api/writes", limit: 120, period: 1.minute) do |req|
  req.ip if req.path.start_with?("/api/") && (req.post? || req.put? || req.patch? || req.delete?)
end

Rack::Attack.throttle("api/search", limit: 180, period: 1.minute) do |req|
  req.ip if req.path == "/api/search" && req.get?
end

Rack::Attack.throttle("session/pin", limit: 10, period: 1.minute) do |req|
  req.ip if req.path.start_with?("/session/") && req.post?
end

Rack::Attack.throttle("devise/login", limit: 20, period: 1.minute) do |req|
  req.ip if req.path == "/users/sign_in" && req.post?
end

Rack::Attack.throttle("devise/password", limit: 10, period: 1.minute) do |req|
  req.ip if req.path == "/users/password" && req.post?
end
