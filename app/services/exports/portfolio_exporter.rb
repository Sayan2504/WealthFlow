# frozen_string_literal: true

module Exports
  # Thin adapter delegating workbook and CSV exports to Reporting::PortfolioExporter.
  class PortfolioExporter
    PPF_FY_LIMIT = Reporting::PortfolioExporter::PPF_FY_LIMIT

    class << self
      delegate :build_sheets, :build_excel_workbook, :build_complete_csv, to: Reporting::PortfolioExporter
    end
  end
end
