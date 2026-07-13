import { CONFIG } from '../config.js';

/**
 * Check if a monthly repayment passes the Mortgage Servicing Ratio (MSR).
 * MSR applies to HDB loans only and caps repayment at 30% of gross monthly income.
 *
 * @param {number} grossMonthlyIncome
 * @param {number} monthlyRepayment
 * @returns {boolean}
 */
export function checkMSR(grossMonthlyIncome, monthlyRepayment) {
  return monthlyRepayment <= grossMonthlyIncome * CONFIG.income.msrRatio;
}

/**
 * Check if a monthly repayment passes the Total Debt Servicing Ratio (TDSR).
 * TDSR applies to all property loans and caps total obligations at 55% of gross income.
 *
 * @param {number} grossMonthlyIncome
 * @param {number} monthlyRepayment
 * @returns {boolean}
 */
export function checkTDSR(grossMonthlyIncome, monthlyRepayment) {
  return monthlyRepayment <= grossMonthlyIncome * CONFIG.income.tdsrRatio;
}

/**
 * Get maximum loan amount based on the MSR constraint.
 *
 * @param {number} grossMonthlyIncome
 * @param {number} annualRate - Annual interest rate as a decimal (e.g. 0.026).
 * @param {number} tenureYears
 * @returns {number} Maximum loan principal.
 */
export function getMaxLoanFromMSR(grossMonthlyIncome, annualRate, tenureYears) {
  const maxMonthly = grossMonthlyIncome * CONFIG.income.msrRatio;
  return getMaxLoanFromPayment(maxMonthly, annualRate, tenureYears);
}

/**
 * Get maximum loan amount based on the TDSR constraint.
 *
 * @param {number} grossMonthlyIncome
 * @param {number} annualRate - Annual interest rate as a decimal (e.g. 0.035).
 * @param {number} tenureYears
 * @returns {number} Maximum loan principal.
 */
export function getMaxLoanFromTDSR(grossMonthlyIncome, annualRate, tenureYears) {
  const maxMonthly = grossMonthlyIncome * CONFIG.income.tdsrRatio;
  return getMaxLoanFromPayment(maxMonthly, annualRate, tenureYears);
}

/**
 * Helper: derive the maximum loan principal from a given maximum monthly payment
 * using the standard present-value-of-annuity formula.
 *
 * @param {number} maxMonthlyPayment
 * @param {number} annualRate
 * @param {number} tenureYears
 * @returns {number}
 */
function getMaxLoanFromPayment(maxMonthlyPayment, annualRate, tenureYears) {
  const monthlyRate = annualRate / 12;
  const numPayments = tenureYears * 12;
  if (monthlyRate === 0) return maxMonthlyPayment * numPayments;
  return maxMonthlyPayment * (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
}
