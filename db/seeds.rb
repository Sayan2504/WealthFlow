# frozen_string_literal: true

if Portfolio::ActiveRecordBridge.available?
  primary = User.primary_demo_user!

  if !Portfolio::ActiveRecordBridge.seeded?(user: primary)
    json_path = Portfolio::Repository::DEFAULT_STORAGE_FILE
    if File.exist?(json_path)
      raw = JSON.parse(File.read(json_path, encoding: "UTF-8"))
      Portfolio::ActiveRecordBridge.import_from_hash!(raw, user: primary)
    else
      Portfolio::Repository.instance.initialize_empty_for_user!(primary)
    end
  elsif PortfolioProfile.where(user_id: nil).exists?
    raw = JSON.parse(File.read(Portfolio::Repository::DEFAULT_STORAGE_FILE, encoding: "UTF-8"))
    Portfolio::ActiveRecordBridge.import_from_hash!(raw, user: primary)
  end
end
