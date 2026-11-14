# frozen_string_literal: true

require "rails_helper"
require "digest"

RSpec.describe "WealthFlow Architecture, Security, Devise Isolation, Ransack & Zero-Frontend-Math", type: :request do
  let(:preview_file) { Rails.root.join("storage", "preview_data.json") }

  around do |example|
    digest_before = Digest::SHA256.file(preview_file).hexdigest
    example.run
    Current.reset
    expect(Digest::SHA256.file(preview_file).hexdigest).to eq(digest_before)
  end

  describe "Devise Authentication Enforcement Guard" do
    it "redirects unauthenticated HTML requests to /users/sign_in without exposing portfolio data" do
      %w[/ /mutual_funds /fixed_income /retirement /insurance /home_loan /banking /tax_calculator].each do |path|
        get path
        expect(response).to have_http_status(:found), "Expected 302 redirect on #{path}, got #{response.status}"
        expect(response).to redirect_to(new_user_session_path)
        expect(response.body).not_to include("window.TRACKER_DATA")
      end
    end

    it "rejects unauthenticated requests to every API and session endpoint with 401 JSON" do
      get "/api/search", params: { q: "hdfc" }
      expect(response).to have_http_status(:unauthorized)

      get "/api/export_csv"
      expect(response).to have_http_status(:unauthorized)

      get "/api/mf_search", params: { q: "parag" }
      expect(response).to have_http_status(:unauthorized)

      post "/api/fixed_income/slab_preview", params: { slab: 0.20 }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/api/fixed_income/deposit_preview", params: { type: "fd" }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/api/mutual_funds/sip_projection", params: { step_ups: {} }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/api/tax_preview", params: { payload: { gross_salary: 1_500_000 } }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/api/save_item", params: { type: "fd", payload: { bank: "Test" } }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)

      post "/session/pin", params: { pin: "1234" }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "renders Devise sign-in with Ad Carousel & keeps sign-up/password free of carousel and private data" do
      [new_user_session_path, new_user_password_path].each do |auth_path|
        get auth_path
        expect(response).to have_http_status(:ok)
        expect(response.body).not_to include("window.TRACKER_DATA")
      end

      get new_user_session_path
      expect(response.body).to include('data-controller="carousel"')
      expect(response.body).to include("motion.min.js")

      get new_user_registration_path
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("window.TRACKER_DATA")
      expect(response.body).not_to include('data-controller="carousel"')
    end
  end

  describe "Drawer-Only UI, theme.yml Engine, Main-Page Carousel, Search/AI & Graphs" do
    before do
      @primary = User.primary_demo_user!
      sign_in @primary
    end

    it "renders carousel only on main dashboard, uses config-driven theme.yml, drawer-only UI, simple Search/Ask AI, and backend wealth graphs" do
      get root_path
      expect(response).to have_http_status(:ok)

      # Left sidebar has module navigation links (no searchbar inside sidebar)
      sidebar_fragment = response.body[/<aside.*?<\/aside>/m].to_s
      expect(sidebar_fragment).to include('aria-label="Primary Sidebar Navigation"')
      expect(sidebar_fragment).to include('href="/fixed_income"')
      expect(sidebar_fragment).to include('href="/mutual_funds"')
      expect(sidebar_fragment).to include('href="/home_loan"')
      expect(sidebar_fragment).not_to include('id="global-top-search"')

      # Top panel header has Search + Ask AI drawer trigger + theme.yml buttons, NO module nav links
      header_fragment = response.body[/<header.*?<\/header>/m].to_s
      expect(header_fragment).to include('id="top-portfolio-search"')
      expect(header_fragment).to include('id="global-top-search"')
      expect(header_fragment).to include('id="open-ai-drawer-btn"')
      expect(header_fragment).to include('data-theme-value="midnight"')
      expect(header_fragment).to include('data-theme-value="solstice"')
      expect(header_fragment).to include('data-theme-value="aurora"')
      expect(header_fragment).not_to include('href="/fixed_income"')
      expect(header_fragment).not_to include('href="/mutual_funds"')
      expect(header_fragment).not_to include('href="/home_loan"')
      expect(header_fragment).not_to include('href="/tax_calculator"')

      # Simplified 4-slide carousel on main dashboard only (no AI slide), zero modals/popups, unified right drawer & toast stack
      expect(response.body).to include('data-controller="carousel"')
      expect(response.body).to include("/images/carousel/fixed-income-yields.svg")
      expect(response.body).not_to include("/images/carousel/ai-search-banking.svg")
      expect(response.body).to include('id="right-drawer"')
      expect(response.body).to include('id="drawer-footer"')
      expect(response.body).not_to include('id="modal-container"')
      expect(response.body).not_to include('id="confirm-container"')
      expect(response.body).to include('id="toast-stack"')
      expect(response.body).to include('data-controller="toast"')

      # Backend-computed graphs rendered on dashboard
      expect(response.body).to include('id="wealth-analytics-graphs"')
      expect(response.body).to include("Total Wealth &amp; Net Worth Graph")
      expect(response.body).to include("Mutual Funds, EPF &amp; PPF Increase / Decrease Tracker")
      expect(response.body).to include("Home Loan Decrease Metric")

      # Carousel is NOT rendered on interior subpages
      [mutual_funds_path, fixed_income_path, retirement_path, insurance_path, home_loan_path, banking_path].each do |subpage|
        get subpage
        expect(response).to have_http_status(:ok)
        expect(response.body).not_to include('data-controller="carousel"')
      end

      # Tech stack metadata is NOT rendered in the UI; detailed documentation resides in README.md
      get root_path
      expect(response.body).not_to include("Packwerk 3.3")
      expect(response.body).not_to include("Ransack 4.4")
      expect(response.body).not_to include("Tech Stack:")

      readme = File.read(Rails.root.join("README.md"))
      expect(readme).to include("packwerk")
      expect(readme).to include("packages/ai_search")
      expect(readme).to include("theme.yml")
    end

    it "resolves direct module searches like fd to /fixed_income and returns empty results for non-matching queries" do
      get "/api/search", params: { q: "tax regime" }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["ok"]).to be(true)
      expect(json["quick_prompts"]).to be_an(Array).and be_present
      expect(json.dig("ai_insight", "title")).to include("AI Tax")
      expect(json.dig("ai_insight", "answer")).to be_present

      get "/api/search", params: { q: "fd" }
      expect(response).to have_http_status(:ok)
      fd_urls = JSON.parse(response.body)["results"].map { |r| r["url"] }
      expect(fd_urls).to include("/fixed_income")

      get "/api/search", params: { q: "home loan" }
      expect(response).to have_http_status(:ok)
      hl_json = JSON.parse(response.body)
      hl_urls = hl_json["results"].map { |r| r["url"] }
      expect(hl_urls).to include("/home_loan")
      expect(hl_json.dig("ai_insight", "url")).to eq("/home_loan")

      get "/api/search", params: { q: "nonexistent_xyz_999" }
      expect(response).to have_http_status(:ok)
      empty_results = JSON.parse(response.body)["results"]
      expect(empty_results).to eq([])
    end
  end

  describe "Per-User Portfolio Isolation & Ransack Global Search" do
    it "isolates newly registered Devise users from primary user data and scopes Ransack search" do
      primary = User.primary_demo_user!
      raw = JSON.parse(File.read(preview_file, encoding: "UTF-8"))
      Portfolio::ActiveRecordBridge.import_from_hash!(raw, user: primary)

      # Register a brand-new user via Devise signup
      expect do
        post user_registration_path, params: {
          user: {
            name: "Ananya Kapoor",
            annual_income: 2_400_000,
            email: "ananya.kapoor@wealthflow.in",
            password: "Password!2026",
            password_confirmation: "Password!2026"
          }
        }
      end.to change(User, :count).by(1)

      ananya = User.find_by!(email: "ananya.kapoor@wealthflow.in")
      expect(response).to redirect_to(root_path)

      # Ananya starts with empty portfolio (0 mutual funds, 0 fixed deposits)
      expect(ananya.mutual_funds.count).to eq(0)
      expect(ananya.fixed_deposits.count).to eq(0)

      # Ananya saves her own Fixed Deposit in IDFC First Bank
      post "/api/save_item",
           params: {
             type: "fd",
             payload: {
               bank: "IDFC First Bank",
               fd_no: "IDFC-ANANYA-88",
               principal: 300_000,
               rate: 7.75,
               start_date: "2025-01-15",
               maturity_date: "2026-07-15"
             }
           }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      expect(ananya.fixed_deposits.count).to eq(1)

      # Ransack global search for Ananya finds IDFC but NEVER Primary User's HDFC/SBI records
      get "/api/search", params: { q: "IDFC" }
      expect(response).to have_http_status(:ok)
      idfc_hits = JSON.parse(response.body)["results"]
      expect(idfc_hits.any? { |r| r["title"].include?("IDFC First Bank") }).to be(true)

      get "/api/search", params: { q: "Parag Parikh" }
      expect(response).to have_http_status(:ok)
      ppf_hits = JSON.parse(response.body)["results"].select { |r| r["category"] == "Mutual Fund" }
      expect(ppf_hits).to be_empty

      # Sign out Ananya, sign in Primary User: Primary User sees ZERO of Ananya's records
      sign_out ananya
      sign_in primary

      get "/api/search", params: { q: "IDFC-ANANYA-88" }
      expect(response).to have_http_status(:ok)
      leaked_hits = JSON.parse(response.body)["results"].select { |r| r["category"] == "Fixed Deposit" }
      expect(leaked_hits).to be_empty
    end
  end

  describe "Zero-Frontend-Math Backend Calculation APIs" do
    before do
      @primary = User.primary_demo_user!
      raw = JSON.parse(File.read(preview_file, encoding: "UTF-8"))
      Portfolio::ActiveRecordBridge.import_from_hash!(raw, user: @primary)
      sign_in @primary
    end

    it "computes Fixed Income slab preview on the backend via Packwerk FixedIncome::Calculator" do
      post "/api/fixed_income/slab_preview",
           params: { slab: 0.20 }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["ok"]).to be(true)
      expect(json["slabRate"]).to eq(0.2)
      expect(json.dig("postTax", "effectiveTaxPct")).to eq("20.80")
      expect(json["rows"]).to be_a(Hash)
      expect(json["rows"].keys).to include("fd-#{@primary.fixed_deposits.first.external_id || @primary.fixed_deposits.first.id}")
    end

    it "computes FD/RD/Flexi RD live modal previews on the backend" do
      post "/api/fixed_income/deposit_preview",
           params: {
             type: "fd",
             deposit: {
               principal: 100_000,
               rate: 7.5,
               start_date: "2025-01-01",
               maturity_date: "2026-01-01"
             }
           }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["ok"]).to be(true)
      expect(json.dig("preview", "maturity")).to be > 100_000
      expect(json["html"]).to include("Post-Tax Net:")
    end

    it "computes 10-year SIP step-up projections on the backend via MutualFunds::Analytics" do
      mf = @primary.mutual_funds.first
      post "/api/mutual_funds/sip_projection",
           params: { step_ups: { (mf.external_id || mf.id).to_s => 10 } }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["ok"]).to be(true)
      expect(json.dig("projection", "step_10y")).to be >= json.dig("projection", "flat_10y")
      expect(json["html"]).to include("10-Yr Step-Up Corpus")
    end

    it "contains no client-side tax or compounding math formulas in JS assets" do
      client_js = File.read(Rails.root.join("public", "javascripts", "wealthflow_client.js"))
      expect(client_js).not_to include("computeSlabsJs")
      expect(client_js).not_to include("computeSurchargeJs")
      expect(client_js).not_to include("Math.pow")

      fi_slab_js = File.read(Rails.root.join("app", "javascript", "controllers", "fi_slab_controller.js"))
      expect(fi_slab_js).not_to include("effRate = slab")
      expect(fi_slab_js).to include("/api/fixed_income/slab_preview")
    end
  end
end
