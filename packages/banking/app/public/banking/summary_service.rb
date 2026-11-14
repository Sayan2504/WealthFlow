# frozen_string_literal: true

module Banking
  # Liquid bank account balances, savings yield estimation, and credit card utilization diagnostics.
  class SummaryService
    def self.calculate_credit_card_metrics(card)
      c = (card || {}).with_indifferent_access
      limit = c[:credit_limit].to_f
      utilized = c[:utilized_amount].to_f
      available = [0.0, limit - utilized].max
      util_pct = limit.positive? ? ((utilized / limit) * 100.0).round(1) : 0.0

      if util_pct > 70
        status_label = "High Utilization"
        badge_class = "bg-rose-950/80 text-rose-400 border-rose-800/60"
        bar_class = "bg-rose-500"
      elsif util_pct > 30
        status_label = "Moderate"
        badge_class = "bg-amber-950/80 text-amber-400 border-amber-800/60"
        bar_class = "bg-amber-500"
      else
        status_label = "Optimal"
        badge_class = "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
        bar_class = "bg-emerald-500"
      end

      {
        limit: limit,
        utilized: utilized,
        available: available,
        utilizationPct: util_pct,
        statusLabel: status_label,
        badgeClass: badge_class,
        barClass: bar_class
      }
    end

    def self.summarize(data)
      accounts = Array(data[:bank_accounts]).map(&:with_indifferent_access)
      cards = Array(data[:credit_cards]).map(&:with_indifferent_access)

      total_balance = accounts.sum { |a| a[:current_balance].to_f }
      annual_interest = accounts.sum do |a|
        a[:current_balance].to_f * (a[:interest_rate].to_f / 100.0)
      end.round

      total_limit = cards.sum { |c| c[:credit_limit].to_f }
      total_utilized = cards.sum { |c| c[:utilized_amount].to_f }
      total_available = [0.0, total_limit - total_utilized].max
      util_pct = total_limit.positive? ? ((total_utilized / total_limit) * 100.0).round(1) : 0.0
      total_rewards = cards.sum { |c| c[:reward_points].to_i }

      {
        accounts: {
          count: accounts.size,
          totalBalance: total_balance,
          annualInterest: annual_interest,
          totalBalanceInr: Core::CurrencyFormatter.format_inr(total_balance)
        },
        cards: {
          count: cards.size,
          totalLimit: total_limit,
          totalUtilized: total_utilized,
          totalAvailable: total_available,
          utilizationPct: util_pct,
          totalRewardPoints: total_rewards
        }
      }
    end
  end
end
