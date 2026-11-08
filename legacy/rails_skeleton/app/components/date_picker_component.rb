# app/components/date_picker_component.rb
# frozen_string_literal: true

class DatePickerComponent < ViewComponent::Base
  def initialize(id:, name:, value: nil, label: nil, on_change: nil)
    @id = id
    @name = name
    @value = value || Date.current.iso8601
    @label = label
    @on_change = on_change
  end

  def formatted_display
    Date.parse(@value.to_s).strftime("%d %b %Y")
  rescue ArgumentError
    @value.to_s
  end
end

