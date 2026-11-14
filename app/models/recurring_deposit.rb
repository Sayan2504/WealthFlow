# frozen_string_literal: true

class RecurringDeposit < ApplicationRecord
  belongs_to :user, optional: true

  validates :bank, presence: true

  scope :standard_rd, -> { where(deposit_kind: "rd") }
  scope :flexi_rd, -> { where(deposit_kind: "flexi_rd") }

  def self.ransackable_attributes(_auth_object = nil)
    %w[bank rd_no purpose deposit_kind end_date]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
