# frozen_string_literal: true

require "rails_helper"
require "tempfile"
require "fileutils"

RSpec.describe "Pages", type: :request do
  before do
    @tmp = Tempfile.new(["wealthflow_pages", ".json"])
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

  it "renders Dashboard (/)" do
    get "/"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Consolidated Net Worth")
    expect(response.body).to include("Post-Tax Interest")
  end

  it "renders Mutual Funds (/mutual_funds)" do
    get "/mutual_funds"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Mutual Funds Portfolio")
    expect(response.body).to include("Overlap Intelligence Drawer")
  end

  it "renders Fixed Income (/fixed_income) with Post-Tax Interest & slab selector" do
    get "/fixed_income"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("After-Tax Interest Take-Home Reality")
    expect(response.body).to include("setFiTaxSlab(0.3)")
  end

  it "renders Retirement (/retirement)" do
    get "/retirement"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Retirement Corpus")
    expect(response.body).to include("Public Provident Fund")
  end

  it "renders Insurance (/insurance)" do
    get "/insurance"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Insurance &amp; Risk Coverage")
  end

  it "renders Home Loan (/home_loan)" do
    get "/home_loan"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Home Loan &amp; Mortgage Amortization")
    expect(response.body).to include("Home Loan Principal Decrease Tracker")
  end

  it "renders Banking (/banking)" do
    get "/banking"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Banking &amp; Credit Cards")
    expect(response.body).not_to include("Home Loan Principal Decrease Tracker")
  end

  it "renders Tax Calculator (/tax_calculator)" do
    get "/tax_calculator"
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Income Tax &amp; ITR Planner")
  end
end
