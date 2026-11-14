# frozen_string_literal: true

class MutualFund < ApplicationRecord
  belongs_to :user, optional: true
  has_many :stock_holdings, dependent: :destroy

  validates :scheme_name, presence: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[scheme_name scheme_code category amc holdings_source]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[stock_holdings]
  end
end
