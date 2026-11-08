# packages/investments/mutual_funds/app/public/mutual_funds/amfi_nav_service.rb
# frozen_string_literal: true

require "net/http"
require "uri"
require "date"
require "bigdecimal"

module MutualFunds
  class AmfiNavService
    AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"
    REQUEST_TIMEOUT_SECONDS = 15

    # Fetches daily NAV data from AMFI and updates matching holdings
    # Returns summary: { total_updated: Integer, schemes_updated: Array, errors: Array }
    def self.sync_all_holdings(user = nil)
      scope = user ? user.mutual_fund_holdings : MutualFundHolding.all
      holdings = scope.to_a
      return { total_updated: 0, schemes_updated: [], message: "No holdings to update" } if holdings.empty?

      nav_data = fetch_nav_feed
      return { total_updated: 0, error: "Failed to download AMFI NAV feed" } if nav_data.nil?

      updated_schemes = []
      errors = []

      holdings.each do |holding|
        nav_entry = find_best_match(holding, nav_data)
        if nav_entry
          holding.update!(
            latest_nav: nav_entry[:nav],
            nav_date: nav_entry[:date]
          )
          updated_schemes << {
            id: holding.id,
            scheme_name: holding.scheme_name,
            new_nav: nav_entry[:nav],
            date: nav_entry[:date]
          }
        else
          errors << "No NAV match found for #{holding.scheme_name}"
        end
      rescue StandardError => e
        errors << "Error updating #{holding.scheme_name}: #{e.message}"
      end

      {
        total_updated: updated_schemes.size,
        schemes_updated: updated_schemes,
        errors: errors,
        synced_at: Time.current
      }
    end

    # Parses AMFI raw text format:
    # Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
    def self.parse_feed(raw_text)
      entries = {}

      raw_text.each_line do |line|
        line = line.strip
        next if line.empty? || line.start_with?("Scheme Code")

        parts = line.split(";")
        next unless parts.size >= 6

        scheme_code = parts[0].strip
        isin_growth = parts[1].strip
        scheme_name = parts[3].strip
        nav_str     = parts[4].strip
        date_str    = parts[5].strip

        nav_decimal = BigDecimal(nav_str) rescue nil
        next unless nav_decimal && nav_decimal.positive?

        date = Date.parse(date_str) rescue Date.current

        entry = {
          scheme_code: scheme_code,
          isin: isin_growth,
          scheme_name: scheme_name,
          nav: nav_decimal,
          date: date
        }

        # Index by scheme_code and normalized lowercase name
        entries[scheme_code] = entry
        entries[normalize_name(scheme_name)] = entry
      end

      entries
    end

    def self.fetch_nav_feed
      uri = URI.parse(AMFI_NAV_URL)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = REQUEST_TIMEOUT_SECONDS
      http.read_timeout = REQUEST_TIMEOUT_SECONDS

      response = http.get(uri.request_uri)
      return nil unless response.is_a?(Net::HTTPSuccess)

      parse_feed(response.body)
    rescue StandardError => e
      Rails.logger.error("[AmfiNavService] Network/parsing exception: #{e.message}")
      nil
    end

    def self.find_best_match(holding, nav_data)
      # 1. Exact match by folio/scheme code if present
      if holding.respond_to?(:scheme_code) && holding.scheme_code.present?
        match = nav_data[holding.scheme_code]
        return match if match
      end

      # 2. Normalized full scheme name match
      normalized_holding_name = normalize_name(holding.scheme_name)
      match = nav_data[normalized_holding_name]
      return match if match

      # 3. Fuzzy keyword token matching
      keywords = normalized_holding_name.split(/\s+/).reject { |w| %w[fund direct growth plan -].include?(w) }
      return nil if keywords.empty?

      nav_data.each do |key, entry|
        next unless key.is_a?(String)
        if keywords.all? { |kw| key.include?(kw) }
          return entry
        end
      end

      nil
    end

    def self.normalize_name(name)
      name.to_s.downcase.gsub(/[^a-z0-9]/, " ").squeeze(" ").strip
    end
  end
end

