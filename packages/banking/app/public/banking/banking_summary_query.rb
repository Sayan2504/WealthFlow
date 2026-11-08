# packages/banking/app/public/banking/banking_summary_query.rb
module Banking
  class BankingSummaryQuery
    def self.call(bank_accounts: [], credit_cards: [])
      total_bank_balance = bank_accounts.sum { |acc| acc[:current_balance].to_f }
      annual_interest = bank_accounts.sum { |acc| acc[:current_balance].to_f * (acc[:interest_rate].to_f / 100.0) }

      total_credit_limit = credit_cards.sum { |card| card[:credit_limit].to_f }
      total_card_utilized = credit_cards.sum { |card| card[:utilized_amount].to_f }
      available_credit_limit = [0.0, total_credit_limit - total_card_utilized].max
      utilization_pct = total_credit_limit.positive? ? ((total_card_utilized / total_credit_limit) * 100.0).round(2) : 0.0

      {
        bank_count: bank_accounts.size,
        total_bank_balance: total_bank_balance,
        annual_interest: annual_interest.round,
        card_count: credit_cards.size,
        total_credit_limit: total_credit_limit,
        total_card_utilized: total_card_utilized,
        available_credit_limit: available_credit_limit,
        utilization_pct: utilization_pct
      }
    end
  end
end

