# frozen_string_literal: true

class TaxProfile < ApplicationRecord
  belongs_to :user, optional: true

  def self.for_user(user = nil)
    target = user || Current.user
    return where(user_id: target.id).first_or_create! if target

    first || create!
  end

  def self.current
    for_user(Current.user)
  end
end
