# frozen_string_literal: true

module Api
  class PortfolioController < ApplicationController
    protect_from_forgery with: :null_session
    before_action :require_unlocked_session!

    COLLECTION_ALIASES = {
      "mutual_fund" => "mutual_funds",
      "mutual_funds" => "mutual_funds",
      "fd" => "fixed_deposits",
      "fixed_deposit" => "fixed_deposits",
      "fixed_deposits" => "fixed_deposits",
      "rd" => "recurring_deposits",
      "recurring_deposit" => "recurring_deposits",
      "recurring_deposits" => "recurring_deposits",
      "flexi_rd" => "flexi_rds",
      "flexi_rds" => "flexi_rds",
      "health_insurance" => "health_insurance",
      "life_insurance" => "life_insurance",
      "vehicle_insurance" => "vehicle_insurance",
      "home_loan_insurance" => "home_loan_insurance",
      "bank_account" => "bank_accounts",
      "bank_accounts" => "bank_accounts",
      "credit_card" => "credit_cards",
      "credit_cards" => "credit_cards"
    }.freeze

    def export_csv
      data = ::Portfolio::Repository.load_raw
      ov = Calculations::DashboardAggregator.calculate_overview(data)
      csv = Exports::PortfolioExporter.build_complete_csv(data, ov)

      send_data csv,
                filename: "WealthFlow_Portfolio_#{Date.current}.csv",
                type: "text/csv; charset=utf-8",
                disposition: "attachment"
    end

    def export_excel
      data = ::Portfolio::Repository.load_raw
      ov = Calculations::DashboardAggregator.calculate_overview(data)
      xml = Exports::PortfolioExporter.build_excel_workbook(data, ov)

      send_data xml,
                filename: "WealthFlow_Portfolio_#{Date.current}.xls",
                type: "application/vnd.ms-excel; charset=utf-8",
                disposition: "attachment"
    end

    def clear_data
      ::Portfolio::Repository.clear!
      render json: { success: true, message: "Portfolio reset to blank slate." }
    end

    def statutory_rates
      rates = Market::AmfiService::STATUTORY_RETIREMENT_RATES

      if request.post?
        data = ::Portfolio::Repository.load_raw.deep_stringify_keys
        data["ppf"] ||= {}
        data["ppf"]["interest_rate"] = rates[:ppf][:rate]
        data["ppf"]["rate_authority"] = rates[:ppf][:authority]
        data["ppf"]["effective_quarter"] = rates[:ppf][:effective_quarter]

        data["epf"] ||= {}
        data["epf"]["interest_rate"] = rates[:epf][:rate]
        data["epf"]["rate_authority"] = rates[:epf][:authority]
        data["epf"]["effective_fy"] = rates[:epf][:effective_fy]

        ::Portfolio::Repository.save_raw(data)
      end

      render json: {
        success: true,
        ppf: rates[:ppf],
        epf: rates[:epf],
        rates: rates
      }
    end

    def save_item
      body = parsed_body
      item_type = (body["type"] || params[:type]).to_s.strip
      payload = body["payload"].is_a?(Hash) ? body["payload"] : body.except("type", "controller", "action")

      return render(json: { success: false, error: "Missing entity type" }, status: :bad_request) if item_type.empty?

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      saved = apply_save!(data, item_type, payload)

      return render(json: { success: false, error: "Unsupported entity type: #{item_type}" }, status: :bad_request) if saved.nil?

      data["user"] ||= {}
      data["user"]["last_updated"] = Date.current.to_s
      ::Portfolio::Repository.save_raw(data)

      ov = Calculations::DashboardAggregator.calculate_overview(data)
      render json: { success: true, item: saved, taxCalc: ov[:taxCalc] }
    end

    def delete_item
      body = parsed_body
      item_type = (body["type"] || body["collection"] || params[:type]).to_s.strip
      target_id = (body["id"] || params[:id]).to_i

      return render(json: { success: false, error: "Missing type or id" }, status: :bad_request) if item_type.empty? || target_id <= 0

      data = ::Portfolio::Repository.load_raw.deep_stringify_keys
      deleted = apply_delete!(data, item_type, target_id)

      if deleted == :unsupported
        return render(json: { success: false, error: "Unsupported collection: #{item_type}" }, status: :bad_request)
      end

      data["user"] ||= {}
      data["user"]["last_updated"] = Date.current.to_s
      ::Portfolio::Repository.save_raw(data)

      render json: { success: true, deleted: deleted }
    end

    def tax_preview
      body = parsed_body
      payload = body["payload"].is_a?(Hash) ? body["payload"] : body.except("controller", "action")
      data = ::Portfolio::Repository.load_raw
      result = Calculations::TaxCalculatorService.calculate_both_regimes(payload, data)
      render json: { success: true, taxCalc: result }
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

    def generate_id
      (Time.current.to_f * 1000).to_i
    end

    def upsert_in_array(list, record)
      id = record["id"].to_i
      idx = list.index { |x| x["id"].to_i == id }
      if idx
        list[idx] = record
      else
        list << record
      end
      record
    end

    def apply_save!(data, item_type, payload)
      p = payload.transform_keys(&:to_s)
      id = p["id"].to_i.positive? ? p["id"].to_i : generate_id

      if (collection = COLLECTION_ALIASES[item_type])
        data[collection] ||= []
        existing = data[collection].find { |x| x["id"].to_i == id } || {}
        record = build_collection_record(collection, id, p, existing)
        return upsert_in_array(data[collection], record)
      end

      case item_type
      when "ppf_contribution", "ppf_contributions"
        data["ppf"] ||= { "contributions" => [] }
        data["ppf"]["contributions"] ||= []
        old_entry = data["ppf"]["contributions"].find { |x| x["id"].to_i == id }
        old_amt = old_entry ? old_entry["amount"].to_f : 0.0
        new_amt = p["amount"].to_f
        date_str = p["date"].presence || Date.current.to_s
        record = {
          "id" => id,
          "fy" => Calculations::RetirementCalculator.normalize_ppf_fy(date_str, p["fy"]),
          "date" => date_str,
          "amount" => new_amt,
          "note" => p["note"].to_s.strip
        }
        upsert_in_array(data["ppf"]["contributions"], record)
        if data["ppf"]["current_balance"].to_f.positive?
          data["ppf"]["current_balance"] = [0.0, data["ppf"]["current_balance"].to_f + (new_amt - old_amt)].max.round
        end
        data["ppf"]["last_updated"] = Date.current.to_s
        record
      when "ppf_balance", "ppf"
        data["ppf"] ||= {}
        data["ppf"]["account_identifier"] = p["account_identifier"].presence || data["ppf"]["account_identifier"] || "PPF-SOVEREIGN"
        data["ppf"]["current_balance"] = p["current_balance"].to_f if p.key?("current_balance")
        data["ppf"]["interest_rate"] = p["interest_rate"].to_f if p["interest_rate"].to_f.positive?
        data["ppf"]["last_updated"] = p["last_updated"].presence || Date.current.to_s
        data["ppf"]
      when "epf_entry", "epf_entries"
        data["epf"] ||= { "entries" => [] }
        data["epf"]["entries"] ||= []
        record = {
          "id" => id,
          "date" => p["date"].presence || Date.current.to_s,
          "description" => p["description"].presence || "EPF Contribution",
          "employee" => p["employee"].to_f,
          "employer" => p["employer"].to_f,
          "interest" => p["interest"].to_f
        }
        upsert_in_array(data["epf"]["entries"], record)
        data["epf"]["current_balance"] = data["epf"]["entries"].sum { |e| e["employee"].to_f + e["employer"].to_f + e["interest"].to_f }.round
        data["epf"]["last_updated"] = Date.current.to_s
        record
      when "epf_balance", "epf"
        data["epf"] ||= {}
        if p.key?("uan") || p.key?("account_identifier")
          ident = p["uan"].presence || p["account_identifier"].presence || "EPFO-UAN"
          data["epf"]["uan"] = ident
          data["epf"]["account_identifier"] = ident
        end
        data["epf"]["current_balance"] = p["current_balance"].to_f if p.key?("current_balance")
        data["epf"]["interest_rate"] = p["interest_rate"].to_f if p["interest_rate"].to_f.positive?
        data["epf"]["last_updated"] = p["last_updated"].presence || Date.current.to_s
        data["epf"]
      when "ulip"
        data["ulip"] ||= {}
        data["ulip"]["policy_name"] = p["policy_name"].presence || data["ulip"]["policy_name"] || "Market-Linked ULIP"
        data["ulip"]["total_paid"] = p["total_paid"].to_f if p.key?("total_paid")
        data["ulip"]["current_value"] = p["current_value"].to_f if p.key?("current_value")
        data["ulip"]
      when "home_loan"
        data["home_loan"] ||= {}
        data["home_loan"].merge!(
          "outstanding_principal" => p["outstanding_principal"].to_f,
          "monthly_emi" => p["monthly_emi"].to_f,
          "original_loan_amount" => p["original_loan_amount"].to_f,
          "loan_start_date" => p["loan_start_date"].to_s,
          "tenure_years" => p["tenure_years"].to_f,
          "interest_rate" => p["interest_rate"].to_f,
          "emi_day" => (p["emi_day"].to_i.positive? ? p["emi_day"].to_i : 26)
        )
        data["home_loan"]
      when "tax_profile"
        data["tax_profile"] ||= {}
        merged = {
          "fy" => p["fy"].presence || "2025-26",
          "age_group" => p["age_group"].presence || "below_60",
          "preferred_regime" => p["preferred_regime"].presence || "auto",
          "is_salaried" => p["is_salaried"] != false && p["is_salaried"].to_s != "false",
          "gross_salary" => p["gross_salary"].to_f,
          "interest_income" => p["interest_income"].to_f,
          "rental_income" => p["rental_income"].to_f,
          "other_income" => p["other_income"].to_f,
          "hra_exemption" => p["hra_exemption"].to_f,
          "professional_tax" => p["professional_tax"].to_f,
          "home_loan_interest_24b" => p["home_loan_interest_24b"].to_f,
          "sec_80c" => p["sec_80c"].to_f,
          "sec_80ccd_1b_nps" => p["sec_80ccd_1b_nps"].to_f,
          "sec_80ccd_2_employer_nps" => p["sec_80ccd_2_employer_nps"].to_f,
          "sec_80d_health" => p["sec_80d_health"].to_f,
          "sec_80tta_savings" => p["sec_80tta_savings"].to_f,
          "other_deductions_80e_80g" => p["other_deductions_80e_80g"].to_f,
          "tds_deducted" => p["tds_deducted"].to_f,
          "advance_tax_paid" => p["advance_tax_paid"].to_f
        }
        data["tax_profile"].merge!(merged)
        data["tax_profile"]
      else
        nil
      end
    end

    def build_collection_record(collection, id, p, existing)
      case collection
      when "mutual_funds"
        nav = p["latest_nav"].to_f
        val = p["current_value"].to_f
        units = p["units"].to_f
        units = (val / nav).round(4) if units <= 0 && nav.positive? && val.positive?
        holdings = p["holdings"].is_a?(Array) ? p["holdings"] : existing["holdings"]
        rec = existing.merge(
          "id" => id,
          "scheme_name" => p["scheme_name"].to_s.strip,
          "scheme_code" => p["scheme_code"].to_s.strip,
          "latest_nav" => nav,
          "nav_date" => p["nav_date"].presence || existing["nav_date"] || Date.current.strftime("%d-%m-%Y"),
          "units" => units,
          "category" => p["category"].presence || "Equity",
          "amc" => p["amc"].to_s.strip,
          "sip_amount" => p["sip_amount"].to_f,
          "start_date" => p["start_date"].to_s,
          "current_value" => val,
          "invested_amount" => p["invested_amount"].to_f,
          "step_up_pct" => p.key?("step_up_pct") ? p["step_up_pct"].to_f : existing["step_up_pct"].to_f
        )
        if holdings.is_a?(Array) && holdings.any?
          rec["holdings"] = holdings
        else
          rec["holdings"] = Calculations::MutualFundsOverlapService.holdings_for_fund(rec).map { |h| h.transform_keys(&:to_s) }
        end
        rec
      when "fixed_deposits"
        mat_override = p["maturity_amount"].to_f
        {
          "id" => id,
          "bank" => p["bank"].to_s.strip,
          "fd_no" => p["fd_no"].to_s.strip,
          "principal" => p["principal"].to_f,
          "rate" => p["rate"].to_f,
          "start_date" => p["start_date"].to_s,
          "maturity_date" => p["maturity_date"].to_s,
          "maturity_amount" => (mat_override.positive? ? mat_override.round : nil)
        }.compact
      when "recurring_deposits"
        mat_override = p["maturity_amount"].to_f
        {
          "id" => id,
          "bank" => p["bank"].to_s.strip,
          "rd_no" => p["rd_no"].to_s.strip,
          "purpose" => p["purpose"].to_s.strip,
          "monthly_amount" => p["monthly_amount"].to_f,
          "rate" => p["rate"].to_f,
          "start_date" => p["start_date"].to_s,
          "end_date" => p["end_date"].to_s,
          "maturity_amount" => (mat_override.positive? ? mat_override.round : nil)
        }.compact
      when "flexi_rds"
        mat_override = p["maturity_amount"].to_f
        {
          "id" => id,
          "bank" => p["bank"].to_s.strip,
          "rd_no" => p["rd_no"].to_s.strip,
          "purpose" => p["purpose"].to_s.strip,
          "base_monthly" => p["base_monthly"].to_f,
          "total_deposited" => p["total_deposited"].to_f,
          "rate" => p["rate"].to_f,
          "start_date" => p["start_date"].to_s,
          "end_date" => p["end_date"].to_s,
          "maturity_amount" => (mat_override.positive? ? mat_override.round : nil)
        }.compact
      when "health_insurance", "life_insurance", "vehicle_insurance", "home_loan_insurance"
        {
          "id" => id,
          "insurer" => p["insurer"].to_s.strip,
          "policy_name" => p["policy_name"].to_s.strip,
          "policy_type" => p["policy_type"].to_s.strip,
          "asset_ref" => p["asset_ref"].to_s.strip,
          "insured_person" => p["insured_person"].to_s.strip,
          "nominee_person" => p["nominee_person"].to_s.strip,
          "sum_insured" => p["sum_insured"].to_f,
          "annual_premium" => p["annual_premium"].to_f,
          "policy_no" => p["policy_no"].to_s.strip,
          "start_date" => p["start_date"].to_s,
          "end_date" => p["end_date"].to_s
        }
      when "bank_accounts"
        {
          "id" => id,
          "bank_name" => p["bank_name"].to_s.strip,
          "account_type" => p["account_type"].presence || "Savings",
          "account_no" => p["account_no"].to_s.strip,
          "branch_ifsc" => p["branch_ifsc"].to_s.strip,
          "holder_name" => p["holder_name"].to_s.strip,
          "current_balance" => p["current_balance"].to_f,
          "interest_rate" => p["interest_rate"].to_f,
          "nominee" => p["nominee"].to_s.strip,
          "purpose" => p["purpose"].to_s.strip,
          "notes" => p["notes"].to_s.strip
        }
      when "credit_cards"
        {
          "id" => id,
          "bank_name" => p["bank_name"].to_s.strip,
          "card_name" => p["card_name"].to_s.strip,
          "network" => p["network"].presence || "Visa",
          "last4" => p["last4"].to_s.strip,
          "billing_day" => (p["billing_day"].to_i.positive? ? p["billing_day"].to_i : 1),
          "due_day" => (p["due_day"].to_i.positive? ? p["due_day"].to_i : 15),
          "credit_limit" => p["credit_limit"].to_f,
          "utilized_amount" => p["utilized_amount"].to_f,
          "reward_points" => p["reward_points"].to_i,
          "annual_fee_notes" => p["annual_fee_notes"].to_s.strip
        }
      end
    end

    def apply_delete!(data, item_type, target_id)
      if (collection = COLLECTION_ALIASES[item_type])
        list = Array(data[collection])
        removed = list.find { |x| x["id"].to_i == target_id }
        data[collection] = list.reject { |x| x["id"].to_i == target_id }
        return removed
      end

      case item_type
      when "ppf_contribution", "ppf_contributions"
        list = Array(data.dig("ppf", "contributions"))
        removed = list.find { |x| x["id"].to_i == target_id }
        if removed && data["ppf"]
          data["ppf"]["contributions"] = list.reject { |x| x["id"].to_i == target_id }
          if data["ppf"]["current_balance"].to_f.positive?
            data["ppf"]["current_balance"] = [0.0, data["ppf"]["current_balance"].to_f - removed["amount"].to_f].max.round
          end
        end
        removed
      when "epf_entry", "epf_entries"
        list = Array(data.dig("epf", "entries"))
        removed = list.find { |x| x["id"].to_i == target_id }
        if data["epf"]
          new_list = list.reject { |x| x["id"].to_i == target_id }
          data["epf"]["entries"] = new_list
          if new_list.any?
            data["epf"]["current_balance"] = new_list.sum { |e| e["employee"].to_f + e["employer"].to_f + e["interest"].to_f }.round
          end
        end
        removed
      else
        :unsupported
      end
    end
  end
end

