/**
 * Advanced Settings Drawer
 * 
 * Manages the collapsible panel containing overridable system defaults
 * (property prices, rates, rental values, renovation costs).
 */

import { CONFIG } from '../config.js';

/** Drawer field definitions */
const DRAWER_FIELDS = [
    { key: 'prices.bto2Room', label: '2-Room BTO Price', prefix: 'S$', type: 'currency' },
    { key: 'prices.resale3Room', label: '3-Room Resale Price', prefix: 'S$', type: 'currency' },
    { key: 'prices.resale4Room', label: '4-Room Resale Price', prefix: 'S$', type: 'currency' },
    { key: 'prices.privateCondo', label: 'Private Condo Price', prefix: 'S$', type: 'currency' },
    { key: 'rates.propInflation', label: 'Property Inflation', suffix: '% p.a.', type: 'percent' },
    { key: 'rates.equityReturn', label: 'Equity Return', suffix: '% p.a.', type: 'percent' },
    { key: 'rates.hdbLoanRate', label: 'HDB Loan Rate', suffix: '% p.a.', type: 'percent' },
    { key: 'rates.bankLoanRate', label: 'Bank Loan Rate', suffix: '% p.a.', type: 'percent' },
    { key: 'rental.rent3rCommon', label: '3-Room Rental (1 Rm)', prefix: 'S$', suffix: '/mo', type: 'currency' },
    { key: 'rental.rent4rCommon', label: '4-Room Rental (2 Rms)', prefix: 'S$', suffix: '/mo', type: 'currency' },
    { key: 'rental.rentCondoWhole', label: 'Condo Rental', prefix: 'S$', suffix: '/mo', type: 'currency' },
    { key: 'renovation.renoBto2Room', label: 'BTO Renovation', prefix: 'S$', type: 'currency' },
    { key: 'renovation.reno3Room', label: '3-Room Renovation', prefix: 'S$', type: 'currency' },
    { key: 'renovation.reno4Room', label: '4-Room Renovation', prefix: 'S$', type: 'currency' },
    { key: 'renovation.renoCondo', label: 'Condo Furnishing', prefix: 'S$', type: 'currency' },
    { key: 'loan.defaultTenureYears', label: 'Loan Tenure', suffix: 'years', type: 'number' },
    { key: 'savingsRate', label: 'Savings Rate', suffix: '%', type: 'percent_simple' },
];

/** @type {Function|null} */
let onOverrideChange = null;

/**
 * Initialize the drawer toggle and render input fields.
 * @param {Function} onChange - Called with current overrides object when any value changes
 */
export function initDrawer(onChange) {
    onOverrideChange = onChange;

    const toggleBtn = document.getElementById('drawer-toggle');
    const content = document.getElementById('drawer-content');

    if (toggleBtn && content) {
        toggleBtn.addEventListener('click', () => {
            const isOpen = content.classList.toggle('is-open');
            toggleBtn.classList.toggle('is-open', isOpen);
            toggleBtn.querySelector('.drawer-chevron').style.transform = isOpen ? 'rotate(180deg)' : '';
        });
    }

    renderDrawerFields();
}

/**
 * Render all advanced setting fields into the drawer grid.
 */
function renderDrawerFields() {
    const grid = document.getElementById('drawer-grid');
    if (!grid) return;

    grid.innerHTML = '';

    for (const field of DRAWER_FIELDS) {
        const defaultValue = getNestedValue(CONFIG, field.key);
        const displayValue = field.type === 'percent'
            ? (defaultValue * 100).toFixed(1)
            : field.type === 'percent_simple'
                ? (defaultValue * 100).toFixed(0)
                : defaultValue;

        const item = document.createElement('div');
        item.className = 'drawer-item';

        item.innerHTML = `
            <label class="drawer-label" for="adv-${field.key}">${field.label}</label>
            <div class="drawer-input-wrap">
                ${field.prefix ? `<span class="input-prefix">${field.prefix}</span>` : ''}
                <input
                    type="number"
                    id="adv-${field.key}"
                    class="drawer-input"
                    value="${displayValue}"
                    data-key="${field.key}"
                    data-type="${field.type}"
                    step="${field.type === 'percent' ? '0.1' : field.type === 'currency' ? '1000' : '1'}"
                />
                ${field.suffix ? `<span class="input-suffix">${field.suffix}</span>` : ''}
            </div>
        `;

        const input = item.querySelector('input');
        input.addEventListener('change', handleFieldChange);

        grid.appendChild(item);
    }

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'drawer-reset-btn';
    resetBtn.textContent = '↺ Reset to Defaults';
    resetBtn.addEventListener('click', resetDefaults);
    grid.parentElement.appendChild(resetBtn);
}

/**
 * Handle a field value change and compute overrides.
 */
function handleFieldChange() {
    const overrides = collectOverrides();
    if (onOverrideChange) {
        onOverrideChange(overrides);
    }
}

/**
 * Collect all current overrides from the drawer inputs.
 * Only includes values that differ from defaults.
 * @returns {object} Nested override object matching CONFIG structure
 */
export function collectOverrides() {
    const overrides = {};

    for (const field of DRAWER_FIELDS) {
        const input = document.getElementById(`adv-${field.key}`);
        if (!input) continue;

        let value = parseFloat(input.value);
        if (isNaN(value)) continue;

        // Convert display value back to internal representation
        if (field.type === 'percent') {
            value = value / 100;
        } else if (field.type === 'percent_simple') {
            value = value / 100;
        }

        const defaultValue = getNestedValue(CONFIG, field.key);
        if (value !== defaultValue) {
            setNestedValue(overrides, field.key, value);
        }
    }

    return overrides;
}

/**
 * Reset all drawer fields to CONFIG defaults.
 */
function resetDefaults() {
    for (const field of DRAWER_FIELDS) {
        const input = document.getElementById(`adv-${field.key}`);
        if (!input) continue;

        const defaultValue = getNestedValue(CONFIG, field.key);
        input.value = field.type === 'percent'
            ? (defaultValue * 100).toFixed(1)
            : field.type === 'percent_simple'
                ? (defaultValue * 100).toFixed(0)
                : defaultValue;
    }

    if (onOverrideChange) {
        onOverrideChange({});
    }
}

// ── Utility: nested object access ──

function getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!curr[keys[i]]) curr[keys[i]] = {};
        curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
}
