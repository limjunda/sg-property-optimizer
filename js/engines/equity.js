/**
 * Project equity portfolio value with an initial lump sum and regular monthly contributions.
 * Uses compound growth formula (lump-sum growth + future value of annuity).
 *
 * @param {number} initialCapital - Initial investment amount (S$). Clamped to ≥ 0.
 * @param {number} monthlyContribution - Regular monthly contribution (S$). Clamped to ≥ 0.
 * @param {number} annualReturn - Expected annual return rate as a decimal (e.g. 0.075).
 * @param {number} years - Investment horizon in years.
 * @returns {number} Projected portfolio value, rounded to nearest dollar.
 */
export function projectEquityPortfolio(initialCapital, monthlyContribution, annualReturn, years) {
  if (initialCapital < 0) initialCapital = 0;
  if (monthlyContribution < 0) monthlyContribution = 0;

  const monthlyReturn = annualReturn / 12;
  const totalMonths = years * 12;

  // Lump sum compound growth
  const lumpSumGrowth = initialCapital * Math.pow(1 + monthlyReturn, totalMonths);

  // Future value of annuity (monthly contributions)
  let annuityGrowth = 0;
  if (monthlyReturn > 0) {
    annuityGrowth =
      monthlyContribution * (Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn;
  } else {
    annuityGrowth = monthlyContribution * totalMonths;
  }

  return Math.round(lumpSumGrowth + annuityGrowth);
}

/**
 * Get a year-by-year equity portfolio breakdown.
 *
 * @param {number} initialCapital - Initial investment (clamped to ≥ 0).
 * @param {number} monthlyContribution - Monthly contribution (clamped to ≥ 0).
 * @param {number} annualReturn - Annual return rate as a decimal.
 * @param {number} years - Number of years to project.
 * @returns {Array<{
 *   year: number,
 *   portfolioValue: number,
 *   totalContributed: number,
 *   totalGains: number
 * }>}
 */
export function getEquitySchedule(initialCapital, monthlyContribution, annualReturn, years) {
  const schedule = [];
  const monthlyReturn = annualReturn / 12;
  let balance = Math.max(0, initialCapital);
  let totalContributed = Math.max(0, initialCapital);

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyReturn) + Math.max(0, monthlyContribution);
      totalContributed += Math.max(0, monthlyContribution);
    }

    schedule.push({
      year,
      portfolioValue: Math.round(balance),
      totalContributed: Math.round(totalContributed),
      totalGains: Math.round(balance - totalContributed),
    });
  }

  return schedule;
}
