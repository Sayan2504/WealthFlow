# frozen_string_literal: true

module FixedIncome
  # Encapsulates FD, RD, Flexi RD, and Post-Tax Income slab analytics.
  class Calculator
    def self.summarize(data, slab_rate: 0.30)
      slab = slab_rate.to_f
      fds = Array(data[:fixed_deposits]).map(&:with_indifferent_access)
      rds = Array(data[:recurring_deposits]).map(&:with_indifferent_access)
      frds = Array(data[:flexi_rds]).map(&:with_indifferent_access)

      fd_rows = {}
      fd_principal = 0
      fd_maturity = 0
      fd_rate_sum = 0.0
      next_fd_maturity = nil

      fds.each do |fd|
        c = Core::FinancialMath.calculate_fd(
          principal: fd[:principal],
          rate: fd[:rate],
          start_date: fd[:start_date],
          maturity_date: fd[:maturity_date],
          custom_maturity_amount: fd[:maturity_amount],
          tax_rate: slab
        )
        fd_principal += c[:principal]
        fd_maturity += c[:maturity]
        fd_rate_sum += c[:rate]
        fd_rows["fd-#{fd[:id]}"] = formatted_row(c)

        mat_d = Core::FinancialMath.parse_date(fd[:maturity_date])
        next_d = Core::FinancialMath.parse_date(next_fd_maturity)
        next_fd_maturity = fd[:maturity_date] if mat_d && (next_d.nil? || mat_d < next_d)
      end

      rd_rows = {}
      rd_monthly = 0
      rd_invested = 0
      rd_maturity = 0
      total_rd_months = 0
      last_rd_end = nil

      rds.each do |rd|
        c = Core::FinancialMath.calculate_rd(
          monthly_amount: rd[:monthly_amount],
          rate: rd[:rate],
          start_date: rd[:start_date],
          end_date: rd[:end_date],
          custom_maturity_amount: rd[:maturity_amount],
          tax_rate: slab
        )
        rd_monthly += c[:monthly_amount]
        rd_invested += c[:total_invested]
        rd_maturity += c[:maturity]
        total_rd_months += c[:n_months]
        rd_rows["rd-#{rd[:id]}"] = formatted_row(c)

        end_d = Core::FinancialMath.parse_date(rd[:end_date])
        last_d = Core::FinancialMath.parse_date(last_rd_end)
        last_rd_end = rd[:end_date] if end_d && (last_d.nil? || end_d > last_d)
      end

      frd_rows = {}
      frd_base = 0
      frd_deposited = 0
      frd_maturity = 0

      frds.each do |frd|
        c = Core::FinancialMath.calculate_flexi_rd(
          base_monthly: frd[:base_monthly],
          total_deposited: frd[:total_deposited],
          rate: frd[:rate],
          start_date: frd[:start_date],
          end_date: frd[:end_date],
          custom_maturity_amount: frd[:maturity_amount],
          tax_rate: slab
        )
        frd_base += c[:base_monthly]
        frd_deposited += c[:total_deposited]
        frd_maturity += c[:maturity]
        frd_rows["frd-#{frd[:id]}"] = formatted_row(c)
      end

      fd_gain = [0, fd_maturity - fd_principal].max
      rd_gain = [0, rd_maturity - rd_invested].max
      frd_gain = [0, frd_maturity - frd_deposited].max
      fd_avg_rate = fds.any? ? (fd_rate_sum / fds.size) : 0.0

      total_gross_gain = fd_gain + rd_gain + frd_gain
      pt = Core::FinancialMath.calculate_post_tax_interest(gross_interest: total_gross_gain, tax_slab: slab)
      post_tax_yield = (fd_avg_rate * (1.0 - pt[:effective_tax_rate])).round(2)

      {
        fd: { principal: fd_principal, maturity: fd_maturity, gain: fd_gain, avgRate: fd_avg_rate, nextMaturity: next_fd_maturity || "—", count: fds.size },
        rd: { monthly: rd_monthly, invested: rd_invested, maturity: rd_maturity, gain: rd_gain, lastEndDate: last_rd_end || "—", totalMonths: total_rd_months, count: rds.size },
        flexiRd: { count: frds.size, baseMonthly: frd_base, invested: frd_deposited, maturity: frd_maturity, gain: frd_gain },
        postTax: {
          slabRate: slab,
          effectiveTaxRate: pt[:effective_tax_rate],
          effectiveTaxPct: Kernel.format("%.2f", pt[:effective_tax_rate] * 100.0),
          totalGrossGain: total_gross_gain,
          totalGrossGainInr: Core::CurrencyFormatter.format_inr(total_gross_gain),
          estimatedTax: pt[:estimated_tax],
          estimatedTaxInr: Core::CurrencyFormatter.format_inr(pt[:estimated_tax]),
          postTaxGain: pt[:post_tax_interest],
          postTaxGainInr: Core::CurrencyFormatter.format_inr(pt[:post_tax_interest]),
          postTaxYield: post_tax_yield,
          postTaxYieldPct: "#{Kernel.format('%.2f', post_tax_yield)}%"
        },
        rows: fd_rows.merge(rd_rows).merge(frd_rows)
      }
    end

    def self.preview_deposit(type:, params:, slab_rate: 0.30)
      p = (params || {}).with_indifferent_access
      slab = slab_rate.to_f

      result = case type.to_s
               when "fd"
                 c = Core::FinancialMath.calculate_fd(
                   principal: p[:principal],
                   rate: p[:rate],
                   start_date: p[:start_date],
                   maturity_date: p[:maturity_date],
                   custom_maturity_amount: p[:maturity_amount],
                   tax_rate: slab
                 )
                 { invested: c[:principal], maturity: c[:maturity], gain: c[:gain], tax: c[:tax], post_tax_gain: c[:post_tax_gain], duration_text: c[:duration_text] }
               when "rd"
                 c = Core::FinancialMath.calculate_rd(
                   monthly_amount: p[:monthly_amount],
                   rate: p[:rate],
                   start_date: p[:start_date],
                   end_date: p[:end_date],
                   custom_maturity_amount: p[:maturity_amount],
                   tax_rate: slab
                 )
                 { invested: c[:total_invested], maturity: c[:maturity], gain: c[:gain], tax: c[:tax], post_tax_gain: c[:post_tax_gain], duration_text: c[:duration_text] }
               when "flexi_rd"
                 c = Core::FinancialMath.calculate_flexi_rd(
                   base_monthly: p[:base_monthly],
                   total_deposited: p[:total_deposited],
                   rate: p[:rate],
                   start_date: p[:start_date],
                   end_date: p[:end_date],
                   custom_maturity_amount: p[:maturity_amount],
                   tax_rate: slab
                 )
                 { invested: c[:total_deposited], maturity: c[:maturity], gain: c[:gain], tax: c[:tax], post_tax_gain: c[:post_tax_gain], duration_text: c[:duration_text] }
               else
                 { invested: 0, maturity: 0, gain: 0, tax: 0, post_tax_gain: 0, duration_text: "—" }
               end

      result.merge(
        invested_inr: Core::CurrencyFormatter.format_inr(result[:invested]),
        maturity_inr: Core::CurrencyFormatter.format_inr(result[:maturity]),
        gain_inr: Core::CurrencyFormatter.format_inr(result[:gain]),
        tax_inr: Core::CurrencyFormatter.format_inr(result[:tax]),
        post_tax_gain_inr: Core::CurrencyFormatter.format_inr(result[:post_tax_gain])
      )
    end

    def self.formatted_row(calc)
      {
        gain: calc[:gain],
        tax: calc[:tax],
        post_tax_gain: calc[:post_tax_gain],
        post_tax_yield: calc[:post_tax_yield],
        post_tax_gain_inr: Core::CurrencyFormatter.format_inr(calc[:post_tax_gain]),
        tax_inr: Core::CurrencyFormatter.format_inr(calc[:tax]),
        post_tax_yield_pct: "#{Kernel.format('%.2f', calc[:post_tax_yield])}%"
      }
    end
  end
end

