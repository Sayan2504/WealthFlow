# frozen_string_literal: true

class EpfEntry < ApplicationRecord
  belongs_to :user, optional: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[date description]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
