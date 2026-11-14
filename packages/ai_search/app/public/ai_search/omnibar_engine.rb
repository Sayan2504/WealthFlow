# frozen_string_literal: true

module AiSearch
  # AI Financial Omnibar engine powering top-panel natural-language portfolio Q&A and instant shortcuts.
  class OmnibarEngine
    AI_PROMPT_CHIPS = [
      "Net Worth Summary",
      "Tax Regime Comparison",
      "Post-Tax FD Yield",
      "Mutual Fund SIP & Overlap",
      "PPF & EPF Retirement",
      "Credit Card Utilization"
    ].freeze

    MODULE_SHORTCUTS = [
      {
        title: "Overview & Net Worth Dashboard",
        subtitle: "Asset allocation, net worth, liabilities & monthly cashflow summary",
        keywords: "dashboard overview net worth summary assets liabilities allocation",
        url: "/",
        category: "Module",
        badge: "Core"
      },
      {
        title: "Mutual Funds & Stock Overlap",
        subtitle: "SIP step-up simulator, AMFI live NAV sync & overlap matrix",
        keywords: "mf mutual fund funds sip nav amfi overlap stock holding equity",
        url: "/mutual_funds",
        category: "Module",
        badge: "Equities"
      },
      {
        title: "Fixed Income & Post-Tax Slab Yield",
        subtitle: "FD, Recurring Deposits, Flexi RDs, interest & post-tax calculation",
        keywords: "fd rd fixed income deposit recurring flexi interest post tax slab",
        url: "/fixed_income",
        category: "Module",
        badge: "Deposits"
      },
      {
        title: "Retirement Vault (PPF & EPF)",
        subtitle: "PPF ₹1.5L FY tracker, EPF UAN passbook & sovereign interest rates",
        keywords: "retirement ppf epf uan pf pension 1.5l limit sovereign",
        url: "/retirement",
        category: "Module",
        badge: "Retirement"
      },
      {
        title: "Insurance & Risk Coverage",
        subtitle: "Health cover, life term adequacy, ULIP & vehicle policies",
        keywords: "insurance health medical term life ulip vehicle policy cover premium",
        url: "/insurance",
        category: "Module",
        badge: "Protection"
      },
      {
        title: "Home Loan & Mortgage Amortization",
        subtitle: "Principal decrease graph, monthly EMI, interest rate & loan cover",
        keywords: "home loan mortgage emi principal outstanding repaid interest housing liability debt",
        url: "/home_loan",
        category: "Module",
        badge: "EMI"
      },
      {
        title: "Banking & Credit Cards",
        subtitle: "Liquid savings/current accounts, rewards & credit card utilization",
        keywords: "bank banking savings current account balance ifsc credit card limit utilization",
        url: "/banking",
        category: "Module",
        badge: "Liquidity"
      },
      {
        title: "Income Tax Planner (New vs Old Regime)",
        subtitle: "FY 2025-26 115BAC slabs, 87A rebate, 80C/80D/HRA/24B deductions",
        keywords: "tax calculator income regime old new 80c 80d nps hra tds itr refund 115bac",
        url: "/tax_calculator",
        category: "Module",
        badge: "Taxation"
      },
      {
        title: "Account Security & Profile Settings",
        subtitle: "Update sign-in credentials, email, name & annual income",
        keywords: "profile password security account settings email pin lock",
        url: "/users/edit",
        category: "Security",
        badge: "Account"
      }
    ].freeze

    def self.default_suggestions
      MODULE_SHORTCUTS.first(6).map { |s| s.slice(:title, :subtitle, :url, :category, :badge).merge(value: "") }
    end

    def self.search_shortcuts(query)
      tokens = query.to_s.downcase.split(/\s+/).reject(&:blank?)
      return default_suggestions if tokens.empty?

      MODULE_SHORTCUTS.select do |s|
        haystack = "#{s[:title]} #{s[:subtitle]} #{s[:keywords]}".downcase
        tokens.all? do |t|
          t.length <= 3 ? haystack.match?(/\b#{Regexp.escape(t)}\b/) : haystack.include?(t)
        end
      end.map { |s| s.slice(:title, :subtitle, :url, :category, :badge).merge(value: "") }
    end

    def self.search_amfi_catalog(query)
      q = query.to_s.strip
      return [] unless q.length >= 3

      MarketData::AmfiClient.search_schemes(q).first(4).map do |s|
        nav_val = s[:nav].to_f
        {
          category: "AMFI Catalog",
          badge: "Fund",
          title: s[:schemeName] || s[:scheme_name],
          subtitle: "AMFI Code #{s[:schemeCode] || s[:scheme_code]} • #{s[:amc]}",
          value: nav_val.positive? ? "NAV ₹#{nav_val.round(2)}" : "Add to MF",
          url: "/mutual_funds"
        }
      end
    rescue StandardError
      []
    end

    def self.synthesize_ai_insight(query:, portfolio_data:)
      return nil if portfolio_data.blank?

      ov = Dashboard::Aggregator.calculate_overview(portfolio_data)
      q = query.to_s.strip.downcase

      if q.blank?
        return {
          title: "WealthFlow AI Portfolio Brief",
          badge: "AI Overview",
          metric: Core::CurrencyFormatter.format_inr(ov[:netWorth]),
          answer: "Net worth stands at #{Core::CurrencyFormatter.format_inr(ov[:netWorth])} across #{Core::CurrencyFormatter.format_inr(ov[:totalAssets])} in gross assets. Recommended tax regime: #{ov.dig(:taxCalc, :recommendedRegime)} (saves #{Core::CurrencyFormatter.format_inr(ov.dig(:taxCalc, :taxSavings))}).",
          url: "/"
        }
      end

      if q.match?(/tax|regime|80c|80d|itr|rebate|tds|salary|nps|hra/)
        tc = ov[:taxCalc] || {}
        nr = tc[:newRegime] || {}
        old_r = tc[:oldRegime] || {}
        rec = tc[:recommendedRegime].presence || "New Regime"
        savings = tc[:taxSavings].to_f
        return {
          title: "AI Tax Regime Advisor (FY 2025-26)",
          badge: "AI Tax Insight",
          metric: "#{rec} Saves #{Core::CurrencyFormatter.format_inr(savings)}",
          answer: "New Regime liability is #{Core::CurrencyFormatter.format_inr(nr[:totalTax])} vs Old Regime #{Core::CurrencyFormatter.format_inr(old_r[:totalTax])} on #{Core::CurrencyFormatter.format_inr(tc[:grossTotalIncome])} gross income.",
          url: "/tax_calculator"
        }
      end

      if q.match?(/fd|rd|fixed|deposit|interest|yield|post[-\s]?tax|slab/)
        pt = ov[:postTax] || {}
        return {
          title: "AI Fixed Income & Post-Tax Brief",
          badge: "AI Yield Insight",
          metric: "#{Core::CurrencyFormatter.format_inr(pt[:postTaxGain])} Net Gain",
          answer: "Gross FD/RD interest is #{Core::CurrencyFormatter.format_inr(pt[:totalGrossGain])}; after #{(pt[:effectiveTaxRate].to_f * 100).round(2)}% slab + cess, net keep-home gain is #{Core::CurrencyFormatter.format_inr(pt[:postTaxGain])} (#{pt[:postTaxYield]}% post-tax yield).",
          url: "/fixed_income"
        }
      end

      if q.match?(/mf|mutual|sip|overlap|stock|nav|equity|fund|step/)
        mf = ov[:mf] || {}
        return {
          title: "AI Equity & SIP Analytics Brief",
          badge: "AI MF Insight",
          metric: "#{Core::CurrencyFormatter.format_inr(mf[:current])} Corpus",
          answer: "Invested #{Core::CurrencyFormatter.format_inr(mf[:invested])} with gain of #{Core::CurrencyFormatter.format_inr(mf[:gain])} (#{Kernel.format('%.1f', mf[:gainPct].to_f)}%). Active monthly SIP outflow is #{Core::CurrencyFormatter.format_inr(mf[:sip])}/mo.",
          url: "/mutual_funds"
        }
      end

      if q.match?(/ppf|epf|retire|uan|sovereign|pension/)
        ppf = ov[:ppf] || {}
        epf = ov[:epf] || {}
        ret_total = ppf[:balance].to_f + epf[:balance].to_f
        return {
          title: "AI Retirement Corpus Brief",
          badge: "AI Sovereign Brief",
          metric: "#{Core::CurrencyFormatter.format_inr(ret_total)} Combined",
          answer: "PPF balance is #{Core::CurrencyFormatter.format_inr(ppf[:balance])} (@ #{ppf[:rate]}%, FY contribution #{Core::CurrencyFormatter.format_inr(ppf[:latestFyTotal])}) and EPF balance is #{Core::CurrencyFormatter.format_inr(epf[:balance])} (@ #{epf[:rate]}%).",
          url: "/retirement"
        }
      end

      if q.match?(/insur|health|life|term|cover|policy|ulip|vehicle/)
        hc = ov.dig(:health, :sumInsured).to_f
        lc = ov.dig(:life, :sumInsured).to_f
        return {
          title: "AI Coverage & Protection Brief",
          badge: "AI Cover Insight",
          metric: "#{Core::CurrencyFormatter.format_inr(hc + lc)} H+L Cover",
          answer: "Active policies provide #{Core::CurrencyFormatter.format_inr(hc)} health cover (#{ov.dig(:health, :count).to_i} policies) and #{Core::CurrencyFormatter.format_inr(lc)} life cover (#{ov.dig(:life, :count).to_i} policies).",
          url: "/insurance"
        }
      end

      if q.match?(/home\s*loan|mortgage|emi|principal|sanction|housing/)
        hl = ov[:homeLoan] || {}
        return {
          title: "AI Home Loan & Amortization Brief",
          badge: "AI Mortgage Insight",
          metric: "#{Core::CurrencyFormatter.format_inr(hl[:outstanding_principal])} Due",
          answer: "Outstanding principal is #{Core::CurrencyFormatter.format_inr(hl[:outstanding_principal])} of #{Core::CurrencyFormatter.format_inr(hl[:original_loan_amount])} (#{hl[:repaid_pct].to_i}% repaid). Monthly EMI is #{Core::CurrencyFormatter.format_inr(hl[:monthly_emi])} at #{hl[:interest_rate].to_f}% p.a.",
          url: "/home_loan"
        }
      end

      if q.match?(/bank|card|credit|liquid|limit|util/)
        acct = ov.dig(:banking, :accounts) || {}
        cards = ov.dig(:banking, :cards) || {}
        return {
          title: "AI Banking & Credit Card Brief",
          badge: "AI Liquidity Brief",
          metric: "#{Core::CurrencyFormatter.format_inr(acct[:totalBalance])} Cash",
          answer: "Bank liquidity is #{Core::CurrencyFormatter.format_inr(acct[:totalBalance])} across #{acct[:count].to_i} accounts. Card utilization is #{cards[:utilizationPct].to_f}% with #{Core::CurrencyFormatter.format_inr(cards[:totalAvailable])} available limit.",
          url: "/banking"
        }
      end

      {
        title: "AI Portfolio Copilot: \"#{query.to_s.strip}\"",
        badge: "AI Brief",
        metric: "#{Core::CurrencyFormatter.format_inr(ov[:netWorth])} Net Worth",
        answer: "Gross assets #{Core::CurrencyFormatter.format_inr(ov[:totalAssets])} • Total gain #{Core::CurrencyFormatter.format_inr(ov[:totalGain])} • Allocation: #{ov.dig(:allocation, :mfPct)}% MF, #{ov.dig(:allocation, :fiPct)}% Fixed Income, #{ov.dig(:allocation, :retPct)}% Retirement.",
        url: "/"
      }
    rescue StandardError
      nil
    end
  end
end

