# app/components/delete_confirmation_modal_component.rb
# frozen_string_literal: true

class DeleteConfirmationModalComponent < ViewComponent::Base
  def initialize(title: "Remove Portfolio Entry?")
    @title = title
  end
end

