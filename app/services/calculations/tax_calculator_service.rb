# frozen_string_literal: true

module Calculations
  # Thin adapter delegating Indian Income Tax calculations to TaxPlanning::RegimeComparator.
  class TaxCalculatorService
    class << self
      delegate :default_tax_profile,
               :calculate_both_regimes,
               :compute_slab_breakdown,
               :compute_surcharge,
               to: TaxPlanning::RegimeComparator
    end
  end
end
