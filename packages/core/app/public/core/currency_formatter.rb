# frozen_string_literal: true

module Core
  # Shared Indian currency, Lakh/Crore compact formatting, and DD/MM/YYYY date formatting.
  module CurrencyFormatter
    module_function

    def format_num(val, decimals = 0)
      n = val.to_f
      n = 0.0 if n.nan? || n.infinite?
      sign = n.negative? ? "-" : ""
      fixed = Kernel.format("%.#{decimals}f", n.abs)
      int_part, dec_part = fixed.split(".")

      if int_part.length > 3
        last_three = int_part[-3..]
        rest = int_part[0...-3].reverse.scan(/\d{1,2}/).join(",").reverse
        int_part = "#{rest},#{last_three}"
      end

      formatted = decimals.positive? ? "#{int_part}.#{dec_part}" : int_part
      "#{sign}#{formatted}"
    end

    def format_inr(val, decimals = 0)
      n = val.to_f
      n = 0.0 if n.nan? || n.infinite?
      sign = n.negative? ? "-" : ""
      "#{sign}₹#{format_num(n.abs, decimals)}"
    end

    def format_compact(val)
      raw = val.to_f
      raw = 0.0 if raw.nan? || raw.infinite?
      v = raw.abs
      sign = raw.negative? ? "-" : ""
      if v >= 10_000_000
        "#{sign}₹#{Kernel.format('%.2f', v / 10_000_000.0)} Cr"
      elsif v >= 100_000
        "#{sign}₹#{Kernel.format('%.2f', v / 100_000.0)} L"
      elsif v >= 1_000
        "#{sign}₹#{Kernel.format('%.1f', v / 1_000.0)} K"
      else
        "#{sign}₹#{v.round}"
      end
    end

    def format_date_dmy(iso_str, blank_fallback = "—")
      str = iso_str.to_s.strip
      return blank_fallback if str.empty? || str == "—"

      parts = str.split("-")
      return str unless parts.length == 3

      "#{parts[2]}/#{parts[1]}/#{parts[0]}"
    end
  end
end

