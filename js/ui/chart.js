/**
 * Chart.js Configuration & Rendering (Using ApexCharts)
 * 
 * Renders the primary Net Worth vs. Time multi-line chart
 * with crossover detection, greyed-out unaffordable paths,
 * and dynamic annotations.
 */

import { formatCurrency, formatCompact, findCrossover } from '../utils.js';

/** Path color mapping */
const PATH_COLORS = {
    bto:   { main: 'hsl(185, 90%, 55%)', glow: 'hsla(185, 90%, 55%, 0.25)', faded: 'hsla(185, 90%, 55%, 0.12)' },
    '3room': { main: 'hsl(38, 95%, 60%)', glow: 'hsla(38, 95%, 60%, 0.25)', faded: 'hsla(38, 95%, 60%, 0.12)' },
    '4room': { main: 'hsl(155, 80%, 50%)', glow: 'hsla(155, 80%, 50%, 0.25)', faded: 'hsla(155, 80%, 50%, 0.12)' },
    condo: { main: 'hsl(330, 85%, 60%)', glow: 'hsla(330, 85%, 60%, 0.25)', faded: 'hsla(330, 85%, 60%, 0.12)' }
};

const PATH_LABELS = {
    bto: '2-Room Flexi BTO',
    '3room': '3-Room Resale',
    '4room': '4-Room Resale',
    condo: 'Private Condo'
};

/** @type {ApexCharts|null} */
let chart = null;

/**
 * Initialize the ApexCharts instance.
 * @param {string} containerId - DOM element ID for the chart
 */
export function initChart(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const options = buildChartOptions([]);
    chart = new ApexCharts(el, options);
    chart.render();
}

/**
 * Update the chart with new simulation results.
 * @param {object[]} results - Array of 4 path result objects from the simulator
 * @param {number} startAge - Starting age from user input
 */
export function updateChart(results, startAge = 35) {
    if (!chart) return;

    const series = [];
    const annotations = { xaxis: [], points: [] };
    const warningsContainer = document.getElementById('chart-warnings');
    if (warningsContainer) warningsContainer.innerHTML = '';

    // Build series for each path
    for (const result of results) {
        const colors = PATH_COLORS[result.pathId];
        const isActive = result.isAffordable && result.isEligible;

        series.push({
            name: result.pathName,
            data: result.yearlyData.map(d => ({
                x: d.age,
                y: isActive ? d.netWorth : null
            })),
            color: isActive ? colors.main : 'hsla(0, 0%, 50%, 0.2)',
        });

        // Add warning badges for unaffordable paths
        if (!isActive && warningsContainer) {
            const badge = document.createElement('div');
            badge.className = 'warning-badge';
            badge.innerHTML = `
                <span class="warning-badge__icon">⚠</span>
                <span class="warning-badge__text">
                    <strong>${result.pathName}</strong><br>
                    ${result.warnings[0] || 'Insufficient Upfront Capital Structure'}
                </span>
            `;
            warningsContainer.appendChild(badge);
        }
    }

    // Detect crossover points between affordable paths
    const affordablePaths = results.filter(r => r.isAffordable && r.isEligible);
    if (affordablePaths.length >= 2) {
        for (let i = 0; i < affordablePaths.length; i++) {
            for (let j = i + 1; j < affordablePaths.length; j++) {
                const s1 = affordablePaths[i].yearlyData.map(d => d.netWorth);
                const s2 = affordablePaths[j].yearlyData.map(d => d.netWorth);
                const crossover = findCrossover(s1, s2);

                if (crossover !== null) {
                    const crossoverAge = startAge + crossover;
                    // Interpolated value at crossover
                    const crossoverIdx = Math.floor(crossover);
                    const frac = crossover - crossoverIdx;
                    const crossoverValue = s1[crossoverIdx] + frac * (s1[crossoverIdx + 1] - s1[crossoverIdx]);

                    annotations.xaxis.push({
                        x: crossoverAge,
                        strokeDashArray: 4,
                        borderColor: 'hsla(38, 95%, 60%, 0.5)',
                        label: {
                            text: `Crossover: Age ${crossoverAge.toFixed(1)}`,
                            style: {
                                color: '#f5a623',
                                background: 'hsla(38, 95%, 60%, 0.1)',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: { left: 8, right: 8, top: 4, bottom: 4 }
                            },
                            orientation: 'horizontal',
                            offsetY: -10
                        }
                    });

                    annotations.points.push({
                        x: crossoverAge,
                        y: Math.round(crossoverValue),
                        marker: {
                            size: 6,
                            fillColor: '#f5a623',
                            strokeColor: '#fff',
                            strokeWidth: 2
                        },
                        label: {
                            text: formatCompact(crossoverValue),
                            style: {
                                color: '#f5a623',
                                background: 'transparent',
                                fontSize: '10px'
                            },
                            offsetY: -15
                        }
                    });
                }
            }
        }
    }

    // Update chart
    chart.updateOptions({
        series,
        annotations,
        xaxis: {
            min: startAge,
            max: startAge + 10,
            tickAmount: 10
        },
        stroke: {
            curve: 'smooth',
            width: results.map(r => (r.isAffordable && r.isEligible) ? 4 : 2),
            dashArray: results.map(r => (r.isAffordable && r.isEligible) ? 0 : 4)
        }
    }, true, true);
}

/**
 * Build the initial ApexCharts configuration.
 */
function buildChartOptions(initialSeries) {
    return {
        chart: {
            type: 'area',
            height: 400,
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
            },
            dropShadow: {
                enabled: true,
                top: 4,
                left: 0,
                blur: 8,
                opacity: 0.3
            }
        },
        series: initialSeries,
        colors: [
            PATH_COLORS.bto.main,
            PATH_COLORS['3room'].main,
            PATH_COLORS['4room'].main,
            PATH_COLORS.condo.main
        ],
        stroke: {
            curve: 'smooth',
            width: 4
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.15,
                opacityTo: 0.0,
                stops: [0, 100]
            }
        },
        xaxis: {
            type: 'numeric',
            min: 35,
            max: 45,
            tickAmount: 10,
            title: {
                text: 'Age',
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
                formatter: (val) => Math.round(val)
            },
            axisBorder: { color: 'hsla(220, 20%, 30%, 0.3)' },
            axisTicks: { color: 'hsla(220, 20%, 30%, 0.3)' }
        },
        yaxis: {
            title: {
                text: 'Net Worth (S$)',
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
            yaxis: { lines: { show: true } },
            padding: { left: 10, right: 10 }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            floating: false,
            fontSize: '12px',
            fontWeight: 500,
            labels: {
                colors: 'hsl(220, 15%, 75%)'
            },
            markers: {
                size: 6,
                shape: 'circle'
            },
            itemMargin: { horizontal: 12, vertical: 4 },
            onItemClick: { toggleDataSeries: true },
            onItemHover: { highlightDataSeries: true }
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
            },
            custom: undefined,
            marker: { show: true },
            x: {
                formatter: (val) => `Age ${Math.round(val)}`
            }
        },
        markers: {
            size: 0,
            hover: { size: 7 }
        },
        theme: {
            mode: 'dark'
        },
        responsive: [
            {
                breakpoint: 768,
                options: {
                    chart: { height: 320 },
                    legend: {
                        position: 'bottom',
                        fontSize: '11px'
                    }
                }
            },
            {
                breakpoint: 480,
                options: {
                    chart: { height: 260 },
                    yaxis: {
                        labels: {
                            formatter: (val) => formatCompact(val)
                        }
                    }
                }
            }
        ]
    };
}

/**
 * Destroy the chart instance (for cleanup).
 */
export function destroyChart() {
    if (chart) {
        chart.destroy();
        chart = null;
    }
}
