/**
 * Singapore Property Optimizer — 10-Year Simulation Engine
 * 
 * Runs all 4 property acquisition paths in parallel:
 *   Path 1: 2-Room Flexi BTO + Equity Compounding
 *   Path 2: 3-Room Resale HDB + 1 Room Rental
 *   Path 3: 4-Room Resale HDB + 2 Rooms Rental
 *   Path 4: Private Condo (Owner-Occupied)
 * 
 * Each path produces a yearly net worth trajectory from Age 35 to 45.
 */

import { CONFIG } from './config.js';
import { calculateSinglesGrants } from './engines/grants.js';
import { checkMSR, checkTDSR, getMaxLoanFromMSR, getMaxLoanFromTDSR } from './engines/debt.js';
import { calculateBSD } from './engines/bsd.js';
import { calculateMonthlyRepayment, getOutstandingBalance } from './engines/mortgage.js';
import { projectPropertyValue, estimateAnnualValue, calculatePropertyTax } from './engines/property.js';
import { projectEquityPortfolio } from './engines/equity.js';


/**
 * Main simulation entry point.
 * 
 * @param {object} userInputs - { age, income, cpfOA, cashLiquidity }
 * @param {object} [overrides] - Optional overrides for CONFIG defaults
 * @returns {object[]} Array of 4 path result objects
 */
export function runSimulation(userInputs, overrides = {}) {
    const cfg = mergeConfig(overrides);
    const { age, income, cpfOA, cashLiquidity } = userInputs;
    const years = cfg.timeline.projectionYears;

    // Monthly savings available for equity investment
    const monthlySavings = income * cfg.savingsRate;

    const results = [
        simulateBTO(age, income, cpfOA, cashLiquidity, monthlySavings, cfg, years),
        simulateResale3Room(age, income, cpfOA, cashLiquidity, monthlySavings, cfg, years),
        simulateResale4Room(age, income, cpfOA, cashLiquidity, monthlySavings, cfg, years),
        simulatePrivateCondo(age, income, cpfOA, cashLiquidity, monthlySavings, cfg, years),
    ];

    return results;
}


/**
 * Deep-merge user overrides into a copy of CONFIG.
 */
function mergeConfig(overrides) {
    const cfg = JSON.parse(JSON.stringify(CONFIG));
    for (const [section, values] of Object.entries(overrides)) {
        if (typeof values === 'object' && values !== null && cfg[section]) {
            Object.assign(cfg[section], values);
        } else {
            cfg[section] = values;
        }
    }
    return cfg;
}


// ─────────────────────────────────────────────────
// PATH 1: 2-Room Flexi BTO + Equity Compounding
// ─────────────────────────────────────────────────

function simulateBTO(age, income, cpfOA, cash, monthlySavings, cfg, years) {
    const pathName = '2-Room Flexi BTO';
    const price = cfg.prices.bto2Room;
    const warnings = [];

    // ── Eligibility ──
    const grants = calculateSinglesGrants(income, 'BTO', '2-4 room');
    if (!grants.isEligibleForProperty) {
        return createIneligibleResult(pathName, grants.errorMsg, years, age);
    }

    // ── Loan & Affordability ──
    const bsd = calculateBSD(price);
    const totalGrants = grants.totalGrantsAvailable;
    
    // Max loan: minimum of 75% LTV limit and MSR limit
    const maxLoanLTV = price * cfg.loan.maxLTV;
    const maxLoanMSR = getMaxLoanFromMSR(income, cfg.rates.hdbLoanRate, cfg.loan.defaultTenureYears);
    let loanAmount = Math.min(maxLoanLTV, maxLoanMSR);

    let downpayment, cpfUsed, cashRequired;
    const dpTotal = price - loanAmount; // Total downpayment before grants
    const renoFee = cfg.renovation.renoBto2Room;

    if (totalGrants > dpTotal) {
        // Excess grants reduce the loan principal
        loanAmount = price - totalGrants;
        downpayment = totalGrants;
        cpfUsed = 0;
        cashRequired = bsd; // Renovation is paid at Year 4
    } else {
        downpayment = dpTotal;
        cpfUsed = Math.min(cpfOA, dpTotal - totalGrants);
        cashRequired = (dpTotal - totalGrants - cpfUsed) + bsd; // Renovation is paid at Year 4
    }

    let isAffordable = true;
    if (cashRequired > cash) {
        isAffordable = false;
        warnings.push(`Insufficient upfront capital. Required: S$${Math.round(cashRequired).toLocaleString()}, Available: S$${Math.round(cash).toLocaleString()}`);
    }

    const monthlyMortgage = calculateMonthlyRepayment(loanAmount, cfg.rates.hdbLoanRate, cfg.loan.defaultTenureYears);

    // ── Remaining Liquidity ──
    let remainingCash = cash - cashRequired;

    // ── Year-by-Year Simulation ──
    const yearlyData = [];
    const btoWait = cfg.timeline.btoWaitYears;

    let cpfOABalance = cpfOA - cpfUsed;
    let equityPortfolio = remainingCash;
    let cumulativeRental = 0;

    const monthlyCpfOA = Math.min(income, cfg.cpf.wageCeiling) * (cfg.cpf.employeeRate + cfg.cpf.employerRate) * cfg.cpf.oaAllocationRate;

    for (let t = 0; t <= years; t++) {
        const propertyValue = projectPropertyValue(price, cfg.rates.propInflation, t);
        let loanBalance = loanAmount;
        let mortgagePaidThisYear = 0;
        let rentalIncome = 0;

        if (t === 0) {
            mortgagePaidThisYear = 0;
        } else {
            if (t < btoWait) {
                loanBalance = loanAmount;
            } else {
                const yearsIntoLoan = t - btoWait;
                loanBalance = getOutstandingBalance(loanAmount, cfg.rates.hdbLoanRate, cfg.loan.defaultTenureYears, yearsIntoLoan);
            }

            const isMortgageActive = (t >= btoWait);
            const monthlyReturn = cfg.rates.equityReturn / 12;
            const cpfInterestRateMonthly = cfg.cpf.oaInterestRate / 12;

            if (t === btoWait) {
                // Key collection! Renovation cost is paid now.
                equityPortfolio -= renoFee;
            }

            for (let m = 0; m < 12; m++) {
                // Add monthly interest to CPF OA
                cpfOABalance *= (1 + cpfInterestRateMonthly);
                // Add monthly CPF OA contribution
                cpfOABalance += monthlyCpfOA;

                // Deduct mortgage
                let cashMortgageShortfall = 0;
                if (isMortgageActive) {
                    if (cpfOABalance >= monthlyMortgage) {
                        cpfOABalance -= monthlyMortgage;
                        cashMortgageShortfall = 0;
                    } else {
                        const shortfall = monthlyMortgage - cpfOABalance;
                        cpfOABalance = 0;
                        cashMortgageShortfall = shortfall;
                    }
                    mortgagePaidThisYear += monthlyMortgage;
                }

                // Property tax and SCC after completion
                let otherMonthlyCosts = 0;
                if (isMortgageActive) {
                    const av = estimateAnnualValue(propertyValue);
                    const annualPropertyTax = calculatePropertyTax(av, true);
                    otherMonthlyCosts = cfg.runningCosts.hdbSCC + (annualPropertyTax / 12);
                }

                const monthlyEquityContrib = monthlySavings - cashMortgageShortfall - otherMonthlyCosts;
                equityPortfolio = equityPortfolio * (1 + monthlyReturn) + monthlyEquityContrib;
            }
        }

        const netWorth = propertyValue + equityPortfolio + cpfOABalance - loanBalance;

        // Check for bankruptcy (cash reserves depleted)
        if (equityPortfolio < 0) {
            isAffordable = false;
            const msg = 'Cash reserves depleted during projection period due to monthly cash flow deficit.';
            if (!warnings.includes(msg)) {
                warnings.push(msg);
            }
        }

        yearlyData.push({
            year: t,
            age: age + t,
            propertyValue: Math.round(propertyValue),
            loanBalance: Math.round(Math.max(0, loanBalance)),
            equityPortfolio: Math.round(equityPortfolio),
            cpfOABalance: Math.round(cpfOABalance),
            netWorth: Math.round(netWorth),
            rentalIncome: Math.round(rentalIncome * 12),
            mortgagePayment: Math.round(mortgagePaidThisYear),
            cumulativeRental: Math.round(cumulativeRental)
        });
    }

    const final = yearlyData[yearlyData.length - 1];
    return {
        pathName,
        pathId: 'bto',
        isAffordable,
        isEligible: true,
        yearlyData,
        warnings,
        grants: grants.breakdown,
        totalGrants: totalGrants,
        upfrontCosts: { downpayment: Math.round(downpayment), bsd, renovation: renoFee, total: Math.round(cashRequired + cpfUsed) },
        loanDetails: { amount: Math.round(loanAmount), rate: cfg.rates.hdbLoanRate, monthlyPayment: Math.round(monthlyMortgage), type: 'HDB Concessionary' },
        summary: {
            finalNetWorth: final.netWorth,
            liquidEquityRatio: final.equityPortfolio / Math.max(1, final.netWorth),
            tenantSubsidyTotal: 0
        }
    };
}


// ─────────────────────────────────────────────────
// PATH 2: 3-Room Resale HDB + 1 Room Rental
// ─────────────────────────────────────────────────

function simulateResale3Room(age, income, cpfOA, cash, monthlySavings, cfg, years) {
    const pathName = '3-Room Resale HDB';
    const price = cfg.prices.resale3Room;
    const warnings = [];

    // ── Grants ──
    const grants = calculateSinglesGrants(income, 'Resale', '2-4 room');
    const totalGrants = grants.totalGrantsAvailable;

    // Determine loan type: HDB concessionary if income <= 7000, else bank
    const isHDBLoan = income <= cfg.income.grantIncomeCeiling;
    const loanRate = isHDBLoan ? cfg.rates.hdbLoanRate : cfg.rates.bankLoanRate;

    // ── Loan & Affordability ──
    const bsd = calculateBSD(price);
    const maxLoanLTV = price * cfg.loan.maxLTV;
    const maxLoanMSR = getMaxLoanFromMSR(income, loanRate, cfg.loan.defaultTenureYears);
    let loanAmount = Math.min(maxLoanLTV, maxLoanMSR);

    let downpayment, cpfUsed, cashRequired;
    const dpTotal = price - loanAmount;
    const renoFee = cfg.renovation.reno3Room;

    if (isHDBLoan) {
        if (totalGrants > dpTotal) {
            loanAmount = price - totalGrants;
            downpayment = totalGrants;
            cpfUsed = 0;
            cashRequired = bsd + renoFee;
        } else {
            downpayment = dpTotal;
            cpfUsed = Math.min(cpfOA, dpTotal - totalGrants);
            cashRequired = (dpTotal - totalGrants - cpfUsed) + bsd + renoFee;
        }
    } else {
        const minCashDown = price * cfg.loan.bankCashDownMin;
        const cpfDown = dpTotal - minCashDown;
        if (totalGrants > cpfDown) {
            loanAmount = price * 0.95 - totalGrants;
            downpayment = price - loanAmount;
            cpfUsed = 0;
            cashRequired = minCashDown + bsd + renoFee;
        } else {
            downpayment = dpTotal;
            cpfUsed = Math.min(cpfOA, cpfDown - totalGrants);
            cashRequired = minCashDown + (cpfDown - totalGrants - cpfUsed) + bsd + renoFee;
        }
    }

    let isAffordable = true;
    if (cashRequired > cash) {
        isAffordable = false;
        warnings.push(`Insufficient upfront capital. Required: S$${Math.round(cashRequired).toLocaleString()}, Available: S$${Math.round(cash).toLocaleString()}`);
    }

    const monthlyMortgage = calculateMonthlyRepayment(loanAmount, loanRate, cfg.loan.defaultTenureYears);

    // ── Remaining Liquidity ──
    let remainingCash = cash - cashRequired;

    // ── Year-by-Year Simulation ──
    const yearlyData = [];
    let equityPortfolio = remainingCash;
    let cpfOABalance = cpfOA - cpfUsed;
    let cumulativeRental = 0;
    const monthlyRent = cfg.rental.rent3rCommon;

    // Monthly CPF OA contribution
    const monthlyCpfOA = Math.min(income, cfg.cpf.wageCeiling) * (cfg.cpf.employeeRate + cfg.cpf.employerRate) * cfg.cpf.oaAllocationRate;

    for (let t = 0; t <= years; t++) {
        const propertyValue = projectPropertyValue(price, cfg.rates.propInflation, t);
        let loanBalance = t === 0 ? loanAmount : getOutstandingBalance(loanAmount, loanRate, cfg.loan.defaultTenureYears, t);
        let mortgagePaidThisYear = 0;
        let annualRental = 0;

        if (t === 0) {
            mortgagePaidThisYear = 0;
            annualRental = 0;
        } else {
            // Rental income: 1 room from Year 1 onwards
            const rentalIncome = t >= 1 ? monthlyRent : 0;
            annualRental = rentalIncome * 12;
            cumulativeRental += annualRental;

            // Property tax considerations
            const av = estimateAnnualValue(propertyValue);
            const annualPropertyTax = calculatePropertyTax(av, true); // Simplified: owner-occupied rate
            const otherMonthlyCosts = cfg.runningCosts.hdbSCC + (annualPropertyTax / 12);

            const monthlyReturn = cfg.rates.equityReturn / 12;
            const cpfInterestRateMonthly = cfg.cpf.oaInterestRate / 12;

            for (let m = 0; m < 12; m++) {
                // Add monthly interest to CPF OA
                cpfOABalance *= (1 + cpfInterestRateMonthly);
                // Add monthly CPF OA contribution
                cpfOABalance += monthlyCpfOA;

                // Deduct mortgage
                let cashMortgageShortfall = 0;
                if (cpfOABalance >= monthlyMortgage) {
                    cpfOABalance -= monthlyMortgage;
                    cashMortgageShortfall = 0;
                } else {
                    const shortfall = monthlyMortgage - cpfOABalance;
                    cpfOABalance = 0;
                    cashMortgageShortfall = shortfall;
                }
                mortgagePaidThisYear += monthlyMortgage;

                // Monthly contribution to equity (can be negative, draining cash)
                const monthlyEquityContrib = monthlySavings + rentalIncome - cashMortgageShortfall - otherMonthlyCosts;

                // Grow equity portfolio
                equityPortfolio = equityPortfolio * (1 + monthlyReturn) + monthlyEquityContrib;
            }
        }

        const netWorth = propertyValue + equityPortfolio + cpfOABalance - loanBalance;

        // Check for bankruptcy (cash reserves depleted)
        if (equityPortfolio < 0) {
            isAffordable = false;
            const msg = 'Cash reserves depleted during projection period due to monthly cash flow deficit.';
            if (!warnings.includes(msg)) {
                warnings.push(msg);
            }
        }

        yearlyData.push({
            year: t,
            age: age + t,
            propertyValue: Math.round(propertyValue),
            loanBalance: Math.round(Math.max(0, loanBalance)),
            equityPortfolio: Math.round(equityPortfolio),
            cpfOABalance: Math.round(cpfOABalance),
            netWorth: Math.round(netWorth),
            rentalIncome: Math.round(annualRental),
            mortgagePayment: Math.round(mortgagePaidThisYear),
            cumulativeRental: Math.round(cumulativeRental)
        });
    }

    const final = yearlyData[yearlyData.length - 1];
    return {
        pathName,
        pathId: '3room',
        isAffordable,
        isEligible: true,
        yearlyData,
        warnings,
        grants: grants.breakdown,
        totalGrants,
        upfrontCosts: { downpayment: Math.round(downpayment), bsd, renovation: renoFee, total: Math.round(cashRequired + cpfUsed) },
        loanDetails: { amount: Math.round(loanAmount), rate: loanRate, monthlyPayment: Math.round(monthlyMortgage), type: isHDBLoan ? 'HDB Concessionary' : 'Bank Loan' },
        summary: {
            finalNetWorth: final.netWorth,
            liquidEquityRatio: final.equityPortfolio / Math.max(1, final.netWorth),
            tenantSubsidyTotal: final.cumulativeRental
        }
    };
}


// ─────────────────────────────────────────────────
// PATH 3: 4-Room Resale HDB + 2 Rooms Rental
// ─────────────────────────────────────────────────

function simulateResale4Room(age, income, cpfOA, cash, monthlySavings, cfg, years) {
    const pathName = '4-Room Resale HDB';
    const price = cfg.prices.resale4Room;
    const warnings = [];

    // ── Grants ──
    const grants = calculateSinglesGrants(income, 'Resale', '2-4 room');
    const totalGrants = grants.totalGrantsAvailable;

    // Determine loan type: HDB concessionary if income <= 7000, else bank
    const isHDBLoan = income <= cfg.income.grantIncomeCeiling;
    const loanRate = isHDBLoan ? cfg.rates.hdbLoanRate : cfg.rates.bankLoanRate;

    // ── Loan & Affordability ──
    const bsd = calculateBSD(price);
    const maxLoanLTV = price * cfg.loan.maxLTV;
    const maxLoanMSR = getMaxLoanFromMSR(income, loanRate, cfg.loan.defaultTenureYears);
    let loanAmount = Math.min(maxLoanLTV, maxLoanMSR);

    let downpayment, cpfUsed, cashRequired;
    const dpTotal = price - loanAmount;
    const renoFee = cfg.renovation.reno4Room;

    if (isHDBLoan) {
        if (totalGrants > dpTotal) {
            loanAmount = price - totalGrants;
            downpayment = totalGrants;
            cpfUsed = 0;
            cashRequired = bsd + renoFee;
        } else {
            downpayment = dpTotal;
            cpfUsed = Math.min(cpfOA, dpTotal - totalGrants);
            cashRequired = (dpTotal - totalGrants - cpfUsed) + bsd + renoFee;
        }
    } else {
        const minCashDown = price * cfg.loan.bankCashDownMin;
        const cpfDown = dpTotal - minCashDown;
        if (totalGrants > cpfDown) {
            loanAmount = price * 0.95 - totalGrants;
            downpayment = price - loanAmount;
            cpfUsed = 0;
            cashRequired = minCashDown + bsd + renoFee;
        } else {
            downpayment = dpTotal;
            cpfUsed = Math.min(cpfOA, cpfDown - totalGrants);
            cashRequired = minCashDown + (cpfDown - totalGrants - cpfUsed) + bsd + renoFee;
        }
    }

    let isAffordable = true;
    if (cashRequired > cash) {
        isAffordable = false;
        warnings.push(`Insufficient upfront capital. Required: S$${Math.round(cashRequired).toLocaleString()}, Available: S$${Math.round(cash).toLocaleString()}`);
    }

    const monthlyMortgage = calculateMonthlyRepayment(loanAmount, loanRate, cfg.loan.defaultTenureYears);

    // ── Remaining Liquidity ──
    let remainingCash = cash - cashRequired;

    // ── Year-by-Year Simulation ──
    const yearlyData = [];
    let equityPortfolio = remainingCash;
    let cpfOABalance = cpfOA - cpfUsed;
    let cumulativeRental = 0;
    const monthlyRent = cfg.rental.rent4rCommon; // 2 rooms

    // Monthly CPF OA contribution
    const monthlyCpfOA = Math.min(income, cfg.cpf.wageCeiling) * (cfg.cpf.employeeRate + cfg.cpf.employerRate) * cfg.cpf.oaAllocationRate;

    for (let t = 0; t <= years; t++) {
        const propertyValue = projectPropertyValue(price, cfg.rates.propInflation, t);
        let loanBalance = t === 0 ? loanAmount : getOutstandingBalance(loanAmount, loanRate, cfg.loan.defaultTenureYears, t);
        let mortgagePaidThisYear = 0;
        let annualRental = 0;

        if (t === 0) {
            mortgagePaidThisYear = 0;
            annualRental = 0;
        } else {
            // Rental: 2 common rooms from Year 1 onwards
            const rentalIncome = t >= 1 ? monthlyRent : 0;
            annualRental = rentalIncome * 12;
            cumulativeRental += annualRental;

            const av = estimateAnnualValue(propertyValue);
            const annualPropertyTax = calculatePropertyTax(av, true);
            const otherMonthlyCosts = cfg.runningCosts.hdbSCC + (annualPropertyTax / 12);

            const monthlyReturn = cfg.rates.equityReturn / 12;
            const cpfInterestRateMonthly = cfg.cpf.oaInterestRate / 12;

            for (let m = 0; m < 12; m++) {
                // Add monthly interest to CPF OA
                cpfOABalance *= (1 + cpfInterestRateMonthly);
                // Add monthly CPF OA contribution
                cpfOABalance += monthlyCpfOA;

                // Deduct mortgage
                let cashMortgageShortfall = 0;
                if (cpfOABalance >= monthlyMortgage) {
                    cpfOABalance -= monthlyMortgage;
                    cashMortgageShortfall = 0;
                } else {
                    const shortfall = monthlyMortgage - cpfOABalance;
                    cpfOABalance = 0;
                    cashMortgageShortfall = shortfall;
                }
                mortgagePaidThisYear += monthlyMortgage;

                // Monthly contribution to equity (can be negative)
                const monthlyEquityContrib = monthlySavings + rentalIncome - cashMortgageShortfall - otherMonthlyCosts;

                // Grow equity portfolio
                equityPortfolio = equityPortfolio * (1 + monthlyReturn) + monthlyEquityContrib;
            }
        }

        const netWorth = propertyValue + equityPortfolio + cpfOABalance - loanBalance;

        // Check for bankruptcy (cash reserves depleted)
        if (equityPortfolio < 0) {
            isAffordable = false;
            const msg = 'Cash reserves depleted during projection period due to monthly cash flow deficit.';
            if (!warnings.includes(msg)) {
                warnings.push(msg);
            }
        }

        yearlyData.push({
            year: t,
            age: age + t,
            propertyValue: Math.round(propertyValue),
            loanBalance: Math.round(Math.max(0, loanBalance)),
            equityPortfolio: Math.round(equityPortfolio),
            cpfOABalance: Math.round(cpfOABalance),
            netWorth: Math.round(netWorth),
            rentalIncome: Math.round(annualRental),
            mortgagePayment: Math.round(mortgagePaidThisYear),
            cumulativeRental: Math.round(cumulativeRental)
        });
    }

    const final = yearlyData[yearlyData.length - 1];
    return {
        pathName,
        pathId: '4room',
        isAffordable,
        isEligible: true,
        yearlyData,
        warnings,
        grants: grants.breakdown,
        totalGrants,
        upfrontCosts: { downpayment: Math.round(downpayment), bsd, renovation: renoFee, total: Math.round(cashRequired + cpfUsed) },
        loanDetails: { amount: Math.round(loanAmount), rate: loanRate, monthlyPayment: Math.round(monthlyMortgage), type: isHDBLoan ? 'HDB Concessionary' : 'Bank Loan' },
        summary: {
            finalNetWorth: final.netWorth,
            liquidEquityRatio: final.equityPortfolio / Math.max(1, final.netWorth),
            tenantSubsidyTotal: final.cumulativeRental
        }
    };
}


// ─────────────────────────────────────────────────
// PATH 4: Private Condo (Owner-Occupied)
// ─────────────────────────────────────────────────

function simulatePrivateCondo(age, income, cpfOA, cash, monthlySavings, cfg, years) {
    const pathName = 'Private Condo';
    const price = cfg.prices.privateCondo;
    const warnings = [];

    // ── No Grants for Private Property ──
    const totalGrants = 0;

    // ── Loan & Affordability ──
    const bsd = calculateBSD(price);
    const maxLoanLTV = price * cfg.loan.maxLTV;
    const maxLoanTDSR = getMaxLoanFromTDSR(income, cfg.rates.bankLoanRate, cfg.loan.defaultTenureYears);
    let loanAmount = Math.min(maxLoanLTV, maxLoanTDSR);

    const dpTotal = price - loanAmount;
    const renoFee = cfg.renovation.renoCondo;

    // Bank loan: 5% must be cash, 20% can be CPF/cash
    const minCashDown = price * cfg.loan.bankCashDownMin;
    const cpfDown = dpTotal - minCashDown;
    const cpfUsed = Math.min(cpfOA, cpfDown);
    const cashRequired = minCashDown + (cpfDown - cpfUsed) + bsd + renoFee;

    let isAffordable = true;
    if (cashRequired > cash) {
        isAffordable = false;
        warnings.push(`Insufficient upfront capital. Required: S$${Math.round(cashRequired).toLocaleString()}, Available: S$${Math.round(cash).toLocaleString()}`);
    }

    const loanRate = cfg.rates.bankLoanRate;
    const monthlyMortgage = calculateMonthlyRepayment(loanAmount, loanRate, cfg.loan.defaultTenureYears);

    // ── Remaining Liquidity ──
    let remainingCash = cash - cashRequired;

    // ── Year-by-Year Simulation ──
    const yearlyData = [];
    let equityPortfolio = remainingCash;
    let cpfOABalance = cpfOA - cpfUsed;
    let cumulativeRental = 0;

    // Monthly CPF OA contribution
    const monthlyCpfOA = Math.min(income, cfg.cpf.wageCeiling) * (cfg.cpf.employeeRate + cfg.cpf.employerRate) * cfg.cpf.oaAllocationRate;

    for (let t = 0; t <= years; t++) {
        const propertyValue = projectPropertyValue(price, cfg.rates.propInflation, t);
        let loanBalance = t === 0 ? loanAmount : getOutstandingBalance(loanAmount, loanRate, cfg.loan.defaultTenureYears, t);
        let mortgagePaidThisYear = 0;

        if (t === 0) {
            mortgagePaidThisYear = 0;
        } else {
            const av = estimateAnnualValue(propertyValue);
            const annualPropertyTax = calculatePropertyTax(av, true);
            const otherMonthlyCosts = cfg.runningCosts.condoMaintenance + (annualPropertyTax / 12);

            const monthlyReturn = cfg.rates.equityReturn / 12;
            const cpfInterestRateMonthly = cfg.cpf.oaInterestRate / 12;

            for (let m = 0; m < 12; m++) {
                // Add monthly interest to CPF OA
                cpfOABalance *= (1 + cpfInterestRateMonthly);
                // Add monthly CPF OA contribution
                cpfOABalance += monthlyCpfOA;

                // Deduct mortgage
                let cashMortgageShortfall = 0;
                if (cpfOABalance >= monthlyMortgage) {
                    cpfOABalance -= monthlyMortgage;
                    cashMortgageShortfall = 0;
                } else {
                    const shortfall = monthlyMortgage - cpfOABalance;
                    cpfOABalance = 0;
                    cashMortgageShortfall = shortfall;
                }
                mortgagePaidThisYear += monthlyMortgage;

                // Monthly contribution to equity (can be negative)
                const monthlyEquityContrib = monthlySavings - cashMortgageShortfall - otherMonthlyCosts;

                // Grow equity portfolio
                equityPortfolio = equityPortfolio * (1 + monthlyReturn) + monthlyEquityContrib;
            }
        }

        const netWorth = propertyValue + equityPortfolio + cpfOABalance - loanBalance;

        // Check for bankruptcy (cash reserves depleted)
        if (equityPortfolio < 0) {
            isAffordable = false;
            const msg = 'Cash reserves depleted during projection period due to monthly cash flow deficit.';
            if (!warnings.includes(msg)) {
                warnings.push(msg);
            }
        }

        yearlyData.push({
            year: t,
            age: age + t,
            propertyValue: Math.round(propertyValue),
            loanBalance: Math.round(Math.max(0, loanBalance)),
            equityPortfolio: Math.round(equityPortfolio),
            cpfOABalance: Math.round(cpfOABalance),
            netWorth: Math.round(netWorth),
            rentalIncome: 0,
            mortgagePayment: Math.round(mortgagePaidThisYear),
            cumulativeRental: 0
        });
    }

    const final = yearlyData[yearlyData.length - 1];
    return {
        pathName,
        pathId: 'condo',
        isAffordable,
        isEligible: true,
        yearlyData,
        warnings,
        grants: { singlesGrant: 0, ehgGrant: 0, proximityGrant: 0 },
        totalGrants: 0,
        upfrontCosts: { downpayment: Math.round(dpTotal), bsd, renovation: renoFee, total: Math.round(cashRequired + cpfUsed) },
        loanDetails: { amount: Math.round(loanAmount), rate: loanRate, monthlyPayment: Math.round(monthlyMortgage), type: 'Bank Loan' },
        summary: {
            finalNetWorth: final.netWorth,
            liquidEquityRatio: final.equityPortfolio / Math.max(1, final.netWorth),
            tenantSubsidyTotal: 0
        }
    };
}


// ─────────────────────────────────────────────────
// Helper: Create result for ineligible paths
// ─────────────────────────────────────────────────

function createIneligibleResult(pathName, errorMsg, years, startAge = 35) {
    const pathId = pathName.includes('BTO') ? 'bto' :
                   pathName.includes('3-Room') ? '3room' :
                   pathName.includes('4-Room') ? '4room' : 'condo';
    return {
        pathName,
        pathId,
        isAffordable: false,
        isEligible: false,
        yearlyData: Array.from({ length: years + 1 }, (_, t) => ({
            year: t, age: startAge + t,
            propertyValue: 0, loanBalance: 0, equityPortfolio: 0,
            cpfOABalance: 0,
            netWorth: 0, rentalIncome: 0, mortgagePayment: 0, cumulativeRental: 0
        })),
        warnings: [errorMsg],
        grants: { singlesGrant: 0, ehgGrant: 0, proximityGrant: 0 },
        totalGrants: 0,
        upfrontCosts: { downpayment: 0, bsd: 0, renovation: 0, total: 0 },
        loanDetails: { amount: 0, rate: 0, monthlyPayment: 0, type: 'N/A' },
        summary: {
            finalNetWorth: 0,
            liquidEquityRatio: 0,
            tenantSubsidyTotal: 0
        }
    };
}


// ─────────────────────────────────────────────────
// Helper: Create result for unaffordable paths
// ─────────────────────────────────────────────────

function createUnaffordableResult(pathName, requiredAmount, availableFunds, years, pathId = 'bto', startAge = 35, customWarning = null) {
    const warningMsg = customWarning || `Insufficient upfront capital. Required: S$${Math.round(requiredAmount).toLocaleString()}, Available: S$${Math.round(availableFunds).toLocaleString()}`;
    return {
        pathName,
        pathId,
        isAffordable: false,
        isEligible: true,
        yearlyData: Array.from({ length: years + 1 }, (_, t) => ({
            year: t, age: startAge + t,
            propertyValue: 0, loanBalance: 0, equityPortfolio: 0,
            cpfOABalance: 0,
            netWorth: 0, rentalIncome: 0, mortgagePayment: 0, cumulativeRental: 0
        })),
        warnings: [warningMsg],
        grants: { singlesGrant: 0, ehgGrant: 0, proximityGrant: 0 },
        totalGrants: 0,
        upfrontCosts: { downpayment: 0, bsd: 0, renovation: 0, total: Math.round(requiredAmount) },
        loanDetails: { amount: 0, rate: 0, monthlyPayment: 0, type: 'N/A' },
        summary: {
            finalNetWorth: 0,
            liquidEquityRatio: 0,
            tenantSubsidyTotal: 0
        }
    };
}
