/**
 * Calculate the fixed monthly mortgage repayment using standard amortization.
 *
 * @param {number} principal - Loan principal (S$).
 * @param {number} annualRate - Annual interest rate as a decimal (e.g. 0.026).
 * @param {number} tenureYears - Loan tenure in years.
 * @returns {number} Monthly repayment amount.
 */
export function calculateMonthlyRepayment(principal, annualRate, tenureYears) {
  const monthlyRate = annualRate / 12;
  const numPayments = tenureYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/**
 * Get the outstanding loan balance at a given year.
 *
 * @param {number} principal - Original loan principal.
 * @param {number} annualRate - Annual interest rate as a decimal.
 * @param {number} tenureYears - Total loan tenure in years.
 * @param {number} yearsPaid - Number of years of payments already made.
 * @returns {number} Outstanding balance.
 */
export function getOutstandingBalance(principal, annualRate, tenureYears, yearsPaid) {
  const monthlyRate = annualRate / 12;
  const totalPayments = tenureYears * 12;
  const paymentsMade = yearsPaid * 12;
  if (monthlyRate === 0) return principal * (1 - paymentsMade / totalPayments);
  const monthlyPayment = calculateMonthlyRepayment(principal, annualRate, tenureYears);
  return (
    principal * Math.pow(1 + monthlyRate, paymentsMade) -
    (monthlyPayment * (Math.pow(1 + monthlyRate, paymentsMade) - 1)) / monthlyRate
  );
}

/**
 * Get a year-by-year amortization schedule.
 *
 * @param {number} principal - Loan principal.
 * @param {number} annualRate - Annual interest rate as a decimal.
 * @param {number} tenureYears - Loan tenure in years.
 * @returns {Array<{
 *   year: number,
 *   principalPaid: number,
 *   interestPaid: number,
 *   endingBalance: number,
 *   totalPayment: number
 * }>}
 */
export function getAmortizationSchedule(principal, annualRate, tenureYears) {
  const schedule = [];
  const monthlyRate = annualRate / 12;
  const monthlyPayment = calculateMonthlyRepayment(principal, annualRate, tenureYears);
  let balance = principal;

  for (let year = 1; year <= tenureYears; year++) {
    let yearInterest = 0;
    let yearPrincipal = 0;

    for (let month = 0; month < 12; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      yearInterest += interestPayment;
      yearPrincipal += principalPayment;
      balance -= principalPayment;
    }

    schedule.push({
      year,
      principalPaid: Math.round(yearPrincipal),
      interestPaid: Math.round(yearInterest),
      endingBalance: Math.max(0, Math.round(balance)),
      totalPayment: Math.round(monthlyPayment * 12),
    });
  }

  return schedule;
}
