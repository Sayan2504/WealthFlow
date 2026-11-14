# frozen_string_literal: true

class BankAccount < ApplicationRecord
  belongs_to :user, optional: true

  validates :bank_name, presence: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[bank_name account_type account_no branch_ifsc holder_name purpose nominee notes]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
