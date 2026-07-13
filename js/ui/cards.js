/**
 * Dynamic Metric Cards
 * 
 * Renders and updates the three summary cards:
 * 1. Absolute Financial Winner at Age 45
 * 2. Liquid Equity Ratio
 * 3. Tenant Subsidy Total
 */

import { formatCurrency, animateValue } from '../utils.js';

/** Previous values for animation delta */
let prevWinner = { value: 0, name: '' };
let prevLiquid = 0;
let prevTenant = 0;

/**
 * Update all metric cards with simulation results.
 * @param {object[]} results - Array of 4 path result objects
 */
export function updateCards(results) {
    // Filter to affordable paths only
    const affordable = results.filter(r => r.isAffordable && r.isEligible);

    if (affordable.length === 0) {
        renderEmptyState();
        return;
    }

    // ── 1. Winner at Age 45 ──
    updateWinnerCard(affordable);

    // ── 2. Liquid Equity Ratio ──
    updateLiquidCard(affordable);

    // ── 3. Tenant Subsidy Total ──
    updateTenantCard(affordable);
}

/**
 * Card 1: Absolute Financial Winner at Age 45
 */
function updateWinnerCard(affordable) {
    const winner = affordable.reduce((best, curr) =>
        curr.summary.finalNetWorth > best.summary.finalNetWorth ? curr : best
    );

    const el = document.getElementById('card-winner-value');
    const nameEl = document.getElementById('card-winner-name');
    const subEl = document.getElementById('card-winner-sub');

    if (el) {
        animateValue(el, prevWinner.value, winner.summary.finalNetWorth, 900);
        prevWinner.value = winner.summary.finalNetWorth;
    }

    if (nameEl) {
        nameEl.textContent = winner.pathName;
        nameEl.style.color = getPathColor(winner.pathId);
    }

    if (subEl) {
        // Show lead over second place
        const sorted = [...affordable].sort((a, b) => b.summary.finalNetWorth - a.summary.finalNetWorth);
        if (sorted.length > 1) {
            const lead = sorted[0].summary.finalNetWorth - sorted[1].summary.finalNetWorth;
            subEl.textContent = `Leads by ${formatCurrency(lead)} over ${sorted[1].pathName}`;
        } else {
            subEl.textContent = 'Only affordable path';
        }
    }
}

/**
 * Card 2: Liquid Equity Ratio at Year 10
 */
function updateLiquidCard(affordable) {
    // Use the winner's ratio
    const winner = affordable.reduce((best, curr) =>
        curr.summary.finalNetWorth > best.summary.finalNetWorth ? curr : best
    );

    const ratio = winner.summary.liquidEquityRatio;
    const pct = Math.round(ratio * 100);

    const el = document.getElementById('card-liquid-value');
    const barEl = document.getElementById('card-liquid-bar');
    const subEl = document.getElementById('card-liquid-sub');

    if (el) {
        el.textContent = `${pct}%`;
        el.classList.add('is-animating');
        setTimeout(() => el.classList.remove('is-animating'), 600);
    }

    if (barEl) {
        // Animate the bar fill
        const stockFill = barEl.querySelector('.liquid-bar__stocks');
        const propFill = barEl.querySelector('.liquid-bar__property');
        if (stockFill) stockFill.style.width = `${pct}%`;
        if (propFill) propFill.style.width = `${100 - pct}%`;
    }

    if (subEl) {
        const stockVal = Math.round(winner.yearlyData[winner.yearlyData.length - 1].equityPortfolio);
        const propEquity = winner.yearlyData[winner.yearlyData.length - 1].propertyValue -
                           winner.yearlyData[winner.yearlyData.length - 1].loanBalance;
        subEl.textContent = `Stocks: ${formatCurrency(stockVal)} · Property Equity: ${formatCurrency(propEquity)}`;
    }

    prevLiquid = pct;
}

/**
 * Card 3: Tenant Subsidy Total (cumulative rent over MOP)
 */
function updateTenantCard(affordable) {
    // Sum tenant subsidy across all rental paths
    const maxSubsidy = affordable.reduce((best, curr) =>
        curr.summary.tenantSubsidyTotal > best.summary.tenantSubsidyTotal ? curr : best
    );

    const el = document.getElementById('card-tenant-value');
    const nameEl = document.getElementById('card-tenant-name');
    const subEl = document.getElementById('card-tenant-sub');

    if (el) {
        animateValue(el, prevTenant, maxSubsidy.summary.tenantSubsidyTotal, 900);
        prevTenant = maxSubsidy.summary.tenantSubsidyTotal;
    }

    if (nameEl) {
        nameEl.textContent = maxSubsidy.pathName;
        nameEl.style.color = getPathColor(maxSubsidy.pathId);
    }

    if (subEl) {
        if (maxSubsidy.summary.tenantSubsidyTotal > 0) {
            const monthlyAvg = maxSubsidy.summary.tenantSubsidyTotal / 60; // 5 years
            subEl.textContent = `≈ ${formatCurrency(monthlyAvg)}/mo average over MOP`;
        } else {
            subEl.textContent = 'No rental income paths available';
        }
    }
}

/**
 * Render empty state when no paths are affordable.
 */
function renderEmptyState() {
    const ids = ['card-winner-value', 'card-liquid-value', 'card-tenant-value'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });

    const subIds = ['card-winner-sub', 'card-liquid-sub', 'card-tenant-sub'];
    subIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Insufficient capital for all paths';
    });
}

/**
 * Get CSS color for a path ID.
 */
function getPathColor(pathId) {
    const colors = {
        bto: 'hsl(185, 90%, 55%)',
        '3room': 'hsl(38, 95%, 60%)',
        '4room': 'hsl(155, 80%, 50%)',
        condo: 'hsl(330, 85%, 60%)'
    };
    return colors[pathId] || 'hsl(220, 15%, 65%)';
}
