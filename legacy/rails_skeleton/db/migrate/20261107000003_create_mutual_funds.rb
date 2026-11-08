# db/migrate/20261107000003_create_mutual_funds.rb
# frozen_string_literal: true

class CreateMutualFunds < ActiveRecord::Migration[8.1]
  def change
    create_table :mutual_fund_holdings do |t|
      t.references :user, null: false, foreign_key: true
      t.string :scheme_name, null: false
      t.string :folio_number
      t.string :category, null: false # 'equity_large_cap', 'debt', 'hybrid', 'elss', 'flexi_cap'
      t.decimal :units, precision: 15, scale: 4, default: 0.0, null: false
      t.decimal :invested_amount, precision: 15, scale: 2, default: 0.0, null: false
      t.decimal :latest_nav, precision: 10, scale: 4, default: 0.0
      t.date :nav_date

      t.timestamps
    end

    create_table :mutual_fund_transactions do |t|
      t.references :mutual_fund_holding, null: false, foreign_key: true
      t.date :transaction_date, null: false
      t.string :transaction_type, null: false # 'sip', 'lump_sum', 'redemption', 'dividend'
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.decimal :units, precision: 15, scale: 4, null: false
      t.decimal :nav_applied, precision: 10, scale: 4, null: false

      t.timestamps
    end

    add_index :mutual_fund_holdings, :category
    add_index :mutual_fund_transactions, :transaction_date
  end
end

