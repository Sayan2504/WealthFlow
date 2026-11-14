# frozen_string_literal: true

module TaxPlanning
  # Canonical Indian Income Tax (FY 2024-25 & FY 2025-26 / 2026-27) Old vs New Regime calculator.
  class RegimeComparator
    def self.default_tax_profile(data = {})
      mfs = Array(data[:mutual_funds]).map(&:with_indifferent_access)
      elss_80c = mfs.sum do |f|
        name = f[:scheme_name].to_s.downcase
        (name.include?("elss") || name.include?("tax")) ? (f[:sip_amount].to_f * 12.0) : 0.0
      end

      ppf_80c = Array(data.dig(:ppf, :contributions)).sum { |c| c[:amount].to_f }
      sec_80c_auto = [150_000.0, elss_80c + ppf_80c].min.round

      health_80d = Array(data[:health_insurance]).sum { |p| p[:annual_premium].to_f }.round
      sec_80d_auto = [75_000.0, health_80d].min.round

      {
        fy: "2025-26",
        age_group: "below_60",
        is_salaried: true,
        preferred_regime: "auto",
        gross_salary: 1_800_000,
        interest_income: 0,
        rental_income: 0,
        other_income: 0,
        sec_80c: sec_80c_auto.positive? ? sec_80c_auto : 150_000,
        sec_80d_health: sec_80d_auto.positive? ? sec_80d_auto : 25_000,
        sec_80ccd_1b_nps: 50_000,
        sec_80ccd_2_employer_nps: 0,
        hra_exemption: 120_000,
        home_loan_interest_24b: 200_000,
        sec_80tta_savings: 10_000,
        other_deductions_80e_80g: 0,
        professional_tax: 2400,
        tds_deducted: 165_000,
        advance_tax_paid: 0
      }.with_indifferent_access
    end

    def self.calculate_both_regimes(raw_profile, data = {})
      defaults = default_tax_profile(data)
      raw = (raw_profile || {}).transform_keys(&:to_s)
      p = defaults.merge(raw).with_indifferent_access

      gross_salary = [0.0, p[:gross_salary].to_f].max
      interest_income = [0.0, p[:interest_income].to_f].max
      rental_income = [0.0, p[:rental_income].to_f].max
      other_income = [0.0, p[:other_income].to_f].max
      gross_total_income = (gross_salary + interest_income + rental_income + other_income).round

      is_salaried = p[:is_salaried] != false && p[:is_salaried].to_s != "false"
      p[:is_salaried] = is_salaried
      fy = p[:fy].presence || "2025-26"
      age_group = p[:age_group].presence || "below_60"

      # 1. NEW TAX REGIME (Section 115BAC)
      new_std_deduction = is_salaried ? [gross_salary, 75_000].min.round : 0
      new_employer_nps = [0.0, p[:sec_80ccd_2_employer_nps].to_f].max.round
      new_rental_std_ded = (rental_income * 0.30).round
      new_total_deductions = new_std_deduction + new_employer_nps + new_rental_std_ded
      new_taxable_income = [0, gross_total_income - new_total_deductions].max

      new_slabs = if fy == "2024-25"
                    [
                      { min: 0, max: 300_000, rate: 0, label: "Up to ₹3,00,000" },
                      { min: 300_000, max: 700_000, rate: 5, label: "₹3,00,001 – ₹7,00,000" },
                      { min: 700_000, max: 1_000_000, rate: 10, label: "₹7,00,001 – ₹10,00,000" },
                      { min: 1_000_000, max: 1_200_000, rate: 15, label: "₹10,00,001 – ₹12,00,000" },
                      { min: 1_200_000, max: 1_500_000, rate: 20, label: "₹12,00,001 – ₹15,00,000" },
                      { min: 1_500_000, max: Float::INFINITY, rate: 30, label: "Above ₹15,00,000" }
                    ]
                  else
                    [
                      { min: 0, max: 400_000, rate: 0, label: "Up to ₹4,00,000" },
                      { min: 400_000, max: 800_000, rate: 5, label: "₹4,00,001 – ₹8,00,000" },
                      { min: 800_000, max: 1_200_000, rate: 10, label: "₹8,00,001 – ₹12,00,000" },
                      { min: 1_200_000, max: 1_600_000, rate: 15, label: "₹12,00,001 – ₹16,00,000" },
                      { min: 1_600_000, max: 2_000_000, rate: 20, label: "₹16,00,001 – ₹20,00,000" },
                      { min: 2_000_000, max: 2_400_000, rate: 25, label: "₹20,00,001 – ₹24,00,000" },
                      { min: 2_400_000, max: Float::INFINITY, rate: 30, label: "Above ₹24,00,000" }
                    ]
                  end

      new_breakdown = compute_slab_breakdown(new_taxable_income, new_slabs)
      new_rebate_threshold = fy == "2024-25" ? 700_000 : 1_200_000
      new_max_rebate = fy == "2024-25" ? 25_000 : 60_000

      new_rebate_87a = 0
      new_marginal_relief = 0
      if new_taxable_income <= new_rebate_threshold
        new_rebate_87a = [new_breakdown[:total_slab_tax], new_max_rebate].min
      else
        excess_income = new_taxable_income - new_rebate_threshold
        new_marginal_relief = new_breakdown[:total_slab_tax] - excess_income if new_breakdown[:total_slab_tax] > excess_income
      end

      new_tax_after_rebate = [0, new_breakdown[:total_slab_tax] - new_rebate_87a - new_marginal_relief].max
      new_surcharge = compute_surcharge(new_tax_after_rebate, new_taxable_income, true)
      new_cess = ((new_tax_after_rebate + new_surcharge[:amount]) * 0.04).round
      new_total_tax = new_tax_after_rebate + new_surcharge[:amount] + new_cess

      # 2. OLD TAX REGIME
      old_std_deduction = is_salaried ? [gross_salary, 50_000].min.round : 0
      old_prof_tax = is_salaried ? [2500, [0.0, p[:professional_tax].to_f].max].min.round : 0
      old_hra = is_salaried ? [0.0, p[:hra_exemption].to_f].max.round : 0
      old_home_loan_24b = [200_000, [0.0, p[:home_loan_interest_24b].to_f].max].min.round
      old_80c = [150_000, [0.0, p[:sec_80c].to_f].max].min.round
      old_80ccd_1b = [50_000, [0.0, p[:sec_80ccd_1b_nps].to_f].max].min.round
      old_80ccd_2 = new_employer_nps
      old_80d = [100_000, [0.0, p[:sec_80d_health].to_f].max].min.round
      max_80tta = age_group == "below_60" ? 10_000 : 50_000
      old_80tta = [max_80tta, [0.0, p[:sec_80tta_savings].to_f].max].min.round
      old_other_ded = [0.0, p[:other_deductions_80e_80g].to_f].max.round
      old_rental_std_ded = new_rental_std_ded

      old_total_deductions =
        old_std_deduction + old_prof_tax + old_hra + old_home_loan_24b +
        old_80c + old_80ccd_1b + old_80ccd_2 + old_80d + old_80tta +
        old_other_ded + old_rental_std_ded

      old_taxable_income = [0, gross_total_income - old_total_deductions].max

      basic_exemption = case age_group
                        when "super_senior_80" then 500_000
                        when "senior_60_80" then 300_000
                        else 250_000
                        end

      old_slabs = if age_group == "super_senior_80"
                    [
                      { min: 0, max: 500_000, rate: 0, label: "Up to ₹5,00,000 (Super Senior)" },
                      { min: 500_000, max: 1_000_000, rate: 20, label: "₹5,00,001 – ₹10,00,000" },
                      { min: 1_000_000, max: Float::INFINITY, rate: 30, label: "Above ₹10,00,000" }
                    ]
                  else
                    [
                      { min: 0, max: basic_exemption, rate: 0, label: "Up to #{Core::CurrencyFormatter.format_inr(basic_exemption)}" },
                      { min: basic_exemption, max: 500_000, rate: 5, label: "#{Core::CurrencyFormatter.format_inr(basic_exemption + 1)} – ₹5,00,000" },
                      { min: 500_000, max: 1_000_000, rate: 20, label: "₹5,00,001 – ₹10,00,000" },
                      { min: 1_000_000, max: Float::INFINITY, rate: 30, label: "Above ₹10,00,000" }
                    ]
                  end

      old_breakdown = compute_slab_breakdown(old_taxable_income, old_slabs)
      old_rebate_87a = old_taxable_income <= 500_000 ? [old_breakdown[:total_slab_tax], 12_500].min : 0
      old_tax_after_rebate = [0, old_breakdown[:total_slab_tax] - old_rebate_87a].max
      old_surcharge = compute_surcharge(old_tax_after_rebate, old_taxable_income, false)
      old_cess = ((old_tax_after_rebate + old_surcharge[:amount]) * 0.04).round
      old_total_tax = old_tax_after_rebate + old_surcharge[:amount] + old_cess

      tds_deducted = [0.0, p[:tds_deducted].to_f].max.round
      advance_tax_paid = [0.0, p[:advance_tax_paid].to_f].max.round
      total_taxes_paid = tds_deducted + advance_tax_paid

      new_refund_or_payable = total_taxes_paid - new_total_tax
      old_refund_or_payable = total_taxes_paid - old_total_tax

      recommended_regime = new_total_tax <= old_total_tax ? "new" : "old"
      tax_savings = (old_total_tax - new_total_tax).abs
      pref = p[:preferred_regime].to_s
      active_regime = %w[new old].include?(pref) ? pref : recommended_regime

      new_eff_rate = gross_total_income.positive? ? ((new_total_tax.to_f / gross_total_income) * 100.0).round(2) : 0.0
      old_eff_rate = gross_total_income.positive? ? ((old_total_tax.to_f / gross_total_income) * 100.0).round(2) : 0.0

      {
        profile: p,
        grossTotalIncome: gross_total_income,
        grossTotalIncomeInr: Core::CurrencyFormatter.format_inr(gross_total_income),
        totalTaxesPaid: total_taxes_paid,
        totalTaxesPaidInr: Core::CurrencyFormatter.format_inr(total_taxes_paid),
        recommendedRegime: recommended_regime,
        activeRegime: active_regime,
        taxSavings: tax_savings,
        taxSavingsInr: Core::CurrencyFormatter.format_inr(tax_savings),
        newRegime: build_regime_payload(
          std_ded: new_std_deduction,
          total_ded: new_total_deductions,
          taxable: new_taxable_income,
          slabs: new_breakdown[:rows],
          slab_tax: new_breakdown[:total_slab_tax],
          rebate: new_rebate_87a,
          marginal_relief: new_marginal_relief,
          tax_after_rebate: new_tax_after_rebate,
          surcharge: new_surcharge,
          cess: new_cess,
          total_tax: new_total_tax,
          eff_rate: new_eff_rate,
          gross_total: gross_total_income,
          refund_or_payable: new_refund_or_payable
        ),
        oldRegime: build_regime_payload(
          std_ded: old_std_deduction,
          total_ded: old_total_deductions,
          taxable: old_taxable_income,
          slabs: old_breakdown[:rows],
          slab_tax: old_breakdown[:total_slab_tax],
          rebate: old_rebate_87a,
          marginal_relief: 0,
          tax_after_rebate: old_tax_after_rebate,
          surcharge: old_surcharge,
          cess: old_cess,
          total_tax: old_total_tax,
          eff_rate: old_eff_rate,
          gross_total: gross_total_income,
          refund_or_payable: old_refund_or_payable
        )
      }.with_indifferent_access
    end

    def self.build_regime_payload(std_ded:, total_ded:, taxable:, slabs:, slab_tax:, rebate:, marginal_relief:, tax_after_rebate:, surcharge:, cess:, total_tax:, eff_rate:, gross_total:, refund_or_payable:)
      net_post_tax = [0, gross_total - total_tax].max
      monthly_take_home = (net_post_tax / 12.0).round
      rebate_plus_relief = rebate + marginal_relief
      surcharge_plus_cess = surcharge[:amount].to_i + cess

      {
        stdDeduction: std_ded,
        totalDeductions: total_ded,
        totalDeductionsInr: Core::CurrencyFormatter.format_inr(total_ded),
        taxableIncome: taxable,
        taxableIncomeInr: Core::CurrencyFormatter.format_inr(taxable),
        slabs: slabs,
        slabTax: slab_tax,
        slabTaxInr: Core::CurrencyFormatter.format_inr(slab_tax),
        rebate87A: rebate,
        marginalRelief: marginal_relief,
        rebatePlusRelief: rebate_plus_relief,
        rebatePlusReliefInr: Core::CurrencyFormatter.format_inr(rebate_plus_relief),
        taxAfterRebate: tax_after_rebate,
        surcharge: surcharge,
        cess: cess,
        cessInr: Core::CurrencyFormatter.format_inr(cess),
        surchargePlusCess: surcharge_plus_cess,
        surchargePlusCessInr: Core::CurrencyFormatter.format_inr(surcharge_plus_cess),
        totalTax: total_tax,
        totalTaxInr: Core::CurrencyFormatter.format_inr(total_tax),
        effectiveRate: eff_rate,
        effectiveRateLabel: "#{Kernel.format('%.2f', eff_rate)}%",
        netPostTaxIncome: net_post_tax,
        monthlyTakeHome: monthly_take_home,
        monthlyTakeHomeInr: Core::CurrencyFormatter.format_inr(monthly_take_home),
        refundOrPayable: refund_or_payable,
        refundOrPayableInr: Core::CurrencyFormatter.format_inr(refund_or_payable),
        refundLabel: refund_or_payable >= 0 ? "Expected Refund: #{Core::CurrencyFormatter.format_inr(refund_or_payable)}" : "Tax Payable: #{Core::CurrencyFormatter.format_inr(refund_or_payable.abs)}"
      }
    end

    def self.compute_slab_breakdown(taxable_income, slabs)
      total_slab_tax = 0
      rows = slabs.map do |s|
        min_v = s[:min]
        max_v = s[:max]
        rate = s[:rate]
        taxable_in_slab = 0
        if taxable_income > min_v
          taxable_in_slab = max_v == Float::INFINITY ? (taxable_income - min_v) : [0, [taxable_income, max_v].min - min_v].max
        end
        tax_in_slab = (taxable_in_slab * (rate / 100.0)).round
        total_slab_tax += tax_in_slab
        {
          label: s[:label],
          rate: rate,
          taxableInSlab: taxable_in_slab,
          taxInSlab: tax_in_slab,
          taxableInSlabInr: Core::CurrencyFormatter.format_inr(taxable_in_slab),
          taxInSlabInr: Core::CurrencyFormatter.format_inr(tax_in_slab)
        }
      end
      { rows: rows, total_slab_tax: total_slab_tax }
    end

    def self.compute_surcharge(tax_after_rebate, taxable_income, is_new_regime)
      return { rate: 0, amount: 0 } if taxable_income <= 5_000_000 || tax_after_rebate <= 0

      rate = if taxable_income > 50_000_000
               is_new_regime ? 25 : 37
             elsif taxable_income > 20_000_000
               25
             elsif taxable_income > 10_000_000
               15
             else
               10
             end
      { rate: rate, amount: (tax_after_rebate * (rate / 100.0)).round }
    end
  end
end
