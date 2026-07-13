/**
 * Singapore Property Optimizer — Main Application Orchestrator
 * 
 * Wires together: Inputs → Simulation Engine → Chart + Metric Cards
 * Handles initialization, responsive behavior, and re-calculation flow.
 */

import { initInputs, getInputValues } from './ui/inputs.js';
import { initDrawer, collectOverrides } from './ui/drawer.js';
import { initChart, updateChart } from './ui/chart.js';
import { updateCards } from './ui/cards.js';
import { runSimulation } from './simulator.js';
import { debounce } from './utils.js';
import { initModal, showModal } from './ui/modal.js';

/** 
 * Application state
 */
let currentResults = null;
let currentOverrides = {};

/**
 * Boot the application.
 */
function init() {
    // Initialize UI components
    initInputs(handleInputChange);
    initDrawer(handleOverrideChange);
    initChart('net-worth-chart');
    initModal();

    // Wire up the calculate button
    const calcBtn = document.getElementById('btn-calculate');
    if (calcBtn) {
        calcBtn.addEventListener('click', runCalculation);
    }

    // Run initial calculation with defaults
    setTimeout(runCalculation, 300);

    // Add viewport height fix for mobile
    setViewportHeight();
    window.addEventListener('resize', debounce(setViewportHeight, 150));

    console.log('🏠 Singapore Property Optimizer initialized.');
}

/**
 * Handle input field changes (debounced).
 */
function handleInputChange(values) {
    // Auto-recalculate on input change
    runCalculation();
}

/**
 * Handle advanced setting overrides.
 */
function handleOverrideChange(overrides) {
    currentOverrides = overrides;
    runCalculation();
}

/**
 * Execute the simulation and update all visualizations.
 */
function runCalculation() {
    const inputs = getInputValues();

    // Validate minimum requirements
    if (inputs.age < 35) return;
    if (inputs.income <= 0) return;

    // Add loading state
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) chartContainer.classList.add('is-loading');

    try {
        // Run the 4-path simulation
        currentResults = runSimulation(inputs, currentOverrides);

        // Update visualizations
        updateChart(currentResults);
        updateCards(currentResults);

        // Update path summary cards below chart
        updatePathSummaries(currentResults);

    } catch (error) {
        console.error('Simulation error:', error);
    } finally {
        if (chartContainer) chartContainer.classList.remove('is-loading');
    }
}

/**
 * Update the path summary breakdown cards.
 */
function updatePathSummaries(results) {
    const container = document.getElementById('path-summaries');
    if (!container) return;

    container.innerHTML = '';

    const pathIcons = { bto: '🏗️', '3room': '🏠', '4room': '🏡', condo: '🏢' };
    const pathColors = {
        bto: 'var(--path-bto)',
        '3room': 'var(--path-3room)',
        '4room': 'var(--path-4room)',
        condo: 'var(--path-condo)'
    };

    for (const result of results) {
        const card = document.createElement('div');
        card.className = `path-summary-card ${!result.isAffordable ? 'is-disabled' : ''}`;
        card.style.borderTopColor = pathColors[result.pathId];

        const icon = pathIcons[result.pathId] || '🏠';
        const status = result.isAffordable
            ? `<span class="path-status path-status--ok">✓ Affordable</span>`
            : `<span class="path-status path-status--warn">✗ ${result.warnings[0] || 'Unaffordable'}</span>`;

        card.innerHTML = `
            <div class="path-summary-card__header">
                <span class="path-summary-card__icon">${icon}</span>
                <div>
                    <h3 class="path-summary-card__title">${result.pathName}</h3>
                    ${status}
                </div>
            </div>
            ${result.isAffordable ? `
            <div class="path-summary-card__grid">
                <div class="path-summary-card__stat">
                    <span class="stat-label">Loan Type</span>
                    <span class="stat-value">${result.loanDetails.type}</span>
                </div>
                <div class="path-summary-card__stat">
                    <span class="stat-label">Monthly Payment</span>
                    <span class="stat-value">S$${result.loanDetails.monthlyPayment.toLocaleString()}</span>
                </div>
                <div class="path-summary-card__stat">
                    <span class="stat-label">Total Grants</span>
                    <span class="stat-value ${result.totalGrants > 0 ? 'stat-value--highlight' : ''}">S$${result.totalGrants.toLocaleString()}</span>
                </div>
                <div class="path-summary-card__stat">
                    <span class="stat-label">Upfront Required</span>
                    <span class="stat-value">S$${result.upfrontCosts.total.toLocaleString()}</span>
                </div>
                <div class="path-summary-card__stat">
                    <span class="stat-label">Net Worth (Yr 10)</span>
                    <span class="stat-value stat-value--large">S$${result.summary.finalNetWorth.toLocaleString()}</span>
                </div>
                <div class="path-summary-card__stat">
                    <span class="stat-label">Rental Income (Total)</span>
                    <span class="stat-value">S$${result.summary.tenantSubsidyTotal.toLocaleString()}</span>
                </div>
            </div>
            ` : `
            <div class="path-summary-card__disabled-msg">
                ${result.warnings.map(w => `<p>⚠ ${w}</p>`).join('')}
            </div>
            `}
        `;

        card.addEventListener('click', () => {
            if (result.isAffordable) {
                showModal(result);
            }
        });

        container.appendChild(card);
    }
}

/**
 * Fix viewport height for mobile browsers (100vh issue).
 */
function setViewportHeight() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', init);
