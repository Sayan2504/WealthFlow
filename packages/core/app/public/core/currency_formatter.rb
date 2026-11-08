# packages/core/app/public/core/currency_formatter.rb
# frozen_string_literal: true

module Core
  class CurrencyFormatter
    # Formats number using Indian Lakhs & Crores grouping system: ₹ 12,34,567.00
    def self.format_inr(amount, precision: 2, symbol: "₹")
      return "#{symbol} 0.00" if amount.nil?

      val = BigDecimal(amount.to_s)
      is_negative = val.negative?
      val = val.abs

      parts = sprintf("%.#{precision}f", val).split(".")
      integer_part = parts[0]
      decimal_part = parts[1]

      if integer_part.length > 3
        last_three = integer_part[-3..]
        remaining = integer_part[0...-3]
        formatted_remaining = remaining.reverse.gsub(/(\d{2})(?=\d)/, '\1,').reverse
        formatted_int = "#{formatted_remaining},#{last_three}"
      else
        formatted_int = integer_part
      end

      result = precision.positive? ? "#{formatted_int}.#{decimal_part}" : formatted_int
      prefix = is_negative ? "-#{symbol} " : "#{symbol} "
      "#{prefix}#{result}"
    end

    # Compact formatter: ₹12.5L or ₹1.4Cr
    def self.format_compact(amount, symbol: "₹")
      return "#{symbol}0" if amount.nil?

      val = BigDecimal(amount.to_s)
      is_negative = val.negative?
      val = val.abs

      formatted = if val >= 10_000_000
                    "#{(val / 10_000_000).round(2)} Cr"
                  elsif val >= 100_000
                    "#{(val / 100_000).round(2)} L"
                  elsif val >= 1_000
                    "#{(val / 1_000).round(1)} K"
                  else
                    val.round(0).to_s
                  end

      is_negative ? "-#{symbol}#{formatted}" : "#{symbol}#{formatted}"
    end
  end
end

