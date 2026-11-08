# app/components/policy_card_component.rb
# frozen_string_literal: true

class PolicyCardComponent < ViewComponent::Base
  def initialize(policy:)
    @policy = policy
  end

  def category_badge_classes
    if @policy.health?
      "bg-teal-500/10 text-teal-400 border border-teal-500/20"
    else
      "bg-sky-500/10 text-sky-400 border border-sky-500/20"
    end
  end

  def status_badge_classes
    if @policy.active?
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    else
      "bg-rose-500/10 text-rose-400 border border-rose-500/20"
    end
  end
end

