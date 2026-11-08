# frozen_string_literal: true

require "rails_helper"

RSpec.describe Calculations::FinancialMath do
  describe ".compute_exact_duration" do
    it "computes duration across full years and leap boundaries" do
      dur = described_class.compute_exact_duration("2024-01-01", "2026-01-01")
      expect(dur[:years]).to eq(2)
      expect(dur[:months]).to eq(0)
      expect(dur[:days]).to eq(0)
      expect(dur[:total_months]).to eq(24)
    end

    it "handles negative or inverted date edge cases gracefully" do
      dur = described_class.compute_exact_duration("2026-01-01", "2025-01-01")
      expect(dur[:total_months]).to eq(0)
      expect(dur[:text]).to eq("0 Yrs, 0 Mos, 0 Days")
    end

    it "handles nil and blank dates" do
      dur = described_class.compute_exact_duration("", nil)
      expect(dur[:total_months]).to eq(0)
    end
  end

  describe ".calculate_fd" do
    it "calculates quarterly compounding for tenures >= 180 days" do
      res = described_class.calculate_fd(
        principal: 100_000,
        rate: 6.5,
        start_date: "2025-01-01",
        maturity_date: "2026-01-01"
      )
      expect(res[:maturity]).to be > 100_000
      expect(res[:gain]).to eq(res[:maturity] - 100_000)
    end

    it "calculates simple interest for short tenures under 180 days" do
      res = described_class.calculate_fd(
        principal: 50_000,
        rate: 4.25,
        start_date: "2026-09-21",
        maturity_date: "2027-01-01"
      )
      expect(res[:gain]).to be > 0
      expect(res[:gain]).to be < 1_000
    end

    it "handles zero and negative amounts without raising error" do
      res = described_class.calculate_fd(
        principal: -10_000,
        rate: -5,
        start_date: "2026-01-01",
        maturity_date: "2027-01-01"
      )
      expect(res[:principal]).to eq(0)
      expect(res[:maturity]).to eq(0)
      expect(res[:gain]).to eq(0)
    end
  end

  describe ".calculate_rd and .calculate_flexi_rd" do
    it "calculates RD compounding accurately across months" do
      res = described_class.calculate_rd(
        monthly_amount: 5000,
        rate: 6.6,
        start_date: "2026-04-01",
        end_date: "2027-04-01"
      )
      expect(res[:total_invested]).to eq(60_000)
      expect(res[:maturity]).to be > 60_000
      expect(res[:gain]).to eq(res[:maturity] - 60_000)
    end

    it "calculates Flexi RD with custom total deposited amount" do
      res = described_class.calculate_flexi_rd(
        base_monthly: 100,
        total_deposited: 500,
        rate: 6.25,
        start_date: "2026-10-10",
        end_date: "2027-10-10"
      )
      expect(res[:total_deposited]).to eq(500)
      expect(res[:maturity]).to be >= 500
    end
  end

  describe ".calculate_standard_emi" do
    it "computes standard reducing balance monthly loan EMI" do
      emi = described_class.calculate_standard_emi(
        principal: 4_000_000,
        annual_rate: 7.45,
        tenure_years: 30
      )
      expect(emi).to eq(27_832)
    end

    it "returns 0 for zero loan principal or zero tenure" do
      expect(described_class.calculate_standard_emi(principal: 0, annual_rate: 8.5, tenure_years: 20)).to eq(0)
      expect(described_class.calculate_standard_emi(principal: 100_000, annual_rate: 0, tenure_years: 5)).to eq(0)
    end
  end
end

RSpec.describe Calculations::RetirementCalculator do
  describe ".group_ppf_by_financial_year" do
    it "clubs multiple contributions in the same FY and computes limit difference" do
      entries = [
        { id: 1, date: "2026-11-01", amount: 13_000 },
        { id: 2, date: "2026-11-07", amount: 137_000 }
      ]
      groups = described_class.group_ppf_by_financial_year(entries)
      expect(groups.size).to eq(1)
      expect(groups.first[:total_amount]).to eq(150_000)
      expect(groups.first[:is_full]).to be true
      expect(groups.first[:limit_status_label]).to eq("₹1.5L limit reached")
    end

    it "shows 'lesser than the ₹1.5L limit' phrasing when under 150000" do
      entries = [
        { id: 1, date: "2024-03-31", amount: 100_000 }
      ]
      groups = described_class.group_ppf_by_financial_year(entries)
      expect(groups.first[:is_full]).to be false
      expect(groups.first[:limit_status_label]).to include("lesser than the ₹1.5L limit")
      expect(groups.first[:limit_status_label]).to include("50,000")
    end
  end
end

RSpec.describe Calculations::MutualFundsOverlapService do
  describe ".calculate_pairwise_overlap" do
    it "calculates holding overlap between HDFC Index and Parag Parikh Flexi Cap" do
      res = described_class.calculate_pairwise_overlap("119063", "122639")
      expect(res[:overlap_percentage]).to be > 0.0
      expect(res[:common_stocks_count]).to be >= 2
      # HDFC Bank is common to both
      common_tickers = res[:common_stocks].map { |x| x[:ticker] }
      expect(common_tickers).to include("HDFCBANK")
    end
  end
end

