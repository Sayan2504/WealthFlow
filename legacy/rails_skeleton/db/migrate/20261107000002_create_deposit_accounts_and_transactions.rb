# db/migrate/20261107000002_create_deposit_accounts_and_transactions.rb
# frozen_string_literal: true

class CreateDepositAccountsAndTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :deposit_accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :institution_name, null: false
      t.string :account_type, null: false # 'fixed_deposit', 'recurring_deposit', 'flexi_rd'
      t.decimal :principal_amount, precision: 15, scale: 2, default: 0.0
      t.decimal :monthly_installment, precision: 15, scale: 2
      t.decimal :interest_rate, precision: 5, scale: 2, null: false # e.g. 7.10%
      t.string :compounding_frequency, default: "quarterly" # 'monthly', 'quarterly', 'yearly'
      t.date :start_date, null: false
      t.date :maturity_date, null: false
      t.boolean :tax_saving, default: false

      t.timestamps
    end

    create_table :deposit_transactions do |t|
      t.references :deposit_account, null: false, foreign_key: true
      t.date :transaction_date, null: false
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.string :transaction_type, null: false # 'installment', 'variable_deposit', 'interest_credit'

      t.timestamps
    end

    add_index :deposit_accounts, :account_type
    add_index :deposit_transactions, :transaction_date
  end
end

