# frozen_string_literal: true

require "rails_helper"

RSpec.describe Calculations::TaxCalculatorService do
  describe ".calculate_both_regimes" do
    it "applies FY 2025-26 New Regime Section 87A rebate for salaried income up to 12.75L" do
      result = described_class.calculate_both_regimes(
        "fy" => "2025-26",
        "is_salaried" => true,
        "gross_salary" => 1_275_000,
        "professional_tax" => 0
      )

      expect(result[:grossTotalIncome]).to eq(1_275_000)
      expect(result.dig(:newRegime, :stdDeduction)).to eq(75_000)
      expect(result.dig(:newRegime, :taxableIncome)).to eq(1_200_000)
      expect(result.dig(:newRegime, :slabTax)).to eq(60_000)
      expect(result.dig(:newRegime, :rebate87A)).to eq(60_000)
      expect(result.dig(:newRegime, :totalTax)).to eq(0)
      expect(result[:recommendedRegime]).to eq("new")
    end

    it "applies FY 2025-26 marginal relief right above 12L taxable income" do
      result = described_class.calculate_both_regimes(
        "fy" => "2025-26",
        "is_salaried" => false,
        "gross_salary" => 1_210_000
      )

      expect(result.dig(:newRegime, :taxableIncome)).to eq(1_210_000)
      expect(result.dig(:newRegime, :marginalRelief)).to be > 0
      expect(result.dig(:newRegime, :taxAfterRebate)).to eq(10_000)
      expect(result.dig(:newRegime, :totalTax)).to eq(10_400) # 10,000 + 4% cess
    end

    it "recommends Old Regime when deductions exceed New Regime threshold advantage" do
      result = described_class.calculate_both_regimes(
        "fy" => "2024-25",
        "is_salaried" => true,
        "gross_salary" => 1_600_000,
        "hra_exemption" => 240_000,
        "home_loan_interest_24b" => 200_000,
        "sec_80c" => 150_000,
        "sec_80ccd_1b_nps" => 50_000,
        "sec_80d_health" => 75_000
      )

      expect(result.dig(:oldRegime, :totalTax)).to be < result.dig(:newRegime, :totalTax)
      expect(result[:recommendedRegime]).to eq("old")
      expect(result[:taxSavings]).to be > 0
    end

    it "computes surcharge brackets properly for high-income taxpayers" do
      result = described_class.calculate_both_regimes(
        "fy" => "2025-26",
        "is_salaried" => true,
        "gross_salary" => 60_000_000
      )

      expect(result.dig(:newRegime, :surcharge, :rate)).to eq(25)
      expect(result.dig(:oldRegime, :surcharge, :rate)).to eq(37)
    end
  end
end

