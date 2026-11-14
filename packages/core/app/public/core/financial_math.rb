# frozen_string_literal: true

module Core
  # Shared compound interest, RBI short-tenure FD, RD/Flexi-RD, post-tax yield, and EMI formulas.
  class FinancialMath
    def self.compute_exact_duration(start_date, end_date)
      return { years: 0, months: 0, days: 0, total_months: 0, total_years: 0.0, text: "0 Yrs, 0 Mos, 0 Days" } if start_date.blank? || end_date.blank?

      s_date = parse_date(start_date)
      e_date = parse_date(end_date)
      return { years: 0, months: 0, days: 0, total_months: 0, total_years: 0.0, text: "0 Yrs, 0 Mos, 0 Days" } if s_date.nil? || e_date.nil? || e_date <= s_date

      years = e_date.year - s_date.year
      months = e_date.month - s_date.month
      days = e_date.day - s_date.day

      if days.negative?
        months -= 1
        prev_month_end = Date.new(e_date.year, e_date.month, 1) - 1.day
        days += prev_month_end.day
      end

      if months.negative?
        years -= 1
        months += 12
      end

      total_months = (years * 12) + months + (days / 30.0)
      total_years = years + (months / 12.0) + (days / 365.0)

      {
        years: years,
        months: months,
        days: days,
        total_months: [total_months.round, 1].max,
        total_years: total_years.round(4),
        text: "#{years} Yrs, #{months} Mos, #{days} Days"
      }
    end

    def self.compute_days_to_maturity(end_date_str)
      return { days_left: 0, label: "—", badge_class: "bg-slate-800 text-slate-400 border-slate-700" } if end_date_str.blank?

      end_date = parse_date(end_date_str)
      return { days_left: 0, label: "—", badge_class: "bg-slate-800 text-slate-400 border-slate-700" } if end_date.nil?

      diff_days = (end_date - Date.current).to_i

      if diff_days.negative?
        {
          days_left: diff_days,
          label: "Matured (#{diff_days.abs}d ago)",
          badge_class: "bg-emerald-950/90 text-emerald-300 border-emerald-700/60"
        }
      elsif diff_days.zero?
        {
          days_left: 0,
          label: "Matures Today!",
          badge_class: "bg-amber-950/90 text-amber-300 border-amber-700/60"
        }
      elsif diff_days <= 30
        {
          days_left: diff_days,
          label: "#{diff_days} Days Left",
          badge_class: "bg-amber-950/90 text-amber-300 border-amber-700/60"
        }
      else
        {
          days_left: diff_days,
          label: "#{diff_days} Days Left",
          badge_class: "bg-indigo-950/80 text-indigo-300 border-indigo-800/60"
        }
      end
    end

    def self.calculate_fd(principal:, rate:, start_date:, maturity_date:, custom_maturity_amount: nil, tax_rate: 0.30)
      p = [principal.to_f, 0.0].max
      r = [rate.to_f, 0.0].max / 100.0
      dur = compute_exact_duration(start_date, maturity_date)

      formula_maturity = 0
      if p.positive? && r.positive?
        s_date = parse_date(start_date)
        e_date = parse_date(maturity_date)
        exact_days = (s_date && e_date && e_date > s_date) ? (e_date - s_date).to_i : 0

        if exact_days.positive? && exact_days < 180
          formula_maturity = (p * (1.0 + r * (exact_days / 365.0))).round
        else
          bank_years = dur[:years] + (dur[:months] / 12.0) + (dur[:days] / 360.0)
          formula_maturity = (p * ((1.0 + r / 4.0)**(4.0 * bank_years))).round
        end
      end

      maturity = custom_maturity_amount.to_f.positive? ? custom_maturity_amount.to_f.round : formula_maturity
      gain = [maturity - p.round, 0].max
      countdown = compute_days_to_maturity(maturity_date)
      post_tax = calculate_post_tax_interest(gross_interest: gain, tax_slab: tax_rate)

      {
        principal: p.round,
        rate: rate.to_f,
        start_date: start_date,
        maturity_date: maturity_date,
        duration_text: dur[:text],
        days_left: countdown[:days_left],
        days_left_label: countdown[:label],
        days_left_badge_class: countdown[:badge_class],
        formula_maturity: formula_maturity,
        maturity: maturity,
        gain: gain,
        tax: post_tax[:estimated_tax],
        post_tax_gain: post_tax[:post_tax_interest],
        post_tax_yield: (rate.to_f * (1.0 - post_tax[:effective_tax_rate])).round(2)
      }
    end

    def self.calculate_rd(monthly_amount:, rate:, start_date:, end_date:, custom_maturity_amount: nil, tax_rate: 0.30)
      m = [monthly_amount.to_f, 0.0].max
      r = [rate.to_f, 0.0].max / 100.0
      dur = compute_exact_duration(start_date, end_date)
      n_months = [dur[:total_months], 1].max
      total_invested = (m * n_months).round

      formula_maturity = 0
      if m.positive? && r.positive?
        (1..n_months).each do |k|
          formula_maturity += m * ((1.0 + r / 4.0)**(4.0 * (k / 12.0)))
        end
      end
      formula_maturity = formula_maturity.round

      maturity = custom_maturity_amount.to_f.positive? ? custom_maturity_amount.to_f.round : formula_maturity
      gain = [maturity - total_invested, 0].max
      countdown = compute_days_to_maturity(end_date)
      post_tax = calculate_post_tax_interest(gross_interest: gain, tax_slab: tax_rate)

      {
        monthly_amount: m.round,
        rate: rate.to_f,
        start_date: start_date,
        end_date: end_date,
        n_months: n_months,
        duration_text: dur[:text],
        days_left: countdown[:days_left],
        days_left_label: countdown[:label],
        days_left_badge_class: countdown[:badge_class],
        total_invested: total_invested,
        formula_maturity: formula_maturity,
        maturity: maturity,
        gain: gain,
        tax: post_tax[:estimated_tax],
        post_tax_gain: post_tax[:post_tax_interest],
        post_tax_yield: (rate.to_f * (1.0 - post_tax[:effective_tax_rate])).round(2)
      }
    end

    def self.calculate_flexi_rd(base_monthly:, total_deposited: nil, rate:, start_date:, end_date:, custom_maturity_amount: nil, tax_rate: 0.30)
      base = [base_monthly.to_f, 0.0].max
      r = [rate.to_f, 0.0].max / 100.0
      dur = compute_exact_duration(start_date, end_date)
      n_months = [dur[:total_months], 1].max

      tot_dep = total_deposited.to_f.positive? ? total_deposited.to_f.round : (base * n_months).round
      avg_monthly = n_months.positive? ? (tot_dep.to_f / n_months) : base

      formula_maturity = 0
      if tot_dep.positive? && r.positive?
        (1..n_months).each do |k|
          formula_maturity += avg_monthly * ((1.0 + r / 4.0)**(4.0 * (k / 12.0)))
        end
      end
      formula_maturity = formula_maturity.round

      maturity = custom_maturity_amount.to_f.positive? ? custom_maturity_amount.to_f.round : formula_maturity
      gain = [maturity - tot_dep, 0].max
      countdown = compute_days_to_maturity(end_date)
      post_tax = calculate_post_tax_interest(gross_interest: gain, tax_slab: tax_rate)

      {
        base_monthly: base.round,
        total_deposited: tot_dep,
        rate: rate.to_f,
        start_date: start_date,
        end_date: end_date,
        n_months: n_months,
        duration_text: dur[:text],
        days_left: countdown[:days_left],
        days_left_label: countdown[:label],
        days_left_badge_class: countdown[:badge_class],
        formula_maturity: formula_maturity,
        maturity: maturity,
        gain: gain,
        tax: post_tax[:estimated_tax],
        post_tax_gain: post_tax[:post_tax_interest],
        post_tax_yield: (rate.to_f * (1.0 - post_tax[:effective_tax_rate])).round(2)
      }
    end

    def self.calculate_post_tax_interest(gross_interest:, tax_slab: 0.30)
      gross = [gross_interest.to_f, 0.0].max
      eff_rate = tax_slab.to_f.positive? ? (tax_slab.to_f * 1.04) : 0.0
      tax = (gross * eff_rate).round
      net = [gross - tax, 0.0].max
      {
        gross_interest: gross.round,
        tax_slab: tax_slab.to_f,
        effective_tax_rate: eff_rate.round(4),
        estimated_tax: tax,
        post_tax_interest: net.round
      }
    end

    def self.calculate_standard_emi(principal:, annual_rate:, tenure_years:)
      p = [principal.to_f, 0.0].max
      r = [annual_rate.to_f, 0.0].max / 100.0 / 12.0
      n = [tenure_years.to_f, 0.0].max * 12.0

      return 0 if p.zero? || r.zero? || n.zero?

      factor = (1.0 + r)**n
      ((p * r * factor) / (factor - 1.0)).round
    end

    def self.calculate_policy_status(end_date_str)
      return { days_to_expiry: 0, status: "PENDING" } if end_date_str.blank?

      end_date = parse_date(end_date_str)
      return { days_to_expiry: 0, status: "PENDING" } if end_date.nil?

      diff_days = (end_date - Date.current).to_i
      status = if diff_days <= 0
                 "EXPIRED"
               elsif diff_days <= 30
                 "DUE SOON"
               else
                 "OK"
               end

      { days_to_expiry: diff_days, status: status }
    end

    def self.parse_date(date_val)
      return nil if date_val.blank?
      return date_val if date_val.is_a?(Date)

      Date.parse(date_val.to_s)
    rescue Date::Error, ArgumentError
      nil
    end
  end
end

