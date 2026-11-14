# frozen_string_literal: true

class PortfolioProfile < ApplicationRecord
  belongs_to :user, optional: true
  has_secure_password :pin, validations: false

  def self.for_user(user = nil)
    target = user || Current.user
    return where(user_id: target.id).first_or_create!(name: "#{target.name} Portfolio", annual_income: target.annual_income || 1_800_000) if target

    first || create!
  end

  def self.current
    for_user(Current.user)
  end

  def pin_enabled?
    pin_digest.present?
  end
end
