# db/migrate/20261107000001_create_users.rb
# frozen_string_literal: true

class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      # Profile fields
      t.string :name, null: false
      t.string :base_currency, default: "INR", null: false
      t.decimal :annual_income, precision: 15, scale: 2, default: 0.0

      # Devise Database authenticatable
      t.string :email,              null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      # Devise Recoverable
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at

      # Devise Rememberable
      t.datetime :remember_created_at

      # Devise Trackable
      t.integer  :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string   :current_sign_in_ip
      t.string   :last_sign_in_ip

      t.timestamps null: false
    end

    add_index :users, :email,                unique: true
    add_index :users, :reset_password_token, unique: true
  end
end
