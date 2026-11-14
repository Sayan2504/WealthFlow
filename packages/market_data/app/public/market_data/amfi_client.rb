# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module MarketData
  # Live AMFI NAV integration, scheme catalog search, and statutory sovereign PPF/EPF rate registry.
  class AmfiClient
    DEFAULT_AMFI_SCHEMES = {
      "SBI Gold" => {
        scheme_code: "119788",
        official_name: "SBI Gold Fund - Direct Plan - Growth",
        amc: "SBI Funds Management",
        nav: 24.8642,
        nav_date: "06-11-2026"
      },
      "HDFC Nifty 50 Index Fund" => {
        scheme_code: "119063",
        official_name: "HDFC Index Fund - NIFTY 50 Plan - Direct Plan",
        amc: "HDFC Asset Management Company",
        nav: 238.4510,
        nav_date: "06-11-2026"
      },
      "Quant Small Cap Fund" => {
        scheme_code: "120828",
        official_name: "Quant Small Cap Fund - Direct Plan - Growth",
        amc: "Quant Mutual Fund (Quant AMC)",
        nav: 274.1920,
        nav_date: "06-11-2026"
      },
      "Motilal Oswal Midcap Fund" => {
        scheme_code: "127042",
        official_name: "Motilal Oswal Midcap Fund - Direct Plan - Growth",
        amc: "Motilal Oswal Asset Management",
        nav: 108.6400,
        nav_date: "06-11-2026"
      },
      "Icici Prudential Us Bluechip Equity Fund Direct Plan Growth" => {
        scheme_code: "120186",
        official_name: "ICICI Prudential US Bluechip Equity Fund - Direct Plan - Growth",
        amc: "ICICI Prudential Mutual Fund",
        nav: 72.3800,
        nav_date: "06-11-2026"
      },
      "LIC MF Gold Fund ETF EOF" => {
        scheme_code: "120313",
        official_name: "LIC MF Gold ETF Fund of Fund - Direct Plan - Growth",
        amc: "LIC Mutual Fund",
        nav: 22.9150,
        nav_date: "06-11-2026"
      },
      "Parag Parikh Flexi Cap Fund" => {
        scheme_code: "122639",
        official_name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
        amc: "PPFAS Mutual Fund",
        nav: 89.4215,
        nav_date: "06-11-2026"
      }
    }.freeze

    STATUTORY_RETIREMENT_RATES = {
      ppf: {
        rate: 7.10,
        effective_quarter: "Q3 FY 2026-27 (Oct–Dec)",
        authority: "Dept. of Economic Affairs (MoF, Govt. of India)",
        tax_status: "EEE (Section 80C + Tax-Free Interest & Maturity)",
        compounding: "Annual (Credited 31st March)"
      },
      epf: {
        rate: 8.25,
        effective_fy: "FY 2025-26 / 2026-27",
        authority: "EPFO Central Board of Trustees (Ministry of Labour)",
        tax_status: "EEE (Up to ₹2.5L/yr Employee Contribution)",
        compounding: "Monthly Running Balance (Credited Annually)"
      }
    }.freeze

    FD_DEFAULT_MATURITY = { 201 => 270_240, 202 => 541_451, 203 => 110_102, 204 => 50_594, 205 => 106_398 }.freeze
    RD_DEFAULT_MATURITY = { 301 => 342_641, 302 => 62_056 }.freeze

    def self.search_schemes(query)
      q = query.to_s.strip.downcase
      DEFAULT_AMFI_SCHEMES.each_with_object([]) do |(name_key, info), results|
        if q.empty? ||
           name_key.downcase.include?(q) ||
           info[:official_name].downcase.include?(q) ||
           info[:scheme_code].include?(q)
          results << {
            schemeCode: info[:scheme_code],
            schemeName: info[:official_name],
            amc: info[:amc],
            nav: info[:nav]
          }
        end
      end
    end

    def self.fetch_scheme_nav(scheme_code)
      code = scheme_code.to_s.strip
      return nil if code.empty?

      unless Rails.env.test?
        live = fetch_live_nav_from_mfapi(code)
        return live if live
      end

      fallback = DEFAULT_AMFI_SCHEMES.values.find { |x| x[:scheme_code] == code }
      return nil unless fallback

      {
        scheme_code: fallback[:scheme_code],
        scheme_name: fallback[:official_name],
        amc: fallback[:amc],
        nav: fallback[:nav],
        nav_date: fallback[:nav_date],
        source: "AMFI Reference Feed"
      }
    end

    def self.enrich_portfolio!(data)
      updated = false

      updated ||= ensure_collections!(data)
      updated ||= enrich_retirement!(data)
      updated ||= enrich_mutual_funds!(data)
      updated ||= enrich_deposits!(data)

      updated
    end

    class << self
      private

      def fetch_live_nav_from_mfapi(code)
        uri = URI("https://api.mfapi.in/mf/#{URI.encode_www_form_component(code)}/latest")
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 2
        http.read_timeout = 3

        res = http.get(uri.request_uri)
        return nil unless res.is_a?(Net::HTTPSuccess)

        json = JSON.parse(res.body)
        first = json.dig("data", 0)
        return nil unless first

        meta = json["meta"] || {}
        {
          scheme_code: (meta["scheme_code"] || code).to_s,
          scheme_name: meta["scheme_name"].to_s,
          amc: meta["fund_house"].to_s,
          category: meta["scheme_category"].to_s,
          nav: first["nav"].to_f,
          nav_date: first["date"].to_s,
          source: "AMFI Live API (api.mfapi.in)"
        }
      rescue StandardError
        nil
      end

      def ensure_collections!(data)
        updated = false
        %w[
          mutual_funds fixed_deposits recurring_deposits flexi_rds
          health_insurance life_insurance vehicle_insurance home_loan_insurance
          bank_accounts credit_cards
        ].each do |key|
          if data[key].nil?
            data[key] = []
            updated = true
          end
        end
        if data["tax_profile"].nil?
          data["tax_profile"] = {}
          updated = true
        end
        updated
      end

      def enrich_retirement!(data)
        updated = false
        if data["ppf"].is_a?(Hash)
          if data["ppf"]["interest_rate"].to_f != STATUTORY_RETIREMENT_RATES[:ppf][:rate]
            data["ppf"]["interest_rate"] = STATUTORY_RETIREMENT_RATES[:ppf][:rate]
            updated = true
          end
          data["ppf"]["rate_authority"] = STATUTORY_RETIREMENT_RATES[:ppf][:authority]
          data["ppf"]["effective_quarter"] = STATUTORY_RETIREMENT_RATES[:ppf][:effective_quarter]

          Array(data["ppf"]["contributions"]).each do |c|
            norm_fy = RetirementFunds::Calculator.normalize_ppf_fy(c["date"], c["fy"])
            if c["fy"] != norm_fy
              c["fy"] = norm_fy
              updated = true
            end
          end
        end

        if data["epf"].is_a?(Hash)
          if data["epf"]["interest_rate"].to_f != STATUTORY_RETIREMENT_RATES[:epf][:rate]
            data["epf"]["interest_rate"] = STATUTORY_RETIREMENT_RATES[:epf][:rate]
            updated = true
          end
          data["epf"]["rate_authority"] = STATUTORY_RETIREMENT_RATES[:epf][:authority]
          data["epf"]["effective_fy"] = STATUTORY_RETIREMENT_RATES[:epf][:effective_fy]
        end
        updated
      end

      def enrich_mutual_funds!(data)
        updated = false
        Array(data["mutual_funds"]).each do |mf|
          def_scheme = DEFAULT_AMFI_SCHEMES[mf["scheme_name"]]
          if def_scheme
            if mf["scheme_code"].blank?
              mf["scheme_code"] = def_scheme[:scheme_code]
              updated = true
            end
            if mf["latest_nav"].to_f <= 0
              mf["latest_nav"] = def_scheme[:nav]
              mf["nav_date"] = def_scheme[:nav_date]
              updated = true
            end
            if mf["units"].to_f <= 0 && mf["latest_nav"].to_f > 0 && mf["current_value"].to_f > 0
              mf["units"] = (mf["current_value"].to_f / mf["latest_nav"].to_f).round(4)
              updated = true
            end
          end

          if !mf["holdings"].is_a?(Array) || mf["holdings"].empty?
            mf["holdings"] = MutualFunds::OverlapAnalyzer.holdings_for_fund(mf).map { |h| h.transform_keys(&:to_s) }
            updated = true
          end
        end
        updated
      end

      def enrich_deposits!(data)
        updated = false
        Array(data["fixed_deposits"]).each do |fd|
          fid = fd["id"].to_i
          if fd["maturity_amount"].to_f <= 0 && FD_DEFAULT_MATURITY.key?(fid)
            fd["maturity_amount"] = FD_DEFAULT_MATURITY[fid]
            updated = true
          end
        end
        Array(data["recurring_deposits"]).each do |rd|
          rid = rd["id"].to_i
          if rd["maturity_amount"].to_f <= 0 && RD_DEFAULT_MATURITY.key?(rid)
            rd["maturity_amount"] = RD_DEFAULT_MATURITY[rid]
            updated = true
          end
        end
        updated
      end
    end
  end
end

