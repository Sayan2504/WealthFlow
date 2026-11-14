# frozen_string_literal: true

class CreateWealthflowTables < ActiveRecord::Migration[8.1]
  def change
    create_table :portfolio_profiles, if_not_exists: true do |t|
      t.string :name, default: "WealthFlow Portfolio"
      t.decimal :annual_income, precision: 15, scale: 2, default: 1_800_000
      t.string :last_updated

      # PPF root attributes
      t.string :ppf_account_identifier, default: "PPF-SOVEREIGN"
      t.decimal :ppf_interest_rate, precision: 6, scale: 2, default: 7.10
      t.decimal :ppf_current_balance, precision: 15, scale: 2, default: 0
      t.string :ppf_last_updated
      t.string :ppf_rate_authority
      t.string :ppf_effective_quarter

      # EPF root attributes
      t.string :epf_account_identifier, default: "EPFO-UAN"
      t.string :epf_uan, default: "EPFO-UAN"
      t.decimal :epf_interest_rate, precision: 6, scale: 2, default: 8.25
      t.decimal :epf_current_balance, precision: 15, scale: 2, default: 0
      t.string :epf_last_updated
      t.string :epf_rate_authority
      t.string :epf_effective_fy

      # ULIP root attributes
      t.string :ulip_policy_name, default: "Market-Linked ULIP"
      t.decimal :ulip_total_paid, precision: 15, scale: 2, default: 0
      t.decimal :ulip_current_value, precision: 15, scale: 2, default: 0

      # Home Loan root attributes
      t.decimal :home_loan_outstanding_principal, precision: 15, scale: 2, default: 0
      t.decimal :home_loan_monthly_emi, precision: 15, scale: 2, default: 0
      t.decimal :home_loan_original_loan_amount, precision: 15, scale: 2, default: 0
      t.string :home_loan_start_date
      t.decimal :home_loan_tenure_years, precision: 6, scale: 2, default: 0
      t.decimal :home_loan_interest_rate, precision: 6, scale: 2, default: 0
      t.integer :home_loan_emi_day, default: 26

      # Optional PIN lock (bcrypt has_secure_password :pin)
      t.string :pin_digest

      t.timestamps
    end

    create_table :mutual_funds, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :scheme_name, null: false
      t.string :scheme_code
      t.decimal :latest_nav, precision: 14, scale: 4, default: 0
      t.string :nav_date
      t.decimal :units, precision: 16, scale: 4, default: 0
      t.string :category, default: "Equity"
      t.string :amc
      t.decimal :sip_amount, precision: 15, scale: 2, default: 0
      t.string :start_date
      t.decimal :current_value, precision: 15, scale: 2, default: 0
      t.decimal :invested_amount, precision: 15, scale: 2, default: 0
      t.decimal :step_up_pct, precision: 6, scale: 2, default: 0
      t.string :holdings_source
      t.string :holdings_updated_at
      t.timestamps
    end
    add_index :mutual_funds, :external_id, if_not_exists: true

    create_table :stock_holdings, if_not_exists: true do |t|
      t.references :mutual_fund, null: false, foreign_key: true
      t.string :stock, null: false
      t.string :ticker
      t.string :sector, default: "Equity"
      t.decimal :weight, precision: 8, scale: 2, default: 0
      t.timestamps
    end

    create_table :fixed_deposits, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :bank, null: false
      t.string :fd_no
      t.decimal :principal, precision: 15, scale: 2, default: 0
      t.decimal :rate, precision: 6, scale: 2, default: 0
      t.string :start_date
      t.string :maturity_date
      t.decimal :maturity_amount, precision: 15, scale: 2
      t.timestamps
    end
    add_index :fixed_deposits, :external_id, if_not_exists: true

    create_table :recurring_deposits, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :deposit_kind, default: "rd", null: false
      t.string :bank, null: false
      t.string :rd_no
      t.string :purpose
      t.decimal :monthly_amount, precision: 15, scale: 2, default: 0
      t.decimal :base_monthly, precision: 15, scale: 2, default: 0
      t.decimal :total_deposited, precision: 15, scale: 2, default: 0
      t.decimal :rate, precision: 6, scale: 2, default: 0
      t.string :start_date
      t.string :end_date
      t.decimal :maturity_amount, precision: 15, scale: 2
      t.timestamps
    end
    add_index :recurring_deposits, :external_id, if_not_exists: true
    add_index :recurring_deposits, :deposit_kind, if_not_exists: true

    create_table :ppf_contributions, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :fy
      t.string :date
      t.decimal :amount, precision: 15, scale: 2, default: 0
      t.string :note
      t.timestamps
    end
    add_index :ppf_contributions, :external_id, if_not_exists: true

    create_table :epf_entries, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :date
      t.string :description
      t.decimal :employee, precision: 15, scale: 2, default: 0
      t.decimal :employer, precision: 15, scale: 2, default: 0
      t.decimal :interest, precision: 15, scale: 2, default: 0
      t.timestamps
    end
    add_index :epf_entries, :external_id, if_not_exists: true

    create_table :insurance_policies, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :category, null: false
      t.string :insurer
      t.string :policy_name
      t.string :policy_type
      t.string :asset_ref
      t.string :insured_person
      t.string :nominee_person
      t.decimal :sum_insured, precision: 15, scale: 2, default: 0
      t.decimal :annual_premium, precision: 15, scale: 2, default: 0
      t.string :policy_no
      t.string :start_date
      t.string :end_date
      t.timestamps
    end
    add_index :insurance_policies, :external_id, if_not_exists: true
    add_index :insurance_policies, :category, if_not_exists: true

    create_table :bank_accounts, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :bank_name, null: false
      t.string :account_type, default: "Savings"
      t.string :account_no
      t.string :branch_ifsc
      t.string :holder_name
      t.decimal :current_balance, precision: 15, scale: 2, default: 0
      t.decimal :interest_rate, precision: 6, scale: 2, default: 0
      t.string :nominee
      t.string :purpose
      t.text :notes
      t.text :nominee_notes
      t.timestamps
    end
    add_index :bank_accounts, :external_id, if_not_exists: true

    create_table :credit_cards, if_not_exists: true do |t|
      t.bigint :external_id
      t.string :bank_name
      t.string :card_name
      t.string :network, default: "Visa"
      t.string :last4
      t.integer :billing_day, default: 1
      t.integer :due_day, default: 15
      t.decimal :credit_limit, precision: 15, scale: 2, default: 0
      t.decimal :utilized_amount, precision: 15, scale: 2, default: 0
      t.integer :reward_points, default: 0
      t.string :annual_fee_notes
      t.timestamps
    end
    add_index :credit_cards, :external_id, if_not_exists: true

    create_table :tax_profiles, if_not_exists: true do |t|
      t.string :fy, default: "2025-26"
      t.string :age_group, default: "below_60"
      t.string :preferred_regime, default: "auto"
      t.boolean :is_salaried, default: true
      t.decimal :gross_salary, precision: 15, scale: 2, default: 0
      t.decimal :interest_income, precision: 15, scale: 2, default: 0
      t.decimal :rental_income, precision: 15, scale: 2, default: 0
      t.decimal :other_income, precision: 15, scale: 2, default: 0
      t.decimal :hra_exemption, precision: 15, scale: 2, default: 0
      t.decimal :professional_tax, precision: 15, scale: 2, default: 0
      t.decimal :home_loan_interest_24b, precision: 15, scale: 2, default: 0
      t.decimal :sec_80c, precision: 15, scale: 2, default: 0
      t.decimal :sec_80ccd_1b_nps, precision: 15, scale: 2, default: 0
      t.decimal :sec_80ccd_2_employer_nps, precision: 15, scale: 2, default: 0
      t.decimal :sec_80d_health, precision: 15, scale: 2, default: 0
      t.decimal :sec_80tta_savings, precision: 15, scale: 2, default: 0
      t.decimal :other_deductions_80e_80g, precision: 15, scale: 2, default: 0
      t.decimal :tds_deducted, precision: 15, scale: 2, default: 0
      t.decimal :advance_tax_paid, precision: 15, scale: 2, default: 0
      t.timestamps
    end
  end
end

