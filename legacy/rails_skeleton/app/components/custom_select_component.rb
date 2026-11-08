# app/components/custom_select_component.rb
# frozen_string_literal: true

class CustomSelectComponent < ViewComponent::Base
  def initialize(name:, options:, selected: nil, label: nil)
    @name = name
    @options = options # Array of [label, value] pairs
    @selected = selected || @options.first&.last
    @label = label
  end

  def selected_label
    pair = @options.find { |_, val| val.to_s == @selected.to_s }
    pair ? pair.first : @options.first&.first
  end
end

