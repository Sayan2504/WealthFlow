# frozen_string_literal: true

class PpfContribution < ApplicationRecord
  belongs_to :user, optional: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[fy date note]
  end

  def self.ransackable_associations(_auth_object = nil)
    []
  end
end
