# frozen_string_literal: true

module Users
  class RegistrationsController < Devise::RegistrationsController
    protected

    def sign_up(resource_name, resource)
      super
      return unless resource.persisted?

      Current.user = resource
      Portfolio::Repository.instance.initialize_empty_for_user!(resource)
    end
  end
end

