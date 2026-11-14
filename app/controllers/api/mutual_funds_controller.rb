# frozen_string_literal: true

module Api
  class MutualFundsController < ApplicationController
    protect_from_forgery with: :null_session
    before_action :require_unlocked_session!
    helper WealthflowHelper

    def search
      q = params[:q].to_s.strip
      results = Market::AmfiService.search_schemes(q)

      if results.empty? && q.length >= 2 && !Rails.env.test?
        results = fetch_remote_mf_search(q)
      end

      render json: { success: true, results: results, schemes: results }
    end

    def nav
      code = (params[:scheme_code] || params[:code]).to_s.strip
      return render(json: { success: false, error: "Missing scheme_code" }, status: :bad_request) if code.empty?

      info = Market::AmfiService.fetch_scheme_nav(code)
      return render(json: { success: false, error: "Scheme NAV not found" }, status: :not_found) unless info

      render json: { success: true }.merge(info)
    end

    def overlap
      id_a = (params[:fund_a_id] || params[:fund_a]).to_s.strip
      id_b = (params[:fund_b_id] || params[:fund_b]).to_s.strip

      if id_a.empty? || id_b.empty?
        return render json: { success: false, error: "Both fund_a_id and fund_b_id are required" }, status: :bad_request
      end

      data = ::Portfolio::Repository.load_raw
      funds = Array(data[:mutual_funds])
      fund_a = funds.find { |f| f[:id].to_s == id_a || f[:scheme_code].to_s == id_a }
      fund_b = funds.find { |f| f[:id].to_s == id_b || f[:scheme_code].to_s == id_b }

      if fund_a.nil? || fund_b.nil?
        return render json: { success: false, error: "Selected funds could not be found in portfolio" }, status: :bad_request
      end

      result = Calculations::MutualFundsOverlapService.calculate_pairwise_overlap(fund_a, fund_b)
      html = view_context.render_pairwise_overlap_html(result)

      render json: {
        success: true,
        overlap: result,
        html: html
      }.merge(result)
    end

    def fetch_live_stocks
      body = parsed_body
      fund_id = (body["fund_id"] || body["id"] || params[:fund_id]).to_s.strip
      scheme_code = (body["scheme_code"] || params[:scheme_code]).to_s.strip
      scheme_name = (body["scheme_name"] || params[:scheme_name]).to_s.strip

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      fund = Array(data["mutual_funds"]).find { |f| f["id"].to_s == fund_id } if fund_id.present?

      if fund
        scheme_code = fund["scheme_code"].to_s if scheme_code.empty?
        scheme_name = fund["scheme_name"].to_s if scheme_name.empty?
      end

      fetched = Calculations::MutualFundsOverlapService.fetch_live_stocks(scheme_code, scheme_name)
      if fund
        fund["holdings"] = fetched["holdings"]
        fund["holdings_source"] = fetched["source"]
        fund["holdings_updated_at"] = Date.current.to_s
        ::Portfolio::Repository.save_raw(data)
      end

      render json: fetched
    end

    def sync_all_stocks
      if params[:async].to_s == "true" || parsed_body["async"].to_s == "true"
        job = SyncPortfolioMarketDataJob.perform_later("stocks")
        return render json: { success: true, queued: true, job_id: job.job_id, message: "Background holdings sync queued." }
      end

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      funds = Array(data["mutual_funds"])
      updated_count = 0

      funds.each do |fund|
        fetched = Calculations::MutualFundsOverlapService.fetch_live_stocks(fund["scheme_code"], fund["scheme_name"])
        fund["holdings"] = fetched["holdings"]
        fund["holdings_source"] = fetched["source"]
        fund["holdings_updated_at"] = Date.current.to_s
        updated_count += 1
      end

      ::Portfolio::Repository.save_raw(data)
      render json: { success: true, updated_count: updated_count, message: "Synced holdings for #{updated_count} schemes." }
    end

    def add_stock
      body = parsed_body
      fund_id = (body["fund_id"] || params[:fund_id]).to_s.strip
      stock_name = body["stock"].to_s.strip
      ticker = body["ticker"].to_s.strip.upcase
      sector = body["sector"].presence || "Equity"
      weight = body["weight"].to_f

      if fund_id.empty? || stock_name.empty? || weight <= 0
        return render json: { success: false, error: "Valid fund_id, stock name, and positive weight are required" }, status: :bad_request
      end

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      fund = Array(data["mutual_funds"]).find { |f| f["id"].to_s == fund_id }
      return render(json: { success: false, error: "Fund not found" }, status: :not_found) unless fund

      fund["holdings"] ||= Calculations::MutualFundsOverlapService.holdings_for_fund(fund).map { |h| h.transform_keys(&:to_s) }
      clean_ticker = ticker.presence || stock_name.gsub(/[^A-Za-z0-9]/, "")[0, 10].upcase
      existing = fund["holdings"].find { |h| h["ticker"].to_s.upcase == clean_ticker || h["stock"].to_s.casecmp?(stock_name) }

      if existing
        existing["stock"] = stock_name
        existing["ticker"] = clean_ticker
        existing["sector"] = sector
        existing["weight"] = weight
      else
        fund["holdings"] << {
          "stock" => stock_name,
          "ticker" => clean_ticker,
          "sector" => sector,
          "weight" => weight
        }
      end

      fund["holdings_source"] = "User Verified + AMC Factsheet"
      fund["holdings_updated_at"] = Date.current.to_s
      ::Portfolio::Repository.save_raw(data)

      render json: { success: true, holdings: fund["holdings"] }
    end

    def delete_stock
      body = parsed_body
      fund_id = (body["fund_id"] || params[:fund_id]).to_s.strip
      ticker = body["ticker"].to_s.strip.upcase
      stock_name = body["stock"].to_s.strip

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      fund = Array(data["mutual_funds"]).find { |f| f["id"].to_s == fund_id }
      return render(json: { success: false, error: "Fund not found" }, status: :not_found) unless fund

      fund["holdings"] = Array(fund["holdings"]).reject do |h|
        (ticker.present? && h["ticker"].to_s.upcase == ticker) ||
          (stock_name.present? && h["stock"].to_s.casecmp?(stock_name))
      end
      fund["holdings_updated_at"] = Date.current.to_s
      ::Portfolio::Repository.save_raw(data)

      render json: { success: true, holdings: fund["holdings"] }
    end

    def save_step_up
      body = parsed_body
      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      funds = Array(data["mutual_funds"])

      if body["step_ups"].is_a?(Hash)
        body["step_ups"].each do |fid, pct|
          f = funds.find { |x| x["id"].to_s == fid.to_s }
          f["step_up_pct"] = pct.to_f if f
        end
      elsif body["fund_id"].present?
        f = funds.find { |x| x["id"].to_s == body["fund_id"].to_s }
        return render(json: { success: false, error: "Fund not found" }, status: :not_found) unless f

        f["step_up_pct"] = body["step_up_pct"].to_f
      else
        return render json: { success: false, error: "Missing step_ups or fund_id" }, status: :bad_request
      end

      ::Portfolio::Repository.save_raw(data)
      render json: { success: true, mutual_funds: funds }
    end

    def sync_navs
      if params[:async].to_s == "true" || parsed_body["async"].to_s == "true"
        job = SyncPortfolioMarketDataJob.perform_later("navs")
        return render json: { success: true, queued: true, job_id: job.job_id, message: "Background AMFI NAV sync queued." }
      end

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      funds = Array(data["mutual_funds"])
      updated_count = 0

      funds.each do |fund|
        code = fund["scheme_code"].to_s.strip
        next if code.empty?

        info = Market::AmfiService.fetch_scheme_nav(code)
        next unless info && info[:nav].to_f.positive?

        fund["latest_nav"] = info[:nav].to_f.round(4)
        fund["nav_date"] = info[:nav_date].to_s if info[:nav_date].present?
        if fund["units"].to_f.positive?
          fund["current_value"] = (fund["units"].to_f * fund["latest_nav"]).round(2)
        end
        updated_count += 1
      end

      data["user"] ||= {}
      data["user"]["last_updated"] = Date.current.to_s
      ::Portfolio::Repository.save_raw(data)

      render json: { success: true, updated_count: updated_count, funds: funds }
    end

    private

    def require_unlocked_session!
      return unless Portfolio::ActiveRecordBridge.available?

      profile = PortfolioProfile.for_user(current_user)
      return unless profile&.pin_enabled? && session[:wealthflow_locked] == true

      render json: { success: false, error: "Cockpit is locked. Unlock with your PIN first." }, status: :unauthorized
    end

    def parsed_body
      raw = request.raw_post.to_s.strip
      if raw.present? && request.content_type.to_s.include?("json")
        JSON.parse(raw)
      else
        params.to_unsafe_h
      end
    rescue JSON::ParserError
      params.to_unsafe_h
    end

    def fetch_remote_mf_search(query)
      uri = URI("https://api.mfapi.in/mf/search?q=#{URI.encode_www_form_component(query)}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 2
      http.read_timeout = 3
      res = http.get(uri.request_uri)
      return [] unless res.is_a?(Net::HTTPSuccess)

      list = JSON.parse(res.body)
      Array(list).first(15).map do |row|
        { schemeCode: row["schemeCode"].to_s, schemeName: row["schemeName"].to_s }
      end
    rescue StandardError
      []
    end
  end
end

