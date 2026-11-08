// packages/liabilities/home_loan/module.js
// Home Loan Package: Liability, Reducing-Balance EMI, & Amortization Summary Query
function calculateStandardEmi(principal, annualRate, tenureYears) {
  const p = Number(principal) || 0;
  const r = (Number(annualRate) || 0) / 100 / 12;
  const n = (Number(tenureYears) || 0) * 12;
  if (p <= 0 || r <= 0 || n <= 0) return 0;
  const factor = Math.pow(1 + r, n);
  return Math.round((p * r * factor) / (factor - 1));
}

function summarizeHomeLoan(data) {
  const hl = data.home_loan || {};
  const original_loan_amount = Number(hl.original_loan_amount) || 0;
  const outstanding_principal = Number(hl.outstanding_principal) || 0;
  const tenure_years = Number(hl.tenure_years) || 0;
  const interest_rate = Number(hl.interest_rate) || 0;
  const auto_emi = calculateStandardEmi(original_loan_amount, interest_rate, tenure_years);
  const monthly_emi = Number(hl.monthly_emi) || auto_emi;
  const principal_repaid = Math.max(0, original_loan_amount - outstanding_principal);
  const repaid_pct = original_loan_amount > 0 ? Math.round((principal_repaid / original_loan_amount) * 100) : 0;

  return {
    outstanding_principal,
    monthly_emi,
    auto_emi,
    original_loan_amount,
    principal_repaid,
    repaid_pct,
    loan_start_date: hl.loan_start_date || "",
    tenure_years,
    interest_rate,
    emi_day: Number(hl.emi_day) || 26
  };
}

module.exports = {
  calculateStandardEmi,
  summarizeHomeLoan
};

