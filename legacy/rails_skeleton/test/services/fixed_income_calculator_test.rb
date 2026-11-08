# test/services/fixed_income_calculator_test.rb
# frozen_string_literal: true

require "test_helper"

class FixedIncomeCalculatorTest < ActiveSupport::TestCase
  test "FD maturity amount calculation" do
    maturity = FixedIncome::FdCalculator.maturity_amount(
      principal: 200_000,
      annual_rate: 7.10,
      tenure_months: 36
    )
    assert maturity > 200_000
    assert_in_delta 246_944.06, maturity.to_f, 2.0
  end

  test "RD maturity amount calculation" do
    maturity = FixedIncome::RdCalculator.maturity_amount(
      monthly_installment: 10_000,
      annual_rate: 7.00,
      tenure_months: 36
    )
    invested = FixedIncome::RdCalculator.total_invested(
      monthly_installment: 10_000,
      tenure_months: 36
    )
    assert_equal 360_000.0, invested.to_f
    assert maturity > invested
  end
end

