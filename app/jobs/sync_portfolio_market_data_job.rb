# frozen_string_literal: true

class SyncPortfolioMarketDataJob < ApplicationJob
  queue_as :default

  def perform(mode = "all")
    normalized = mode.to_s
    data = Portfolio::Repository.load_raw.deep_stringify_keys
    updated = false

    if %w[all navs].include?(normalized)
      updated |= sync_navs!(data)
    end

    if %w[all rates].include?(normalized)
      updated |= sync_statutory_rates!(data)
    end

    if %w[all stocks].include?(normalized)
      updated |= sync_stocks!(data)
    end

    if updated
      data["user"] ||= {}
      data["user"]["last_updated"] = Date.current.to_s
      Portfolio::Repository.save_raw(data)
    end

    true
  end

  private

  def sync_navs!(data)
    updated = false
    Array(data["mutual_funds"]).each do |fund|
      code = fund["scheme_code"].to_s.strip
      next if code.empty?

      info = Market::AmfiService.fetch_scheme_nav(code)
      next unless info && info[:nav].to_f.positive?

      fund["latest_nav"] = info[:nav].to_f.round(4)
      fund["nav_date"] = info[:nav_date].to_s if info[:nav_date].present?
      if fund["units"].to_f.positive?
        fund["current_value"] = (fund["units"].to_f * fund["latest_nav"]).round(2)
      end
      updated = true
    end
    updated
  end

  def sync_statutory_rates!(data)
    rates = Market::AmfiService::STATUTORY_RETIREMENT_RATES
    data["ppf"] ||= {}
    data["ppf"]["interest_rate"] = rates[:ppf][:rate]
    data["ppf"]["rate_authority"] = rates[:ppf][:authority]
    data["ppf"]["effective_quarter"] = rates[:ppf][:effective_quarter]

    data["epf"] ||= {}
    data["epf"]["interest_rate"] = rates[:epf][:rate]
    data["epf"]["rate_authority"] = rates[:epf][:authority]
    data["epf"]["effective_fy"] = rates[:epf][:effective_fy]
    true
  end

  def sync_stocks!(data)
    updated = false
    Array(data["mutual_funds"]).each do |fund|
      fetched = Calculations::MutualFundsOverlapService.fetch_live_stocks(fund["scheme_code"], fund["scheme_name"])
      fund["holdings"] = fetched["holdings"]
      fund["holdings_source"] = fetched["source"]
      fund["holdings_updated_at"] = Date.current.to_s
      updated = true
    end
    updated
  end
end

