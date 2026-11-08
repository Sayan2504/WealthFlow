// packages/insurance/health_insurance/module.js
// Health Insurance Package: Policy Expiry Calculator & Summary Query
function calculatePolicyStatus(pol) {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!pol.end_date) return { daysToExpiry: 0, status: "PENDING" };
  const end = new Date(pol.end_date);
  const diffDays = Math.round((end.getTime() - ref.getTime()) / 86400000);
  let status = "OK";
  if (diffDays <= 0) status = "EXPIRED";
  else if (diffDays <= 30) status = "DUE SOON";
  return { daysToExpiry: diffDays, status };
}

function summarizeHealthInsurance(data) {
  let sumInsured = 0;
  let premium = 0;
  (data.health_insurance || []).forEach(h => {
    sumInsured += Number(h.sum_insured) || 0;
    premium += Number(h.annual_premium) || 0;
  });
  return {
    sumInsured,
    premium,
    count: (data.health_insurance || []).length
  };
}

module.exports = {
  calculatePolicyStatus,
  summarizeHealthInsurance
};

