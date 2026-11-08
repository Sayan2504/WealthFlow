# app/components/action_buttons_component.rb
# frozen_string_literal: true

class ActionButtonsComponent < ViewComponent::Base
  def initialize(category:, record_id: nil, label: "Entry", show_delete: true)
    @category = category
    @record_id = record_id
    @label = label
    @show_delete = show_delete
  end
end

