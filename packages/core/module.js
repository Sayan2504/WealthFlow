// packages/core/module.js
// Core Package: Shared Financial Math, Duration Engine, Currency Formatting & Local Persistence
const fs = require("fs");
const path = require("path");
const { enrichPortfolioWithMarketRates } = require("./market_api");

const DB_FILE = path.join(__dirname, "..", "..", "storage", "preview_data.json");

const initialPortfolioData = {
  user: {
    name: "WealthFlow Portfolio",
    annual_income: 1800000,
    last_updated: "2026-11-07"
  },
  mutual_funds: [
    {
      id: 101,
      scheme_name: "SBI Gold",
      category: "Gold ETF / Gold Fund",
      amc: "SBI Funds Management",
      sip_amount: 1000,
      start_date: "2024-09-13",
      current_value: 20992.00,
      invested_amount: 17449.00,
      step_up_pct: 0
    },
    {
      id: 102,
      scheme_name: "HDFC Nifty 50 Index Fund",
      category: "Large Cap / Index Fund",
      amc: "HDFC Asset Management Company",
      sip_amount: 3000,
      start_date: "2024-09-13",
      current_value: 40127.00,
      invested_amount: 41678.00,
      step_up_pct: 32.5
    },
    {
      id: 103,
      scheme_name: "Quant Small Cap Fund",
      category: "Small Cap Equity",
      amc: "Quant Mutual Fund (Quant AMC)",
      sip_amount: 0,
      start_date: "2025-09-07",
      current_value: 7759.00,
      invested_amount: 7000.00,
      step_up_pct: 0
    },
    {
      id: 104,
      scheme_name: "Motilal Oswal Midcap Fund",
      category: "Mid Cap Equity",
      amc: "Motilal Oswal Asset Management",
      sip_amount: 1500,
      start_date: "2024-08-27",
      current_value: 28211.00,
      invested_amount: 28499.00,
      step_up_pct: 15
    },
    {
      id: 105,
      scheme_name: "Icici Prudential Us Bluechip Equity Fund Direct Plan Growth",
      category: "International / Overseas FoF",
      amc: "ICICI Prudential Mutual Fund",
      sip_amount: 1000,
      start_date: "2026-01-31",
      current_value: 9768.00,
      invested_amount: 9000.00,
      step_up_pct: 15
    },
    {
      id: 106,
      scheme_name: "LIC MF Gold Fund ETF EOF",
      category: "Gold ETF / Gold Fund",
      amc: "LIC Mutual Fund",
      sip_amount: 0,
      start_date: "2025-08-16",
      current_value: 3776.00,
      invested_amount: 3000.00,
      step_up_pct: 0
    },
    {
      id: 107,
      scheme_name: "Parag Parikh Flexi Cap Fund",
      category: "Flexi Cap Equity",
      amc: "PPFAS Mutual Fund",
      sip_amount: 3500,
      start_date: "2025-11-02",
      current_value: 17600.00,
      invested_amount: 17999.00,
      step_up_pct: 37.5
    }
  ],
  fixed_deposits: [
    {
      id: 201,
      bank: "SBI",
      fd_no: "45588898601",
      principal: 250000,
      rate: 6.45,
      start_date: "2026-09-21",
      maturity_date: "2027-12-09",
      maturity_amount: 270240
    },
    {
      id: 202,
      bank: "PNB",
      fd_no: "054520DP00028943",
      principal: 500000,
      rate: 6.60,
      start_date: "2025-07-29",
      maturity_date: "2027-10-16",
      maturity_amount: 541451
    },
    {
      id: 203,
      bank: "HDFC",
      fd_no: "50301346662245",
      principal: 100000,
      rate: 6.45,
      start_date: "2025-05-03",
      maturity_date: "2027-11-03",
      maturity_amount: 110102
    },
    {
      id: 204,
      bank: "HDFC",
      fd_no: "50301421664925",
      principal: 50000,
      rate: 4.25,
      start_date: "2026-09-21",
      maturity_date: "2027-01-01",
      maturity_amount: 50594
    },
    {
      id: 205,
      bank: "PNB",
      fd_no: "166610PU00001356",
      principal: 100000,
      rate: 6.25,
      start_date: "2026-09-10",
      maturity_date: "2027-09-10",
      maturity_amount: 106398
    }
  ],
  recurring_deposits: [
    {
      id: 301,
      bank: "HDFC",
      rd_no: "5040 0362 2929 38",
      purpose: "Travel",
      monthly_amount: 18000,
      rate: 7.05,
      start_date: "2025-05-10",
      end_date: "2026-11-10",
      maturity_amount: 342641
    },
    {
      id: 302,
      bank: "HDFC",
      rd_no: "5040 0359 7357 57",
      purpose: "Sister college fees",
      monthly_amount: 5000,
      rate: 6.60,
      start_date: "2026-04-01",
      end_date: "2027-04-01",
      maturity_amount: 62056
    }
  ],
  flexi_rds: [],
  ppf: {
    account_identifier: "PPF-SOVEREIGN",
    interest_rate: 7.10,
    current_balance: 894315,
    last_updated: "2026-11-07",
    contributions: [
      { id: 401, fy: "2021 - 2022", date: "2022-03-31", amount: 150000 },
      { id: 402, fy: "2022 - 2023", date: "2023-03-31", amount: 150000 },
      { id: 403, fy: "2023 - 2024", date: "2024-03-31", amount: 150000 },
      { id: 404, fy: "2024 - 2025", date: "2025-03-31", amount: 100000 },
      { id: 405, fy: "2025 - 2026", date: "2026-03-31", amount: 63500 },
      { id: 406, fy: "2026 - 2027", date: "2026-11-07", amount: 137000 }
    ]
  },
  epf: {
    account_identifier: "EPFO-UAN",
    interest_rate: 8.25,
    current_balance: 683975,
    last_updated: "2026-11-07",
    entries: [
      {
        id: 501,
        date: "2026-11-07",
        description: "Accumulated EPF Corpus (Employee + Employer)",
        employee: 341987.50,
        employer: 341987.50,
        interest: 0
      }
    ]
  },
  ulip: {
    policy_name: "Market-Linked ULIP",
    total_paid: 120000.24,
    current_value: 49452.01
  },
  home_loan: {
    outstanding_principal: 2698271,
    monthly_emi: 30615,
    original_loan_amount: 4000000,
    loan_start_date: "2025-04-05",
    tenure_years: 30,
    interest_rate: 7.45,
    emi_day: 26
  },
  health_insurance: [
    {
      id: 601,
      insurer: "Aditya Birla Capital Health Insurance",
      policy_name: "Activ One NXT",
      policy_type: "Individual",
      insured_person: "Sangita Sinha",
      nominee_person: "Chhanda Sinha",
      sum_insured: 1000000,
      annual_premium: 5178,
      policy_no: "31-25-0264118-00",
      start_date: "2025-09-21",
      end_date: "2028-09-21"
    },
    {
      id: 602,
      insurer: "Aditya Birla Capital Health Insurance",
      policy_name: "Activ One NXT",
      policy_type: "Parents",
      insured_person: "Chhanda Sinha, Goutam Sinha",
      nominee_person: "Anuska Sarkar",
      sum_insured: 1000000,
      annual_premium: 43184,
      policy_no: "31-25-0216771-00",
      start_date: "2025-08-22",
      end_date: "2028-08-21"
    },
    {
      id: 603,
      insurer: "Aditya Birla Capital Health Insurance",
      policy_name: "ActivOne Maternity",
      policy_type: "Me, Spouse",
      insured_person: "Sayan Sinha, Anuska Sarkar",
      nominee_person: "Anuska Sarkar",
      sum_insured: 1000000,
      annual_premium: 19807,
      policy_no: "31-25-0094311-00",
      start_date: "2025-06-06",
      end_date: "2028-07-05"
    },
    {
      id: 604,
      insurer: "Zurich Kotak (Employer)",
      policy_name: "Vidal Health",
      policy_type: "Family",
      insured_person: "Sayan Sinha, Anuska Sarkar, Chhanda Sinha, Goutam Sinha",
      nominee_person: "Anuska Sarkar",
      sum_insured: 500000,
      annual_premium: 30000,
      policy_no: "",
      start_date: "2026-04-01",
      end_date: "2027-03-31"
    }
  ],
  life_insurance: [],
  vehicle_insurance: [],
  home_loan_insurance: [],
  bank_accounts: [],
  credit_cards: [],
  tax_profile: {}
};

const emptyPortfolioData = initialPortfolioData;

function loadData() {
  const storageDir = path.dirname(DB_FILE);
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyPortfolioData, null, 2));
    return JSON.parse(JSON.stringify(emptyPortfolioData));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!parsed.fixed_deposits || !parsed.ppf) {
      fs.writeFileSync(DB_FILE, JSON.stringify(emptyPortfolioData, null, 2));
      return JSON.parse(JSON.stringify(emptyPortfolioData));
    }
    parsed.bank_accounts = parsed.bank_accounts || [];
    parsed.credit_cards = parsed.credit_cards || [];
    parsed.tax_profile = parsed.tax_profile || {};
    parsed.flexi_rds = parsed.flexi_rds || [];
    parsed.vehicle_insurance = parsed.vehicle_insurance || [];
    parsed.home_loan_insurance = parsed.home_loan_insurance || [];

    // Ensure prefilled FDs & RDs carry their exact bank maturity amounts from the user's tracker
    const fdDefaultMap = { 201: 270240, 202: 541451, 203: 110102, 204: 50594, 205: 106398 };
    let fdUpdated = false;
    (parsed.fixed_deposits || []).forEach(fd => {
      if (!fd.maturity_amount && fdDefaultMap[fd.id]) {
        fd.maturity_amount = fdDefaultMap[fd.id];
        fdUpdated = true;
      }
    });
    const rdDefaultMap = { 301: 342641, 302: 62056 };
    (parsed.recurring_deposits || []).forEach(rd => {
      if (!rd.maturity_amount && rdDefaultMap[rd.id]) {
        rd.maturity_amount = rdDefaultMap[rd.id];
        fdUpdated = true;
      }
    });
    if (parsed.ppf && Array.isArray(parsed.ppf.contributions)) {
      parsed.ppf.contributions.forEach(c => {
        const normFy = normalizePpfFy(c.date, c.fy);
        if (c.fy !== normFy) {
          c.fy = normFy;
          fdUpdated = true;
        }
      });
    }

    if (enrichPortfolioWithMarketRates(parsed) || fdUpdated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(emptyPortfolioData));
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function normalizePpfFy(dateStr, rawFy) {
  if (rawFy) {
    const m = String(rawFy).match(/(\d{4})/);
    if (m) {
      const startYr = parseInt(m[1], 10);
      if (startYr >= 1990 && startYr <= 2100) {
        return `${startYr} - ${startYr + 1}`;
      }
    }
  }
  if (dateStr) {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10);
      if (y >= 1990 && mo >= 1 && mo <= 12) {
        const startYr = mo >= 4 ? y : y - 1;
        return `${startYr} - ${startYr + 1}`;
      }
    }
  }
  return "2026 - 2027";
}

function groupPpfByFinancialYear(contributions = []) {
  const map = new Map();
  (contributions || []).forEach(c => {
    const fy = normalizePpfFy(c.date, c.fy);
    if (!map.has(fy)) {
      const match = fy.match(/(\d{4})/);
      const sortYear = match ? parseInt(match[1], 10) : 0;
      map.set(fy, { fy, sortYear, totalAmount: 0, entries: [] });
    }
    const grp = map.get(fy);
    const amt = Number(c.amount) || 0;
    grp.totalAmount += amt;
    grp.entries.push({ ...c, fy, amount: amt });
  });
  const groups = Array.from(map.values()).sort((a, b) => a.sortYear - b.sortYear);
  groups.forEach(g => {
    g.entries.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  });
  return groups;
}

function computeExactDuration(startStr, endStr) {
  if (!startStr || !endStr) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, totalYears: 0, text: "0 Yrs, 0 Mos, 0 Days" };
  }
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, totalYears: 0, text: "0 Yrs, 0 Mos, 0 Days" };
  }

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months + (days / 30);
  const totalYears = years + (months / 12) + (days / 365);
  const text = `${years} Yrs, ${months} Mos, ${days} Days`;

  return { years, months, days, totalMonths, totalYears, text };
}

function formatINR(val, decimals = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(val) || 0);
}

function formatNum(val, decimals = 0) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(val) || 0);
}

function formatDateDMY(isoStr) {
  if (!isoStr || isoStr === "—") return "—";
  const parts = String(isoStr).split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

module.exports = {
  emptyPortfolioData,
  loadData,
  saveData,
  normalizePpfFy,
  groupPpfByFinancialYear,
  computeExactDuration,
  formatINR,
  formatNum,
  formatDateDMY
};
