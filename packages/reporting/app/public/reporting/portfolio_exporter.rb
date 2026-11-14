# frozen_string_literal: true

require "csv"

module Reporting
  # Multi-sheet Excel SpreadsheetML workbook and CSV portfolio exporter.
  class PortfolioExporter
    PPF_FY_LIMIT = 150_000

    class << self
      def build_sheets(data, ov)
        d = data.with_indifferent_access
        o = ov.with_indifferent_access

        mfs = Array(d[:mutual_funds])
        fds = Array(d[:fixed_deposits])
        rds = Array(d[:recurring_deposits])
        frds = Array(d[:flexi_rds])
        ppf = d[:ppf] || {}
        epf = d[:epf] || {}
        ppf_rate = ppf[:interest_rate].to_f.positive? ? ppf[:interest_rate].to_f : 7.1
        epf_rate = epf[:interest_rate].to_f.positive? ? epf[:interest_rate].to_f : 8.25
        epf_uan = epf[:uan].presence || (epf[:account_identifier].present? && epf[:account_identifier] != "EPFO-UAN" ? epf[:account_identifier] : "")
        banking = o[:banking] || { accounts: {}, cards: {} }
        hl = o[:homeLoan] || {}
        tc = o[:taxCalc] || {}
        generated = dmy(Date.current.to_s)

        overview = [
          title_row("WEALTHFLOW — CONSOLIDATED PORTFOLIO OVERVIEW"),
          body_row(["Generated Date", generated, ""]),
          blank_row,
          head_row(["PORTFOLIO SUMMARY", "VALUE (INR)", "NOTES / DETAILS"]),
          body_row(["Net Worth", bold_cell(r2(o[:netWorth])), "Gross Assets minus Outstanding Home Loan and Credit Card dues"]),
          body_row(["Net Worth (Excluding RD & Flexi RD)", bold_cell(r2(o[:netWorthWithoutRd])), "Net Worth minus RD and Flexi RD maturity"]),
          body_row(["Gross Financial Assets", bold_cell(r2(o[:totalAssets])), "Investments + FD + RD + Flexi RD + PPF + EPF + Bank Balances"]),
          body_row(["Total Capital Invested", r2(o[:totalInvested]), "Across all schemes, deposits and bank balances"]),
          body_row(["Total Portfolio Gain", gain_cell(r2(o[:totalGain])), "Investment Gain + FD/RD/Flexi RD/PPF Interest + Bank Annual Interest"]),
          blank_row,
          head_row(["ASSET ALLOCATION", "VALUE (INR)", "SHARE %"]),
          body_row(["Mutual Funds / Investments", r2(o.dig(:mf, :current)), o.dig(:allocation, :mfPct)]),
          body_row(["Fixed Income (FD + RD + Flexi RD)", r2(o.dig(:allocation, :fiTotal)), o.dig(:allocation, :fiPct)]),
          body_row(["Retirement (PPF + EPF)", r2(o.dig(:allocation, :retTotal)), o.dig(:allocation, :retPct)]),
          blank_row,
          head_row(["INVESTMENTS (MUTUAL FUNDS) SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Current Value", bold_cell(r2(o.dig(:mf, :current))), "#{mfs.size} Schemes"]),
          body_row(["Total Invested", r2(o.dig(:mf, :invested)), ""]),
          body_row(["Monthly SIP Outflow", r2(o.dig(:mf, :sip)), "Automated Monthly SIP"]),
          body_row(["Absolute Gain", gain_cell(r2(o.dig(:mf, :gain))), ""]),
          body_row(["Gain %", "#{Kernel.format('%.2f', o.dig(:mf, :gainPct).to_f)}%", ""]),
          blank_row,
          head_row(["FIXED DEPOSITS (FD) SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Total Principal", r2(o.dig(:fd, :principal)), "#{fds.size} FDs"]),
          body_row(["Expected Maturity", bold_cell(r2(o.dig(:fd, :maturity))), "Quarterly Compounded"]),
          body_row(["Interest Gain", gain_cell(r2(o.dig(:fd, :gain))), ""]),
          body_row(["Avg Interest Rate (%)", r2(o.dig(:fd, :avgRate)), ""]),
          body_row(["Next Maturity Date", dmy(o.dig(:fd, :nextMaturity)), ""]),
          blank_row,
          head_row(["RECURRING DEPOSITS (RD) SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Monthly RD Outflow", r2(o.dig(:rd, :monthly)), "#{rds.size} RDs"]),
          body_row(["Total Invested", r2(o.dig(:rd, :invested)), ""]),
          body_row(["Expected Maturity", bold_cell(r2(o.dig(:rd, :maturity))), "Quarterly Compounded"]),
          body_row(["Interest Gain", gain_cell(r2(o.dig(:rd, :gain))), ""]),
          body_row(["Last RD End Date", dmy(o.dig(:rd, :lastEndDate)), ""]),
          blank_row,
          head_row(["FLEXI RD SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Base Monthly Outflow", r2(o.dig(:flexiRd, :baseMonthly)), "#{frds.size} Flexi RDs"]),
          body_row(["Total Deposited", r2(o.dig(:flexiRd, :invested)), ""]),
          body_row(["Expected Maturity", bold_cell(r2(o.dig(:flexiRd, :maturity))), ""]),
          body_row(["Interest Gain", gain_cell(r2(o.dig(:flexiRd, :gain))), ""]),
          blank_row,
          head_row(["RETIREMENT & ULIP SUMMARY", "VALUE", "DETAILS"]),
          body_row(["PPF Total Contribution", r2(o.dig(:ppf, :contribution)), "#{ppf_rate}% p.a. EEE"]),
          body_row(["PPF Current Balance", bold_cell(r2(o.dig(:ppf, :balance))), "Interest Earned: ₹#{r2(o.dig(:ppf, :interest))}"]),
          body_row(["PPF Current FY Contribution", r2(o.dig(:ppf, :latestFyTotal)), o.dig(:ppf, :latestFyTotal).to_f >= PPF_FY_LIMIT ? "₹1.5L limit reached" : "₹#{r2(PPF_FY_LIMIT - o.dig(:ppf, :latestFyTotal).to_f)} lesser than the ₹1.5L limit"]),
          body_row(["EPF Current Balance (Employee + Employer)", bold_cell(r2(o.dig(:epf, :balance))), "#{epf_rate}% p.a.#{epf_uan.present? ? " • UAN: #{epf_uan}" : ''}"]),
          body_row(["ULIP Total Paid", r2(o.dig(:ulip, :paid)), ""]),
          body_row(["ULIP Current Value", bold_cell(r2(o.dig(:ulip, :value))), ""]),
          blank_row,
          head_row(["INSURANCE SUMMARY", "SUM INSURED / COVER (INR)", "ANNUAL PREMIUM (INR) • POLICIES"]),
          body_row(["Health Insurance", r2(o.dig(:health, :sumInsured)), "₹#{r2(o.dig(:health, :premium))} • #{o.dig(:health, :count)} policies"]),
          body_row(["Life Insurance", r2(o.dig(:life, :sumInsured)), "₹#{r2(o.dig(:life, :premium))} • #{o.dig(:life, :count)} policies"]),
          body_row(["Vehicle / Motor Insurance", r2(o.dig(:vehicle, :sumInsured)), "₹#{r2(o.dig(:vehicle, :premium))} • #{o.dig(:vehicle, :count)} policies"]),
          body_row(["Home Loan Protection & Property Insurance", r2(o.dig(:homeLoanIns, :sumInsured)), "₹#{r2(o.dig(:homeLoanIns, :premium))} • #{o.dig(:homeLoanIns, :count)} policies"]),
          blank_row,
          head_row(["HOME LOAN SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Outstanding Principal", bold_cell(r2(hl[:outstanding_principal])), ""]),
          body_row(["Monthly EMI", r2(hl[:monthly_emi]), "Standard Formula EMI: ₹#{hl[:auto_emi]}"]),
          body_row(["Original Loan Amount", r2(hl[:original_loan_amount]), "Principal Repaid: #{hl[:repaid_pct]}%"]),
          body_row(["Loan Start Date", dmy(hl[:loan_start_date]), ""]),
          body_row(["EMI Debit Date", "#{hl[:emi_day] || 26}th of every month", ""]),
          body_row(["Tenure (Years)", hl[:tenure_years].to_f, ""]),
          body_row(["Interest Rate (%)", hl[:interest_rate].to_f, ""]),
          blank_row,
          head_row(["BANKING SUMMARY", "VALUE", "DETAILS"]),
          body_row(["Total Bank Balance", bold_cell(r2(banking.dig(:accounts, :totalBalance))), "#{banking.dig(:accounts, :count) || 0} accounts"]),
          body_row(["Estimated Annual Interest", gain_cell(r2(banking.dig(:accounts, :annualInterest))), ""]),
          body_row(["Total Credit Limit", r2(banking.dig(:cards, :totalLimit)), "#{banking.dig(:cards, :count) || 0} cards"]),
          body_row(["Credit Utilized", r2(banking.dig(:cards, :totalUtilized)), "#{banking.dig(:cards, :utilizationPct) || 0}% utilization"]),
          body_row(["Credit Available", r2(banking.dig(:cards, :totalAvailable)), ""]),
          body_row(["Reward Points", banking.dig(:cards, :totalRewardPoints).to_i, ""]),
          blank_row,
          head_row(["TAX SNAPSHOT", "VALUE (INR)", "DETAILS"]),
          body_row(["Section 80C Utilised", r2(o.dig(:tax, :utilized80C)), "#{o.dig(:tax, :pct80C)}% of ₹1.5L"]),
          body_row(["Section 80D Utilised", r2(o.dig(:tax, :utilized80D)), "#{o.dig(:tax, :pct80D)}% of ₹50K"]),
          body_row(["Estimated Tax Saved", gain_cell(r2(o.dig(:tax, :totalTaxSaved))), ""]),
          body_row(["Recommended Regime", tc[:recommendedRegime].to_s, "Active: #{tc[:activeRegime]}"]),
          body_row(["Tax Savings vs Other Regime", r2(tc[:taxSavings]), ""])
        ]

        investments = [
          title_row("INVESTMENTS (MUTUAL FUNDS)"),
          head_row(["Scheme Name", "Scheme Code", "Category", "AMC / Fund House", "Monthly SIP", "SIP Start Date", "Units", "Latest NAV", "NAV Date", "Current Value", "Invested Amount", "Absolute Gain", "Return %", "Step-Up %"]),
          *mfs.map do |mf|
            cur = mf[:current_value].to_f
            inv = mf[:invested_amount].to_f
            g = cur - inv
            pct = inv.positive? ? "#{Kernel.format('%.2f', (g / inv) * 100)}%" : "0.00%"
            body_row([
              mf[:scheme_name], text_cell(mf[:scheme_code]), mf[:category], mf[:amc].to_s,
              mf[:sip_amount].to_f, dmy(mf[:start_date]), mf[:units].to_f, mf[:latest_nav].to_f,
              mf[:nav_date].to_s, bold_cell(cur), inv, gain_cell(r2(g)), pct, "#{mf[:step_up_pct].to_f}%"
            ])
          end,
          total_row(["TOTAL", "", "", "", r2(o.dig(:mf, :sip)), "", "", "", "", r2(o.dig(:mf, :current)), r2(o.dig(:mf, :invested)), r2(o.dig(:mf, :gain)), "#{Kernel.format('%.2f', o.dig(:mf, :gainPct).to_f)}%", ""])
        ]

        fd_sheet = [
          title_row("FIXED DEPOSITS (FD)"),
          head_row(["Bank", "FD No", "Principal", "Rate %", "Start Date", "Maturity Date", "Duration", "Days Left to Maturity", "Interest Gain", "Maturity Amount"]),
          *fds.map do |fd|
            c = Core::FinancialMath.calculate_fd(
              principal: fd[:principal], rate: fd[:rate], start_date: fd[:start_date],
              maturity_date: fd[:maturity_date], custom_maturity_amount: fd[:maturity_amount]
            )
            body_row([fd[:bank], text_cell(fd[:fd_no]), c[:principal], c[:rate], dmy(fd[:start_date]), dmy(fd[:maturity_date]), c[:duration_text], c[:days_left_label], gain_cell(c[:gain]), bold_cell(c[:maturity])])
          end,
          total_row(["TOTAL", "", r2(o.dig(:fd, :principal)), r2(o.dig(:fd, :avgRate)), "", dmy(o.dig(:fd, :nextMaturity)), "", "", r2(o.dig(:fd, :gain)), r2(o.dig(:fd, :maturity))])
        ]

        rd_sheet = [
          title_row("RECURRING DEPOSITS (RD)"),
          head_row(["Bank", "RD No", "Purpose", "Monthly Amount", "Total Invested", "Rate %", "Start Date", "Duration", "End Date", "Days Left to Maturity", "Interest Gain", "Total Maturity"]),
          *rds.map do |rd|
            c = Core::FinancialMath.calculate_rd(
              monthly_amount: rd[:monthly_amount], rate: rd[:rate], start_date: rd[:start_date],
              end_date: rd[:end_date], custom_maturity_amount: rd[:maturity_amount]
            )
            body_row([rd[:bank], text_cell(rd[:rd_no]), rd[:purpose].to_s, c[:monthly_amount], c[:total_invested], c[:rate], dmy(rd[:start_date]), c[:duration_text], dmy(rd[:end_date]), c[:days_left_label], gain_cell(c[:gain]), bold_cell(c[:maturity])])
          end,
          total_row(["TOTAL", "", "", r2(o.dig(:rd, :monthly)), r2(o.dig(:rd, :invested)), "", "", "", dmy(o.dig(:rd, :lastEndDate)), "", r2(o.dig(:rd, :gain)), r2(o.dig(:rd, :maturity))]),
          blank_row,
          title_row("FLEXIBLE RECURRING DEPOSITS (FLEXI RD)"),
          head_row(["Bank", "Account No", "Purpose", "Base Monthly", "Total Deposited", "Rate %", "Start Date", "Duration", "End Date", "Days Left to Maturity", "Interest Gain", "Total Maturity"]),
          *frds.map do |frd|
            c = Core::FinancialMath.calculate_flexi_rd(
              base_monthly: frd[:base_monthly], total_deposited: frd[:total_deposited], rate: frd[:rate],
              start_date: frd[:start_date], end_date: frd[:end_date], custom_maturity_amount: frd[:maturity_amount]
            )
            body_row([frd[:bank], text_cell(frd[:rd_no]), frd[:purpose].to_s, c[:base_monthly], c[:total_deposited], c[:rate], dmy(frd[:start_date]), c[:duration_text], dmy(frd[:end_date]), c[:days_left_label], gain_cell(c[:gain]), bold_cell(c[:maturity])])
          end,
          total_row(["TOTAL", "", "", r2(o.dig(:flexiRd, :baseMonthly)), r2(o.dig(:flexiRd, :invested)), "", "", "", "", "", r2(o.dig(:flexiRd, :gain)), r2(o.dig(:flexiRd, :maturity))])
        ]

        ppf_groups = o.dig(:ppf, :fyGroups) || []
        retirement = [
          title_row("PUBLIC PROVIDENT FUND (PPF) — #{ppf_rate}% p.a."),
          head_row(["Metric", "Value", "Details"]),
          body_row(["Total Contribution", r2(o.dig(:ppf, :contribution)), ""]),
          body_row(["Interest Earned", gain_cell(r2(o.dig(:ppf, :interest))), "Auto-Calculated (Balance - Contributions)"]),
          body_row(["Current Balance", bold_cell(r2(o.dig(:ppf, :balance))), "Last Updated: #{dmy(ppf[:last_updated])}"]),
          blank_row,
          head_row(["Financial Year", "Entry", "Transaction Date", "Note", "Contribution (INR)", "Limit Status (₹1.5L / FY)"]),
          *ppf_groups.flat_map do |grp|
            diff = PPF_FY_LIMIT - grp[:total_amount].to_f
            status = diff.positive? ? "₹#{r2(diff)} lesser than the ₹1.5L limit" : "₹1.5L limit reached"
            entries = grp[:entries] || []
            hdr = body_row([
              text_cell(grp[:fy]),
              entries.size > 1 ? "FY Total (#{entries.size} entries)" : "1 Entry",
              entries.size > 1 ? "" : dmy(entries.first&.dig(:date)),
              entries.size > 1 ? "" : entries.first&.dig(:note).to_s,
              bold_cell(r2(grp[:total_amount])),
              status
            ])
            subs = entries.size > 1 ? entries.each_with_index.map { |e, idx| body_row([grp[:fy], "  Entry ##{idx + 1}", dmy(e[:date]), e[:note].to_s, e[:amount].to_f, ""]) } : []
            [hdr, *subs]
          end,
          total_row(["TOTAL PPF CONTRIBUTIONS", "", "", "", r2(o.dig(:ppf, :contribution)), ""]),
          blank_row,
          title_row("EMPLOYEES' PROVIDENT FUND (EPF) — #{epf_rate}% p.a."),
          head_row(["Metric", "Value", "Details"]),
          body_row(["UAN (Universal Account No)", text_cell(epf_uan), ""]),
          body_row(["Accumulated Balance (Employee + Employer)", bold_cell(r2(o.dig(:epf, :balance))), "Last Updated: #{dmy(epf[:last_updated])}"]),
          blank_row,
          head_row(["Transaction Date", "Particulars", "Employee Share", "Employer Share", "Interest"]),
          *Array(epf[:entries]).map { |e| body_row([dmy(e[:date]), e[:description].presence || "EPF Entry", e[:employee].to_f, e[:employer].to_f, gain_cell(e[:interest].to_f)]) },
          total_row(["TOTAL EPF BALANCE", "", r2(o.dig(:epf, :balance)), "", ""])
        ]

        insurance = [
          title_row("HEALTH INSURANCE POLICIES"),
          *policy_rows(d[:health_insurance], "Linked Asset", "Insured Person", "Nominee Person", "Sum Insured (INR)", "Annual Premium (INR)"),
          blank_row,
          title_row("LIFE INSURANCE POLICIES"),
          *policy_rows(d[:life_insurance], "Linked Asset", "Insured Person", "Nominee Person", "Sum Assured (INR)", "Annual Premium (INR)"),
          blank_row,
          title_row("VEHICLE / MOTOR INSURANCE POLICIES"),
          *policy_rows(d[:vehicle_insurance], "Vehicle / Reg No", "Owner", "Nominee", "IDV / Sum Insured (INR)", "Annual Premium (INR)"),
          blank_row,
          title_row("HOME LOAN PROTECTION & PROPERTY INSURANCE"),
          *policy_rows(d[:home_loan_insurance], "Linked Loan / Property", "Insured Borrower", "Nominee", "Loan Cover Assured (INR)", "Premium Paid (INR)")
        ]

        loan_ulip = [
          title_row("HOME LOAN / MORTGAGE TRACKER"),
          head_row(["Metric", "Value"]),
          body_row(["Outstanding Principal", bold_cell(r2(hl[:outstanding_principal]))]),
          body_row(["Monthly EMI", r2(hl[:monthly_emi])]),
          body_row(["Auto-Calculated Standard EMI", r2(hl[:auto_emi])]),
          body_row(["Original Loan Amount", r2(hl[:original_loan_amount])]),
          body_row(["Principal Repaid", gain_cell(r2(hl[:principal_repaid]))]),
          body_row(["Principal Repaid (%)", "#{hl[:repaid_pct]}%"]),
          body_row(["Loan Start Date", dmy(hl[:loan_start_date])]),
          body_row(["EMI Debit Date", "#{hl[:emi_day] || 26}th of every month"]),
          body_row(["Tenure (Years)", hl[:tenure_years].to_f]),
          body_row(["Interest Rate (%)", hl[:interest_rate].to_f]),
          blank_row,
          title_row("ULIP PORTFOLIO"),
          head_row(["Metric", "Value"]),
          body_row(["Policy Name", d.dig(:ulip, :policy_name).presence || "ULIP"]),
          body_row(["Total Paid", r2(o.dig(:ulip, :paid))]),
          body_row(["Current Value", bold_cell(r2(o.dig(:ulip, :value)))]),
          body_row(["Gain / (Loss)", gain_cell(r2(o.dig(:ulip, :gain)))])
        ]

        accounts = Array(d[:bank_accounts])
        cards = Array(d[:credit_cards])
        bank_sheet = [
          title_row("BANK ACCOUNTS"),
          head_row(["Bank Name", "Account Type", "Account Number", "Account Holder", "Nominee", "Purpose of Account", "Notes", "Branch / IFSC", "Interest Rate %", "Estimated Annual Interest", "Current Balance (INR)"]),
          *accounts.map do |acc|
            bal = acc[:current_balance].to_f
            rate = acc[:interest_rate].to_f
            body_row([acc[:bank_name], acc[:account_type] || "Savings", text_cell(acc[:account_no]), acc[:holder_name].to_s, acc[:nominee].to_s, acc[:purpose].to_s, acc[:notes].presence || acc[:nominee_notes].to_s, acc[:branch_ifsc].to_s, rate, (bal * (rate / 100.0)).round, bold_cell(r2(bal))])
          end,
          total_row(["TOTAL BANK LIQUIDITY", "", "", "", "", "", "", "", "", r2(banking.dig(:accounts, :annualInterest)), r2(banking.dig(:accounts, :totalBalance))]),
          blank_row,
          title_row("CREDIT CARDS & LIMITS"),
          head_row(["Issuing Bank", "Card Name", "Network", "Last 4 Digits", "Billing Day", "Due Day", "Total Credit Limit", "Current Utilized", "Available Limit", "Utilization %", "Reward Points", "Annual Fee / Notes"]),
          *cards.map do |card|
            limit = card[:credit_limit].to_f
            used = card[:utilized_amount].to_f
            util = limit.positive? ? "#{Kernel.format('%.1f', (used / limit) * 100)}%" : "0.0%"
            body_row([card[:bank_name], card[:card_name], card[:network] || "Visa", text_cell(card[:last4]), card[:billing_day] || 1, card[:due_day] || 15, limit, r2(used), r2([0.0, limit - used].max), util, card[:reward_points].to_i, card[:annual_fee_notes].to_s])
          end,
          total_row(["TOTAL CREDIT CARDS", "", "", "", "", "", r2(banking.dig(:cards, :totalLimit)), r2(banking.dig(:cards, :totalUtilized)), r2(banking.dig(:cards, :totalAvailable)), "#{banking.dig(:cards, :utilizationPct) || 0}%", banking.dig(:cards, :totalRewardPoints).to_i, ""])
        ]

        p = tc[:profile] || {}
        nr = tc[:newRegime] || {}
        old_r = tc[:oldRegime] || {}
        tax_sheet = [
          title_row("INCOME TAX & ITR RETURN CALCULATION (FY #{p[:fy]})"),
          head_row(["Profile Input", "Value (INR)"]),
          body_row(["Age Group", p[:age_group].to_s]),
          body_row(["Preferred Regime", p[:preferred_regime].to_s]),
          body_row(["Salaried", p[:is_salaried] ? "Yes" : "No"]),
          body_row(["Gross Salary", p[:gross_salary].to_f]),
          body_row(["Interest Income", p[:interest_income].to_f]),
          body_row(["Rental Income", p[:rental_income].to_f]),
          body_row(["Other Income", p[:other_income].to_f]),
          body_row(["HRA Exemption", p[:hra_exemption].to_f]),
          body_row(["Professional Tax", p[:professional_tax].to_f]),
          body_row(["Home Loan Interest (Sec 24b)", p[:home_loan_interest_24b].to_f]),
          body_row(["Section 80C", p[:sec_80c].to_f]),
          body_row(["Section 80CCD(1B) NPS", p[:sec_80ccd_1b_nps].to_f]),
          body_row(["Section 80CCD(2) Employer NPS", p[:sec_80ccd_2_employer_nps].to_f]),
          body_row(["Section 80D Health", p[:sec_80d_health].to_f]),
          body_row(["Section 80TTA Savings", p[:sec_80tta_savings].to_f]),
          body_row(["Other Deductions (80E / 80G)", p[:other_deductions_80e_80g].to_f]),
          body_row(["TDS Deducted", p[:tds_deducted].to_f]),
          body_row(["Advance Tax Paid", p[:advance_tax_paid].to_f]),
          blank_row,
          head_row(["Particular", "New Tax Regime (INR)", "Old Tax Regime (INR)"]),
          body_row(["Gross Total Income", tc[:grossTotalIncome], tc[:grossTotalIncome]]),
          body_row(["Standard Deduction", nr[:stdDeduction], old_r[:stdDeduction]]),
          body_row(["Other Chapter VI-A & Sec 10/24b Deductions", nr[:totalDeductions].to_f - nr[:stdDeduction].to_f, old_r[:totalDeductions].to_f - old_r[:stdDeduction].to_f]),
          body_row(["Net Taxable Income", nr[:taxableIncome], old_r[:taxableIncome]]),
          body_row(["Slab Tax (Before Rebate)", nr[:slabTax], old_r[:slabTax]]),
          body_row(["Section 87A Rebate & Marginal Relief", nr[:rebate87A].to_f + nr[:marginalRelief].to_f, old_r[:rebate87A].to_f + old_r[:marginalRelief].to_f]),
          body_row(["Surcharge", nr.dig(:surcharge, :amount), old_r.dig(:surcharge, :amount)]),
          body_row(["Health & Education Cess (4%)", nr[:cess], old_r[:cess]]),
          body_row([text_cell("Total Income Tax Liability"), bold_cell(nr[:totalTax]), bold_cell(old_r[:totalTax])]),
          body_row(["Effective Tax Rate (%)", "#{Kernel.format('%.2f', nr[:effectiveRate].to_f)}%", "#{Kernel.format('%.2f', old_r[:effectiveRate].to_f)}%"]),
          body_row(["Total Taxes Paid (TDS + Advance Tax)", tc[:totalTaxesPaid], tc[:totalTaxesPaid]]),
          body_row(["ITR Refund (+) or Balance Tax Payable (-)", nr[:refundOrPayable], old_r[:refundOrPayable]]),
          body_row(["Net Annual Post-Tax Income", nr[:netPostTaxIncome], old_r[:netPostTaxIncome]]),
          body_row(["Recommended Regime", tc[:recommendedRegime].to_s, ""]),
          blank_row,
          title_row("NEW REGIME — SLAB BREAKDOWN"),
          head_row(["Slab", "Rate %", "Taxable in Slab", "Tax in Slab"]),
          *Array(nr[:slabs]).map { |s| body_row([s[:label], s[:rate], s[:taxableInSlab], s[:taxInSlab]]) },
          blank_row,
          title_row("OLD REGIME — SLAB BREAKDOWN"),
          head_row(["Slab", "Rate %", "Taxable in Slab", "Tax in Slab"]),
          *Array(old_r[:slabs]).map { |s| body_row([s[:label], s[:rate], s[:taxableInSlab], s[:taxInSlab]]) }
        ]

        [
          { name: "Overview", title: "CONSOLIDATED OVERVIEW", rows: overview },
          { name: "Investments", title: "INVESTMENTS (MUTUAL FUNDS)", rows: investments },
          { name: "Fixed Deposits (FD)", title: "FIXED DEPOSITS (FD)", rows: fd_sheet },
          { name: "RD and Flexi RD", title: "RECURRING DEPOSITS (RD & FLEXI RD)", rows: rd_sheet },
          { name: "PPF and EPF", title: "RETIREMENT (PPF & EPF)", rows: retirement },
          { name: "Insurance", title: "INSURANCE (HEALTH, LIFE, VEHICLE, HOME LOAN)", rows: insurance },
          { name: "Home Loan and ULIP", title: "HOME LOAN & ULIP", rows: loan_ulip },
          { name: "Bank and Cards", title: "BANK ACCOUNTS & CREDIT CARDS", rows: bank_sheet },
          { name: "Income Tax", title: "INCOME TAX & ITR", rows: tax_sheet }
        ]
      end

      def build_excel_workbook(data, ov)
        sheets = build_sheets(data, ov)
        sheet_xml = sheets.map do |sh|
          max_cols = [1, *sh[:rows].map { |r| r[:c].size }].max
          cols = (0...max_cols).map { |i| "<Column ss:Width=\"#{i.zero? ? 210 : 120}\"/>" }.join
          rows = sh[:rows].map do |r|
            next "<Row/>" if r[:k] == "blank"

            cells = r[:c].map do |c|
              n = norm_cell(c, r[:k])
              "<Cell ss:StyleID=\"#{n[:s]}\"><Data ss:Type=\"#{n[:t]}\">#{esc_xml(n[:v])}</Data></Cell>"
            end.join
            "<Row ss:AutoFitHeight=\"1\">#{cells}</Row>"
          end.join
          "<Worksheet ss:Name=\"#{esc_xml(sh[:name])}\"><Table>#{cols}#{rows}</Table></Worksheet>"
        end.join("\n  ")

        <<~XML
          <?xml version="1.0" encoding="UTF-8"?>
          <?mso-application progid="Excel.Sheet"?>
          <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
           xmlns:o="urn:schemas-microsoft-com:office:office"
           xmlns:x="urn:schemas-microsoft-com:office:excel"
           xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
           <Styles>
            <Style ss:ID="Default" ss:Name="Normal">
             <Alignment ss:Vertical="Center"/>
             <Font ss:FontName="Inter" ss:Size="10" ss:Color="#0F172A"/>
            </Style>
            <Style ss:ID="sTitle">
             <Font ss:FontName="Inter" ss:Size="12" ss:Bold="1" ss:Color="#312E81"/>
            </Style>
            <Style ss:ID="sHead">
             <Font ss:FontName="Inter" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
             <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
            </Style>
            <Style ss:ID="sBody">
             <Font ss:FontName="Inter" ss:Size="10" ss:Color="#0F172A"/>
            </Style>
            <Style ss:ID="sNum">
             <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Color="#0F172A"/>
             <NumberFormat ss:Format="#,##0.00"/>
            </Style>
            <Style ss:ID="sBoldNum">
             <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
             <NumberFormat ss:Format="#,##0.00"/>
            </Style>
            <Style ss:ID="sGain">
             <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
             <NumberFormat ss:Format="#,##0.00"/>
            </Style>
           </Styles>
            #{sheet_xml}
          </Workbook>
        XML
      end

      def build_complete_csv(data, ov)
        sheets = build_sheets(data, ov)
        lines = []
        lines << "WEALTHFLOW — COMPLETE PORTFOLIO STATEMENT"
        lines << "Generated Date,#{dmy(Date.current.to_s)}"
        lines << ""

        sheets.each_with_index do |sh, idx|
          lines << "#{idx + 1}. #{sh[:title]}"
          sh[:rows].each do |r|
            if r[:k] == "blank"
              lines << ""
              next
            end
            cells = r[:c].map do |c|
              n = norm_cell(c, r[:k])
              n[:t] == "Number" ? n[:v].to_f.round(2).to_s : csv_escape(n[:v])
            end
            lines << cells.join(",")
          end
          lines << ""
        end
        lines.join("\n")
      end

      private

      def title_row(t) = { k: "title", c: [t] }
      def head_row(arr) = { k: "head", c: arr }
      def body_row(arr) = { k: "body", c: arr }
      def total_row(arr) = { k: "total", c: arr }
      def blank_row = { k: "blank", c: [] }
      def bold_cell(v) = { v: v, s: "sBoldNum" }
      def gain_cell(v) = { v: v, s: "sGain" }
      def text_cell(v) = { v: v.nil? ? "" : v.to_s, s: "sBody", t: "String" }
      def r2(v) = v.to_f.round(2)
      def dmy(d) = Core::CurrencyFormatter.format_date_dmy(d, "")

      def policy_rows(list, asset_label, person_label, nominee_label, cover_label, premium_label)
        items = Array(list)
        header = head_row([
          "Insurer", "Policy Name", "Policy Type", asset_label, person_label, nominee_label,
          cover_label, premium_label, "Policy No", "Start Date", "End Date", "Days to Expiry", "Renewal Status"
        ])
        rows = items.map do |pol|
          st = Core::FinancialMath.calculate_policy_status(pol[:end_date])
          body_row([
            pol[:insurer], pol[:policy_name], pol[:policy_type].to_s, pol[:asset_ref].to_s,
            pol[:insured_person].to_s, pol[:nominee_person].to_s,
            bold_cell(pol[:sum_insured].to_f), pol[:annual_premium].to_f,
            text_cell(pol[:policy_no]), dmy(pol[:start_date]), dmy(pol[:end_date]),
            st[:days_to_expiry], st[:status]
          ])
        end
        sum = items.sum { |p| p[:sum_insured].to_f }
        prem = items.sum { |p| p[:annual_premium].to_f }
        foot = items.any? ? [total_row(["TOTAL", "", "", "", "", "", sum, prem, "", "", "", "", ""])] : [body_row(["No policies added yet"])]
        [header, *rows, *foot]
      end

      def norm_cell(c, row_kind)
        if c.is_a?(Hash)
          v = c[:v].nil? ? "" : c[:v]
          is_num = c[:t] ? c[:t] == "Number" : (v.is_a?(Numeric) && !v.to_f.nan?)
          return { v: v, t: is_num ? "Number" : "String", s: c[:s] || (is_num ? "sNum" : "sBody") }
        end

        v = c.nil? ? "" : c
        is_num = v.is_a?(Numeric) && !v.to_f.nan?
        case row_kind
        when "head" then { v: v, t: "String", s: "sHead" }
        when "title" then { v: v, t: "String", s: "sTitle" }
        when "total" then { v: v, t: is_num ? "Number" : "String", s: is_num ? "sBoldNum" : "sHead" }
        else { v: v, t: is_num ? "Number" : "String", s: is_num ? "sNum" : "sBody" }
        end
      end

      def esc_xml(val)
        val.to_s
           .gsub("&", "&amp;")
           .gsub("<", "&lt;")
           .gsub(">", "&gt;")
           .gsub('"', "&quot;")
      end

      def csv_escape(val)
        "\"#{val.to_s.gsub('"', '""')}\""
      end
    end
  end
end

