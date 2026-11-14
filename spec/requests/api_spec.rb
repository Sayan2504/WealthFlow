# frozen_string_literal: true

require "rails_helper"
require "tempfile"
require "fileutils"

RSpec.describe "Portfolio & Mutual Funds API", type: :request do
  before do
    @tmp = Tempfile.new(["wealthflow_api", ".json"])
    src = Rails.root.join("storage", "preview_data.json")
    if File.exist?(src)
      FileUtils.cp(src, @tmp.path)
    else
      @tmp.write("{}")
      @tmp.flush
    end
    @repo = Portfolio::Repository.new(@tmp.path)
    allow(Portfolio::Repository).to receive(:instance).and_return(@repo)
    @user = User.primary_demo_user!
    sign_in @user
  end

  after do
    @tmp.close! if @tmp
  end

  describe "GET /api/mutual_funds/overlap" do
    it "returns 200 with pairwise overlap HTML & metrics when both valid fund IDs exist" do
      funds = @repo.load_raw[:mutual_funds]
      skip("Need at least 2 mutual funds in fixture") if funds.size < 2

      get "/api/mutual_funds/overlap", params: { fund_a_id: funds[0][:id], fund_b_id: funds[1][:id] }
      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json["success"]).to be(true)
      expect(json).to have_key("overlapPercentage")
      expect(json["html"]).to include("Portfolio Overlap")
    end

    it "returns 400 when parameters are missing or refer to unknown funds" do
      get "/api/mutual_funds/overlap", params: { fund_a_id: "", fund_b_id: "" }
      expect(response).to have_http_status(:bad_request)

      get "/api/mutual_funds/overlap", params: { fund_a_id: "9999999", fund_b_id: "8888888" }
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "GET /api/mf_search" do
    it "returns matching AMFI schemes" do
      get "/api/mf_search", params: { q: "Parag Parikh" }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["success"]).to be(true)
      expect(json["schemes"].map { |s| s["schemeCode"] }).to include("122639")
    end
  end

  describe "GET & POST /api/statutory_rates" do
    it "returns PPF & EPF statutory rates" do
      get "/api/statutory_rates"
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.dig("ppf", "rate")).to eq(7.1)
      expect(json.dig("epf", "rate")).to eq(8.25)

      post "/api/statutory_rates"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /api/export_csv & /api/export_excel" do
    it "exports CSV and Excel SpreadsheetML cleanly" do
      get "/api/export_csv"
      expect(response).to have_http_status(:ok)
      expect(response.headers["Content-Type"]).to include("text/csv")
      expect(response.body).to include("WEALTHFLOW")

      get "/api/export_excel"
      expect(response).to have_http_status(:ok)
      expect(response.headers["Content-Type"]).to include("application/vnd.ms-excel")
      expect(response.body).to include("<Workbook")
    end
  end

  describe "POST /api/save_item & POST /api/delete_item" do
    it "creates, updates, and deletes a Fixed Deposit in isolated storage" do
      post "/api/save_item",
           params: {
             type: "fd",
             payload: {
               bank: "ICICI",
               fd_no: "ICICI-TEST-01",
               principal: 100_000,
               rate: 7.25,
               start_date: "2026-01-01",
               maturity_date: "2027-01-01"
             }
           }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }

      expect(response).to have_http_status(:ok)
      saved = JSON.parse(response.body)["item"]
      expect(saved["bank"]).to eq("ICICI")
      item_id = saved["id"]

      reloaded = @repo.load_raw[:fixed_deposits].find { |f| f[:id] == item_id }
      expect(reloaded).not_to be_nil
      expect(reloaded[:fd_no]).to eq("ICICI-TEST-01")

      post "/api/delete_item",
           params: { type: "fd", id: item_id }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }

      expect(response).to have_http_status(:ok)
      expect(@repo.load_raw[:fixed_deposits].find { |f| f[:id] == item_id }).to be_nil
    end

    it "saves tax_profile and returns updated taxCalc" do
      post "/api/save_item",
           params: {
             type: "tax_profile",
             payload: { fy: "2025-26", is_salaried: true, gross_salary: 1_800_000, sec_80c: 150_000 }
           }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["success"]).to be(true)
      expect(json.dig("taxCalc", "grossTotalIncome")).to eq(1_800_000)
    end
  end

  describe "Mutual Funds sync, step-up & holdings endpoints" do
    it "supports mf_nav, save_step_up, sync_navs, fetch_live_stocks, add_stock, delete_stock and sync_all_stocks" do
      get "/api/mf_nav", params: { scheme_code: "122639" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["nav"]).to be > 0

      funds = @repo.load_raw[:mutual_funds]
      skip("Need at least 1 mutual fund in fixture") if funds.empty?
      fid = funds[0][:id]

      post "/api/save_step_up",
           params: { step_ups: { fid.to_s => 15 } }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)

      post "/api/sync_navs", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["success"]).to be(true)

      post "/api/fetch_live_stocks",
           params: { fund_id: fid }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)

      post "/api/add_stock",
           params: { fund_id: fid, stock: "Test Corp", ticker: "TESTCORP", sector: "Tech", weight: 2.5 }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["holdings"].map { |h| h["ticker"] }).to include("TESTCORP")

      post "/api/delete_stock",
           params: { fund_id: fid, ticker: "TESTCORP" }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["holdings"].map { |h| h["ticker"] }).not_to include("TESTCORP")

      post "/api/sync_all_stocks", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
    end
  end
end
