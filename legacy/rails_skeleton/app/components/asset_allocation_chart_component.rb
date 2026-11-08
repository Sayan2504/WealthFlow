# app/components/asset_allocation_chart_component.rb
# frozen_string_literal: true

class AssetAllocationChartComponent < ViewComponent::Base
  CIRCUMFERENCE = 238.761 # 2 * PI * 38

  def initialize(allocation:, breakdown:)
    @allocation = allocation
    @breakdown = breakdown
  end

  def mutual_funds_pct
    @allocation[:mutual_funds_pct] || 0
  end

  def fixed_income_pct
    @allocation[:fixed_income_pct] || 0
  end

  def retirement_pct
    @allocation[:retirement_pct] || 0
  end

  def total_portfolio_value
    (@breakdown[:mutual_funds][:current] || 0) +
      (@breakdown[:fixed_income][:current] || 0) +
      (@breakdown[:retirement][:total] || 0)
  end

  def mf_dash
    ((mutual_funds_pct / 100.0) * CIRCUMFERENCE).round(2)
  end

  def fi_dash
    ((fixed_income_pct / 100.0) * CIRCUMFERENCE).round(2)
  end

  def ret_dash
    ((retirement_pct / 100.0) * CIRCUMFERENCE).round(2)
  end

  def fi_offset
    -mf_dash
  end

  def ret_offset
    -(mf_dash + fi_dash)
  end
end
