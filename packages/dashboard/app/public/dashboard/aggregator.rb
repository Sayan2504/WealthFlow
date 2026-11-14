# frozen_string_literal: true

module Dashboard
  # Top-level Net Worth and multi-module financial overview aggregator composed from domain packages.
  class Aggregator
    def self.calculate_overview(data, slab_rate: 0.30)
      d = (data || {}).with_indifferent_access

      mf = summarize_mutual_funds(d)
      fi = summarize_fixed_income(d, slab_rate: slab_rate)
      ret = summarize_retirement(d)
      health = summarize_policy_group(d[:health_insurance])
      life = summarize_policy_group(d[:life_insurance])
      vehicle = summarize_policy_group(d[:vehicle_insurance])
      home_loan_ins = summarize_policy_group(d[:home_loan_insurance])

      ulip_raw = d[:ulip] || {}
      ulip_paid = ulip_raw[:total_paid].to_f
      ulip_val = ulip_raw[:current_value].to_f
      ulip = { paid: ulip_paid, value: ulip_val, gain: ulip_val - ulip_paid }

      home_loan = summarize_home_loan(d)
      banking = summarize_banking(d)
      tax_calc = TaxPlanning::RegimeComparator.calculate_both_regimes(d[:tax_profile], d)

      fd = fi[:fd]
      rd = fi[:rd]
      flexi_rd = fi[:flexiRd]
      ppf = ret[:ppf]
      epf = ret[:epf]

      total_assets = mf[:current] + fd[:maturity] + rd[:maturity] + flexi_rd[:maturity] +
                     epf[:balance] + ppf[:balance] + banking[:accounts][:totalBalance]
      total_invested = mf[:invested] + fd[:principal] + rd[:invested] + flexi_rd[:invested] +
                       epf[:balance] + ppf[:contribution] + banking[:accounts][:totalBalance]
      total_gain = mf[:gain] + fd[:gain] + rd[:gain] + flexi_rd[:gain] +
                   ppf[:interest] + banking[:accounts][:annualInterest]
      net_worth = total_assets - home_loan[:outstanding_principal] - banking[:cards][:totalUtilized]
      net_worth_without_rd = net_worth - rd[:maturity] - flexi_rd[:maturity]

      fi_total = fd[:maturity] + rd[:maturity] + flexi_rd[:maturity]
      ret_total = ppf[:balance] + epf[:balance]
      mf_pct = total_assets.positive? ? ((mf[:current] / total_assets) * 100.0).round : 0
      fi_pct = total_assets.positive? ? ((fi_total / total_assets) * 100.0).round : 0
      ret_pct = total_assets.positive? ? [0, 100 - (mf_pct + fi_pct)].max : 0
      liabilities_total = home_loan[:outstanding_principal] + banking[:cards][:totalUtilized]

      fy_ppf = ppf[:latestFyTotal] || 0
      utilized_80c = [150_000, fy_ppf + (ulip[:paid].positive? ? [150_000, ulip[:paid]].min : 0)].min
      pct_80c = ((utilized_80c / 150_000.0) * 100.0).round
      utilized_80d = [50_000, health[:premium]].min
      pct_80d = ((utilized_80d / 50_000.0) * 100.0).round
      total_tax_saved = ((utilized_80c + utilized_80d) * 0.312).round

      graphs = build_wealth_graphs(
        data: d,
        mf: mf,
        ppf: ppf,
        epf: epf,
        fi_total: fi_total,
        bank_total: banking[:accounts][:totalBalance],
        home_loan: home_loan,
        total_assets: total_assets,
        total_invested: total_invested,
        total_gain: total_gain,
        total_liabilities: liabilities_total,
        net_worth: net_worth
      )

      {
        mf: mf,
        fd: fd,
        rd: rd,
        flexiRd: flexi_rd,
        postTax: fi[:postTax],
        ppf: ppf,
        epf: epf,
        ulip: ulip,
        homeLoan: home_loan,
        netWorth: net_worth,
        netWorthWithoutRd: net_worth_without_rd,
        totalAssets: total_assets,
        totalInvested: total_invested,
        totalGain: total_gain,
        totalLiabilities: liabilities_total,
        allocation: { mfPct: mf_pct, fiPct: fi_pct, retPct: ret_pct, fiTotal: fi_total, retTotal: ret_total },
        tax: { utilized80C: utilized_80c, pct80C: pct_80c, utilized80D: utilized_80d, pct80D: pct_80d, totalTaxSaved: total_tax_saved },
        health: health,
        life: life,
        vehicle: vehicle,
        homeLoanIns: home_loan_ins,
        banking: banking,
        taxCalc: tax_calc,
        graphs: graphs
      }.with_indifferent_access
    end

    def self.compute_overview(data, slab_rate = 0.30, annual_income: 1_800_000)
      d = (data || {}).with_indifferent_access
      slab = slab_rate.to_f

      mf_summary = MutualFunds::Analytics.summarize(d[:mutual_funds])
      fi_summary = FixedIncome::Calculator.summarize(d, slab_rate: slab)
      ret_summary = RetirementFunds::Calculator.summarize(d)
      health_summary = HealthInsurance::Analyzer.summarize(d[:health_insurance])
      life_summary = LifeInsurance::AdequacyCalculator.summarize(d[:life_insurance], d[:ulip], annual_income: annual_income)
      vehicle_summary = summarize_policy_group(d[:vehicle_insurance])
      hl_ins_summary = summarize_policy_group(d[:home_loan_insurance])
      hl_summary = HomeLoan::EmiCalculator.summarize(d[:home_loan])
      banking_summary = Banking::SummaryService.summarize(d)

      total_assets = banking_summary[:accounts][:totalBalance] +
                     mf_summary[:current] +
                     fi_summary[:fd][:principal] +
                     fi_summary[:rd][:invested] +
                     fi_summary[:flexiRd][:invested] +
                     ret_summary[:ppf][:balance] +
                     ret_summary[:epf][:balance] +
                     life_summary[:ulipValue]
      total_liabilities = hl_summary[:outstanding_principal] + banking_summary[:cards][:totalUtilized]
      net_worth = total_assets - total_liabilities

      all_policies = Array(d[:health_insurance]) +
                     Array(d[:life_insurance]) +
                     Array(d[:vehicle_insurance]) +
                     Array(d[:home_loan_insurance])
      expiring_policies_count = all_policies.count do |p|
        %w[EXPIRED DUE\ SOON].include?(Core::FinancialMath.calculate_policy_status(p[:end_date])[:status])
      end

      total_coverage = health_summary[:sumInsured] + life_summary[:sumInsured] + vehicle_summary[:sumInsured] + hl_ins_summary[:sumInsured]
      total_annual_premiums = health_summary[:premium] + life_summary[:premium] + vehicle_summary[:premium] + hl_ins_summary[:premium]

      mf_current = mf_summary[:current]
      fi_total = fi_summary[:fd][:principal] + fi_summary[:rd][:invested] + fi_summary[:flexiRd][:invested]
      ret_total = ret_summary[:ppf][:balance] + ret_summary[:epf][:balance] + life_summary[:ulipValue]
      bank_total = banking_summary[:accounts][:totalBalance]
      denom = total_assets.positive? ? total_assets : 1.0

      allocation = [
        { label: "Mutual Funds", value: mf_current.round, pct: ((mf_current / denom) * 100.0).round(1), color: "indigo" },
        { label: "Fixed Income", value: fi_total.round, pct: ((fi_total / denom) * 100.0).round(1), color: "cyan" },
        { label: "Retirement & ULIP", value: ret_total.round, pct: ((ret_total / denom) * 100.0).round(1), color: "emerald" },
        { label: "Liquid Banking", value: bank_total.round, pct: ((bank_total / denom) * 100.0).round(1), color: "amber" }
      ]

      tax_calc = TaxPlanning::RegimeComparator.calculate_both_regimes(d[:tax_profile], d)
      ret = summarize_retirement(d)
      graphs = build_wealth_graphs(
        data: d,
        mf: mf_summary,
        ppf: ret[:ppf],
        epf: ret[:epf],
        fi_total: fi_total,
        bank_total: bank_total,
        home_loan: hl_summary,
        total_assets: total_assets,
        total_invested: mf_summary[:invested] + fi_total + ret[:ppf][:contribution] + ret[:epf][:contribution].to_f + bank_total,
        total_gain: mf_summary[:gain] + fi_summary[:postTax][:totalGrossGain] + ret[:ppf][:interest] + ret[:epf][:interest].to_f,
        total_liabilities: total_liabilities,
        net_worth: net_worth
      )

      {
        netWorth: net_worth.round,
        totalAssets: total_assets.round,
        totalLiabilities: total_liabilities.round,
        allocation: allocation,
        mf: mf_summary,
        fd: fi_summary[:fd],
        rd: fi_summary[:rd],
        flexiRd: fi_summary[:flexiRd],
        postTax: fi_summary[:postTax],
        fiRows: fi_summary[:rows],
        ppf: ret_summary[:ppf],
        epf: ret_summary[:epf],
        ulip: { paid: life_summary[:ulipPaid], value: life_summary[:ulipValue], gain: life_summary[:ulipGain] },
        homeLoan: hl_summary,
        insurance: {
          health: health_summary.slice(:sumInsured, :premium, :count),
          life: life_summary.slice(:sumInsured, :premium, :count),
          vehicle: vehicle_summary,
          homeLoan: hl_ins_summary,
          totalCoverage: total_coverage,
          totalAnnualPremium: total_annual_premiums,
          expiringCount: expiring_policies_count
        },
        banking: banking_summary,
        taxCalc: tax_calc,
        graphs: graphs
      }.with_indifferent_access
    end

    def self.summarize_mutual_funds(data)
      funds = Array(data[:mutual_funds])
      current = funds.sum { |mf| mf[:current_value].to_f }
      invested = funds.sum { |mf| mf[:invested_amount].to_f }
      sip = funds.sum { |mf| mf[:sip_amount].to_f }
      gain = current - invested
      gain_pct = invested.positive? ? (gain / invested) * 100.0 : 0.0
      { current: current, invested: invested, sip: sip, gain: gain, gainPct: gain_pct }
    end

    def self.summarize_fixed_income(data, slab_rate: 0.30)
      fds = Array(data[:fixed_deposits])
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
          tax_rate: slab_rate
        )
        fd_principal += c[:principal]
        fd_maturity += c[:maturity]
        fd_rate_sum += c[:rate]

        mat_d = Core::FinancialMath.parse_date(fd[:maturity_date])
        next_d = Core::FinancialMath.parse_date(next_fd_maturity)
        next_fd_maturity = fd[:maturity_date] if mat_d && (next_d.nil? || mat_d < next_d)
      end

      fd_gain = [0, fd_maturity - fd_principal].max
      fd_avg_rate = fds.any? ? (fd_rate_sum / fds.size) : 0.0

      rds = Array(data[:recurring_deposits])
      rd_monthly = 0
      rd_invested = 0
      rd_maturity = 0
      last_rd_end = nil
      total_rd_months = 0

      rds.each do |rd|
        c = Core::FinancialMath.calculate_rd(
          monthly_amount: rd[:monthly_amount],
          rate: rd[:rate],
          start_date: rd[:start_date],
          end_date: rd[:end_date],
          custom_maturity_amount: rd[:maturity_amount],
          tax_rate: slab_rate
        )
        rd_monthly += c[:monthly_amount]
        rd_invested += c[:total_invested]
        rd_maturity += c[:maturity]
        total_rd_months += c[:n_months]

        end_d = Core::FinancialMath.parse_date(rd[:end_date])
        last_d = Core::FinancialMath.parse_date(last_rd_end)
        last_rd_end = rd[:end_date] if end_d && (last_d.nil? || end_d > last_d)
      end

      rd_gain = [0, rd_maturity - rd_invested].max

      frds = Array(data[:flexi_rds])
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
          tax_rate: slab_rate
        )
        frd_base += c[:base_monthly]
        frd_deposited += c[:total_deposited]
        frd_maturity += c[:maturity]
      end

      frd_gain = [0, frd_maturity - frd_deposited].max

      total_gross_gain = fd_gain + rd_gain + frd_gain
      pt = Core::FinancialMath.calculate_post_tax_interest(gross_interest: total_gross_gain, tax_slab: slab_rate)
      post_tax_yield = (fd_avg_rate * (1.0 - pt[:effective_tax_rate])).round(2)

      {
        fd: { principal: fd_principal, maturity: fd_maturity, gain: fd_gain, avgRate: fd_avg_rate, nextMaturity: next_fd_maturity || "—", count: fds.size },
        rd: { monthly: rd_monthly, invested: rd_invested, maturity: rd_maturity, gain: rd_gain, lastEndDate: last_rd_end || "—", totalMonths: total_rd_months, count: rds.size },
        flexiRd: { count: frds.size, baseMonthly: frd_base, invested: frd_deposited, maturity: frd_maturity, gain: frd_gain },
        postTax: {
          slabRate: slab_rate,
          effectiveTaxRate: pt[:effective_tax_rate],
          totalGrossGain: total_gross_gain,
          estimatedTax: pt[:estimated_tax],
          postTaxGain: pt[:post_tax_interest],
          postTaxYield: post_tax_yield
        }
      }
    end

    def self.summarize_retirement(data)
      ppf_raw = data[:ppf] || {}
      ppf_groups = RetirementFunds::Calculator.group_ppf_by_financial_year(ppf_raw[:contributions] || [])
      ppf_contributions = ppf_groups.sum { |g| g[:total_amount] }
      ppf_balance = ppf_raw[:current_balance].to_f.positive? ? ppf_raw[:current_balance].to_f : ppf_contributions
      ppf_interest = [0.0, ppf_balance - ppf_contributions].max
      ppf_rate = ppf_raw[:interest_rate].to_f.positive? ? ppf_raw[:interest_rate].to_f : 7.10
      latest_fy_total = ppf_groups.any? ? ppf_groups.last[:total_amount] : 0

      epf_raw = data[:epf] || {}
      epf_entries = Array(epf_raw[:entries])
      epf_contrib = epf_entries.sum { |e| e[:employee].to_f + e[:employer].to_f }
      epf_interest = epf_entries.sum { |e| e[:interest].to_f }
      epf_sum = epf_contrib + epf_interest
      epf_balance = epf_sum.positive? ? epf_sum : epf_raw[:current_balance].to_f
      epf_contrib = epf_balance if epf_entries.empty? && epf_contrib.zero?
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
          contribution: epf_contrib,
          interest: epf_interest,
          balance: epf_balance,
          rate: epf_rate,
          entries: epf_entries
        }
      }
    end

    def self.build_wealth_graphs(data:, mf:, ppf:, epf:, fi_total:, bank_total:, home_loan:, total_assets:, total_invested:, total_gain:, total_liabilities:, net_worth:)
      # 1. Total Wealth Metric Graph
      gross = [total_assets.to_f, 0.0].max
      liab = [total_liabilities.to_f, 0.0].max
      nw = net_worth.to_f
      max_scale = [gross, liab, nw.abs, 1.0].max
      wealth_gain_pct = total_invested.to_f.positive? ? ((total_gain.to_f / total_invested.to_f) * 100.0).round(2) : 0.0

      ret_total = ppf[:balance].to_f + epf[:balance].to_f
      asset_denom = gross.positive? ? gross : 1.0
      wealth_segments = [
        { label: "Mutual Funds", value: mf[:current].to_f, pct: ((mf[:current].to_f / asset_denom) * 100.0).round(1), bar_class: "bg-indigo-500" },
        { label: "Fixed Deposits & RDs", value: fi_total.to_f, pct: ((fi_total.to_f / asset_denom) * 100.0).round(1), bar_class: "bg-cyan-500" },
        { label: "PPF & EPF Vault", value: ret_total, pct: ((ret_total / asset_denom) * 100.0).round(1), bar_class: "bg-emerald-500" },
        { label: "Liquid Bank", value: bank_total.to_f, pct: ((bank_total.to_f / asset_denom) * 100.0).round(1), bar_class: "bg-amber-500" }
      ]

      # Total Wealth Trajectory SVG Points (Invested -> Accrued Gains -> Gross Assets -> Net Worth)
      wealth_series = [total_invested.to_f, (total_invested.to_f + (total_gain.to_f * 0.5)), gross, [nw, 0.0].max]
      wealth_svg = build_svg_polyline(wealth_series, width: 320, height: 84)

      # 2. Mutual Funds Increase / Decrease Metric
      mf_inv = mf[:invested].to_f
      mf_cur = mf[:current].to_f
      mf_delta = mf_cur - mf_inv
      mf_delta_pct = mf_inv.positive? ? ((mf_delta / mf_inv) * 100.0).round(2) : 0.0
      mf_max = [mf_inv, mf_cur, 1.0].max
      mf_schemes = Array(data[:mutual_funds]).map do |scheme|
        s_inv = scheme[:invested_amount].to_f
        s_cur = scheme[:current_value].to_f
        s_delta = s_cur - s_inv
        s_pct = s_inv.positive? ? ((s_delta / s_inv) * 100.0).round(2) : 0.0
        {
          name: scheme[:scheme_name].to_s,
          invested: s_inv,
          current: s_cur,
          delta: s_delta,
          delta_pct: s_pct,
          positive: s_delta >= 0,
          bar_pct: [[((s_cur / [mf_max, 1.0].max) * 100.0).round(1), 6.0].max, 100.0].min
        }
      end
      mf_svg = build_svg_polyline([mf_inv, (mf_inv + mf_cur) * 0.48, (mf_inv + mf_cur) * 0.56, mf_cur], width: 280, height: 72)

      # 3. EPF Increase / Decrease Metric
      epf_contrib = epf[:contribution].to_f
      epf_interest = epf[:interest].to_f
      epf_bal = epf[:balance].to_f
      epf_delta_pct = epf_contrib.positive? ? ((epf_interest / epf_contrib) * 100.0).round(2) : 0.0
      epf_max = [epf_bal, epf_contrib, 1.0].max
      epf_running = 0.0
      epf_series = []
      epf_bars = Array(epf[:entries]).last(6).map do |entry|
        add = entry[:employee].to_f + entry[:employer].to_f + entry[:interest].to_f
        epf_running += add
        epf_series << epf_running
        {
          label: entry[:month].to_s,
          added: add,
          interest: entry[:interest].to_f,
          running: epf_running
        }
      end
      epf_series = [epf_contrib, epf_bal] if epf_series.empty?
      epf_peak = [epf_bars.map { |b| b[:running] }.max.to_f, 1.0].max
      epf_bars.each { |b| b[:bar_pct] = [[((b[:running] / epf_peak) * 100.0).round(1), 8.0].max, 100.0].min }
      epf_svg = build_svg_polyline(epf_series, width: 280, height: 72)

      # 4. PPF Increase / Decrease Metric
      ppf_contrib = ppf[:contribution].to_f
      ppf_interest = ppf[:interest].to_f
      ppf_bal = ppf[:balance].to_f
      ppf_delta_pct = ppf_contrib.positive? ? ((ppf_interest / ppf_contrib) * 100.0).round(2) : 0.0
      ppf_max = [ppf_bal, ppf_contrib, 1.0].max
      ppf_running = 0.0
      ppf_series = []
      ppf_bars = Array(ppf[:fyGroups]).last(6).map do |grp|
        amt = grp[:total_amount].to_f
        ppf_running += amt
        ppf_series << ppf_running
        {
          label: grp[:fy_label].to_s,
          amount: amt,
          running: ppf_running
        }
      end
      ppf_series = [ppf_contrib, ppf_bal] if ppf_series.empty?
      ppf_peak = [ppf_bars.map { |b| b[:amount] }.max.to_f, 1.0].max
      ppf_bars.each { |b| b[:bar_pct] = [[((b[:amount] / ppf_peak) * 100.0).round(1), 8.0].max, 100.0].min }
      ppf_svg = build_svg_polyline(ppf_series, width: 280, height: 72)

      # 5. Home Loan Principal Decrease Metric & Curve
      hl_orig = home_loan[:original_loan_amount].to_f
      hl_out = home_loan[:outstanding_principal].to_f
      hl_repaid = [0.0, hl_orig - hl_out].max
      hl_repaid_pct = hl_orig.positive? ? ((hl_repaid / hl_orig) * 100.0).round(1) : 0.0
      hl_remaining_pct = hl_orig.positive? ? [100.0 - hl_repaid_pct, 0.0].max.round(1) : 0.0

      hl_series = if hl_orig.positive?
                    mid_paid = [hl_orig - (hl_repaid * 0.5), hl_out].max
                    mid_future = (hl_out * 0.45).round
                    [hl_orig, mid_paid, hl_out, mid_future, 0.0]
                  else
                    [0.0, 0.0]
                  end
      hl_svg = build_svg_polyline(hl_series, width: 320, height: 84)
      hl_milestones = [
        { label: "Sanctioned", value: hl_orig, pct: 100.0 },
        { label: "Mid-Paid", value: hl_orig.positive? ? (hl_orig - (hl_repaid * 0.5)) : 0.0, pct: hl_orig.positive? ? (((hl_orig - (hl_repaid * 0.5)) / hl_orig) * 100.0).round(1) : 0.0 },
        { label: "Current Balance", value: hl_out, pct: hl_remaining_pct, current: true },
        { label: "Future Mid", value: hl_orig.positive? ? (hl_out * 0.45) : 0.0, pct: hl_orig.positive? ? (((hl_out * 0.45) / hl_orig) * 100.0).round(1) : 0.0 },
        { label: "Closure", value: 0.0, pct: 0.0 }
      ]

      {
        total_wealth: {
          gross_assets: gross,
          total_invested: total_invested.to_f,
          total_gain: total_gain.to_f,
          gain_pct: wealth_gain_pct,
          positive: total_gain.to_f >= 0,
          liabilities: liab,
          net_worth: nw,
          assets_bar_pct: ((gross / max_scale) * 100.0).round(1),
          liabilities_bar_pct: ((liab / max_scale) * 100.0).round(1),
          net_worth_bar_pct: (([nw, 0.0].max / max_scale) * 100.0).round(1),
          segments: wealth_segments,
          svg: wealth_svg
        },
        asset_movements: {
          mf: {
            label: "Mutual Funds",
            invested: mf_inv,
            current: mf_cur,
            delta: mf_delta,
            delta_pct: mf_delta_pct,
            positive: mf_delta >= 0,
            bar_invested_pct: ((mf_inv / mf_max) * 100.0).round(1),
            bar_current_pct: ((mf_cur / mf_max) * 100.0).round(1),
            schemes: mf_schemes,
            svg: mf_svg
          },
          epf: {
            label: "EPF Vault",
            contributions: epf_contrib,
            interest: epf_interest,
            balance: epf_bal,
            delta: epf_interest,
            delta_pct: epf_delta_pct,
            positive: epf_interest >= 0,
            bar_principal_pct: ((epf_contrib / epf_max) * 100.0).round(1),
            bar_balance_pct: ((epf_bal / epf_max) * 100.0).round(1),
            entries: epf_bars,
            svg: epf_svg
          },
          ppf: {
            label: "PPF Vault",
            contributions: ppf_contrib,
            interest: ppf_interest,
            balance: ppf_bal,
            delta: ppf_interest,
            delta_pct: ppf_delta_pct,
            positive: ppf_interest >= 0,
            bar_principal_pct: ((ppf_contrib / ppf_max) * 100.0).round(1),
            bar_balance_pct: ((ppf_bal / ppf_max) * 100.0).round(1),
            fy_bars: ppf_bars,
            svg: ppf_svg
          }
        },
        home_loan_paydown: {
          original: hl_orig,
          repaid: hl_repaid,
          outstanding: hl_out,
          repaid_pct: hl_repaid_pct,
          remaining_pct: hl_remaining_pct,
          monthly_emi: home_loan[:monthly_emi].to_f,
          interest_rate: home_loan[:interest_rate].to_f,
          tenure_years: home_loan[:tenure_years].to_f,
          milestones: hl_milestones,
          svg: hl_svg
        }
      }.with_indifferent_access
    end

    def self.build_svg_polyline(values, width: 280, height: 72)
      pts_raw = Array(values).map(&:to_f)
      pts_raw = [0.0, 0.0] if pts_raw.size < 2

      min_v = [pts_raw.min, 0.0].min
      max_v = pts_raw.max
      span = (max_v - min_v).positive? ? (max_v - min_v) : 1.0
      pad_x = 8.0
      pad_y = 8.0
      usable_w = width - (pad_x * 2)
      usable_h = height - (pad_y * 2)

      coords = pts_raw.each_with_index.map do |v, idx|
        x = pad_x + ((idx.to_f / (pts_raw.size - 1)) * usable_w)
        y = (height - pad_y) - (((v - min_v) / span) * usable_h)
        [x.round(1), y.round(1)]
      end

      line_points = coords.map { |x, y| "#{x},#{y}" }.join(" ")
      area_points = "#{pad_x},#{(height - pad_y).round(1)} #{line_points} #{(width - pad_x).round(1)},#{(height - pad_y).round(1)}"
      {
        width: width,
        height: height,
        line_points: line_points,
        area_points: area_points,
        last_x: coords.last[0],
        last_y: coords.last[1],
        dots: coords.map { |x, y| { x: x, y: y } }
      }
    end

    def self.summarize_policy_group(policies)
      list = Array(policies)
      {
        sumInsured: list.sum { |p| (p[:sum_insured] || p["sum_insured"]).to_f },
        premium: list.sum { |p| (p[:annual_premium] || p["annual_premium"]).to_f },
        count: list.size
      }
    end

    def self.summarize_home_loan(data)
      hl = data[:home_loan] || {}
      orig = hl[:original_loan_amount].to_f
      out = hl[:outstanding_principal].to_f
      tenure = hl[:tenure_years].to_f
      rate = hl[:interest_rate].to_f
      auto_emi = Core::FinancialMath.calculate_standard_emi(principal: orig, annual_rate: rate, tenure_years: tenure)
      monthly_emi = hl[:monthly_emi].to_f.positive? ? hl[:monthly_emi].to_f : auto_emi
      repaid = [0.0, orig - out].max
      repaid_pct = orig.positive? ? ((repaid / orig) * 100.0).round : 0

      {
        outstanding_principal: out,
        monthly_emi: monthly_emi,
        auto_emi: auto_emi,
        original_loan_amount: orig,
        principal_repaid: repaid,
        repaid_pct: repaid_pct,
        loan_start_date: hl[:loan_start_date].to_s,
        tenure_years: tenure,
        interest_rate: rate,
        emi_day: (hl[:emi_day].to_i.positive? ? hl[:emi_day].to_i : 26)
      }
    end

    def self.calculate_credit_card_metrics(card)
      c = card.with_indifferent_access
      limit = c[:credit_limit].to_f
      utilized = c[:utilized_amount].to_f
      available = [0.0, limit - utilized].max
      util_pct = limit.positive? ? ((utilized / limit) * 100.0).round(1) : 0.0

      if util_pct > 70
        status_label = "High Utilization"
        badge_class = "bg-rose-950/80 text-rose-400 border-rose-800/60"
        bar_class = "bg-rose-500"
      elsif util_pct > 30
        status_label = "Moderate"
        badge_class = "bg-amber-950/80 text-amber-400 border-amber-800/60"
        bar_class = "bg-amber-500"
      else
        status_label = "Optimal"
        badge_class = "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
        bar_class = "bg-emerald-500"
      end

      {
        limit: limit,
        utilized: utilized,
        available: available,
        utilizationPct: util_pct,
        statusLabel: status_label,
        badgeClass: badge_class,
        barClass: bar_class
      }
    end

    def self.summarize_banking(data)
      accounts = Array(data[:bank_accounts])
      cards = Array(data[:credit_cards])

      total_balance = accounts.sum { |a| a[:current_balance].to_f }
      annual_interest = accounts.sum do |a|
        a[:current_balance].to_f * (a[:interest_rate].to_f / 100.0)
      end.round

      total_limit = cards.sum { |c| c[:credit_limit].to_f }
      total_utilized = cards.sum { |c| c[:utilized_amount].to_f }
      total_available = [0.0, total_limit - total_utilized].max
      util_pct = total_limit.positive? ? ((total_utilized / total_limit) * 100.0).round(1) : 0.0
      total_rewards = cards.sum { |c| c[:reward_points].to_i }

      {
        accounts: {
          count: accounts.size,
          totalBalance: total_balance,
          annualInterest: annual_interest
        },
        cards: {
          count: cards.size,
          totalLimit: total_limit,
          totalUtilized: total_utilized,
          totalAvailable: total_available,
          utilizationPct: util_pct,
          totalRewardPoints: total_rewards
        }
      }
    end
  end
end
