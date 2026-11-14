# frozen_string_literal: true

module RetirementFunds
  # Sovereign PPF FY limit tracking (₹1.5L cap) and EPF passbook summaries.
  class Calculator
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
        d = Core::FinancialMath.parse_date(date_str)
        if d
          start_yr = d.month >= 4 ? d.year : d.year - 1
          return "#{start_yr} - #{start_yr + 1}"
        end
      end

      "2026 - 2027"
    end

    def self.group_ppf_by_financial_year(contributions = [])
      map = {}

      Array(contributions).each do |c|
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
        g[:limit_status_label] = if diff.positive?
                                   "#{Core::CurrencyFormatter.format_inr(diff)} lesser than the ₹1.5L limit"
                                 else
                                   "₹1.5L limit reached"
                                 end
      end

      groups
    end

    def self.summarize(data)
      ppf_raw = (data[:ppf] || {}).with_indifferent_access
      ppf_groups = group_ppf_by_financial_year(ppf_raw[:contributions] || [])
      ppf_contributions = ppf_groups.sum { |g| g[:total_amount] }
      ppf_balance = ppf_raw[:current_balance].to_f.positive? ? ppf_raw[:current_balance].to_f : ppf_contributions
      ppf_interest = [0.0, ppf_balance - ppf_contributions].max
      ppf_rate = ppf_raw[:interest_rate].to_f.positive? ? ppf_raw[:interest_rate].to_f : 7.10
      latest_fy_total = ppf_groups.any? ? ppf_groups.last[:total_amount] : 0

      epf_raw = (data[:epf] || {}).with_indifferent_access
      epf_entries = Array(epf_raw[:entries]).map(&:with_indifferent_access)
      epf_sum = epf_entries.sum { |e| e[:employee].to_f + e[:employer].to_f + e[:interest].to_f }
      epf_balance = epf_sum.positive? ? epf_sum : epf_raw[:current_balance].to_f
      epf_rate = epf_raw[:interest_rate].to_f.positive? ? epf_raw[:interest_rate].to_f : 8.25

      {
        ppf: {
          contribution: ppf_contributions,
          balance: ppf_balance,
          interest: ppf_interest,
          rate: ppf_rate,
          latestFyTotal: latest_fy_total,
          fyGroups: ppf_groups
        },
        epf: {
          balance: epf_balance,
          rate: epf_rate
        }
      }
    end
  end
end

