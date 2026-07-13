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

export function showModal(pathResult) {
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    
    if (!modal || !bodyEl) return;
    
    // Set title
    if (titleEl) {
        titleEl.textContent = `${pathResult.pathName} — Detailed 10-Year Projection`;
    }
    
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
    
    pathResult.yearlyData.forEach((d) => {
        tableHtml += `
            <tr>
                <td>${d.year === 0 ? 'Start (Yr 0)' : `Year ${d.year}`}</td>
                <td>Age ${d.age}</td>
                <td>${formatCurrency(d.propertyValue)}</td>
                <td>${d.loanBalance > 0 ? formatCurrency(d.loanBalance) : '—'}</td>
                <td>${formatCurrency(d.cpfOABalance || 0)}</td>
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
