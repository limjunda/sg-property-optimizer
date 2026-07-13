import { CONFIG } from '../config.js';

/**
 * Calculate Buyer's Stamp Duty (BSD) using Singapore's progressive brackets.
 *
 * Bracket structure:
 *   First S$180,000  → 1%
 *   Next  S$180,000  → 2%
 *   Next  S$640,000  → 3%
 *   Remainder         → 4%
 *
 * @param {number} purchasePrice - Property purchase price in S$.
 * @returns {number} Total BSD amount, rounded to nearest dollar.
 */
export function calculateBSD(purchasePrice) {
  let remaining = purchasePrice;
  let totalBSD = 0;

  for (const bracket of CONFIG.bsdBrackets) {
    const taxable = Math.min(remaining, bracket.limit);
    totalBSD += taxable * bracket.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }

  return Math.round(totalBSD);
}
