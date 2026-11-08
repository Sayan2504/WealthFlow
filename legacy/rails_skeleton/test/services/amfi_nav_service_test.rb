# test/services/amfi_nav_service_test.rb
# frozen_string_literal: true

require "test_helper"

class AmfiNavServiceTest < ActiveSupport::TestCase
  test "parses official AMFI pipe delimited format" do
    sample_amfi_data = <<~TEXT
      Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
      122639;INF846K01EW2;INF846K01EX0;Parag Parikh Flexi Cap Fund - Direct Plan - Growth;84.5210;06-Nov-2026
      118834;INF769K01EZ2;INF769K01FA3;Mirae Asset Large Cap Fund - Direct Plan - Growth;118.2430;06-Nov-2026
    TEXT

    entries = MutualFunds::AmfiNavService.parse_feed(sample_amfi_data)

    assert entries.key?("122639")
    entry = entries["122639"]
    assert_equal BigDecimal("84.5210"), entry[:nav]
    assert_equal Date.new(2026, 11, 6), entry[:date]
    assert_equal "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", entry[:scheme_name]
  end
end

