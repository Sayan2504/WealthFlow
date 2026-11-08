# app/components/financial_metric_card_component.rb
# frozen_string_literal: true

class FinancialMetricCardComponent < ViewComponent::Base
  def initialize(title:, amount:, subtitle: nil, change_percent: nil, trend: :neutral, icon: "currency-rupee", accent_color: "indigo")
    @title = title
    @amount = amount
    @subtitle = subtitle
    @change_percent = change_percent
    @trend = trend
    @icon = icon
    @accent_color = accent_color
  end

  def formatted_amount
    Core::CurrencyFormatter.format_inr(@amount)
  end

  def badge_classes
    case @trend
    when :up
      "text-emerald-400 bg-emerald-950/70 border border-emerald-800/40"
    when :down
      "text-rose-400 bg-rose-950/70 border border-rose-800/40"
    else
      "text-slate-400 bg-slate-800/70 border border-slate-700/40"
    end
  end

  def icon_color_classes
    case @accent_color
    when "emerald" then "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    when "amber"   then "bg-amber-500/10 text-amber-400 border-amber-500/20"
    when "cyan"    then "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    when "purple"  then "bg-purple-500/10 text-purple-400 border-purple-500/20"
    else "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
    end
  end
end

