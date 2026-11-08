# db/migrate/20261107000004_create_provident_funds_and_ledgers.rb
# frozen_string_literal: true

class CreateProvidentFundsAndLedgers < ActiveRecord::Migration[8.1]
  def change
    create_table :provident_funds do |t|
      t.references :user, null: false, foreign_key: true
      t.string :fund_type, null: false # 'ppf', 'epf'
      t.string :account_identifier # PPF A/c No or EPF UAN
      t.date :opening_date, null: false
      t.decimal :current_interest_rate, precision: 5, scale: 2, null: false # e.g. 7.10% for PPF, 8.25% for EPF
      t.decimal :employer_monthly_contribution, precision: 15, scale: 2, default: 0.0 # EPF only
      t.decimal :employee_monthly_contribution, precision: 15, scale: 2, default: 0.0 # EPF only

      t.timestamps
    end

    create_table :provident_fund_ledgers do |t|
      t.references :provident_fund, null: false, foreign_key: true
      t.date :entry_date, null: false
      t.decimal :employee_share, precision: 15, scale: 2, default: 0.0
      t.decimal :employer_share, precision: 15, scale: 2, default: 0.0
      t.decimal :pension_share, precision: 15, scale: 2, default: 0.0 # EPS
      t.decimal :interest_credited, precision: 15, scale: 2, default: 0.0

      t.timestamps
    end

    add_index :provident_funds, :fund_type
    add_index :provident_fund_ledgers, :entry_date
  end
end

