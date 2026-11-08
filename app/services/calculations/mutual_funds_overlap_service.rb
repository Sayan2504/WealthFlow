# frozen_string_literal: true

module Calculations
  class MutualFundsOverlapService
    # Curated official/sample portfolio holdings of standard Indian Mutual Funds
    # Enables holding breakdown and pairwise stock overlap matrix
    FUND_HOLDINGS_CATALOG = {
      "119788" => [ # SBI Gold
        { stock: "Physical Gold 99.5% Purity", ticker: "GOLD995", sector: "Precious Metals", weight: 98.4 },
        { stock: "TREPS / Cash Equivalents", ticker: "TREPS", sector: "Cash / Money Market", weight: 1.6 }
      ],
      "119063" => [ # HDFC Nifty 50 Index Fund
        { stock: "HDFC Bank Ltd", ticker: "HDFCBANK", sector: "Financial Services", weight: 11.2 },
        { stock: "Reliance Industries Ltd", ticker: "RELIANCE", sector: "Energy & Petrochem", weight: 9.8 },
        { stock: "ICICI Bank Ltd", ticker: "ICICIBANK", sector: "Financial Services", weight: 7.9 },
        { stock: "Infosys Ltd", ticker: "INFY", sector: "Information Technology", weight: 6.1 },
        { stock: "Tata Consultancy Services", ticker: "TCS", sector: "Information Technology", weight: 4.2 },
        { stock: "Larsen & Toubro Ltd", ticker: "LT", sector: "Construction", weight: 4.1 },
        { stock: "ITC Ltd", ticker: "ITC", sector: "FMCG", weight: 3.8 },
        { stock: "Bharti Airtel Ltd", ticker: "BHARTIARTL", sector: "Telecommunication", weight: 3.5 },
        { stock: "State Bank of India", ticker: "SBIN", sector: "Financial Services", weight: 3.1 },
        { stock: "Axis Bank Ltd", ticker: "AXISBANK", sector: "Financial Services", weight: 2.9 }
      ],
      "122639" => [ # Parag Parikh Flexi Cap Fund
        { stock: "HDFC Bank Ltd", ticker: "HDFCBANK", sector: "Financial Services", weight: 8.2 },
        { stock: "Power Grid Corp of India", ticker: "POWERGRID", sector: "Utilities", weight: 6.4 },
        { stock: "Bajaj Holdings & Investment", ticker: "BAJAJHLDNG", sector: "Financial Services", weight: 6.1 },
        { stock: "ITC Ltd", ticker: "ITC", sector: "FMCG", weight: 5.9 },
        { stock: "Coal India Ltd", ticker: "COALINDIA", sector: "Metals & Mining", weight: 5.4 },
        { stock: "Alphabet Inc (Google)", ticker: "GOOGL", sector: "Tech & Media", weight: 4.8 },
        { stock: "Microsoft Corporation", ticker: "MSFT", sector: "Software & Cloud", weight: 4.5 },
        { stock: "ICICI Bank Ltd", ticker: "ICICIBANK", sector: "Financial Services", weight: 4.4 },
        { stock: "Meta Platforms Inc", ticker: "META", sector: "Digital Media", weight: 3.8 },
        { stock: "HCL Technologies Ltd", ticker: "HCLTECH", sector: "Information Technology", weight: 3.5 }
      ],
      "127042" => [ # Motilal Oswal Midcap Fund
        { stock: "Jio Financial Services Ltd", ticker: "JIOFIN", sector: "Financial Services", weight: 7.8 },
        { stock: "Persistent Systems Ltd", ticker: "PERSISTENT", sector: "Information Technology", weight: 6.9 },
        { stock: "Coforge Ltd", ticker: "COFORGE", sector: "Information Technology", weight: 6.4 },
        { stock: "Dixon Technologies Ltd", ticker: "DIXON", sector: "Consumer Durables", weight: 5.8 },
        { stock: "Tube Investments of India", ticker: "TIINDIA", sector: "Auto Components", weight: 5.1 },
        { stock: "Vodafone Idea Ltd", ticker: "IDEA", sector: "Telecommunication", weight: 4.2 },
        { stock: "Kalyan Jewellers Ltd", ticker: "KALYANKJIL", sector: "Retail & Consumer", weight: 4.0 },
        { stock: "Federal Bank Ltd", ticker: "FEDERALBNK", sector: "Financial Services", weight: 3.7 }
      ],
      "120828" => [ # Quant Small Cap Fund
        { stock: "Reliance Industries Ltd", ticker: "RELIANCE", sector: "Energy & Petrochem", weight: 8.9 },
        { stock: "Jio Financial Services Ltd", ticker: "JIOFIN", sector: "Financial Services", weight: 7.4 },
        { stock: "HDFC Bank Ltd", ticker: "HDFCBANK", sector: "Financial Services", weight: 6.2 },
        { stock: "Bikaji Foods International", ticker: "BIKAJI", sector: "FMCG", weight: 4.9 },
        { stock: "Arvind Ltd", ticker: "ARVIND", sector: "Textiles", weight: 4.1 },
        { stock: "Aegis Logistics Ltd", ticker: "AEGISCHEM", sector: "Oil & Gas Logistics", weight: 3.8 }
      ],
      "120186" => [ # ICICI Prudential US Bluechip
        { stock: "Microsoft Corporation", ticker: "MSFT", sector: "Software & Cloud", weight: 9.4 },
        { stock: "Apple Inc", ticker: "AAPL", sector: "Technology Hardware", weight: 8.9 },
        { stock: "NVIDIA Corporation", ticker: "NVDA", sector: "Semiconductors", weight: 8.1 },
        { stock: "Amazon.com Inc", ticker: "AMZN", sector: "E-Commerce & Cloud", weight: 6.8 },
        { stock: "Alphabet Inc (Google)", ticker: "GOOGL", sector: "Tech & Media", weight: 6.4 },
        { stock: "Meta Platforms Inc", ticker: "META", sector: "Digital Media", weight: 5.1 }
      ]
    }.freeze

    def self.holdings_for(scheme_code)
      FUND_HOLDINGS_CATALOG[scheme_code.to_s] || default_holdings_for_unknown
    end

    def self.calculate_pairwise_overlap(fund_a_code, fund_b_code)
      holdings_a = holdings_for(fund_a_code)
      holdings_b = holdings_for(fund_b_code)

      map_a = holdings_a.index_by { |h| h[:ticker] }
      overlap_pct = 0.0
      common_stocks = []

      holdings_b.each do |b|
        ticker = b[:ticker]
        if map_a.key?(ticker)
          a_weight = map_a[ticker][:weight]
          b_weight = b[:weight]
          min_weight = [a_weight, b_weight].min
          overlap_pct += min_weight
          common_stocks << {
            stock: b[:stock],
            ticker: ticker,
            sector: b[:sector],
            fund_a_weight: a_weight,
            fund_b_weight: b_weight,
            overlap_weight: min_weight.round(2)
          }
        end
      end

      {
        overlap_percentage: overlap_pct.round(2),
        common_stocks_count: common_stocks.size,
        common_stocks: common_stocks.sort_by { |x| -x[:overlap_weight] }
      }
    end

    def self.portfolio_aggregate_holdings(funds = [])
      total_current_val = funds.sum { |f| f[:current_value].to_f }
      return [] if total_current_val.zero?

      stock_map = {}

      funds.each do |f|
        fund_val = f[:current_value].to_f
        next if fund_val.zero?

        fund_weight_in_portfolio = fund_val / total_current_val
        holdings = holdings_for(f[:scheme_code])

        holdings.each do |h|
          ticker = h[:ticker]
          stock_map[ticker] ||= {
            stock: h[:stock],
            ticker: ticker,
            sector: h[:sector],
            effective_portfolio_weight: 0.0,
            present_in_funds: []
          }
          stock_weight_in_fund = h[:weight].to_f / 100.0
          effective_contrib = fund_weight_in_portfolio * stock_weight_in_fund * 100.0

          stock_map[ticker][:effective_portfolio_weight] += effective_contrib
          stock_map[ticker][:present_in_funds] << {
            fund_name: f[:scheme_name],
            scheme_code: f[:scheme_code],
            weight_in_fund: h[:weight]
          }
        end
      end

      stock_map.values.each do |s|
        s[:effective_portfolio_weight] = s[:effective_portfolio_weight].round(2)
      end.sort_by { |s| -s[:effective_portfolio_weight] }
    end

    def self.default_holdings_for_unknown
      [
        { stock: "Top Holding 1 (Large Cap)", ticker: "TOP1", sector: "Financial Services", weight: 8.5 },
        { stock: "Top Holding 2 (Energy)", ticker: "TOP2", sector: "Energy", weight: 7.2 },
        { stock: "Top Holding 3 (Technology)", ticker: "TOP3", sector: "Information Technology", weight: 6.8 },
        { stock: "Top Holding 4 (FMCG)", ticker: "TOP4", sector: "FMCG", weight: 5.5 },
        { stock: "Other Holdings & Liquidity", ticker: "OTHER", sector: "Diversified", weight: 72.0 }
      ]
    end
  end
end

