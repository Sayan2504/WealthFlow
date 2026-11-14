# frozen_string_literal: true

class FixedDeposit < ApplicationRecord
  belongs_to :user, optional: true

  validates :bank, presence: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[bank fd_no maturity_date]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
