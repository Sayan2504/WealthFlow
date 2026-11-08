# app/models/user.rb
# frozen_string_literal: true

class User < ActiveRecord::Base
  self.table_name = "users"

  # Devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :trackable

  # Financial domain associations
  has_many :deposit_accounts, dependent: :destroy
  has_many :mutual_fund_holdings, dependent: :destroy
  has_many :provident_funds, dependent: :destroy
  has_many :insurance_policies, dependent: :destroy

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  def health_policies
    insurance_policies.where(category: "health")
  end

  def life_policies
    insurance_policies.where(category: "life")
  end

  # Display initials for avatar
  def initials
    name.split.map(&:first).join.upcase[0..1]
  rescue StandardError
    "U"
  end
end
