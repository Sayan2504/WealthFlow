# frozen_string_literal: true

module Calculations
  class RetirementCalculator
    PPF_LIMIT = 150_000

    def self.normalize_ppf_fy(date_str, raw_fy = nil)
      if raw_fy.present?
        match = raw_fy.to_s.match(/(\d{4})/)
        if match
          start_yr = match[1].to_i
          return "#{start_yr} - #{start_yr + 1}" if start_yr.between?(1990, 2100)
        end
      end

      if date_str.present?
        d = Date.parse(date_str.to_s) rescue nil
        if d
          start_yr = d.month >= 4 ? d.year : d.year - 1
          return "#{start_yr} - #{start_yr + 1}"
        end
      end

      "2026 - 2027"
    end

    def self.group_ppf_by_financial_year(contributions = [])
      map = {}

      (contributions || []).each do |c|
        item = c.deep_symbolize_keys
        fy = normalize_ppf_fy(item[:date], item[:fy])
        item[:fy] = fy
        amt = item[:amount].to_f

        map[fy] ||= {
          fy: fy,
          sort_year: fy.to_s.scan(/\d{4}/).first.to_i,
          total_amount: 0.0,
          entries: []
        }

        map[fy][:total_amount] += amt
        map[fy][:entries] << item
      end

      groups = map.values.sort_by { |g| g[:sort_year] }
      groups.each do |g|
        g[:total_amount] = g[:total_amount].round
        g[:entries].sort_by! { |e| e[:date].to_s }
        diff = PPF_LIMIT - g[:total_amount]
        g[:is_full] = diff <= 0
        g[:outstanding_from_limit] = [diff, 0].max
        g[:limit_status_label] = diff.positive? ? "₹#{diff.to_i.to_fs(:delimited)} lesser than the ₹1.5L limit" : "₹1.5L limit reached"
      end

      groups
    end
  end
end
