/**
 * Leverage & Rental Offset Chart (Grouped Bar Chart)
 * 
 * Renders upfront capital sunk vs. cumulative rent collected
 * vs. net owner contribution for each of the 4 property paths.
 */

import { formatCurrency, formatCompact } from '../utils.js';

/** @type {ApexCharts|null} */
let chart = null;

/**
 * Initialize the leverage grouped bar chart.
 * @param {string} containerId - DOM element ID for the chart
 */
export function initLeverageChart(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const options = buildLeverageChartOptions();
    chart = new ApexCharts(el, options);
    chart.render();
}

/**
 * Update the leverage chart with new simulation results.
 * @param {object[]} results - Array of 4 path result objects from the simulator
 */
export function updateLeverageChart(results) {
    if (!chart) return;

    const pathIds = ['bto', '3room', '4room', 'condo'];
    const mapped = pathIds.map(id => results.find(r => r.pathId === id));

    const upfrontData = mapped.map(r => {
        if (!r || !r.isAffordable) return null;
        return r.upfrontCosts.downpayment + r.upfrontCosts.bsd + r.upfrontCosts.renovation;
    });

    const rentData = mapped.map(r => {
        if (!r || !r.isAffordable) return null;
        return r.summary.tenantSubsidyTotal || 0;
    });

    const netData = mapped.map(r => {
        if (!r || !r.isAffordable) return null;
        const upfront = r.upfrontCosts.downpayment + r.upfrontCosts.bsd + r.upfrontCosts.renovation;
        const rent = r.summary.tenantSubsidyTotal || 0;
        return upfront - rent;
    });

    chart.updateOptions({
        series: [
            {
                name: 'Upfront Capital Sunk',
                data: upfrontData
            },
            {
                name: 'Cumulative Rent Collected',
                data: rentData
            },
            {
                name: 'Net Owner Contribution',
                data: netData
            }
        ]
    }, true, true);
}

/**
 * Build initial ApexCharts configuration for the grouped bar chart.
 */
function buildLeverageChartOptions() {
    return {
        chart: {
            type: 'bar',
            height: 380,
            fontFamily: "'Inter', sans-serif",
            background: 'transparent',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                dynamicAnimation: {
                    enabled: true,
                    speed: 500
                }
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        colors: [
            'hsl(0, 80%, 55%)',    // Upfront Capital Sunk (Red-ish)
            'hsl(145, 70%, 50%)',  // Cumulative Rent Collected (Green-ish)
            'hsl(210, 90%, 60%)'   // Net Owner Contribution (Blue-ish)
        ],
        series: [
            { name: 'Upfront Capital Sunk', data: [0, 0, 0, 0] },
            { name: 'Cumulative Rent Collected', data: [0, 0, 0, 0] },
            { name: 'Net Owner Contribution', data: [0, 0, 0, 0] }
        ],
        xaxis: {
            categories: ['BTO', '3-Room HDB', '4-Room HDB', 'Private Condo'],
            labels: {
                style: {
                    colors: 'hsl(220, 15%, 55%)',
                    fontSize: '11px'
                }
            },
            axisBorder: { color: 'hsla(220, 20%, 30%, 0.3)' },
            axisTicks: { color: 'hsla(220, 20%, 30%, 0.3)' }
        },
        yaxis: {
            title: {
                text: 'Amount (S$)',
                style: {
                    color: 'hsl(220, 15%, 55%)',
                    fontSize: '12px',
                    fontWeight: 500
                }
            },
            labels: {
                style: {
                    colors: 'hsl(220, 15%, 55%)',
                    fontSize: '11px'
                },
                formatter: (val) => formatCompact(val)
            }
        },
        grid: {
            borderColor: 'hsla(220, 20%, 30%, 0.15)',
            strokeDashArray: 3,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            floating: false,
            fontSize: '12px',
            fontWeight: 500,
            labels: {
                colors: 'hsl(220, 15%, 75%)'
            },
            itemMargin: { horizontal: 12, vertical: 4 }
        },
        tooltip: {
            theme: 'dark',
            shared: true,
            intersect: false,
            style: {
                fontSize: '12px'
            },
            y: {
                formatter: (val) => val !== null ? formatCurrency(val) : 'N/A'
            }
        },
        theme: {
            mode: 'dark'
        },
        responsive: [
            {
                breakpoint: 768,
                options: {
                    chart: { height: 320 },
                    plotOptions: {
                        bar: { columnWidth: '70%' }
                    }
                }
            },
            {
                breakpoint: 480,
                options: {
                    chart: { height: 260 },
                    plotOptions: {
                        bar: { columnWidth: '85%' }
                    }
                }
            }
        ]
    };
}
