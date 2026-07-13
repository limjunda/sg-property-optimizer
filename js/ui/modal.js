/**
 * Detailed Strategy Breakdown Modal
 *
 * Handles modal initialization, closing behavior, and HTML generation 
 * for the year-by-year financial projection table.
 */

import { CONFIG } from '../config.js';
import { formatCurrency } from '../utils.js';
import { getInputValues } from './inputs.js';

/**
 * Initialize modal close triggers.
 */
export function initModal() {
    const modal = document.getElementById('detail-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (!modal) return;
    
    const closeModal = () => {
        modal.classList.remove('is-active');
        document.body.style.overflow = ''; // Restore scroll
    };
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', (e) => {
        // Close if clicked directly on backdrop overlay
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-active')) {
            closeModal();
        }
    });
}

/**
 * Open detailed breakdown modal and populate table.
 * @param {object} pathResult - Path result object from the simulator
 */
export function showModal(pathResult) {
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    
    if (!modal || !bodyEl) return;
    
    // Set title
    if (titleEl) {
        titleEl.textContent = `${pathResult.pathName} — Detailed 10-Year Projection`;
    }
    
    // Project year-by-year CPF OA balance
    const cpfBalances = calculateCpfSchedule(pathResult);
    
    // Generate Table HTML
    let tableHtml = `
        <table class="modal-table">
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Age</th>
                    <th>Property Value</th>
                    <th>Outstanding Loan</th>
                    <th>CPF OA Balance</th>
                    <th>Stock Portfolio</th>
                    <th>Cumulative Rental</th>
                    <th>Net Worth</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    pathResult.yearlyData.forEach((d, idx) => {
        const cpfVal = cpfBalances[idx] || 0;
        tableHtml += `
            <tr>
                <td>${d.year === 0 ? 'Start (Yr 0)' : `Year ${d.year}`}</td>
                <td>Age ${d.age}</td>
                <td>${formatCurrency(d.propertyValue)}</td>
                <td>${d.loanBalance > 0 ? formatCurrency(d.loanBalance) : '—'}</td>
                <td>${formatCurrency(cpfVal)}</td>
                <td>${formatCurrency(d.equityPortfolio)}</td>
                <td>${d.cumulativeRental > 0 ? formatCurrency(d.cumulativeRental) : '—'}</td>
                <td style="font-weight: 600; color: var(--text-primary);">${formatCurrency(d.netWorth)}</td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    
    bodyEl.innerHTML = tableHtml;
    
    // Show modal and lock page scroll
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
}

/**
 * Calculates the CPF Ordinary Account balance trajectory based on the selected path.
 * @param {object} pathResult 
 * @returns {number[]} Array of CPF OA balances corresponding to years 0 to 10
 */
function calculateCpfSchedule(pathResult) {
    const { cpfOA, income } = getInputValues();
    const downpayment = pathResult.upfrontCosts.downpayment;
    const pathId = pathResult.pathId;
    
    let cpfUsed = 0;
    if (pathId === 'bto') {
        cpfUsed = Math.min(cpfOA, downpayment);
    } else if (pathId === '3room' || pathId === '4room') {
        const isHDBLoan = income <= CONFIG.income.grantIncomeCeiling;
        if (isHDBLoan) {
            cpfUsed = Math.min(cpfOA, downpayment);
        } else {
            const price = pathId === '3room' ? CONFIG.prices.resale3Room : CONFIG.prices.resale4Room;
            const effectivePrice = price - pathResult.totalGrants;
            const cashDown = effectivePrice * CONFIG.loan.bankCashDownMin;
            const cpfDown = downpayment - cashDown;
            cpfUsed = Math.min(cpfOA, cpfDown);
        }
    } else if (pathId === 'condo') {
        const price = CONFIG.prices.privateCondo;
        const cashDown = price * CONFIG.loan.bankCashDownMin;
        const cpfDown = downpayment - cashDown;
        cpfUsed = Math.min(cpfOA, cpfDown);
    }
    
    const cpfOABalances = [];
    let currentCpf = cpfOA - cpfUsed;
    cpfOABalances.push(Math.round(currentCpf));
    
    const wage = Math.min(income, CONFIG.cpf.wageCeiling);
    const monthlyContribution = wage * (CONFIG.cpf.employeeRate + CONFIG.cpf.employerRate) * CONFIG.cpf.oaAllocationRate;
    
    for (let t = 1; t <= CONFIG.timeline.projectionYears; t++) {
        for (let m = 0; m < 12; m++) {
            currentCpf = currentCpf * (1 + CONFIG.cpf.oaInterestRate / 12) + monthlyContribution;
        }
        cpfOABalances.push(Math.round(currentCpf));
    }
    
    return cpfOABalances;
}
