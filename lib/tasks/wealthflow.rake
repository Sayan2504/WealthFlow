# frozen_string_literal: true

namespace :wealthflow do
  desc "Import storage/preview_data.json into SQLite ActiveRecord models for the primary demo user"
  task import_json: :environment do
    file_path = Portfolio::Repository::DEFAULT_STORAGE_FILE
    abort("JSON file not found: #{file_path}") unless File.exist?(file_path)

    primary = User.primary_demo_user!
    raw = JSON.parse(File.read(file_path, encoding: "UTF-8"))
    Portfolio::ActiveRecordBridge.import_from_hash!(raw, user: primary)
    puts "Imported into SQLite for #{primary.email}: MFs=#{primary.mutual_funds.count}, FDs=#{primary.fixed_deposits.count}, RDs=#{primary.recurring_deposits.count}, PPF=#{primary.ppf_contributions.count}, Policies=#{primary.insurance_policies.count}, Banks=#{primary.bank_accounts.count}"
  end

  desc "Export primary demo user's SQLite ActiveRecord portfolio back to storage/preview_data.json"
  task export_json: :environment do
    abort("Database schema not ready; run rails db:migrate first") unless Portfolio::ActiveRecordBridge.available?

    primary = User.primary_demo_user!
    data = Portfolio::ActiveRecordBridge.export_to_hash(user: primary)
    Portfolio::Repository.save_raw(data, user: primary)
    puts "Exported SQLite portfolio snapshot to #{Portfolio::Repository::DEFAULT_STORAGE_FILE}"
  end
end
