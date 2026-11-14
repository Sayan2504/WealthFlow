# frozen_string_literal: true

require "rails_helper"
require "tempfile"
require "fileutils"

RSpec.describe "Modernization Jobs, Tax Preview & PIN Lock", type: :request do
  include ActiveJob::TestHelper

  before do
    @tmp = Tempfile.new(["wealthflow_mod", ".json"])
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
    clear_enqueued_jobs
    @tmp.close! if @tmp
  end

  describe "SyncPortfolioMarketDataJob" do
    it "refreshes mutual fund NAVs and statutory rates cleanly" do
      expect(SyncPortfolioMarketDataJob.perform_now("all")).to be(true)
      reloaded = @repo.load_raw
      expect(reloaded.dig(:ppf, :interest_rate).to_f).to eq(7.1)
      expect(reloaded.dig(:epf, :interest_rate).to_f).to eq(8.25)
    end

    it "queues SyncPortfolioMarketDataJob when POST /api/sync_navs is called with async=true" do
      expect do
        post "/api/sync_navs", params: { async: true }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      end.to have_enqueued_job(SyncPortfolioMarketDataJob).with("navs")

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["queued"]).to be(true)
    end
  end

  describe "POST /api/tax_preview" do
    it "calculates both tax regimes via TaxCalculatorService without mutating portfolio" do
      post "/api/tax_preview",
           params: {
             payload: {
               fy: "2025-26",
               is_salaried: true,
               gross_salary: 1_275_000,
               sec_80c: 150_000
             }
           }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["success"]).to be(true)
      expect(json.dig("taxCalc", "newRegime", "totalTax")).to eq(0)
    end
  end

  describe "Security PIN session lock & unlock" do
    it "locks, gates HTML & API access, and unlocks with bcrypt PIN" do
      post "/session/pin",
           params: { pin: "2580" }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["pin_enabled"]).to be(true)

      post "/session/lock", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["locked"]).to be(true)

      get "/"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("WealthFlow Cockpit Locked")
      expect(response.body).not_to include("window.TRACKER_DATA")

      post "/api/tax_preview", params: "{}", headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/session/unlock",
           params: { pin: "9999" }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/session/unlock",
           params: { pin: "2580" }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)

      get "/"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Consolidated Net Worth")
    end
  end
end

