# frozen_string_literal: true

class CreateUsersAndScopePortfolioTables < ActiveRecord::Migration[8.1]
  USER_SCOPED_TABLES = %i[
    portfolio_profiles
    mutual_funds
    fixed_deposits
    recurring_deposits
    ppf_contributions
    epf_entries
    insurance_policies
    bank_accounts
    credit_cards
    tax_profiles
  ].freeze

  def change
    create_table :users, if_not_exists: true do |t|
      t.string :name, null: false, default: "Investor"
      t.decimal :annual_income, precision: 15, scale: 2, default: 1_800_000

      # Database authenticatable
      t.string :email, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      # Recoverable
      t.string :reset_password_token
      t.datetime :reset_password_sent_at

      # Rememberable
      t.datetime :remember_created_at

      # Trackable
      t.integer :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string :current_sign_in_ip
      t.string :last_sign_in_ip

      t.timestamps null: false
    end

    add_index :users, :email, unique: true, if_not_exists: true
    add_index :users, :reset_password_token, unique: true, if_not_exists: true

    USER_SCOPED_TABLES.each do |table_name|
      next if column_exists?(table_name, :user_id)

      add_reference table_name, :user, foreign_key: true, index: true
    end
  end
end

