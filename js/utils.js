/**
 * Format number as Singapore dollar string.
 * @param {number} amount - The monetary amount.
 * @param {number} [decimals=0] - Decimal places to display.
 * @returns {string} Formatted string, e.g. "S$50,000"
 */
export function formatCurrency(amount, decimals = 0) {
  const formatted = Math.abs(amount)
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-S$${formatted}` : `S$${formatted}`;
}

/**
 * Format a decimal rate as a percentage string.
 * @param {number} rate - The rate as a decimal (e.g. 0.075).
 * @param {number} [decimals=1] - Decimal places to display.
 * @returns {string} Formatted string, e.g. "7.5%"
 */
export function formatPercent(rate, decimals = 1) {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Format as compact currency (K / M notation).
 * @param {number} amount - The monetary amount.
 * @returns {string} Formatted string, e.g. "S$1.25M"
 */
export function formatCompact(amount) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    // Use up to 2 decimal places, strip trailing zeros
    const str = millions.toFixed(2).replace(/\.?0+$/, '');
    return `${sign}S$${str}M`;
  }

  if (abs >= 1_000) {
    const thousands = abs / 1_000;
    const str = thousands.toFixed(2).replace(/\.?0+$/, '');
    return `${sign}S$${str}K`;
  }

  return `${sign}S$${abs}`;
}

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Debounce function for input handlers.
 * Returns a wrapper that delays invoking fn until after `delay` ms
 * have elapsed since the last invocation.
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=300] - Delay in milliseconds.
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0–1).
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Find crossover point where series1 overtakes series2.
 * Searches for the first index where series1 was at or below series2
 * and then goes above it. Returns the fractional index of the crossover
 * using linear interpolation, or null if no crossover is found.
 * @param {number[]} series1
 * @param {number[]} series2
 * @returns {number|null} Fractional index of crossover, or null.
 */
export function findCrossover(series1, series2) {
  const len = Math.min(series1.length, series2.length);
  if (len < 2) return null;

  for (let i = 1; i < len; i++) {
    const prevDiff = series1[i - 1] - series2[i - 1]; // negative or zero means series1 <= series2
    const currDiff = series1[i] - series2[i];           // positive means series1 > series2

    if (prevDiff <= 0 && currDiff > 0) {
      // Linear interpolation to find fractional crossover point
      // prevDiff <= 0, currDiff > 0
      // We want the t in [0, 1] where the difference crosses zero:
      //   prevDiff + t * (currDiff - prevDiff) = 0
      //   t = -prevDiff / (currDiff - prevDiff)
      const t = -prevDiff / (currDiff - prevDiff);
      return (i - 1) + t;
    }
  }

  return null;
}

/**
 * Animate a number counting up (or down) in an HTML element.
 * Uses requestAnimationFrame for smooth animation. Updates
 * element.textContent with formatted currency on each frame.
 * @param {HTMLElement} element - The DOM element to update.
 * @param {number} start - Starting value.
 * @param {number} end - Ending value.
 * @param {number} [duration=800] - Animation duration in milliseconds.
 */
export function animateValue(element, start, end, duration = 800) {
  if (!element) return;

  let startTimestamp = null;

  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const elapsed = timestamp - startTimestamp;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out quad for a natural feel
    const easedProgress = 1 - (1 - progress) * (1 - progress);

    const current = Math.round(lerp(start, end, easedProgress));
    element.textContent = formatCurrency(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
