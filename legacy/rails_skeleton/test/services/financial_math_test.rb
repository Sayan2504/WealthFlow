# test/services/financial_math_test.rb
# frozen_string_literal: true

require "test_helper"

class FinancialMathTest < ActiveSupport::TestCase
  test "compound interest calculation matches quarterly schedule" do
    # 1 Lakh at 7.10% for 3 years quarterly compounded:
    # A = 100000 * (1 + 0.071/4)^(4*3) = 123472.03
    maturity = Core::FinancialMath.compound_interest(
      principal: 100_000,
      annual_rate_pct: 7.10,
      tenure_years: 3,
      compounding_frequency: 4
    )
    assert_in_delta 123_472.03, maturity.to_f, 1.0
  end

  test "CAGR calculation" do
    # 1 Lakh growing to 2 Lakh in 5 years: CAGR = (2)^(1/5) - 1 ≈ 14.87%
    cagr = Core::FinancialMath.cagr(
      beginning_value: 100_000,
      ending_value: 200_000,
      tenure_years: 5
    )
    assert_in_delta 14.87, cagr.to_f, 0.05
  end

  test "XIRR calculation using Newton Raphson" do
    # Cash flows: -10000 on Jan 1 2024, +11000 on Jan 1 2025 -> ~10%
    flows = [
      { date: Date.new(2024, 1, 1), amount: -10_000 },
      { date: Date.new(2025, 1, 1), amount: 11_000 }
    ]
    xirr = Core::FinancialMath.xirr(flows)
    assert_in_delta 10.0, xirr.to_f, 0.5
  end
end

