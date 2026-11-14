# frozen_string_literal: true

module Market
  # Thin adapter delegating AMFI NAV and statutory registry calls to MarketData::AmfiClient.
  class AmfiService
    DEFAULT_AMFI_SCHEMES = MarketData::AmfiClient::DEFAULT_AMFI_SCHEMES
    STATUTORY_RETIREMENT_RATES = MarketData::AmfiClient::STATUTORY_RETIREMENT_RATES
    FD_DEFAULT_MATURITY = MarketData::AmfiClient::FD_DEFAULT_MATURITY
    RD_DEFAULT_MATURITY = MarketData::AmfiClient::RD_DEFAULT_MATURITY

    class << self
      delegate :search_schemes,
               :fetch_scheme_nav,
               :enrich_portfolio!,
               to: MarketData::AmfiClient
    end
  end
end
