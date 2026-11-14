# frozen_string_literal: true

class InsurancePolicy < ApplicationRecord
  CATEGORIES = %w[health_insurance life_insurance vehicle_insurance home_loan_insurance].freeze

  belongs_to :user, optional: true

  validates :category, inclusion: { in: CATEGORIES }

  def self.ransackable_attributes(_auth_object = nil)
    %w[category insurer policy_name policy_type asset_ref insured_person nominee_person policy_no]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
