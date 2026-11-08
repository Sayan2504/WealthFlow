# db/seeds.rb
# frozen_string_literal: true

puts "== Seeding Financial Platform Data =="

user = User.find_or_create_by!(email: "investor@example.com") do |u|
  u.name = "Sayan Financial Portfolio"
  u.base_currency = "INR"
  u.annual_income = 18_00_000.00 # 18 Lakhs annual CTC
  u.password = "Password123!"
  u.password_confirmation = "Password123!"
end

# 1. FIXED DEPOSITS
puts "Seeding Fixed Deposits..."
sbi_fd = DepositAccount.find_or_create_by!(
  user: user,
  institution_name: "State Bank of India",
  account_type: "fixed_deposit",
  principal_amount: 500_000.00,
  interest_rate: 7.10,
  compounding_frequency: "quarterly",
  start_date: Date.current - 18.months,
  maturity_date: Date.current + 42.months,
  tax_saving: true
)

hdfc_fd = DepositAccount.find_or_create_by!(
  user: user,
  institution_name: "HDFC Bank",
  account_type: "fixed_deposit",
  principal_amount: 300_000.00,
  interest_rate: 7.25,
  compounding_frequency: "quarterly",
  start_date: Date.current - 6.months,
  maturity_date: Date.current + 18.months,
  tax_saving: false
)

# 2. RECURRING DEPOSIT (RD)
puts "Seeding Recurring Deposits..."
icici_rd = DepositAccount.find_or_create_by!(
  user: user,
  institution_name: "ICICI Bank",
  account_type: "recurring_deposit",
  monthly_installment: 15_000.00,
  interest_rate: 7.00,
  compounding_frequency: "quarterly",
  start_date: Date.current - 12.months,
  maturity_date: Date.current + 24.months,
  tax_saving: false
)

# Populate 12 monthly installments
if icici_rd.deposit_transactions.empty?
  12.times do |i|
    icici_rd.deposit_transactions.create!(
      transaction_date: Date.current - (12 - i).months,
      amount: 15_000.00,
      transaction_type: "installment"
    )
  end
end

# 3. FLEXI RECURRING DEPOSIT
puts "Seeding Flexi-RD..."
sbi_flexi = DepositAccount.find_or_create_by!(
  user: user,
  institution_name: "State Bank of India (Flexi RD)",
  account_type: "flexi_rd",
  interest_rate: 6.80,
  compounding_frequency: "quarterly",
  start_date: Date.current - 9.months,
  maturity_date: Date.current + 27.months,
  tax_saving: false
)

if sbi_flexi.deposit_transactions.empty?
  sbi_flexi.deposit_transactions.create!([
    { transaction_date: Date.current - 9.months, amount: 25_000.00, transaction_type: "variable_deposit" },
    { transaction_date: Date.current - 7.months, amount: 40_000.00, transaction_type: "variable_deposit" },
    { transaction_date: Date.current - 5.months, amount: 15_000.00, transaction_type: "variable_deposit" },
    { transaction_date: Date.current - 3.months, amount: 50_000.00, transaction_type: "variable_deposit" },
    { transaction_date: Date.current - 1.month,  amount: 30_000.00, transaction_type: "variable_deposit" }
  ])
end

# 4. MUTUAL FUNDS
puts "Seeding Mutual Funds..."
ppfas = MutualFundHolding.find_or_create_by!(
  user: user,
  scheme_name: "Parag Parikh Flexi Cap Fund - Direct Growth",
  folio_number: "PPFAS-8839211",
  category: "flexi_cap",
  units: 6250.4500,
  invested_amount: 450_000.00,
  latest_nav: 84.5000,
  nav_date: Date.current
)

mirae = MutualFundHolding.find_or_create_by!(
  user: user,
  scheme_name: "Mirae Asset Large Cap Fund - Direct Growth",
  folio_number: "MIR-1029384",
  category: "equity_large_cap",
  units: 2800.2000,
  invested_amount: 300_000.00,
  latest_nav: 118.2000,
  nav_date: Date.current
)

uti_index = MutualFundHolding.find_or_create_by!(
  user: user,
  scheme_name: "UTI Nifty 50 Index Fund - Direct Growth",
  folio_number: "UTI-9920144",
  category: "index",
  units: 1450.0000,
  invested_amount: 250_000.00,
  latest_nav: 195.4000,
  nav_date: Date.current
)

# 5. PUBLIC PROVIDENT FUND (PPF)
puts "Seeding PPF..."
ppf = ProvidentFund.find_or_create_by!(
  user: user,
  fund_type: "ppf",
  account_identifier: "SBI-PPF-1029384756",
  opening_date: Date.current - 4.years,
  current_interest_rate: 7.10
)

if ppf.provident_fund_ledgers.empty?
  ppf.provident_fund_ledgers.create!([
    { entry_date: Date.current - 3.years, employee_share: 150_000.00, interest_credited: 10_650.00 },
    { entry_date: Date.current - 2.years, employee_share: 150_000.00, interest_credited: 22_056.00 },
    { entry_date: Date.current - 1.year,  employee_share: 150_000.00, interest_credited: 34_228.00 },
    { entry_date: Date.current - 2.months, employee_share: 50_000.00, interest_credited: 0.0 }
  ])
end

# 6. EMPLOYEES' PROVIDENT FUND (EPF)
puts "Seeding EPF..."
epf = ProvidentFund.find_or_create_by!(
  user: user,
  fund_type: "epf",
  account_identifier: "UAN-100987654321",
  opening_date: Date.current - 5.years,
  current_interest_rate: 8.25,
  employee_monthly_contribution: 14_400.00,
  employer_monthly_contribution: 4_404.00
)

if epf.provident_fund_ledgers.empty?
  epf.provident_fund_ledgers.create!([
    { entry_date: Date.current - 12.months, employee_share: 172_800.00, employer_share: 52_848.00, pension_share: 14_994.00, interest_credited: 18_615.00 },
    { entry_date: Date.current - 6.months,  employee_share: 86_400.00,  employer_share: 26_424.00, pension_share: 7_497.00,  interest_credited: 0.0 },
    { entry_date: Date.current - 1.month,   employee_share: 14_400.00,  employer_share: 4_404.00,  pension_share: 1_250.00,  interest_credited: 0.0 }
  ])
end

# 7. HEALTH INSURANCE
puts "Seeding Health Insurance..."
InsurancePolicy.find_or_create_by!(
  user: user,
  category: "health",
  policy_type: "floater",
  provider_name: "HDFC ERGO General Insurance",
  policy_number: "HDFC-OPT-7729103",
  sum_assured: 1_500_000.00,
  premium_amount: 22_500.00,
  premium_frequency: "annually",
  start_date: Date.current - 4.months,
  end_date: Date.current + 8.months,
  coverage_details: {
    product: "Optima Secure",
    members_covered: 3,
    room_rent_capping: "No Capping",
    restoration_benefit: "100% Instant Automatic Restoration",
    cumulative_bonus: "100% after 2 claim-free years"
  }
)

InsurancePolicy.find_or_create_by!(
  user: user,
  category: "health",
  policy_type: "critical_illness",
  provider_name: "Care Health Insurance",
  policy_number: "CARE-CI-4402911",
  sum_assured: 2_500_000.00,
  premium_amount: 9_800.00,
  premium_frequency: "annually",
  start_date: Date.current - 2.months,
  end_date: Date.current + 10.months,
  coverage_details: {
    product: "Care Shield Plus",
    illnesses_covered: 32,
    second_medical_opinion: true
  }
)

# 8. LIFE INSURANCE
puts "Seeding Life Insurance..."
InsurancePolicy.find_or_create_by!(
  user: user,
  category: "life",
  policy_type: "term",
  provider_name: "HDFC Life Insurance",
  policy_number: "HDFCLIFE-C2P-9912019",
  sum_assured: 20_000_000.00, # 2 Crores Cover
  premium_amount: 28_400.00,
  premium_frequency: "annually",
  start_date: Date.current - 2.years,
  end_date: Date.current + 33.years,
  coverage_details: {
    plan_name: "Click 2 Protect 3D Plus",
    coverage_term_years: 35,
    riders: ["Accidental Total Permanent Disability", "Critical Illness Waiver of Premium"]
  }
)

InsurancePolicy.find_or_create_by!(
  user: user,
  category: "life",
  policy_type: "term",
  provider_name: "Tata AIA Life Insurance",
  policy_number: "TATALIFE-SR-5520193",
  sum_assured: 10_000_000.00, # 1 Crore Cover
  premium_amount: 16_200.00,
  premium_frequency: "annually",
  start_date: Date.current - 1.year,
  end_date: Date.current + 29.years,
  coverage_details: {
    plan_name: "Sampoorna Raksha Supreme",
    coverage_term_years: 30
  }
)

puts "== Seeding Complete! User: #{user.email} =="

