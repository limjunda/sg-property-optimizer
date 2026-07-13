export const CONFIG = {
  // Property prices (S$)
  prices: {
    bto2Room: 200000,
    resale3Room: 380000,
    resale4Room: 550000,
    privateCondo: 900000
  },

  // Rates (annual, as decimals e.g. 0.028)
  rates: {
    propInflation: 0.028,
    equityReturn: 0.075,
    hdbLoanRate: 0.026,
    bankLoanRate: 0.035
  },

  // Rental income (monthly S$)
  rental: {
    rent3rCommon: 1000,
    rent4rCommon: 2000,
    rentCondoWhole: 2800
  },

  // Renovation costs (S$)
  renovation: {
    reno3Room: 40000,
    reno4Room: 55000,
    renoCondo: 20000,
    renoBto2Room: 25000
  },

  // Loan parameters
  loan: {
    maxLTV: 0.75,
    bankCashDownMin: 0.05,   // 5% min cash for bank loan
    bankCpfDownMax: 0.20,    // remaining 20% from CPF or cash
    defaultTenureYears: 25
  },

  // Income thresholds
  income: {
    btoIncomeCeiling: 7000,
    grantIncomeCeiling: 7000,
    msrRatio: 0.30,
    tdsrRatio: 0.55
  },

  // MOP and timeline
  timeline: {
    btoWaitYears: 4,
    standardMOP: 5,
    plusPrimeMOP: 10,
    projectionYears: 10
  },

  // Running costs (monthly S$)
  runningCosts: {
    hdbSCC: 90,
    condoMaintenance: 350,
    propertyInsurance: 25
  },

  // Savings assumption
  savingsRate: 0.30,   // 30% of gross income saved monthly

  // BSD brackets
  bsdBrackets: [
    { limit: 180000, rate: 0.01 },
    { limit: 180000, rate: 0.02 },
    { limit: 640000, rate: 0.03 },
    { limit: Infinity, rate: 0.04 }
  ],

  cpf: {
    employeeRate: 0.20,
    employerRate: 0.17,
    oaAllocationRate: 0.5677,
    wageCeiling: 8000,
    oaInterestRate: 0.025
  }
};
