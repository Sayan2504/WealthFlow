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

  # Dedicated Mock Data Sandbox User
  mock_user = User.find_or_create_by!(email: "mock@wealthflow.in") do |u|
    u.name = "Aarav Mehta (Mock)"
    u.annual_income = 2_400_000
    u.password = "MockFlow@2026"
    u.password_confirmation = "MockFlow@2026"
  end

  unless Portfolio::ActiveRecordBridge.seeded?(user: mock_user)
    mock_payload = {
      "user" => {
        "name" => "Aarav Mehta (Mock)",
        "annual_income" => 2_400_000,
        "last_updated" => Date.current.strftime("%Y-%m-%d")
      },
      "mutual_funds" => [
        {
          "id" => "mock_mf_1",
          "scheme_name" => "Nifty 50 Index Direct Growth",
          "scheme_code" => "120716",
          "latest_nav" => 248.40,
          "nav_date" => Date.current.strftime("%d-%b-%Y"),
          "units" => 2150.0,
          "category" => "Large Cap",
          "amc" => "UTI Mutual Fund",
          "sip_amount" => 20_000,
          "start_date" => "2023-04-05",
          "current_value" => 534_060,
          "invested_amount" => 410_000,
          "step_up_pct" => 10
        },
        {
          "id" => "mock_mf_2",
          "scheme_name" => "Parag Parikh Flexi Cap Direct Growth",
          "scheme_code" => "122639",
          "latest_nav" => 84.15,
          "nav_date" => Date.current.strftime("%d-%b-%Y"),
          "units" => 4800.0,
          "category" => "Flexi Cap",
          "amc" => "PPFAS Mutual Fund",
          "sip_amount" => 15_000,
          "start_date" => "2023-06-10",
          "current_value" => 403_920,
          "invested_amount" => 320_000,
          "step_up_pct" => 10
        },
        {
          "id" => "mock_mf_3",
          "scheme_name" => "Kotak Emerging Equity Direct Growth",
          "scheme_code" => "119775",
          "latest_nav" => 136.80,
          "nav_date" => Date.current.strftime("%d-%b-%Y"),
          "units" => 1900.0,
          "category" => "Mid Cap",
          "amc" => "Kotak Mahindra MF",
          "sip_amount" => 10_000,
          "start_date" => "2024-01-12",
          "current_value" => 259_920,
          "invested_amount" => 210_000,
          "step_up_pct" => 5
        }
      ],
      "fixed_deposits" => [
        {
          "id" => "mock_fd_1",
          "bank" => "HDFC Bank",
          "fd_no" => "FD-MOCK-101",
          "principal" => 350_000,
          "rate" => 7.25,
          "start_date" => "2025-02-01",
          "maturity_date" => "2027-02-01",
          "maturity_amount" => 404_025
        },
        {
          "id" => "mock_fd_2",
          "bank" => "SBI",
          "fd_no" => "FD-MOCK-204",
          "principal" => 250_000,
          "rate" => 7.10,
          "start_date" => "2025-05-15",
          "maturity_date" => "2026-11-15",
          "maturity_amount" => 277_560
        }
      ],
      "recurring_deposits" => [
        {
          "id" => "mock_rd_1",
          "bank" => "ICICI Bank",
          "rd_no" => "RD-MOCK-301",
          "purpose" => "Annual Travel Fund",
          "monthly_amount" => 15_000,
          "rate" => 7.0,
          "start_date" => "2025-06-01",
          "end_date" => "2026-12-01",
          "maturity_amount" => 286_400
        }
      ],
      "flexi_rds" => [
        {
          "id" => "mock_flexi_1",
          "bank" => "Axis Bank",
          "rd_no" => "FRD-MOCK-401",
          "purpose" => "Emergency Buffer",
          "base_monthly" => 10_000,
          "total_deposited" => 125_000,
          "rate" => 6.9,
          "start_date" => "2025-04-01",
          "end_date" => "2027-04-01",
          "maturity_amount" => 264_500
        }
      ],
      "ppf" => {
        "account_identifier" => "PPF-MOCK-8891",
        "interest_rate" => 7.1,
        "current_balance" => 485_000,
        "last_updated" => Date.current.strftime("%Y-%m-%d"),
        "rate_authority" => "Ministry of Finance (Gol)",
        "effective_quarter" => "Q3 FY25-26",
        "contributions" => [
          { "id" => "mock_ppf_1", "date" => "2024-04-10", "amount" => 150_000, "fy" => "2024-25" },
          { "id" => "mock_ppf_2", "date" => "2025-04-12", "amount" => 150_000, "fy" => "2025-26" }
        ]
      },
      "epf" => {
        "account_identifier" => "UAN-100998877665",
        "interest_rate" => 8.25,
        "current_balance" => 740_000,
        "last_updated" => Date.current.strftime("%Y-%m-%d"),
        "rate_authority" => "EPFO Central Board",
        "effective_fy" => "FY 2025-26",
        "entries" => [
          { "id" => "mock_epf_1", "month" => "Jan 2026", "employee_share" => 14_400, "employer_share" => 14_400, "eps_share" => 1250 },
          { "id" => "mock_epf_2", "month" => "Feb 2026", "employee_share" => 14_400, "employer_share" => 14_400, "eps_share" => 1250 },
          { "id" => "mock_epf_3", "month" => "Mar 2026", "employee_share" => 14_400, "employer_share" => 14_400, "eps_share" => 1250 }
        ]
      },
      "ulip" => {
        "policy_name" => "Mock Wealth Builder",
        "total_paid" => 150_000,
        "current_value" => 182_000
      },
      "home_loan" => {
        "outstanding_principal" => 4_200_000,
        "monthly_emi" => 41_500,
        "original_loan_amount" => 5_000_000,
        "loan_start_date" => "2023-08-01",
        "tenure_years" => 20,
        "interest_rate" => 8.55,
        "emi_day" => 5
      },
      "health_insurance" => [
        {
          "id" => "mock_hi_1",
          "insurer" => "HDFC Ergo",
          "policy_name" => "Optima Secure Family",
          "policy_type" => "Family Floater",
          "insured_person" => "Aarav Mehta & Spouse",
          "nominee_person" => "Meera Mehta",
          "sum_insured" => 1_500_000,
          "annual_premium" => 26_500,
          "policy_no" => "HI-MOCK-551",
          "start_date" => "2025-07-01",
          "end_date" => "2026-06-30"
        }
      ],
      "life_insurance" => [
        {
          "id" => "mock_li_1",
          "insurer" => "ICICI Prudential",
          "policy_name" => "iProtect Smart Term",
          "policy_type" => "Term Life",
          "insured_person" => "Aarav Mehta",
          "nominee_person" => "Meera Mehta",
          "sum_insured" => 15_000_000,
          "annual_premium" => 18_200,
          "policy_no" => "LI-MOCK-882",
          "start_date" => "2023-03-01",
          "end_date" => "2053-03-01"
        }
      ],
      "vehicle_insurance" => [],
      "home_loan_insurance" => [],
      "bank_accounts" => [
        {
          "id" => "mock_bank_1",
          "bank_name" => "HDFC Bank",
          "account_type" => "Salary Account",
          "account_no" => "XXXX4321",
          "branch_ifsc" => "HDFC0000240",
          "holder_name" => "Aarav Mehta",
          "current_balance" => 285_000,
          "interest_rate" => 3.0,
          "nominee" => "Meera Mehta",
          "purpose" => "Primary Salary & SIPs"
        },
        {
          "id" => "mock_bank_2",
          "bank_name" => "ICICI Bank",
          "account_type" => "Savings Account",
          "account_no" => "XXXX8765",
          "branch_ifsc" => "ICIC0000102",
          "holder_name" => "Aarav Mehta",
          "current_balance" => 145_000,
          "interest_rate" => 3.5,
          "nominee" => "Meera Mehta",
          "purpose" => "EMI & Bills"
        }
      ],
      "credit_cards" => [
        {
          "id" => "mock_cc_1",
          "issuer" => "HDFC Bank",
          "card_name" => "Regalia Gold",
          "last_four" => "9042",
          "credit_limit" => 600_000,
          "outstanding" => 28_400,
          "billing_day" => 18
        }
      ],
      "tax_profile" => {
        "fy" => "2025-26",
        "age_group" => "below_60",
        "preferred_regime" => "new",
        "is_salaried" => true,
        "gross_salary" => 2_400_000,
        "interest_income" => 42_000,
        "rental_income" => 0,
        "other_income" => 0,
        "hra_exemption" => 180_000,
        "professional_tax" => 2400,
        "home_loan_interest_24b" => 200_000,
        "sec_80c" => 150_000,
        "sec_80ccd_1b_nps" => 50_000,
        "sec_80ccd_2_employer_nps" => 96_000,
        "sec_80d_health" => 26_500,
        "sec_80tta_savings" => 10_000,
        "other_deductions_80e_80g" => 0,
        "tds_deducted" => 360_000,
        "advance_tax_paid" => 0
      }
    }

    Portfolio::ActiveRecordBridge.import_from_hash!(mock_payload, user: mock_user)
  end
end
