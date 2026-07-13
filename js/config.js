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

export const PRESETS = {
  north: {
    prices: { bto2Room: 160000, resale3Room: 340000, resale4Room: 500000, privateCondo: 900000 },
    rental: { rent3rCommon: 850, rent4rCommon: 1700, rentCondoWhole: 2500 }
  },
  northeast: {
    prices: { bto2Room: 180000, resale3Room: 370000, resale4Room: 540000, privateCondo: 960000 },
    rental: { rent3rCommon: 950, rent4rCommon: 1900, rentCondoWhole: 2700 }
  },
  east: {
    prices: { bto2Room: 260000, resale3Room: 400000, resale4Room: 600000, privateCondo: 1100000 },
    rental: { rent3rCommon: 1100, rent4rCommon: 2200, rentCondoWhole: 3100 }
  },
  west: {
    prices: { bto2Room: 200000, resale3Room: 380000, resale4Room: 560000, privateCondo: 1000000 },
    rental: { rent3rCommon: 1000, rent4rCommon: 2000, rentCondoWhole: 2900 }
  },
  central: {
    prices: { bto2Room: 380000, resale3Room: 480000, resale4Room: 800000, privateCondo: 1400000 },
    rental: { rent3rCommon: 1300, rent4rCommon: 2600, rentCondoWhole: 3800 }
  },
  cbd: {
    prices: { bto2Room: 450000, resale3Room: 580000, resale4Room: 950000, privateCondo: 1750000 },
    rental: { rent3rCommon: 1550, rent4rCommon: 3100, rentCondoWhole: 4500 }
  }
};
