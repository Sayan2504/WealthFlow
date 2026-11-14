# frozen_string_literal: true

class CreditCard < ApplicationRecord
  belongs_to :user, optional: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[bank_name card_name network last4 annual_fee_notes]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
