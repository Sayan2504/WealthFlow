# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Portfolio ActiveRecord Models & Bridge", type: :model do
  it "supports bcrypt PIN authentication on PortfolioProfile" do
    profile = PortfolioProfile.create!(name: "Test Profile")
    expect(profile.pin_enabled?).to be(false)

    profile.update!(pin: "4321", pin_confirmation: "4321")
    expect(profile.pin_enabled?).to be(true)
    expect(profile.authenticate_pin("4321")).to eq(profile)
    expect(profile.authenticate_pin("0000")).to be(false)
  end

  it "validates and associates MutualFund with StockHoldings" do
    mf = MutualFund.create!(scheme_name: "Parag Parikh Flexi Cap Fund", scheme_code: "122639", current_value: 100_000)
    mf.stock_holdings.create!(stock: "HDFC Bank", ticker: "HDFCBANK", sector: "Banking", weight: 8.1)

    expect(mf.stock_holdings.count).to eq(1)
    expect { mf.destroy! }.to change(StockHolding, :count).by(-1)
  end

  it "scopes standard and flexi RecurringDeposits and validates InsurancePolicy categories" do
    RecurringDeposit.create!(deposit_kind: "rd", bank: "HDFC", monthly_amount: 5000, rate: 7.0)
    RecurringDeposit.create!(deposit_kind: "flexi_rd", bank: "ICICI", base_monthly: 3000, total_deposited: 36_000, rate: 6.8)

    expect(RecurringDeposit.standard_rd.count).to eq(1)
    expect(RecurringDeposit.flexi_rd.count).to eq(1)

    bad_policy = InsurancePolicy.new(category: "invalid_cat", insurer: "LIC")
    expect(bad_policy).not_to be_valid
  end

  it "round-trips storage/preview_data.json through SQLite ActiveRecord models with identical aggregates and preserves pin_digest" do
    src = Rails.root.join("storage", "preview_data.json")
    raw = JSON.parse(File.read(src, encoding: "UTF-8"))

    profile = PortfolioProfile.create!(name: "Pre-existing")
    profile.update!(pin: "9876", pin_confirmation: "9876")
    saved_digest = profile.pin_digest

    Portfolio::ActiveRecordBridge.import_from_hash!(raw)
    exported = Portfolio::ActiveRecordBridge.export_to_hash

    expect(PortfolioProfile.current.pin_digest).to eq(saved_digest)
    expect(exported["mutual_funds"].size).to eq(raw["mutual_funds"].size)
    expect(exported["fixed_deposits"].size).to eq(raw["fixed_deposits"].size)
    expect(exported["bank_accounts"].size).to eq(raw["bank_accounts"].size)

    ov_raw = Calculations::DashboardAggregator.calculate_overview(raw)
    ov_db = Calculations::DashboardAggregator.calculate_overview(exported)
    expect(ov_db[:netWorth]).to be_within(0.01).of(ov_raw[:netWorth])
    expect(ov_db[:postTax][:postTaxGain]).to eq(ov_raw[:postTax][:postTaxGain])
  end
end

