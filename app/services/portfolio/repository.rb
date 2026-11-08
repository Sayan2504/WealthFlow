# frozen_string_literal: true

require "json"
require "fileutils"

module Portfolio
  class Repository
    DEFAULT_STORAGE_FILE = Rails.root.join("storage", "preview_data.json")

    def self.instance
      @instance ||= new
    end

    def initialize(file_path = DEFAULT_STORAGE_FILE)
      @file_path = file_path
      ensure_storage_exists!
    end

    def read
      File.open(@file_path, "r:UTF-8") do |f|
        JSON.parse(f.read, symbolize_names: true)
      end
    rescue Errno::ENOENT, JSON::ParserError
      default_data
    end

    def write(data)
      temp_file = "#{@file_path}.tmp"
      File.open(temp_file, "w:UTF-8") do |f|
        f.write(JSON.pretty_generate(data))
      end
      FileUtils.mv(temp_file, @file_path)
      true
    end

    def find_all(collection_name)
      read[collection_name.to_sym] || []
    end

    def find(collection_name, id)
      target_id = id.to_i
      find_all(collection_name).find { |item| item[:id].to_i == target_id }
    end

    def save_item(collection_name, item_attrs)
      data = read
      key = collection_name.to_sym
      data[key] ||= []

      attrs = item_attrs.deep_symbolize_keys
      item_id = attrs[:id].present? ? attrs[:id].to_i : (Time.current.to_f * 1000).to_i
      attrs[:id] = item_id

      existing_idx = data[key].find_index { |x| x[:id].to_i == item_id }
      if existing_idx
        data[key][existing_idx] = attrs
      else
        data[key] << attrs
      end

      write(data)
      attrs
    end

    def delete_item(collection_name, id)
      data = read
      key = collection_name.to_sym
      target_id = id.to_i

      deleted = (data[key] || []).find { |x| x[:id].to_i == target_id }
      data[key] = (data[key] || []).reject { |x| x[:id].to_i == target_id }

      write(data)
      deleted
    end

    def update_root_entity(entity_name, new_attrs)
      data = read
      key = entity_name.to_sym
      data[key] = (data[key] || {}).merge(new_attrs.deep_symbolize_keys)
      write(data)
      data[key]
    end

    private

    def ensure_storage_exists!
      dir = File.dirname(@file_path)
      FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
      unless File.exist?(@file_path)
        write(default_data)
      end
    end

    def default_data
      {
        user: { name: "WealthFlow Portfolio", annual_income: 1800000, last_updated: Date.today.to_s },
        mutual_funds: [],
        fixed_deposits: [],
        recurring_deposits: [],
        flexi_rds: [],
        ppf: { account_identifier: "PPF-SOVEREIGN", interest_rate: 7.10, current_balance: 0, contributions: [] },
        epf: { account_identifier: "EPFO-UAN", interest_rate: 8.25, current_balance: 0, entries: [] },
        ulip: { policy_name: "Market-Linked ULIP", total_paid: 0, current_value: 0 },
        home_loan: { outstanding_principal: 0, monthly_emi: 0, original_loan_amount: 0, tenure_years: 0, interest_rate: 0 },
        health_insurance: [],
        life_insurance: [],
        vehicle_insurance: [],
        home_loan_insurance: [],
        bank_accounts: [],
        credit_cards: [],
        tax_profile: {}
      }
    end
  end
end
