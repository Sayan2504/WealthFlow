# frozen_string_literal: true

require "json"
require "fileutils"
require "tempfile"

module Portfolio
  class Repository
    DEFAULT_STORAGE_FILE = Rails.root.join("storage", "preview_data.json")
    MUTEX = Mutex.new

    def self.instance
      @instance ||= new
    end

    def self.load_raw(user: nil)
      instance.load_raw(user: user)
    end

    def self.save_raw(data, user: nil)
      instance.save_raw(data, user: user)
    end

    def self.clear!(user: nil)
      instance.clear!(user: user)
    end

    def initialize(file_path = DEFAULT_STORAGE_FILE, use_database: nil)
      @file_path = file_path
      @use_database = use_database.nil? ? (file_path.to_s == DEFAULT_STORAGE_FILE.to_s) : use_database
      ensure_storage_exists!
    end

    def load_raw(user: nil)
      parsed = nil

      if db_backing_active?
        target = active_user(user)
        MUTEX.synchronize do
          unless Portfolio::ActiveRecordBridge.seeded?(user: target)
            seed_source = if target.primary_demo_user?
                            read_unlocked || default_data(user: target).deep_stringify_keys
                          else
                            default_data(user: target).deep_stringify_keys
                          end
            Portfolio::ActiveRecordBridge.import_from_hash!(seed_source, user: target)
          end
          parsed = Portfolio::ActiveRecordBridge.export_to_hash(user: target)
        end
      else
        parsed = MUTEX.synchronize do
          read_unlocked
        end
      end

      unless parsed.is_a?(Hash) && parsed.key?("fixed_deposits") && parsed.key?("ppf")
        parsed = default_data(user: active_user(user)).deep_stringify_keys
        save_raw(parsed, user: user)
      end

      if Market::AmfiService.enrich_portfolio!(parsed)
        save_raw(parsed, user: user)
      end

      parsed.with_indifferent_access
    rescue StandardError
      default_data.with_indifferent_access
    end

    def save_raw(data, user: nil)
      stringified = deep_stringify(data)
      MUTEX.synchronize do
        if db_backing_active?
          target = active_user(user)
          Portfolio::ActiveRecordBridge.import_from_hash!(stringified, user: target)
          atomic_write_unlocked(stringified) if target.primary_demo_user?
        else
          atomic_write_unlocked(stringified)
        end
      end
      true
    end

    def clear!(user: nil)
      target = db_backing_active? ? active_user(user) : nil
      fresh = default_data(user: target).deep_stringify_keys
      save_raw(fresh, user: target)
      fresh.with_indifferent_access
    end

    # Legacy symbol-keyed API kept for compatibility with existing service callers
    def read(user: nil)
      load_raw(user: user).deep_symbolize_keys
    end

    def write(data, user: nil)
      save_raw(data, user: user)
    end

    def find_all(collection_name, user: nil)
      read(user: user)[collection_name.to_sym] || []
    end

    def find(collection_name, id, user: nil)
      target_id = id.to_i
      find_all(collection_name, user: user).find { |item| item[:id].to_i == target_id }
    end

    def save_item(collection_name, item_attrs, user: nil)
      data = read(user: user)
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

      write(data, user: user)
      attrs
    end

    def delete_item(collection_name, id, user: nil)
      data = read(user: user)
      key = collection_name.to_sym
      target_id = id.to_i

      deleted = (data[key] || []).find { |x| x[:id].to_i == target_id }
      data[key] = (data[key] || []).reject { |x| x[:id].to_i == target_id }

      write(data, user: user)
      deleted
    end

    def update_root_entity(entity_name, new_attrs, user: nil)
      data = read(user: user)
      key = entity_name.to_sym
      data[key] = (data[key] || {}).merge(new_attrs.deep_symbolize_keys)
      write(data, user: user)
      data[key]
    end

    def initialize_empty_for_user!(user)
      return unless db_backing_active? && user

      MUTEX.synchronize do
        return if Portfolio::ActiveRecordBridge.seeded?(user: user)

        fresh = default_data(user: user).deep_stringify_keys
        Portfolio::ActiveRecordBridge.import_from_hash!(fresh, user: user)
      end
    end

    private

    def active_user(explicit_user = nil)
      explicit_user || Current.user || User.primary_demo_user!
    end

    def db_backing_active?
      @use_database && Portfolio::ActiveRecordBridge.available?
    end

    def ensure_storage_exists!
      dir = File.dirname(@file_path)
      FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
      return if File.exist?(@file_path)

      atomic_write_unlocked(default_data)
    end

    def read_unlocked
      JSON.parse(File.read(@file_path, encoding: "UTF-8"))
    rescue Errno::ENOENT, JSON::ParserError
      nil
    end

    def atomic_write_unlocked(payload_hash)
      dir = File.dirname(@file_path)
      FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
      tmp = Tempfile.new(["preview_data", ".json.tmp"], dir)
      begin
        tmp.write(JSON.pretty_generate(payload_hash))
        tmp.flush
        tmp.close
        File.chmod(0o644, tmp.path)
        FileUtils.mv(tmp.path, @file_path)
      ensure
        tmp.close! if File.exist?(tmp.path) && tmp.path != @file_path.to_s
      end
    end

    def deep_stringify(obj)
      case obj
      when Hash
        obj.each_with_object({}) { |(k, v), out| out[k.to_s] = deep_stringify(v) }
      when Array
        obj.map { |v| deep_stringify(v) }
      else
        obj
      end
    end

    def default_data(user: nil)
      {
        "user" => {
          "name" => user&.name.presence || "WealthFlow Portfolio",
          "annual_income" => user&.annual_income&.to_f&.positive? ? user.annual_income.to_f : 1_800_000,
          "last_updated" => Date.current.to_s
        },
        "mutual_funds" => [],
        "fixed_deposits" => [],
        "recurring_deposits" => [],
        "flexi_rds" => [],
        "ppf" => { "account_identifier" => "PPF-SOVEREIGN", "interest_rate" => 7.10, "current_balance" => 0, "contributions" => [] },
        "epf" => { "account_identifier" => "EPFO-UAN", "interest_rate" => 8.25, "current_balance" => 0, "entries" => [] },
        "ulip" => { "policy_name" => "Market-Linked ULIP", "total_paid" => 0, "current_value" => 0 },
        "home_loan" => { "outstanding_principal" => 0, "monthly_emi" => 0, "original_loan_amount" => 0, "tenure_years" => 0, "interest_rate" => 0, "emi_day" => 26 },
        "health_insurance" => [],
        "life_insurance" => [],
        "vehicle_insurance" => [],
        "home_loan_insurance" => [],
        "bank_accounts" => [],
        "credit_cards" => [],
        "tax_profile" => {}
      }
    end
  end
end
