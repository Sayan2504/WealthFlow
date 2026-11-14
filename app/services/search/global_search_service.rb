# frozen_string_literal: true

module Search
  # Security-hardened global multi-model search powered by Ransack + AiSearch::OmnibarEngine,
  # strictly scoped to the authenticated user's own database records.
  class GlobalSearchService
    def self.search(user:, query:, limit: 24)
      q = query.to_s.strip
      return AiSearch::OmnibarEngine.default_suggestions if q.blank?

      results = []
      results.concat(AiSearch::OmnibarEngine.search_shortcuts(q))
      if user
        results.concat(search_mutual_funds(user, q))
        results.concat(search_stock_holdings(user, q))
        results.concat(search_fixed_deposits(user, q))
        results.concat(search_recurring_deposits(user, q))
        results.concat(search_bank_accounts(user, q))
        results.concat(search_credit_cards(user, q))
        results.concat(search_insurance_policies(user, q))
        results.concat(search_retirement_records(user, q))
      end
      results.concat(AiSearch::OmnibarEngine.search_amfi_catalog(q))

      results.first(limit)
    end

    def self.search_with_ai(user:, query:, portfolio_data: nil, limit: 24)
      q = query.to_s.strip
      data = portfolio_data
      if data.nil? && user
        data = Portfolio::Repository.instance.read(user: user)
      end

      {
        results: search(user: user, query: q, limit: limit),
        ai_insight: AiSearch::OmnibarEngine.synthesize_ai_insight(query: q, portfolio_data: data),
        quick_prompts: AiSearch::OmnibarEngine::AI_PROMPT_CHIPS
      }
    end

    def self.search_mutual_funds(user, q)
      MutualFund.where(user_id: user.id)
                .ransack(scheme_name_or_scheme_code_or_category_or_amc_cont: q)
                .result
                .limit(6)
                .map do |mf|
                  {
                    category: "Mutual Fund",
                    badge: mf.category.presence || "Equity",
                    title: mf.scheme_name,
                    subtitle: "Code #{mf.scheme_code.presence || '—'} • SIP #{Core::CurrencyFormatter.format_inr(mf.sip_amount)}/mo",
                    value: Core::CurrencyFormatter.format_inr(mf.current_value),
                    url: "/mutual_funds"
                  }
                end
    end

    def self.search_stock_holdings(user, q)
      StockHolding.joins(:mutual_fund)
                  .where(mutual_funds: { user_id: user.id })
                  .ransack(stock_or_ticker_or_sector_cont: q)
                  .result
                  .includes(:mutual_fund)
                  .limit(6)
                  .map do |sh|
                    {
                      category: "Underlying Stock",
                      badge: sh.ticker.presence || "STOCK",
                      title: sh.stock,
                      subtitle: "#{sh.sector} • via #{sh.mutual_fund.scheme_name}",
                      value: "#{Kernel.format('%.2f', sh.weight.to_f)}%",
                      url: "/mutual_funds"
                    }
                  end
    end

    def self.search_fixed_deposits(user, q)
      FixedDeposit.where(user_id: user.id)
                  .ransack(bank_or_fd_no_cont: q)
                  .result
                  .limit(6)
                  .map do |fd|
                    {
                      category: "Fixed Deposit",
                      badge: "#{fd.rate.to_f}% p.a.",
                      title: "#{fd.bank} FD",
                      subtitle: "A/C #{fd.fd_no.presence || '—'} • Matures #{Core::CurrencyFormatter.format_date_dmy(fd.maturity_date)}",
                      value: Core::CurrencyFormatter.format_inr(fd.principal),
                      url: "/fixed_income"
                    }
                  end
    end

    def self.search_recurring_deposits(user, q)
      RecurringDeposit.where(user_id: user.id)
                      .ransack(bank_or_rd_no_or_purpose_cont: q)
                      .result
                      .limit(6)
                      .map do |rd|
                        amt = rd.deposit_kind == "flexi_rd" ? rd.total_deposited : rd.monthly_amount
                        kind_label = rd.deposit_kind == "flexi_rd" ? "Flexi RD" : "Recurring Deposit"
                        {
                          category: kind_label,
                          badge: "#{rd.rate.to_f}%",
                          title: "#{rd.bank} #{kind_label}",
                          subtitle: rd.purpose.presence || "A/C #{rd.rd_no}",
                          value: Core::CurrencyFormatter.format_inr(amt),
                          url: "/fixed_income"
                        }
                      end
    end

    def self.search_bank_accounts(user, q)
      BankAccount.where(user_id: user.id)
                 .ransack(bank_name_or_account_type_or_purpose_or_account_no_cont: q)
                 .result
                 .limit(6)
                 .map do |acct|
                   {
                     category: "Bank Account",
                     badge: acct.account_type.presence || "Savings",
                     title: acct.bank_name,
                     subtitle: acct.purpose.presence || "A/C •••#{acct.account_no.to_s.last(4)}",
                     value: Core::CurrencyFormatter.format_inr(acct.current_balance),
                     url: "/banking"
                   }
                 end
    end

    def self.search_credit_cards(user, q)
      CreditCard.where(user_id: user.id)
                .ransack(bank_name_or_card_name_or_network_or_last4_cont: q)
                .result
                .limit(5)
                .map do |cc|
                  {
                    category: "Credit Card",
                    badge: "#{cc.network} •#{cc.last4}",
                    title: "#{cc.bank_name} #{cc.card_name}".strip,
                    subtitle: "Limit #{Core::CurrencyFormatter.format_inr(cc.credit_limit)} • Due Day #{cc.due_day}",
                    value: Core::CurrencyFormatter.format_inr(cc.utilized_amount),
                    url: "/banking"
                  }
                end
    end

    def self.search_insurance_policies(user, q)
      InsurancePolicy.where(user_id: user.id)
                     .ransack(insurer_or_policy_name_or_policy_no_or_insured_person_cont: q)
                     .result
                     .limit(6)
                     .map do |pol|
                       {
                         category: "Insurance",
                         badge: pol.category.humanize.titleize,
                         title: pol.policy_name.presence || pol.insurer,
                         subtitle: "#{pol.insurer} • Insured: #{pol.insured_person.presence || 'Self'}",
                         value: Core::CurrencyFormatter.format_inr(pol.sum_insured),
                         url: "/insurance"
                       }
                     end
    end

    def self.search_retirement_records(user, q)
      ppf = PpfContribution.where(user_id: user.id)
                           .ransack(fy_or_note_cont: q)
                           .result
                           .limit(4)
                           .map do |c|
                             {
                               category: "PPF Deposit",
                               badge: c.fy,
                               title: "PPF FY #{c.fy}",
                               subtitle: c.note.presence || "Deposited #{Core::CurrencyFormatter.format_date_dmy(c.date)}",
                               value: Core::CurrencyFormatter.format_inr(c.amount),
                               url: "/retirement"
                             }
                           end

      epf = EpfEntry.where(user_id: user.id)
                    .ransack(description_or_date_cont: q)
                    .result
                    .limit(4)
                    .map do |e|
                      total = e.employee.to_f + e.employer.to_f + e.interest.to_f
                      {
                        category: "EPF Entry",
                        badge: e.date,
                        title: e.description.presence || "EPF Credit",
                        subtitle: "Emp #{Core::CurrencyFormatter.format_inr(e.employee)} + Er #{Core::CurrencyFormatter.format_inr(e.employer)}",
                        value: Core::CurrencyFormatter.format_inr(total),
                        url: "/retirement"
                      }
                    end

      ppf + epf
    end
  end
end
