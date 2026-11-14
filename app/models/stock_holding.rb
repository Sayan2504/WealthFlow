# frozen_string_literal: true

class StockHolding < ApplicationRecord
  belongs_to :mutual_fund

  validates :stock, presence: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[stock ticker sector]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[mutual_fund]
  end
end
