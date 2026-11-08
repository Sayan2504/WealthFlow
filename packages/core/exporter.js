// packages/core/exporter.js
// Portfolio Exporter — Excel (.xls SpreadsheetML) & CSV.
// Both formats are rendered from ONE shared sheet model (buildSheets), so they always
// contain exactly the same data as what the application shows.
const { formatDateDMY, groupPpfByFinancialYear } = require("./module");
const { calculateFD, calculateRD, calculateFlexiRD } = require("../investments/fixed_income/module");
const { calculatePolicyStatus } = require("../insurance/health_insurance/module");

const PPF_FY_LIMIT = 150000;

// ---------------------------------------------------------------------------
// Sheet model helpers
// ---------------------------------------------------------------------------
const title = (t) => ({ k: "title", c: [t] });
const head = (arr) => ({ k: "head", c: arr });
const body = (arr) => ({ k: "body", c: arr });
const total = (arr) => ({ k: "total", c: arr });
const blank = () => ({ k: "blank", c: [] });
const bold = (v) => ({ v, s: "sBoldNum" });
const gain = (v) => ({ v, s: "sGain" });
const text = (v) => ({ v: v === undefined || v === null ? "" : String(v), s: "sBody", t: "String" });

const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const dmy = (d) => (d ? formatDateDMY(d) : "");

function norm(c, rowKind) {
  if (c !== null && typeof c === "object") {
    const v = c.v === undefined || c.v === null ? "" : c.v;
    const isNum = c.t ? c.t === "Number" : typeof v === "number" && !isNaN(v);
    return { v, t: isNum ? "Number" : "String", s: c.s || (isNum ? "sNum" : "sBody") };
  }
  const v = c === undefined || c === null ? "" : c;
  const isNum = typeof v === "number" && !isNaN(v);
  if (rowKind === "head") return { v, t: "String", s: "sHead" };
  if (rowKind === "title") return { v, t: "String", s: "sTitle" };
  if (rowKind === "total") return { v, t: isNum ? "Number" : "String", s: isNum ? "sBoldNum" : "sHead" };
  return { v, t: isNum ? "Number" : "String", s: isNum ? "sNum" : "sBody" };
}

// ---------------------------------------------------------------------------
// Shared data model: one sheet per app module
// ---------------------------------------------------------------------------
function policyRows(list, assetLabel, personLabel, nomineeLabel, coverLabel, premiumLabel) {
  const header = head([
    "Insurer", "Policy Name", "Policy Type", assetLabel, personLabel, nomineeLabel,
    coverLabel, premiumLabel, "Policy No", "Start Date", "End Date", "Days to Expiry", "Renewal Status"
  ]);
  const rows = (list || []).map(pol => {
    const st = calculatePolicyStatus(pol);
    return body([
      pol.insurer, pol.policy_name, pol.policy_type || "", pol.asset_ref || "",
      pol.insured_person || "", pol.nominee_person || "",
      bold(num(pol.sum_insured)), num(pol.annual_premium),
      text(pol.policy_no), dmy(pol.start_date), dmy(pol.end_date), st.daysToExpiry, st.status
    ]);
  });
  const sum = (list || []).reduce((a, p) => a + num(p.sum_insured), 0);
  const prem = (list || []).reduce((a, p) => a + num(p.annual_premium), 0);
  const foot = (list || []).length > 0
    ? [total(["TOTAL", "", "", "", "", "", sum, prem, "", "", "", "", ""])]
    : [body([`No policies added yet`])];
  return [header, ...rows, ...foot];
}

function buildSheets(data, ov) {
  const mfs = data.mutual_funds || [];
  const fds = data.fixed_deposits || [];
  const rds = data.recurring_deposits || [];
  const frds = data.flexi_rds || [];
  const ppf = data.ppf || {};
  const epf = data.epf || {};
  const ppfRate = num(ppf.interest_rate) || 7.1;
  const epfRate = num(epf.interest_rate) || 8.25;
  const epfUan = epf.uan || (epf.account_identifier && epf.account_identifier !== "EPFO-UAN" ? epf.account_identifier : "");
  const banking = ov.banking || { accounts: {}, cards: {} };
  const hl = ov.homeLoan;
  const tc = ov.taxCalc;
  const generated = dmy(new Date().toISOString().split("T")[0]);

  // 1. Overview ------------------------------------------------------------
  const overview = [
    title("WEALTHFLOW — CONSOLIDATED PORTFOLIO OVERVIEW"),
    body(["Generated Date", generated, ""]),
    blank(),
    head(["PORTFOLIO SUMMARY", "VALUE (INR)", "NOTES / DETAILS"]),
    body(["Net Worth", bold(r2(ov.netWorth)), "Gross Assets minus Outstanding Home Loan and Credit Card dues"]),
    body(["Net Worth (Excluding RD & Flexi RD)", bold(r2(ov.netWorthWithoutRd)), "Net Worth minus RD and Flexi RD maturity"]),
    body(["Gross Financial Assets", bold(r2(ov.totalAssets)), "Investments + FD + RD + Flexi RD + PPF + EPF + Bank Balances"]),
    body(["Total Capital Invested", r2(ov.totalInvested), "Across all schemes, deposits and bank balances"]),
    body(["Total Portfolio Gain", gain(r2(ov.totalGain)), "Investment Gain + FD/RD/Flexi RD/PPF Interest + Bank Annual Interest"]),
    blank(),
    head(["ASSET ALLOCATION", "VALUE (INR)", "SHARE %"]),
    body(["Mutual Funds / Investments", r2(ov.mf.current), ov.allocation.mfPct]),
    body(["Fixed Income (FD + RD + Flexi RD)", r2(ov.allocation.fiTotal), ov.allocation.fiPct]),
    body(["Retirement (PPF + EPF)", r2(ov.allocation.retTotal), ov.allocation.retPct]),
    blank(),
    head(["INVESTMENTS (MUTUAL FUNDS) SUMMARY", "VALUE", "DETAILS"]),
    body(["Current Value", bold(r2(ov.mf.current)), `${mfs.length} Schemes`]),
    body(["Total Invested", r2(ov.mf.invested), ""]),
    body(["Monthly SIP Outflow", r2(ov.mf.sip), "Automated Monthly SIP"]),
    body(["Absolute Gain", gain(r2(ov.mf.gain)), ""]),
    body(["Gain %", `${ov.mf.gainPct.toFixed(2)}%`, ""]),
    blank(),
    head(["FIXED DEPOSITS (FD) SUMMARY", "VALUE", "DETAILS"]),
    body(["Total Principal", r2(ov.fd.principal), `${fds.length} FDs`]),
    body(["Expected Maturity", bold(r2(ov.fd.maturity)), "Quarterly Compounded"]),
    body(["Interest Gain", gain(r2(ov.fd.gain)), ""]),
    body(["Avg Interest Rate (%)", r2(ov.fd.avgRate), ""]),
    body(["Next Maturity Date", dmy(ov.fd.nextMaturity), ""]),
    blank(),
    head(["RECURRING DEPOSITS (RD) SUMMARY", "VALUE", "DETAILS"]),
    body(["Monthly RD Outflow", r2(ov.rd.monthly), `${rds.length} RDs`]),
    body(["Total Invested", r2(ov.rd.invested), ""]),
    body(["Expected Maturity", bold(r2(ov.rd.maturity)), "Quarterly Compounded"]),
    body(["Interest Gain", gain(r2(ov.rd.gain)), ""]),
    body(["Last RD End Date", dmy(ov.rd.lastEndDate), ""]),
    blank(),
    head(["FLEXI RD SUMMARY", "VALUE", "DETAILS"]),
    body(["Base Monthly Outflow", r2(ov.flexiRd.baseMonthly), `${frds.length} Flexi RDs`]),
    body(["Total Deposited", r2(ov.flexiRd.invested), ""]),
    body(["Expected Maturity", bold(r2(ov.flexiRd.maturity)), ""]),
    body(["Interest Gain", gain(r2(ov.flexiRd.gain)), ""]),
    blank(),
    head(["RETIREMENT & ULIP SUMMARY", "VALUE", "DETAILS"]),
    body(["PPF Total Contribution", r2(ov.ppf.contribution), `${ppfRate}% p.a. EEE`]),
    body(["PPF Current Balance", bold(r2(ov.ppf.balance)), `Interest Earned: ₹${r2(ov.ppf.interest)}`]),
    body(["PPF Current FY Contribution", r2(ov.ppf.latestFyTotal), ov.ppf.latestFyTotal >= PPF_FY_LIMIT ? "₹1.5L limit reached" : `₹${r2(PPF_FY_LIMIT - ov.ppf.latestFyTotal)} lesser than the ₹1.5L limit`]),
    body(["EPF Current Balance (Employee + Employer)", bold(r2(ov.epf.balance)), `${epfRate}% p.a.${epfUan ? " • UAN: " + epfUan : ""}`]),
    body(["ULIP Total Paid", r2(ov.ulip.paid), ""]),
    body(["ULIP Current Value", bold(r2(ov.ulip.value)), ""]),
    blank(),
    head(["INSURANCE SUMMARY", "SUM INSURED / COVER (INR)", "ANNUAL PREMIUM (INR) • POLICIES"]),
    body(["Health Insurance", r2(ov.health.sumInsured), `₹${r2(ov.health.premium)} • ${ov.health.count} policies`]),
    body(["Life Insurance", r2(ov.life.sumInsured), `₹${r2(ov.life.premium)} • ${ov.life.count} policies`]),
    body(["Vehicle / Motor Insurance", r2(ov.vehicle.sumInsured), `₹${r2(ov.vehicle.premium)} • ${ov.vehicle.count} policies`]),
    body(["Home Loan Protection & Property Insurance", r2(ov.homeLoanIns.sumInsured), `₹${r2(ov.homeLoanIns.premium)} • ${ov.homeLoanIns.count} policies`]),
    blank(),
    head(["HOME LOAN SUMMARY", "VALUE", "DETAILS"]),
    body(["Outstanding Principal", bold(r2(hl.outstanding_principal)), ""]),
    body(["Monthly EMI", r2(hl.monthly_emi), `Standard Formula EMI: ₹${hl.auto_emi}`]),
    body(["Original Loan Amount", r2(hl.original_loan_amount), `Principal Repaid: ${hl.repaid_pct}%`]),
    body(["Loan Start Date", dmy(hl.loan_start_date), ""]),
    body(["EMI Debit Date", `${hl.emi_day || 26}th of every month`, ""]),
    body(["Tenure (Years)", num(hl.tenure_years), ""]),
    body(["Interest Rate (%)", num(hl.interest_rate), ""]),
    blank(),
    head(["BANKING SUMMARY", "VALUE", "DETAILS"]),
    body(["Total Bank Balance", bold(r2(banking.accounts.totalBalance)), `${banking.accounts.count || 0} accounts`]),
    body(["Estimated Annual Interest", gain(r2(banking.accounts.annualInterest)), ""]),
    body(["Total Credit Limit", r2(banking.cards.totalLimit), `${banking.cards.count || 0} cards`]),
    body(["Credit Utilized", r2(banking.cards.totalUtilized), `${banking.cards.utilizationPct || 0}% utilization`]),
    body(["Credit Available", r2(banking.cards.totalAvailable), ""]),
    body(["Reward Points", num(banking.cards.totalRewardPoints), ""]),
    blank(),
    head(["TAX SNAPSHOT", "VALUE (INR)", "DETAILS"]),
    body(["Section 80C Utilised", r2(ov.tax.utilized80C), `${ov.tax.pct80C}% of ₹1.5L`]),
    body(["Section 80D Utilised", r2(ov.tax.utilized80D), `${ov.tax.pct80D}% of ₹50K`]),
    body(["Estimated Tax Saved", gain(r2(ov.tax.totalTaxSaved)), ""]),
    body(["Recommended Regime", tc.recommendedRegime, `Active: ${tc.activeRegime}`]),
    body(["Tax Savings vs Other Regime", r2(tc.taxSavings), ""])
  ];

  // 2. Investments (Mutual Funds) -----------------------------------------
  const investments = [
    title("INVESTMENTS (MUTUAL FUNDS)"),
    head(["Scheme Name", "Scheme Code", "Category", "AMC / Fund House", "Monthly SIP", "SIP Start Date", "Units", "Latest NAV", "NAV Date", "Current Value", "Invested Amount", "Absolute Gain", "Return %", "Step-Up %"]),
    ...mfs.map(mf => {
      const g = num(mf.current_value) - num(mf.invested_amount);
      const pct = num(mf.invested_amount) > 0 ? ((g / mf.invested_amount) * 100).toFixed(2) + "%" : "0.00%";
      return body([
        mf.scheme_name, text(mf.scheme_code), mf.category, mf.amc || "", num(mf.sip_amount), dmy(mf.start_date),
        num(mf.units), num(mf.latest_nav), mf.nav_date || "", bold(num(mf.current_value)), num(mf.invested_amount),
        gain(r2(g)), pct, `${num(mf.step_up_pct)}%`
      ]);
    }),
    total(["TOTAL", "", "", "", r2(ov.mf.sip), "", "", "", "", r2(ov.mf.current), r2(ov.mf.invested), r2(ov.mf.gain), `${ov.mf.gainPct.toFixed(2)}%`, ""])
  ];

  // 3. Fixed Deposits -------------------------------------------------------
  const fdSheet = [
    title("FIXED DEPOSITS (FD)"),
    head(["Bank", "FD No", "Principal", "Rate %", "Start Date", "Maturity Date", "Duration", "Days Left to Maturity", "Interest Gain", "Maturity Amount"]),
    ...fds.map(fd => {
      const c = calculateFD(fd);
      return body([fd.bank, text(fd.fd_no), c.principal, c.rate, dmy(fd.start_date), dmy(fd.maturity_date), c.durationText, c.daysLeftLabel, gain(c.gain), bold(c.maturity)]);
    }),
    total(["TOTAL", "", r2(ov.fd.principal), r2(ov.fd.avgRate), "", dmy(ov.fd.nextMaturity), "", "", r2(ov.fd.gain), r2(ov.fd.maturity)])
  ];

  // 4. Recurring Deposits (RD + Flexi RD) ----------------------------------
  const rdSheet = [
    title("RECURRING DEPOSITS (RD)"),
    head(["Bank", "RD No", "Purpose", "Monthly Amount", "Total Invested", "Rate %", "Start Date", "Duration", "End Date", "Days Left to Maturity", "Interest Gain", "Total Maturity"]),
    ...rds.map(rd => {
      const c = calculateRD(rd);
      return body([rd.bank, text(rd.rd_no), rd.purpose || "", c.monthly, c.totalInvested, c.rate, dmy(rd.start_date), c.durationText, dmy(rd.end_date), c.daysLeftLabel, gain(c.gain), bold(c.maturity)]);
    }),
    total(["TOTAL", "", "", r2(ov.rd.monthly), r2(ov.rd.invested), "", "", "", dmy(ov.rd.lastEndDate), "", r2(ov.rd.gain), r2(ov.rd.maturity)]),
    blank(),
    title("FLEXIBLE RECURRING DEPOSITS (FLEXI RD)"),
    head(["Bank", "Account No", "Purpose", "Base Monthly", "Total Deposited", "Rate %", "Start Date", "Duration", "End Date", "Days Left to Maturity", "Interest Gain", "Total Maturity"]),
    ...frds.map(frd => {
      const c = calculateFlexiRD(frd);
      return body([frd.bank, text(frd.rd_no), frd.purpose || "", c.baseMonthly, c.totalDeposited, c.rate, dmy(frd.start_date), c.durationText, dmy(frd.end_date), c.daysLeftLabel, gain(c.gain), bold(c.maturity)]);
    }),
    total(["TOTAL", "", "", r2(ov.flexiRd.baseMonthly), r2(ov.flexiRd.invested), "", "", "", "", "", r2(ov.flexiRd.gain), r2(ov.flexiRd.maturity)])
  ];

  // 5. PPF & EPF --------------------------------------------------------------
  const ppfGroups = groupPpfByFinancialYear(ppf.contributions || []);
  const retirement = [
    title(`PUBLIC PROVIDENT FUND (PPF) — ${ppfRate}% p.a.`),
    head(["Metric", "Value", "Details"]),
    body(["Total Contribution", r2(ov.ppf.contribution), ""]),
    body(["Interest Earned", gain(r2(ov.ppf.interest)), "Auto-Calculated (Balance - Contributions)"]),
    body(["Current Balance", bold(r2(ov.ppf.balance)), `Last Updated: ${dmy(ppf.last_updated)}`]),
    blank(),
    head(["Financial Year", "Entry", "Transaction Date", "Note", "Contribution (INR)", "Limit Status (₹1.5L / FY)"]),
    ...ppfGroups.flatMap(grp => {
      const diff = PPF_FY_LIMIT - grp.totalAmount;
      const status = diff > 0 ? `₹${r2(diff)} lesser than the ₹1.5L limit` : "₹1.5L limit reached";
      const header = body([bold_text(grp.fy), grp.entries.length > 1 ? `FY Total (${grp.entries.length} entries)` : "1 Entry", grp.entries.length > 1 ? "" : dmy(grp.entries[0].date), grp.entries.length > 1 ? "" : (grp.entries[0].note || ""), bold(r2(grp.totalAmount)), status]);
      const subs = grp.entries.length > 1
        ? grp.entries.map((e, i) => body([grp.fy, `  Entry #${i + 1}`, dmy(e.date), e.note || "", num(e.amount), ""]))
        : [];
      return [header, ...subs];
    }),
    total(["TOTAL PPF CONTRIBUTIONS", "", "", "", r2(ov.ppf.contribution), ""]),
    blank(),
    title(`EMPLOYEES' PROVIDENT FUND (EPF) — ${epfRate}% p.a.`),
    head(["Metric", "Value", "Details"]),
    body(["UAN (Universal Account No)", text(epfUan), ""]),
    body(["Accumulated Balance (Employee + Employer)", bold(r2(ov.epf.balance)), `Last Updated: ${dmy(epf.last_updated)}`]),
    blank(),
    head(["Transaction Date", "Particulars", "Employee Share", "Employer Share", "Interest"]),
    ...(epf.entries || []).map(e => body([dmy(e.date), e.description || "EPF Entry", num(e.employee), num(e.employer), gain(num(e.interest))])),
    total(["TOTAL EPF BALANCE", "", r2(ov.epf.balance), "", ""])
  ];

  // 6. Insurance --------------------------------------------------------------
  const insurance = [
    title("HEALTH INSURANCE POLICIES"),
    ...policyRows(data.health_insurance, "Linked Asset", "Insured Person", "Nominee Person", "Sum Insured (INR)", "Annual Premium (INR)"),
    blank(),
    title("LIFE INSURANCE POLICIES"),
    ...policyRows(data.life_insurance, "Linked Asset", "Insured Person", "Nominee Person", "Sum Assured (INR)", "Annual Premium (INR)"),
    blank(),
    title("VEHICLE / MOTOR INSURANCE POLICIES"),
    ...policyRows(data.vehicle_insurance, "Vehicle / Reg No", "Owner", "Nominee", "IDV / Sum Insured (INR)", "Annual Premium (INR)"),
    blank(),
    title("HOME LOAN PROTECTION & PROPERTY INSURANCE"),
    ...policyRows(data.home_loan_insurance, "Linked Loan / Property", "Insured Borrower", "Nominee", "Loan Cover Assured (INR)", "Premium Paid (INR)")
  ];

  // 7. Home Loan & ULIP -------------------------------------------------------
  const loanUlip = [
    title("HOME LOAN / MORTGAGE TRACKER"),
    head(["Metric", "Value"]),
    body(["Outstanding Principal", bold(r2(hl.outstanding_principal))]),
    body(["Monthly EMI", r2(hl.monthly_emi)]),
    body(["Auto-Calculated Standard EMI", r2(hl.auto_emi)]),
    body(["Original Loan Amount", r2(hl.original_loan_amount)]),
    body(["Principal Repaid", gain(r2(hl.principal_repaid))]),
    body(["Principal Repaid (%)", `${hl.repaid_pct}%`]),
    body(["Loan Start Date", dmy(hl.loan_start_date)]),
    body(["EMI Debit Date", `${hl.emi_day || 26}th of every month`]),
    body(["Tenure (Years)", num(hl.tenure_years)]),
    body(["Interest Rate (%)", num(hl.interest_rate)]),
    blank(),
    title("ULIP PORTFOLIO"),
    head(["Metric", "Value"]),
    body(["Policy Name", (data.ulip && data.ulip.policy_name) || "ULIP"]),
    body(["Total Paid", r2(ov.ulip.paid)]),
    body(["Current Value", bold(r2(ov.ulip.value))]),
    body(["Gain / (Loss)", gain(r2(ov.ulip.gain))])
  ];

  // 8. Bank Accounts & Credit Cards ------------------------------------------
  const bankSheet = [
    title("BANK ACCOUNTS"),
    head(["Bank Name", "Account Type", "Account Number", "Account Holder", "Nominee", "Purpose of Account", "Notes", "Branch / IFSC", "Interest Rate %", "Estimated Annual Interest", "Current Balance (INR)"]),
    ...(data.bank_accounts || []).map(acc => {
      const bal = num(acc.current_balance);
      const rate = num(acc.interest_rate);
      return body([acc.bank_name, acc.account_type || "Savings", text(acc.account_no), acc.holder_name || "", acc.nominee || "", acc.purpose || "", acc.notes || acc.nominee_notes || "", acc.branch_ifsc || "", rate, Math.round(bal * (rate / 100)), bold(r2(bal))]);
    }),
    total(["TOTAL BANK LIQUIDITY", "", "", "", "", "", "", "", "", r2(banking.accounts.annualInterest), r2(banking.accounts.totalBalance)]),
    blank(),
    title("CREDIT CARDS & LIMITS"),
    head(["Issuing Bank", "Card Name", "Network", "Last 4 Digits", "Billing Day", "Due Day", "Total Credit Limit", "Current Utilized", "Available Limit", "Utilization %", "Reward Points", "Annual Fee / Notes"]),
    ...(data.credit_cards || []).map(card => {
      const limit = num(card.credit_limit);
      const used = num(card.utilized_amount);
      return body([card.bank_name, card.card_name, card.network || "Visa", text(card.last4), card.billing_day || 1, card.due_day || 15, limit, r2(used), r2(Math.max(0, limit - used)), `${limit > 0 ? ((used / limit) * 100).toFixed(1) : "0.0"}%`, num(card.reward_points), card.annual_fee_notes || ""]);
    }),
    total(["TOTAL CREDIT CARDS", "", "", "", "", "", r2(banking.cards.totalLimit), r2(banking.cards.totalUtilized), r2(banking.cards.totalAvailable), `${banking.cards.utilizationPct || 0}%`, num(banking.cards.totalRewardPoints), ""])
  ];

  // 9. Income Tax -------------------------------------------------------------
  const p = tc.profile;
  const nr = tc.newRegime;
  const or = tc.oldRegime;
  const taxSheet = [
    title(`INCOME TAX & ITR RETURN CALCULATION (FY ${p.fy})`),
    head(["Profile Input", "Value (INR)"]),
    body(["Age Group", p.age_group]),
    body(["Preferred Regime", p.preferred_regime]),
    body(["Salaried", p.is_salaried ? "Yes" : "No"]),
    body(["Gross Salary", num(p.gross_salary)]),
    body(["Interest Income", num(p.interest_income)]),
    body(["Rental Income", num(p.rental_income)]),
    body(["Other Income", num(p.other_income)]),
    body(["HRA Exemption", num(p.hra_exemption)]),
    body(["Professional Tax", num(p.professional_tax)]),
    body(["Home Loan Interest (Sec 24b)", num(p.home_loan_interest_24b)]),
    body(["Section 80C", num(p.sec_80c)]),
    body(["Section 80CCD(1B) NPS", num(p.sec_80ccd_1b_nps)]),
    body(["Section 80CCD(2) Employer NPS", num(p.sec_80ccd_2_employer_nps)]),
    body(["Section 80D Health", num(p.sec_80d_health)]),
    body(["Section 80TTA Savings", num(p.sec_80tta_savings)]),
    body(["Other Deductions (80E / 80G)", num(p.other_deductions_80e_80g)]),
    body(["TDS Deducted", num(p.tds_deducted)]),
    body(["Advance Tax Paid", num(p.advance_tax_paid)]),
    blank(),
    head(["Particular", "New Tax Regime (INR)", "Old Tax Regime (INR)"]),
    body(["Gross Total Income", tc.grossTotalIncome, tc.grossTotalIncome]),
    body(["Standard Deduction", nr.stdDeduction, or.stdDeduction]),
    body(["Other Chapter VI-A & Sec 10/24b Deductions", nr.totalDeductions - nr.stdDeduction, or.totalDeductions - or.stdDeduction]),
    body(["Net Taxable Income", nr.taxableIncome, or.taxableIncome]),
    body(["Slab Tax (Before Rebate)", nr.slabTax, or.slabTax]),
    body(["Section 87A Rebate & Marginal Relief", nr.rebate87A + nr.marginalRelief, or.rebate87A + (or.marginalRelief || 0)]),
    body(["Surcharge", nr.surcharge.amount, or.surcharge.amount]),
    body(["Health & Education Cess (4%)", nr.cess, or.cess]),
    body([{ v: "Total Income Tax Liability", s: "sBody", t: "String" }, bold(nr.totalTax), bold(or.totalTax)]),
    body(["Effective Tax Rate (%)", `${nr.effectiveRate.toFixed(2)}%`, `${or.effectiveRate.toFixed(2)}%`]),
    body(["Total Taxes Paid (TDS + Advance Tax)", tc.totalTaxesPaid, tc.totalTaxesPaid]),
    body(["ITR Refund (+) or Balance Tax Payable (-)", nr.refundOrPayable, or.refundOrPayable]),
    body(["Net Annual Post-Tax Income", nr.netPostTaxIncome, or.netPostTaxIncome]),
    body(["Recommended Regime", tc.recommendedRegime, ""]),
    blank(),
    title("NEW REGIME — SLAB BREAKDOWN"),
    head(["Slab", "Rate %", "Taxable in Slab", "Tax in Slab"]),
    ...nr.slabs.map(s => body([s.label, s.rate, s.taxableInSlab, s.taxInSlab])),
    blank(),
    title("OLD REGIME — SLAB BREAKDOWN"),
    head(["Slab", "Rate %", "Taxable in Slab", "Tax in Slab"]),
    ...or.slabs.map(s => body([s.label, s.rate, s.taxableInSlab, s.taxInSlab]))
  ];

  return [
    { name: "Overview", title: "CONSOLIDATED OVERVIEW", rows: overview },
    { name: "Investments", title: "INVESTMENTS (MUTUAL FUNDS)", rows: investments },
    { name: "Fixed Deposits (FD)", title: "FIXED DEPOSITS (FD)", rows: fdSheet },
    { name: "RD and Flexi RD", title: "RECURRING DEPOSITS (RD & FLEXI RD)", rows: rdSheet },
    { name: "PPF and EPF", title: "RETIREMENT (PPF & EPF)", rows: retirement },
    { name: "Insurance", title: "INSURANCE (HEALTH, LIFE, VEHICLE, HOME LOAN)", rows: insurance },
    { name: "Home Loan and ULIP", title: "HOME LOAN & ULIP", rows: loanUlip },
    { name: "Bank and Cards", title: "BANK ACCOUNTS & CREDIT CARDS", rows: bankSheet },
    { name: "Income Tax", title: "INCOME TAX & ITR", rows: taxSheet }
  ];
}

function bold_text(v) {
  return { v: String(v), s: "sBody", t: "String" };
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
function escXml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExcelWorkbook(data, ov) {
  const sheets = buildSheets(data, ov);
  const sheetXml = sheets.map(sh => {
    const maxCols = Math.max(1, ...sh.rows.map(r => r.c.length));
    const cols = Array.from({ length: maxCols }, (_, i) => `<Column ss:Width="${i === 0 ? 210 : 120}"/>`).join("");
    const rows = sh.rows.map(r => {
      if (r.k === "blank") return `<Row/>`;
      const cells = r.c.map(c => {
        const n = norm(c, r.k);
        return `<Cell ss:StyleID="${n.s}"><Data ss:Type="${n.t}">${escXml(n.v)}</Data></Cell>`;
      }).join("");
      return `<Row ss:AutoFitHeight="1">${cells}</Row>`;
    }).join("");
    return `<Worksheet ss:Name="${escXml(sh.name)}"><Table>${cols}${rows}</Table></Worksheet>`;
  }).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Inter" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sTitle">
   <Font ss:FontName="Inter" ss:Size="12" ss:Bold="1" ss:Color="#312E81"/>
  </Style>
  <Style ss:ID="sHead">
   <Font ss:FontName="Inter" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sBody">
   <Font ss:FontName="Inter" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sNum">
   <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sBoldNum">
   <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="sGain">
   <Font ss:FontName="JetBrains Mono" ss:Size="10" ss:Bold="1" ss:Color="#047857"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
  ${sheetXml}
</Workbook>`;
}

function csvCell(v) {
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function buildCompleteCsv(data, ov) {
  const sheets = buildSheets(data, ov);
  const lines = [];
  lines.push("WEALTHFLOW — COMPLETE PORTFOLIO STATEMENT");
  lines.push(`Generated Date,${dmy(new Date().toISOString().split("T")[0])}`);
  lines.push("");
  sheets.forEach((sh, idx) => {
    lines.push(`${idx + 1}. ${sh.title}`);
    sh.rows.forEach(r => {
      if (r.k === "blank") return lines.push("");
      const cells = r.c.map(c => {
        const n = norm(c, r.k);
        return n.t === "Number" ? csvCell(Number(n.v)) : csvCell(n.v);
      });
      lines.push(cells.join(","));
    });
    lines.push("");
  });
  return lines.join("\n");
}

module.exports = {
  buildExcelWorkbook,
  buildCompleteCsv
};
