/**
 * Input Form Binding & Validation
 * 
 * Manages the 4 core input fields (age, income, CPF OA, cash liquidity)
 * with real-time validation and debounced recalculation.
 */

import { debounce, formatCurrency } from '../utils.js';

/** @type {Function|null} */
let onChangeCallback = null;

/** Input field configurations */
const INPUT_CONFIG = {
    age: {
        id: 'input-age',
        min: 35,
        max: 65,
        step: 1,
        default: 35,
        validate: (v) => v >= 35 ? null : 'Must be 35 or older (SSC scheme eligibility)'
    },
    income: {
        id: 'input-income',
        sliderId: 'slider-income',
        min: 3000,
        max: 15000,
        step: 500,
        default: 5500,
        validate: (v) => v >= 0 ? null : 'Income must be positive'
    },
    cpfOA: {
        id: 'input-cpf',
        sliderId: 'slider-cpf',
        min: 20000,
        max: 300000,
        step: 5000,
        default: 80000,
        validate: (v) => v >= 0 ? null : 'CPF OA must be positive'
    },
    cashLiquidity: {
        id: 'input-cash',
        sliderId: 'slider-cash',
        min: 20000,
        max: 1000000,
        step: 10000,
        default: 120000,
        validate: (v) => v >= 0 ? null : 'Cash must be positive'
    }
};

/**
 * Initialize all input bindings.
 * @param {Function} onChange - Callback fired when any input changes (receives full input state)
 */
export function initInputs(onChange) {
    onChangeCallback = onChange;
    const debouncedChange = debounce(emitChange, 350);

    for (const [key, config] of Object.entries(INPUT_CONFIG)) {
        const input = document.getElementById(config.id);
        if (!input) continue;

        // Set initial value
        input.value = config.default;

        // Number input handler
        input.addEventListener('input', () => {
            let val = parseFloat(input.value);
            if (isNaN(val)) return;

            // Sync slider
            if (config.sliderId) {
                const slider = document.getElementById(config.sliderId);
                if (slider) slider.value = val;
            }

            // Validate
            validateField(key, val);
            debouncedChange();
        });

        // Slider handler
        if (config.sliderId) {
            const slider = document.getElementById(config.sliderId);
            if (slider) {
                slider.min = config.min;
                slider.max = config.max;
                slider.step = config.step;
                slider.value = config.default;

                slider.addEventListener('input', () => {
                    const val = parseFloat(slider.value);
                    input.value = val;
                    validateField(key, val);
                    debouncedChange();
                });
            }
        }
    }
}

/**
 * Get current values from all input fields.
 * @returns {{ age: number, income: number, cpfOA: number, cashLiquidity: number }}
 */
export function getInputValues() {
    const values = {};
    for (const [key, config] of Object.entries(INPUT_CONFIG)) {
        const input = document.getElementById(config.id);
        values[key] = input ? parseFloat(input.value) || config.default : config.default;
    }
    return values;
}

/**
 * Validate a single field and show/hide error.
 */
function validateField(key, value) {
    const config = INPUT_CONFIG[key];
    const error = config.validate(value);
    const errorEl = document.getElementById(`error-${key}`);
    if (errorEl) {
        if (error) {
            errorEl.textContent = error;
            errorEl.classList.add('is-visible');
        } else {
            errorEl.classList.remove('is-visible');
        }
    }
    return !error;
}

/**
 * Validate all fields and emit change.
 */
function emitChange() {
    const values = getInputValues();
    let isValid = true;
    for (const [key, config] of Object.entries(INPUT_CONFIG)) {
        if (!validateField(key, values[key])) {
            isValid = false;
        }
    }
    if (isValid && onChangeCallback) {
        onChangeCallback(values);
    }
}

/**
 * Programmatically set input values (e.g., from URL params or presets).
 */
export function setInputValues(values) {
    for (const [key, val] of Object.entries(values)) {
        const config = INPUT_CONFIG[key];
        if (!config) continue;
        const input = document.getElementById(config.id);
        if (input) input.value = val;
        if (config.sliderId) {
            const slider = document.getElementById(config.sliderId);
            if (slider) slider.value = val;
        }
    }
}
