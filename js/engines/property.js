import { CONFIG } from '../config.js';

/**
 * Project property value at year t with compound inflation.
 *
 * @param {number} purchasePrice - Original purchase price (S$).
 * @param {number} inflationRate - Annual property price inflation rate (decimal).
 * @param {number} year - Number of years into the future.
 * @returns {number} Projected property value.
 */
export function projectPropertyValue(purchasePrice, inflationRate, year) {
  return purchasePrice * Math.pow(1 + inflationRate, year);
}

/**
 * Calculate net monthly rental cash flow after expenses.
 *
 * @param {number} grossRent - Monthly gross rental income.
 * @param {number} mortgagePayment - Monthly mortgage repayment.
 * @param {number} propertyTax - Monthly property tax portion.
 * @param {number} serviceCharge - Monthly service/conservancy charge.
 * @returns {number} Net monthly cash flow.
 */
export function calculateNetRentalCashFlow(grossRent, mortgagePayment, propertyTax, serviceCharge) {
  return grossRent - mortgagePayment - propertyTax - serviceCharge;
}

/**
 * Calculate annual property tax using Singapore IRAS progressive rates.
 *
 * @param {number} annualRentalValue - Annual Value (AV) as assessed by IRAS.
 * @param {boolean} [isOwnerOccupied=true] - Whether the property is owner-occupied.
 * @returns {number} Annual property tax, rounded to nearest dollar.
 */
export function calculatePropertyTax(annualRentalValue, isOwnerOccupied = true) {
  if (isOwnerOccupied) {
    return calculateOwnerOccupiedTax(annualRentalValue);
  } else {
    return calculateNonOwnerOccupiedTax(annualRentalValue);
  }
}

/**
 * Progressive owner-occupied residential tax rates.
 * First $8,000: 0%, Next $22,000: 4%, Next $10,000: 5%, Next $15,000: 6%,
 * Next $15,000: 7%, Next $15,000: 8%, Next $15,000: 9%, Remainder: 10%
 * @param {number} av - Annual Value.
 * @returns {number}
 */
function calculateOwnerOccupiedTax(av) {
  const brackets = [
    { limit: 8000, rate: 0 },
    { limit: 22000, rate: 0.04 },
    { limit: 10000, rate: 0.05 },
    { limit: 15000, rate: 0.06 },
    { limit: 15000, rate: 0.07 },
    { limit: 15000, rate: 0.08 },
    { limit: 15000, rate: 0.09 },
    { limit: Infinity, rate: 0.10 },
  ];
  return applyProgressiveTax(av, brackets);
}

/**
 * Progressive non-owner-occupied residential tax rates.
 * First $30,000: 12%, Next $15,000: 20%, Remainder: 28%
 * @param {number} av - Annual Value.
 * @returns {number}
 */
function calculateNonOwnerOccupiedTax(av) {
  const brackets = [
    { limit: 30000, rate: 0.12 },
    { limit: 15000, rate: 0.20 },
    { limit: Infinity, rate: 0.28 },
  ];
  return applyProgressiveTax(av, brackets);
}

/**
 * Apply progressive tax brackets to a value.
 * @param {number} value
 * @param {Array<{limit: number, rate: number}>} brackets
 * @returns {number} Tax amount, rounded.
 */
function applyProgressiveTax(value, brackets) {
  let remaining = value;
  let tax = 0;
  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit);
    tax += taxable * bracket.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

/**
 * Estimate Annual Value from property price.
 * Rough heuristic: ~3.5% of property value.
 *
 * @param {number} propertyPrice - Market value of the property.
 * @returns {number} Estimated Annual Value, rounded.
 */
export function estimateAnnualValue(propertyPrice) {
  return Math.round(propertyPrice * 0.035);
}
