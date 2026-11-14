# frozen_string_literal: true

module Formatting
  # Thin adapter delegating formatting calls to Core::CurrencyFormatter.
  module IndianFormatter
    module_function

    def format_num(val, decimals = 0)
      Core::CurrencyFormatter.format_num(val, decimals)
    end

    def format_inr(val, decimals = 0)
      Core::CurrencyFormatter.format_inr(val, decimals)
    end

    def format_compact(val)
      Core::CurrencyFormatter.format_compact(val)
    end

    def format_date_dmy(iso_str, blank_fallback = "—")
      Core::CurrencyFormatter.format_date_dmy(iso_str, blank_fallback)
    end
  end
end
