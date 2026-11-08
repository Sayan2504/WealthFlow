# app/jobs/mutual_funds/sync_nav_job.rb
# frozen_string_literal: true

module MutualFunds
  class SyncNavJob < ApplicationJob
    queue_as :default

    # Retry on temporary network timeouts with exponential backoff
    retry_on Net::OpenTimeout, Net::ReadTimeout, wait: :exponentially_longer, attempts: 3

    def perform(user_id = nil)
      user = user_id ? User.find_by(id: user_id) : nil
      result = MutualFunds::AmfiNavService.sync_all_holdings(user)

      Rails.logger.info("[SyncNavJob] Finished AMFI NAV sync: #{result[:total_updated]} holdings updated.")
      result
    end
  end
end

