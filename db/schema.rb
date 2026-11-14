# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_14_070000) do
  create_table "bank_accounts", force: :cascade do |t|
    t.bigint "external_id"
    t.string "bank_name", null: false
    t.string "account_type", default: "Savings"
    t.string "account_no"
    t.string "branch_ifsc"
    t.string "holder_name"
    t.decimal "current_balance", precision: 15, scale: 2, default: "0.0"
    t.decimal "interest_rate", precision: 6, scale: 2, default: "0.0"
    t.string "nominee"
    t.string "purpose"
    t.text "notes"
    t.text "nominee_notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_bank_accounts_on_external_id"
    t.index ["user_id"], name: "index_bank_accounts_on_user_id"
  end

  create_table "credit_cards", force: :cascade do |t|
    t.bigint "external_id"
    t.string "bank_name"
    t.string "card_name"
    t.string "network", default: "Visa"
    t.string "last4"
    t.integer "billing_day", default: 1
    t.integer "due_day", default: 15
    t.decimal "credit_limit", precision: 15, scale: 2, default: "0.0"
    t.decimal "utilized_amount", precision: 15, scale: 2, default: "0.0"
    t.integer "reward_points", default: 0
    t.string "annual_fee_notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_credit_cards_on_external_id"
    t.index ["user_id"], name: "index_credit_cards_on_user_id"
  end

  create_table "epf_entries", force: :cascade do |t|
    t.bigint "external_id"
    t.string "date"
    t.string "description"
    t.decimal "employee", precision: 15, scale: 2, default: "0.0"
    t.decimal "employer", precision: 15, scale: 2, default: "0.0"
    t.decimal "interest", precision: 15, scale: 2, default: "0.0"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_epf_entries_on_external_id"
    t.index ["user_id"], name: "index_epf_entries_on_user_id"
  end

  create_table "fixed_deposits", force: :cascade do |t|
    t.bigint "external_id"
    t.string "bank", null: false
    t.string "fd_no"
    t.decimal "principal", precision: 15, scale: 2, default: "0.0"
    t.decimal "rate", precision: 6, scale: 2, default: "0.0"
    t.string "start_date"
    t.string "maturity_date"
    t.decimal "maturity_amount", precision: 15, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_fixed_deposits_on_external_id"
    t.index ["user_id"], name: "index_fixed_deposits_on_user_id"
  end

  create_table "insurance_policies", force: :cascade do |t|
    t.bigint "external_id"
    t.string "category", null: false
    t.string "insurer"
    t.string "policy_name"
    t.string "policy_type"
    t.string "asset_ref"
    t.string "insured_person"
    t.string "nominee_person"
    t.decimal "sum_insured", precision: 15, scale: 2, default: "0.0"
    t.decimal "annual_premium", precision: 15, scale: 2, default: "0.0"
    t.string "policy_no"
    t.string "start_date"
    t.string "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["category"], name: "index_insurance_policies_on_category"
    t.index ["external_id"], name: "index_insurance_policies_on_external_id"
    t.index ["user_id"], name: "index_insurance_policies_on_user_id"
  end

  create_table "mutual_funds", force: :cascade do |t|
    t.bigint "external_id"
    t.string "scheme_name", null: false
    t.string "scheme_code"
    t.decimal "latest_nav", precision: 14, scale: 4, default: "0.0"
    t.string "nav_date"
    t.decimal "units", precision: 16, scale: 4, default: "0.0"
    t.string "category", default: "Equity"
    t.string "amc"
    t.decimal "sip_amount", precision: 15, scale: 2, default: "0.0"
    t.string "start_date"
    t.decimal "current_value", precision: 15, scale: 2, default: "0.0"
    t.decimal "invested_amount", precision: 15, scale: 2, default: "0.0"
    t.decimal "step_up_pct", precision: 6, scale: 2, default: "0.0"
    t.string "holdings_source"
    t.string "holdings_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_mutual_funds_on_external_id"
    t.index ["user_id"], name: "index_mutual_funds_on_user_id"
  end

  create_table "portfolio_profiles", force: :cascade do |t|
    t.string "name", default: "WealthFlow Portfolio"
    t.decimal "annual_income", precision: 15, scale: 2, default: "1800000.0"
    t.string "last_updated"
    t.string "ppf_account_identifier", default: "PPF-SOVEREIGN"
    t.decimal "ppf_interest_rate", precision: 6, scale: 2, default: "7.1"
    t.decimal "ppf_current_balance", precision: 15, scale: 2, default: "0.0"
    t.string "ppf_last_updated"
    t.string "ppf_rate_authority"
    t.string "ppf_effective_quarter"
    t.string "epf_account_identifier", default: "EPFO-UAN"
    t.string "epf_uan", default: "EPFO-UAN"
    t.decimal "epf_interest_rate", precision: 6, scale: 2, default: "8.25"
    t.decimal "epf_current_balance", precision: 15, scale: 2, default: "0.0"
    t.string "epf_last_updated"
    t.string "epf_rate_authority"
    t.string "epf_effective_fy"
    t.string "ulip_policy_name", default: "Market-Linked ULIP"
    t.decimal "ulip_total_paid", precision: 15, scale: 2, default: "0.0"
    t.decimal "ulip_current_value", precision: 15, scale: 2, default: "0.0"
    t.decimal "home_loan_outstanding_principal", precision: 15, scale: 2, default: "0.0"
    t.decimal "home_loan_monthly_emi", precision: 15, scale: 2, default: "0.0"
    t.decimal "home_loan_original_loan_amount", precision: 15, scale: 2, default: "0.0"
    t.string "home_loan_start_date"
    t.decimal "home_loan_tenure_years", precision: 6, scale: 2, default: "0.0"
    t.decimal "home_loan_interest_rate", precision: 6, scale: 2, default: "0.0"
    t.integer "home_loan_emi_day", default: 26
    t.string "pin_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["user_id"], name: "index_portfolio_profiles_on_user_id"
  end

  create_table "ppf_contributions", force: :cascade do |t|
    t.bigint "external_id"
    t.string "fy"
    t.string "date"
    t.decimal "amount", precision: 15, scale: 2, default: "0.0"
    t.string "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["external_id"], name: "index_ppf_contributions_on_external_id"
    t.index ["user_id"], name: "index_ppf_contributions_on_user_id"
  end

  create_table "recurring_deposits", force: :cascade do |t|
    t.bigint "external_id"
    t.string "deposit_kind", default: "rd", null: false
    t.string "bank", null: false
    t.string "rd_no"
    t.string "purpose"
    t.decimal "monthly_amount", precision: 15, scale: 2, default: "0.0"
    t.decimal "base_monthly", precision: 15, scale: 2, default: "0.0"
    t.decimal "total_deposited", precision: 15, scale: 2, default: "0.0"
    t.decimal "rate", precision: 6, scale: 2, default: "0.0"
    t.string "start_date"
    t.string "end_date"
    t.decimal "maturity_amount", precision: 15, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["deposit_kind"], name: "index_recurring_deposits_on_deposit_kind"
    t.index ["external_id"], name: "index_recurring_deposits_on_external_id"
    t.index ["user_id"], name: "index_recurring_deposits_on_user_id"
  end

  create_table "stock_holdings", force: :cascade do |t|
    t.integer "mutual_fund_id", null: false
    t.string "stock", null: false
    t.string "ticker"
    t.string "sector", default: "Equity"
    t.decimal "weight", precision: 8, scale: 2, default: "0.0"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["mutual_fund_id"], name: "index_stock_holdings_on_mutual_fund_id"
  end

  create_table "tax_profiles", force: :cascade do |t|
    t.string "fy", default: "2025-26"
    t.string "age_group", default: "below_60"
    t.string "preferred_regime", default: "auto"
    t.boolean "is_salaried", default: true
    t.decimal "gross_salary", precision: 15, scale: 2, default: "0.0"
    t.decimal "interest_income", precision: 15, scale: 2, default: "0.0"
    t.decimal "rental_income", precision: 15, scale: 2, default: "0.0"
    t.decimal "other_income", precision: 15, scale: 2, default: "0.0"
    t.decimal "hra_exemption", precision: 15, scale: 2, default: "0.0"
    t.decimal "professional_tax", precision: 15, scale: 2, default: "0.0"
    t.decimal "home_loan_interest_24b", precision: 15, scale: 2, default: "0.0"
    t.decimal "sec_80c", precision: 15, scale: 2, default: "0.0"
    t.decimal "sec_80ccd_1b_nps", precision: 15, scale: 2, default: "0.0"
    t.decimal "sec_80ccd_2_employer_nps", precision: 15, scale: 2, default: "0.0"
    t.decimal "sec_80d_health", precision: 15, scale: 2, default: "0.0"
    t.decimal "sec_80tta_savings", precision: 15, scale: 2, default: "0.0"
    t.decimal "other_deductions_80e_80g", precision: 15, scale: 2, default: "0.0"
    t.decimal "tds_deducted", precision: 15, scale: 2, default: "0.0"
    t.decimal "advance_tax_paid", precision: 15, scale: 2, default: "0.0"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["user_id"], name: "index_tax_profiles_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", default: "Investor", null: false
    t.decimal "annual_income", precision: 15, scale: 2, default: "1800000.0"
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "bank_accounts", "users"
  add_foreign_key "credit_cards", "users"
  add_foreign_key "epf_entries", "users"
  add_foreign_key "fixed_deposits", "users"
  add_foreign_key "insurance_policies", "users"
  add_foreign_key "mutual_funds", "users"
  add_foreign_key "portfolio_profiles", "users"
  add_foreign_key "ppf_contributions", "users"
  add_foreign_key "recurring_deposits", "users"
  add_foreign_key "stock_holdings", "mutual_funds"
  add_foreign_key "tax_profiles", "users"
end
