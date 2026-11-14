# frozen_string_literal: true

class User < ApplicationRecord
  PRIMARY_DEMO_EMAIL = "sayan@wealthflow.in"

  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable,
         :trackable

  has_one :portfolio_profile, dependent: :destroy
  has_one :tax_profile, dependent: :destroy
  has_many :mutual_funds, dependent: :destroy
  has_many :fixed_deposits, dependent: :destroy
  has_many :recurring_deposits, dependent: :destroy
  has_many :ppf_contributions, dependent: :destroy
  has_many :epf_entries, dependent: :destroy
  has_many :insurance_policies, dependent: :destroy
  has_many :bank_accounts, dependent: :destroy
  has_many :credit_cards, dependent: :destroy

  validates :name, presence: true

  def primary_demo_user?
    email.to_s.casecmp?(PRIMARY_DEMO_EMAIL)
  end

  def self.primary_demo_user!
    find_or_create_by!(email: PRIMARY_DEMO_EMAIL) do |u|
      u.name = "Sayan Sinha"
      u.annual_income = 1_800_000
      u.password = "WealthFlow@2026"
      u.password_confirmation = "WealthFlow@2026"
    end
  end
end

