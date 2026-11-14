# frozen_string_literal: true

module Portfolio
  class ActiveRecordBridge
    INSURANCE_CATEGORIES = InsurancePolicy::CATEGORIES

    class << self
      def available?
        ActiveRecord::Base.connection_pool.with_connection do |conn|
          conn.data_source_exists?("portfolio_profiles") && conn.data_source_exists?("users")
        end
      rescue StandardError
        false
      end

      def seeded?(user: nil)
        return false unless available?

        target = resolve_user(user)
        return false unless target

        return true if PortfolioProfile.exists?(user_id: target.id)
        return true if target.primary_demo_user? && PortfolioProfile.where(user_id: nil).exists?

        false
      end

      def import_from_hash!(raw_hash, user: nil)
        h = (raw_hash || {}).deep_stringify_keys
        target = resolve_user(user)
        uid = target.id

        ActiveRecord::Base.transaction do
          backfill_orphan_rows!(target) if target.primary_demo_user?

          profile = PortfolioProfile.find_by(user_id: uid) ||
                    PortfolioProfile.new(user_id: uid)
          existing_pin = profile.pin_digest

          user_meta = h["user"] || {}
          ppf = h["ppf"] || {}
          epf = h["epf"] || {}
          ulip = h["ulip"] || {}
          hl = h["home_loan"] || {}

          profile.assign_attributes(
            user_id: uid,
            name: user_meta["name"].presence || target.name.presence || "WealthFlow Portfolio",
            annual_income: num_or(user_meta["annual_income"], target.annual_income || 1_800_000),
            last_updated: user_meta["last_updated"].to_s,

            ppf_account_identifier: ppf["account_identifier"].presence || "PPF-SOVEREIGN",
            ppf_interest_rate: num_or(ppf["interest_rate"], 7.10),
            ppf_current_balance: ppf["current_balance"].to_f,
            ppf_last_updated: ppf["last_updated"].to_s,
            ppf_rate_authority: ppf["rate_authority"].to_s,
            ppf_effective_quarter: ppf["effective_quarter"].to_s,

            epf_account_identifier: epf["account_identifier"].presence || "EPFO-UAN",
            epf_uan: (epf["uan"].presence || epf["account_identifier"].presence || "EPFO-UAN"),
            epf_interest_rate: num_or(epf["interest_rate"], 8.25),
            epf_current_balance: epf["current_balance"].to_f,
            epf_last_updated: epf["last_updated"].to_s,
            epf_rate_authority: epf["rate_authority"].to_s,
            epf_effective_fy: epf["effective_fy"].to_s,

            ulip_policy_name: ulip["policy_name"].presence || "Market-Linked ULIP",
            ulip_total_paid: ulip["total_paid"].to_f,
            ulip_current_value: ulip["current_value"].to_f,

            home_loan_outstanding_principal: hl["outstanding_principal"].to_f,
            home_loan_monthly_emi: hl["monthly_emi"].to_f,
            home_loan_original_loan_amount: hl["original_loan_amount"].to_f,
            home_loan_start_date: hl["loan_start_date"].to_s,
            home_loan_tenure_years: hl["tenure_years"].to_f,
            home_loan_interest_rate: hl["interest_rate"].to_f,
            home_loan_emi_day: (hl["emi_day"].to_i.positive? ? hl["emi_day"].to_i : 26),

            pin_digest: existing_pin
          )
          profile.save!

          import_mutual_funds!(Array(h["mutual_funds"]), uid)
          import_fixed_deposits!(Array(h["fixed_deposits"]), uid)
          import_recurring_deposits!(Array(h["recurring_deposits"]), Array(h["flexi_rds"]), uid)
          import_ppf_contributions!(Array(ppf["contributions"]), uid)
          import_epf_entries!(Array(epf["entries"]), uid)
          import_insurance_policies!(h, uid)
          import_bank_accounts!(Array(h["bank_accounts"]), uid)
          import_credit_cards!(Array(h["credit_cards"]), uid)
          import_tax_profile!(h["tax_profile"], uid)
        end

        true
      end

      def export_to_hash(user: nil)
        target = resolve_user(user)
        uid = target.id
        backfill_orphan_rows!(target) if target.primary_demo_user? && PortfolioProfile.where(user_id: uid).none? && PortfolioProfile.where(user_id: nil).exists?

        profile = PortfolioProfile.find_by(user_id: uid) ||
                  PortfolioProfile.new(user_id: uid, name: target.name, annual_income: target.annual_income || 1_800_000)

        mutual_funds = MutualFund.where(user_id: uid).includes(:stock_holdings).order(:id).map do |mf|
          {
            "id" => mf.external_id.presence || mf.id,
            "scheme_name" => mf.scheme_name,
            "scheme_code" => mf.scheme_code.to_s,
            "latest_nav" => clean_float(mf.latest_nav),
            "nav_date" => mf.nav_date.to_s,
            "units" => clean_float(mf.units),
            "category" => mf.category.presence || "Equity",
            "amc" => mf.amc.to_s,
            "sip_amount" => clean_num(mf.sip_amount),
            "start_date" => mf.start_date.to_s,
            "current_value" => clean_num(mf.current_value),
            "invested_amount" => clean_num(mf.invested_amount),
            "step_up_pct" => clean_num(mf.step_up_pct),
            "holdings_source" => mf.holdings_source.presence,
            "holdings_updated_at" => mf.holdings_updated_at.presence,
            "holdings" => mf.stock_holdings.order(:id).map do |sh|
              {
                "stock" => sh.stock,
                "ticker" => sh.ticker.to_s,
                "sector" => sh.sector.presence || "Equity",
                "weight" => clean_num(sh.weight)
              }
            end
          }.compact
        end

        fixed_deposits = FixedDeposit.where(user_id: uid).order(:id).map do |fd|
          rec = {
            "id" => fd.external_id.presence || fd.id,
            "bank" => fd.bank,
            "fd_no" => fd.fd_no.to_s,
            "principal" => clean_num(fd.principal),
            "rate" => clean_num(fd.rate),
            "start_date" => fd.start_date.to_s,
            "maturity_date" => fd.maturity_date.to_s
          }
          rec["maturity_amount"] = clean_num(fd.maturity_amount) if fd.maturity_amount.present?
          rec
        end

        recurring_deposits = RecurringDeposit.where(user_id: uid).standard_rd.order(:id).map do |rd|
          rec = {
            "id" => rd.external_id.presence || rd.id,
            "bank" => rd.bank,
            "rd_no" => rd.rd_no.to_s,
            "purpose" => rd.purpose.to_s,
            "monthly_amount" => clean_num(rd.monthly_amount),
            "rate" => clean_num(rd.rate),
            "start_date" => rd.start_date.to_s,
            "end_date" => rd.end_date.to_s
          }
          rec["maturity_amount"] = clean_num(rd.maturity_amount) if rd.maturity_amount.present?
          rec
        end

        flexi_rds = RecurringDeposit.where(user_id: uid).flexi_rd.order(:id).map do |frd|
          rec = {
            "id" => frd.external_id.presence || frd.id,
            "bank" => frd.bank,
            "rd_no" => frd.rd_no.to_s,
            "purpose" => frd.purpose.to_s,
            "base_monthly" => clean_num(frd.base_monthly),
            "total_deposited" => clean_num(frd.total_deposited),
            "rate" => clean_num(frd.rate),
            "start_date" => frd.start_date.to_s,
            "end_date" => frd.end_date.to_s
          }
          rec["maturity_amount"] = clean_num(frd.maturity_amount) if frd.maturity_amount.present?
          rec
        end

        ppf_contributions = PpfContribution.where(user_id: uid).order(:id).map do |c|
          rec = {
            "id" => c.external_id.presence || c.id,
            "fy" => c.fy.to_s,
            "date" => c.date.to_s,
            "amount" => clean_num(c.amount)
          }
          rec["note"] = c.note if c.note.present?
          rec
        end

        epf_entries = EpfEntry.where(user_id: uid).order(:id).map do |e|
          {
            "id" => e.external_id.presence || e.id,
            "date" => e.date.to_s,
            "description" => e.description.to_s,
            "employee" => clean_num(e.employee),
            "employer" => clean_num(e.employer),
            "interest" => clean_num(e.interest)
          }
        end

        policies_by_cat = INSURANCE_CATEGORIES.index_with { |_cat| [] }
        InsurancePolicy.where(user_id: uid).order(:id).each do |pol|
          rec = {
            "id" => pol.external_id.presence || pol.id,
            "insurer" => pol.insurer.to_s,
            "policy_name" => pol.policy_name.to_s,
            "policy_type" => pol.policy_type.to_s,
            "asset_ref" => pol.asset_ref.presence,
            "insured_person" => pol.insured_person.to_s,
            "nominee_person" => pol.nominee_person.to_s,
            "sum_insured" => clean_num(pol.sum_insured),
            "annual_premium" => clean_num(pol.annual_premium),
            "policy_no" => pol.policy_no.to_s,
            "start_date" => pol.start_date.to_s,
            "end_date" => pol.end_date.to_s
          }.compact
          policies_by_cat[pol.category] << rec if policies_by_cat.key?(pol.category)
        end

        bank_accounts = BankAccount.where(user_id: uid).order(:id).map do |acct|
          rec = {
            "id" => acct.external_id.presence || acct.id,
            "bank_name" => acct.bank_name,
            "account_type" => acct.account_type.presence || "Savings",
            "account_no" => acct.account_no.to_s,
            "branch_ifsc" => acct.branch_ifsc.to_s,
            "holder_name" => acct.holder_name.to_s,
            "current_balance" => clean_num(acct.current_balance),
            "interest_rate" => clean_num(acct.interest_rate),
            "nominee" => acct.nominee.to_s,
            "purpose" => acct.purpose.to_s,
            "notes" => acct.notes.to_s
          }
          rec["nominee_notes"] = acct.nominee_notes if acct.nominee_notes.present?
          rec
        end

        credit_cards = CreditCard.where(user_id: uid).order(:id).map do |cc|
          {
            "id" => cc.external_id.presence || cc.id,
            "bank_name" => cc.bank_name.to_s,
            "card_name" => cc.card_name.to_s,
            "network" => cc.network.presence || "Visa",
            "last4" => cc.last4.to_s,
            "billing_day" => cc.billing_day.to_i,
            "due_day" => cc.due_day.to_i,
            "credit_limit" => clean_num(cc.credit_limit),
            "utilized_amount" => clean_num(cc.utilized_amount),
            "reward_points" => cc.reward_points.to_i,
            "annual_fee_notes" => cc.annual_fee_notes.to_s
          }
        end

        tp = TaxProfile.find_by(user_id: uid)
        tax_profile_hash = if tp
                             {
                               "fy" => tp.fy.presence || "2025-26",
                               "age_group" => tp.age_group.presence || "below_60",
                               "preferred_regime" => tp.preferred_regime.presence || "auto",
                               "is_salaried" => tp.is_salaried,
                               "gross_salary" => clean_num(tp.gross_salary),
                               "interest_income" => clean_num(tp.interest_income),
                               "rental_income" => clean_num(tp.rental_income),
                               "other_income" => clean_num(tp.other_income),
                               "hra_exemption" => clean_num(tp.hra_exemption),
                               "professional_tax" => clean_num(tp.professional_tax),
                               "home_loan_interest_24b" => clean_num(tp.home_loan_interest_24b),
                               "sec_80c" => clean_num(tp.sec_80c),
                               "sec_80ccd_1b_nps" => clean_num(tp.sec_80ccd_1b_nps),
                               "sec_80ccd_2_employer_nps" => clean_num(tp.sec_80ccd_2_employer_nps),
                               "sec_80d_health" => clean_num(tp.sec_80d_health),
                               "sec_80tta_savings" => clean_num(tp.sec_80tta_savings),
                               "other_deductions_80e_80g" => clean_num(tp.other_deductions_80e_80g),
                               "tds_deducted" => clean_num(tp.tds_deducted),
                               "advance_tax_paid" => clean_num(tp.advance_tax_paid)
                             }
                           else
                             {}
                           end

        {
          "user" => {
            "name" => profile.name.presence || target.name.presence || "WealthFlow Portfolio",
            "annual_income" => clean_num(profile.annual_income.presence || target.annual_income || 1_800_000),
            "last_updated" => profile.last_updated.presence || Date.current.to_s
          },
          "mutual_funds" => mutual_funds,
          "fixed_deposits" => fixed_deposits,
          "recurring_deposits" => recurring_deposits,
          "flexi_rds" => flexi_rds,
          "ppf" => {
            "account_identifier" => profile.ppf_account_identifier.presence || "PPF-SOVEREIGN",
            "interest_rate" => clean_num(profile.ppf_interest_rate.presence || 7.10),
            "current_balance" => clean_num(profile.ppf_current_balance),
            "last_updated" => profile.ppf_last_updated.presence,
            "rate_authority" => profile.ppf_rate_authority.presence,
            "effective_quarter" => profile.ppf_effective_quarter.presence,
            "contributions" => ppf_contributions
          }.compact,
          "epf" => {
            "account_identifier" => profile.epf_account_identifier.presence || "EPFO-UAN",
            "uan" => profile.epf_uan.presence,
            "interest_rate" => clean_num(profile.epf_interest_rate.presence || 8.25),
            "current_balance" => clean_num(profile.epf_current_balance),
            "last_updated" => profile.epf_last_updated.presence,
            "rate_authority" => profile.epf_rate_authority.presence,
            "effective_fy" => profile.epf_effective_fy.presence,
            "entries" => epf_entries
          }.compact,
          "ulip" => {
            "policy_name" => profile.ulip_policy_name.presence || "Market-Linked ULIP",
            "total_paid" => clean_num(profile.ulip_total_paid),
            "current_value" => clean_num(profile.ulip_current_value)
          },
          "home_loan" => {
            "outstanding_principal" => clean_num(profile.home_loan_outstanding_principal),
            "monthly_emi" => clean_num(profile.home_loan_monthly_emi),
            "original_loan_amount" => clean_num(profile.home_loan_original_loan_amount),
            "loan_start_date" => profile.home_loan_start_date.to_s,
            "tenure_years" => clean_num(profile.home_loan_tenure_years),
            "interest_rate" => clean_num(profile.home_loan_interest_rate),
            "emi_day" => (profile.home_loan_emi_day.to_i.positive? ? profile.home_loan_emi_day.to_i : 26)
          },
          "health_insurance" => policies_by_cat["health_insurance"],
          "life_insurance" => policies_by_cat["life_insurance"],
          "vehicle_insurance" => policies_by_cat["vehicle_insurance"],
          "home_loan_insurance" => policies_by_cat["home_loan_insurance"],
          "bank_accounts" => bank_accounts,
          "credit_cards" => credit_cards,
          "tax_profile" => tax_profile_hash
        }
      end

      private

      def resolve_user(explicit_user)
        explicit_user || Current.user || User.primary_demo_user!
      end

      def backfill_orphan_rows!(target_user)
        uid = target_user.id
        [
          PortfolioProfile, MutualFund, FixedDeposit, RecurringDeposit,
          PpfContribution, EpfEntry, InsurancePolicy, BankAccount, CreditCard, TaxProfile
        ].each do |klass|
          klass.where(user_id: nil).update_all(user_id: uid)
        end
      end

      def import_mutual_funds!(items, uid)
        fund_ids = MutualFund.where(user_id: uid).pluck(:id)
        StockHolding.where(mutual_fund_id: fund_ids).delete_all if fund_ids.any?
        MutualFund.where(user_id: uid).delete_all

        items.each do |raw|
          r = raw.stringify_keys
          mf = MutualFund.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            scheme_name: r["scheme_name"].presence || "Unnamed Scheme",
            scheme_code: r["scheme_code"].to_s,
            latest_nav: r["latest_nav"].to_f,
            nav_date: r["nav_date"].to_s,
            units: r["units"].to_f,
            category: r["category"].presence || "Equity",
            amc: r["amc"].to_s,
            sip_amount: r["sip_amount"].to_f,
            start_date: r["start_date"].to_s,
            current_value: r["current_value"].to_f,
            invested_amount: r["invested_amount"].to_f,
            step_up_pct: r["step_up_pct"].to_f,
            holdings_source: r["holdings_source"].to_s,
            holdings_updated_at: r["holdings_updated_at"].to_s
          )
          Array(r["holdings"]).each do |sh|
            s = sh.stringify_keys
            mf.stock_holdings.create!(
              stock: s["stock"].presence || "Unknown",
              ticker: s["ticker"].to_s,
              sector: s["sector"].presence || "Equity",
              weight: s["weight"].to_f
            )
          end
        end
      end

      def import_fixed_deposits!(items, uid)
        FixedDeposit.where(user_id: uid).delete_all
        items.each do |raw|
          r = raw.stringify_keys
          FixedDeposit.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            bank: r["bank"].presence || "Bank",
            fd_no: r["fd_no"].to_s,
            principal: r["principal"].to_f,
            rate: r["rate"].to_f,
            start_date: r["start_date"].to_s,
            maturity_date: r["maturity_date"].to_s,
            maturity_amount: r["maturity_amount"].present? ? r["maturity_amount"].to_f : nil
          )
        end
      end

      def import_recurring_deposits!(rds, flexi_rds, uid)
        RecurringDeposit.where(user_id: uid).delete_all
        rds.each do |raw|
          r = raw.stringify_keys
          RecurringDeposit.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            deposit_kind: "rd",
            bank: r["bank"].presence || "Bank",
            rd_no: r["rd_no"].to_s,
            purpose: r["purpose"].to_s,
            monthly_amount: r["monthly_amount"].to_f,
            rate: r["rate"].to_f,
            start_date: r["start_date"].to_s,
            end_date: r["end_date"].to_s,
            maturity_amount: r["maturity_amount"].present? ? r["maturity_amount"].to_f : nil
          )
        end
        flexi_rds.each do |raw|
          r = raw.stringify_keys
          RecurringDeposit.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            deposit_kind: "flexi_rd",
            bank: r["bank"].presence || "Bank",
            rd_no: r["rd_no"].to_s,
            purpose: r["purpose"].to_s,
            base_monthly: r["base_monthly"].to_f,
            total_deposited: r["total_deposited"].to_f,
            rate: r["rate"].to_f,
            start_date: r["start_date"].to_s,
            end_date: r["end_date"].to_s,
            maturity_amount: r["maturity_amount"].present? ? r["maturity_amount"].to_f : nil
          )
        end
      end

      def import_ppf_contributions!(items, uid)
        PpfContribution.where(user_id: uid).delete_all
        items.each do |raw|
          r = raw.stringify_keys
          PpfContribution.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            fy: r["fy"].to_s,
            date: r["date"].to_s,
            amount: r["amount"].to_f,
            note: r["note"].to_s
          )
        end
      end

      def import_epf_entries!(items, uid)
        EpfEntry.where(user_id: uid).delete_all
        items.each do |raw|
          r = raw.stringify_keys
          EpfEntry.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            date: r["date"].to_s,
            description: r["description"].to_s,
            employee: r["employee"].to_f,
            employer: r["employer"].to_f,
            interest: r["interest"].to_f
          )
        end
      end

      def import_insurance_policies!(hash, uid)
        InsurancePolicy.where(user_id: uid).delete_all
        INSURANCE_CATEGORIES.each do |cat|
          Array(hash[cat]).each do |raw|
            r = raw.stringify_keys
            InsurancePolicy.create!(
              user_id: uid,
              external_id: id_or_nil(r["id"]),
              category: cat,
              insurer: r["insurer"].to_s,
              policy_name: r["policy_name"].to_s,
              policy_type: r["policy_type"].to_s,
              asset_ref: r["asset_ref"].to_s,
              insured_person: r["insured_person"].to_s,
              nominee_person: r["nominee_person"].to_s,
              sum_insured: r["sum_insured"].to_f,
              annual_premium: r["annual_premium"].to_f,
              policy_no: r["policy_no"].to_s,
              start_date: r["start_date"].to_s,
              end_date: r["end_date"].to_s
            )
          end
        end
      end

      def import_bank_accounts!(items, uid)
        BankAccount.where(user_id: uid).delete_all
        items.each do |raw|
          r = raw.stringify_keys
          BankAccount.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            bank_name: r["bank_name"].presence || "Bank",
            account_type: r["account_type"].presence || "Savings",
            account_no: r["account_no"].to_s,
            branch_ifsc: r["branch_ifsc"].to_s,
            holder_name: r["holder_name"].to_s,
            current_balance: r["current_balance"].to_f,
            interest_rate: r["interest_rate"].to_f,
            nominee: r["nominee"].to_s,
            purpose: r["purpose"].to_s,
            notes: r["notes"].to_s,
            nominee_notes: r["nominee_notes"].to_s
          )
        end
      end

      def import_credit_cards!(items, uid)
        CreditCard.where(user_id: uid).delete_all
        items.each do |raw|
          r = raw.stringify_keys
          CreditCard.create!(
            user_id: uid,
            external_id: id_or_nil(r["id"]),
            bank_name: r["bank_name"].to_s,
            card_name: r["card_name"].to_s,
            network: r["network"].presence || "Visa",
            last4: r["last4"].to_s,
            billing_day: (r["billing_day"].to_i.positive? ? r["billing_day"].to_i : 1),
            due_day: (r["due_day"].to_i.positive? ? r["due_day"].to_i : 15),
            credit_limit: r["credit_limit"].to_f,
            utilized_amount: r["utilized_amount"].to_f,
            reward_points: r["reward_points"].to_i,
            annual_fee_notes: r["annual_fee_notes"].to_s
          )
        end
      end

      def import_tax_profile!(raw, uid)
        if raw.blank? || !raw.is_a?(Hash) || raw.empty?
          TaxProfile.where(user_id: uid).delete_all
          return
        end

        r = raw.stringify_keys
        tp = TaxProfile.find_by(user_id: uid) || TaxProfile.new(user_id: uid)
        tp.assign_attributes(
          user_id: uid,
          fy: r["fy"].presence || "2025-26",
          age_group: r["age_group"].presence || "below_60",
          preferred_regime: r["preferred_regime"].presence || "auto",
          is_salaried: r["is_salaried"] != false && r["is_salaried"].to_s != "false",
          gross_salary: r["gross_salary"].to_f,
          interest_income: r["interest_income"].to_f,
          rental_income: r["rental_income"].to_f,
          other_income: r["other_income"].to_f,
          hra_exemption: r["hra_exemption"].to_f,
          professional_tax: r["professional_tax"].to_f,
          home_loan_interest_24b: r["home_loan_interest_24b"].to_f,
          sec_80c: r["sec_80c"].to_f,
          sec_80ccd_1b_nps: r["sec_80ccd_1b_nps"].to_f,
          sec_80ccd_2_employer_nps: r["sec_80ccd_2_employer_nps"].to_f,
          sec_80d_health: r["sec_80d_health"].to_f,
          sec_80tta_savings: r["sec_80tta_savings"].to_f,
          other_deductions_80e_80g: r["other_deductions_80e_80g"].to_f,
          tds_deducted: r["tds_deducted"].to_f,
          advance_tax_paid: r["advance_tax_paid"].to_f
        )
        tp.save!
      end

      def id_or_nil(val)
        v = val.to_i
        v.positive? ? v : nil
      end

      def num_or(val, fallback)
        val.present? ? val.to_f : fallback.to_f
      end

      def clean_float(val)
        val.to_f
      end

      def clean_num(val)
        f = val.to_f
        (f % 1).zero? ? f.to_i : f
      end
    end
  end
end
