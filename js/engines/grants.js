/**
 * Calculate CPF housing grants available to singles in Singapore.
 *
 * Covers the Singles Grant and the Enhanced CPF Housing Grant (EHG)
 * for both BTO and Resale purchases.
 *
 * @param {number} grossMonthlyIncome - Applicant's gross monthly income (S$).
 * @param {string} purchaseType - 'BTO' or 'RESALE'.
 * @param {string} [flatSize='2-4 room'] - '2-4 room' or '5-room+'.
 * @returns {{
 *   isEligibleForProperty: boolean,
 *   errorMsg: string,
 *   breakdown: { singlesGrant: number, ehgGrant: number, proximityGrant: number },
 *   totalGrantsAvailable: number
 * }}
 */
export function calculateSinglesGrants(grossMonthlyIncome, purchaseType, flatSize = '2-4 room') {
  const type = purchaseType.toUpperCase();
  const size = flatSize.toLowerCase();

  const btoIncomeCeilingExceeded = type === 'BTO' && grossMonthlyIncome > 7000;
  let isEligibleForProperty = true;
  let errorMsg = '';

  if (btoIncomeCeilingExceeded) {
    isEligibleForProperty = false;
    errorMsg =
      'Income exceeds the S$7,000 ceiling required for Singles applying for a 2-Room BTO flat.';
  }
  if (type === 'BTO' && size !== '2-4 room') {
    isEligibleForProperty = false;
    errorMsg = 'Single citizens are restricted to 2-Room Flexi flats in the BTO market.';
  }

  // --- Singles Grant (Resale only, income ≤ $7,000) ---
  let singlesGrantAmount = 0;
  if (type === 'RESALE' && grossMonthlyIncome <= 7000) {
    if (size === '5-room+') {
      singlesGrantAmount = 25000;
    } else {
      singlesGrantAmount = 40000;
    }
  }

  // --- Enhanced CPF Housing Grant (EHG) ---
  let ehgGrantAmount = 0;
  const ehgTiers = [
    { maxIncome: 750, grant: 60000 },
    { maxIncome: 1000, grant: 55000 },
    { maxIncome: 1250, grant: 52500 },
    { maxIncome: 1500, grant: 47500 },
    { maxIncome: 1750, grant: 45000 },
    { maxIncome: 2000, grant: 40000 },
    { maxIncome: 2250, grant: 35000 },
    { maxIncome: 2500, grant: 32500 },
    { maxIncome: 2750, grant: 27500 },
    { maxIncome: 3000, grant: 25000 },
    { maxIncome: 3250, grant: 20000 },
    { maxIncome: 3500, grant: 15000 },
    { maxIncome: 3750, grant: 12500 },
    { maxIncome: 4000, grant: 10000 },
    { maxIncome: 4250, grant: 5000 },
    { maxIncome: 4500, grant: 2500 },
  ];

  if (grossMonthlyIncome <= 4500) {
    const matchedTier = ehgTiers.find((tier) => grossMonthlyIncome <= tier.maxIncome);
    ehgGrantAmount = matchedTier ? matchedTier.grant : 0;
  }

  return {
    isEligibleForProperty,
    errorMsg,
    breakdown: {
      singlesGrant: isEligibleForProperty ? singlesGrantAmount : 0,
      ehgGrant: isEligibleForProperty ? ehgGrantAmount : 0,
      proximityGrant: 0,
    },
    totalGrantsAvailable: isEligibleForProperty ? singlesGrantAmount + ehgGrantAmount : 0,
  };
}
