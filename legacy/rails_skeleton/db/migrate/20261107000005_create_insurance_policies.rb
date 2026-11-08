# db/migrate/20261107000005_create_insurance_policies.rb
# frozen_string_literal: true

class CreateInsurancePolicies < ActiveRecord::Migration[8.1]
  def change
    create_table :insurance_policies do |t|
      t.references :user, null: false, foreign_key: true
      t.string :category, null: false # 'health', 'life'
      t.string :policy_type, null: false # 'term', 'endowment', 'floater', 'critical_illness'
      t.string :provider_name, null: false
      t.string :policy_number, null: false
      t.decimal :sum_assured, precision: 15, scale: 2, null: false
      t.decimal :premium_amount, precision: 15, scale: 2, null: false
      t.string :premium_frequency, default: "annually" # 'monthly', 'quarterly', 'annually'
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.json :coverage_details, default: {} # Deductibles, copay, bonus, room-rent limits

      t.timestamps
    end

    add_index :insurance_policies, :category
    add_index :insurance_policies, :end_date
  end
end

