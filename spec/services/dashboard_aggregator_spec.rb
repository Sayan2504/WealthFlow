# frozen_string_literal: true

require "rails_helper"

RSpec.describe Calculations::DashboardAggregator do
  let(:sample_data) do
    {
      mutual_funds: [
        { id: 1, scheme_name: "HDFC Nifty 50 Index Fund", current_value: 100_000, invested_amount: 80_000, sip_amount: 5_000 }
      ],
      fixed_deposits: [
        { id: 2, bank: "SBI", fd_no: "FD001", principal: 200_000, rate: 7.0, start_date: "2025-01-01", maturity_date: "2027-01-01", maturity_amount: 230_000 }
      ],
      recurring_deposits: [
        { id: 3, bank: "HDFC", rd_no: "RD001", monthly_amount: 5_000, rate: 6.5, start_date: "2026-01-01", end_date: "2027-01-01", maturity_amount: 62_000 }
      ],
      flexi_rds: [],
      ppf: { current_balance: 50_000, interest_rate: 7.1, contributions: [{ id: 10, date: "2026-06-01", amount: 40_000 }] },
      epf: { current_balance: 80_000, interest_rate: 8.25, entries: [] },
      ulip: { total_paid: 10_000, current_value: 12_000 },
      home_loan: { original_loan_amount: 1_000_000, outstanding_principal: 200_000, monthly_emi: 15_000, tenure_years: 10, interest_rate: 8.0 },
      health_insurance: [{ sum_insured: 500_000, annual_premium: 20_000 }],
      life_insurance: [],
      vehicle_insurance: [],
      home_loan_insurance: [],
      bank_accounts: [{ id: 4, bank_name: "SBI", current_balance: 30_000, interest_rate: 3.0 }],
      credit_cards: [{ id: 5, bank_name: "HDFC", card_name: "Millennia", credit_limit: 100_000, utilized_amount: 20_000, reward_points: 500 }],
      tax_profile: {}
    }
  end

  describe ".calculate_overview" do
    it "aggregates assets, liabilities, netWorth, netWorthWithoutRd, and postTax interest" do
      ov = described_class.calculate_overview(sample_data, slab_rate: 0.30)

      # Assets: 100k MF + 230k FD + 62k RD + 50k PPF + 80k EPF + 30k Bank = 552,000
      expect(ov[:totalAssets]).to eq(552_000.0)
      # Liabilities: 200k Home Loan + 20k Card = 220,000 -> Net Worth = 332,000
      expect(ov[:netWorth]).to eq(332_000.0)
      expect(ov[:netWorthWithoutRd]).to eq(270_000.0)

      # Gross Fixed Income gain: (230k - 200k) FD + (62k - 60k) RD = 32,000
      expect(ov.dig(:postTax, :totalGrossGain)).to eq(32_000)
      # At 30% + 4% cess => 31.2% effective => tax = 9,984; post-tax = 22,016
      expect(ov.dig(:postTax, :estimatedTax)).to eq(9_984)
      expect(ov.dig(:postTax, :postTaxGain)).to eq(22_016)
    end

    it "computes lower tax deduction under 10% slab" do
      ov = described_class.calculate_overview(sample_data, slab_rate: 0.10)
      expect(ov.dig(:postTax, :effectiveTaxRate)).to be_within(0.0001).of(0.104)
      expect(ov.dig(:postTax, :estimatedTax)).to eq(3_328)
      expect(ov.dig(:postTax, :postTaxGain)).to eq(28_672)
    end
  end

  describe ".calculate_credit_card_metrics" do
    it "classifies utilization bands accurately" do
      optimal = described_class.calculate_credit_card_metrics(credit_limit: 100_000, utilized_amount: 15_000)
      moderate = described_class.calculate_credit_card_metrics(credit_limit: 100_000, utilized_amount: 45_000)
      high = described_class.calculate_credit_card_metrics(credit_limit: 100_000, utilized_amount: 85_000)

      expect(optimal[:statusLabel]).to eq("Optimal")
      expect(moderate[:statusLabel]).to eq("Moderate")
      expect(high[:statusLabel]).to eq("High Utilization")
    end
  end
end

