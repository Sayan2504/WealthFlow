# app/models/insurance_policy.rb
# frozen_string_literal: true

class InsurancePolicy < ActiveRecord::Base
  self.table_name = "insurance_policies"

  belongs_to :user

  CATEGORIES = %w[health life].freeze
  POLICY_TYPES = %w[term endowment ulip floater individual critical_illness].freeze
  FREQUENCIES = %w[monthly quarterly half_yearly annually single].freeze

  validates :category, inclusion: { in: CATEGORIES }
  validates :policy_type, inclusion: { in: POLICY_TYPES }
  validates :provider_name, presence: true
  validates :policy_number, presence: true
  validates :sum_assured, numericality: { greater_than: 0 }
  validates :premium_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :premium_frequency, inclusion: { in: FREQUENCIES }
  validates :start_date, presence: true
  validates :end_date, presence: true

  scope :health, -> { where(category: "health") }
  scope :life, -> { where(category: "life") }
  scope :active, -> { where("end_date >= ?", Date.current) }

  def health?
    category == "health"
  end

  def life?
    category == "life"
  end

  def days_to_renewal
    return 0 unless end_date

    (end_date - Date.current).to_i
  end

  def active?
    end_date >= Date.current
  end
end

