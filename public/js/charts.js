/**
 * Charts module — Chart.js chart factory and renderers.
 *
 * Each renderer takes a container element + data and returns the Chart instance.
 * Uses a consistent blue/green theme.
 */

// --- HTML escape (prevents XSS from imported CSV data) ----------------------
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Theme colors -----------------------------------------------------------
const COLORS = {
  primary: '#1F4E79',
  primaryLight: '#2E75B6',
  accent: '#2E9E5B',
  accentLight: '#4FC07F',
  danger: '#E04545',
  warning: '#E8A93A',
  purple: '#7B5EA7',
  palette: ['#1F4E79', '#2E9E5B', '#2E75B6', '#4FC07F', '#E8A93A', '#7B5EA7', '#E04545', '#36B3A0'],
};

// --- Chart defaults ---------------------------------------------------------
Chart.defaults.font.family = "'-apple-system', 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.size = 12;

/** Theme-aware chart settings — called before each render to sync with current theme. */
function syncChartTheme() {
  const isDark = document.body.classList.contains('dark');
  Chart.defaults.color = isDark ? '#94A3B8' : '#6B7C8E';
  return {
    isDark,
    gridColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    textColor: isDark ? '#94A3B8' : '#6B7C8E',
  };
}

/** Get the current theme's grid color for inline use in scale definitions. */
function gridColor() {
  return document.body.classList.contains('dark')
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.05)';
}

// --- Helpers ----------------------------------------------------------------
function fmtCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtCurrencyFull(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtPctPlain(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function shortMonth(monthStr) {
  const [y, m] = monthStr.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

function showEmpty(container, msg = 'No data available') {
  container.innerHTML = `<div class="chart-empty">${msg}</div>`;
}

// --- Registry: track all charts for destroy/re-render ----------------------
const chartRegistry = new Map();

/** Build standard Chart.js scale options that adapt to the current theme. */
function themedScales(extra = {}) {
  const t = syncChartTheme();
  return {
    y: {
      beginAtZero: true,
      ticks: { callback: extra.yCallback || ((v) => fmtCurrency(v)) },
      grid: { color: t.gridColor },
    },
    x: { grid: { display: false } },
    ...extra,
  };
}

function destroyChart(key) {
  if (chartRegistry.has(key)) {
    chartRegistry.get(key).destroy();
    chartRegistry.delete(key);
  }
}

function registerChart(key, chart) {
  destroyChart(key);
  chartRegistry.set(key, chart);
}

/** Create a canvas inside a container and return its 2D context. */
function prepCanvas(container) {
  // Sync Chart.js defaults with current theme before every render
  syncChartTheme();
  container.innerHTML = '<canvas></canvas>';
  return container.querySelector('canvas').getContext('2d');
}

// ============================================================================
//  CHART RENDERERS
// ============================================================================

/** Revenue & Profit trend — line chart. */
export function renderRevenueTrend(container, data, key = 'revenueTrend') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((d) => shortMonth(d.month)),
      datasets: [
        {
          label: 'Revenue',
          data: data.map((d) => d.revenue),
          borderColor: COLORS.primary,
          backgroundColor: 'rgba(31, 78, 121, 0.08)',
          fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 4,
          pointBackgroundColor: COLORS.primary, yAxisID: 'y',
        },
        {
          label: 'Profit',
          data: data.map((d) => d.profit),
          borderColor: COLORS.accent,
          backgroundColor: 'rgba(46, 158, 91, 0.06)',
          fill: false, tension: 0.35, borderWidth: 2.5, pointRadius: 4,
          pointBackgroundColor: COLORS.accent, yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtCurrencyFull(c.raw)}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Top products — horizontal bar. */
export function renderTopProducts(container, data, key = 'topProducts') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.product),
      datasets: [{
        label: 'Revenue',
        data: data.map((d) => d.revenue),
        backgroundColor: data.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
        borderRadius: 6, barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Revenue: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Profit: ${fmtCurrencyFull(d.profit)}\n Category: ${d.category}`;
            },
          },
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        y: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Revenue by category — doughnut. */
export function renderCategoryDoughnut(container, data, key = 'categoryDoughnut') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);
  const total = data.reduce((s, d) => s + d.revenue, 0);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.category),
      datasets: [{
        data: data.map((d) => d.revenue),
        backgroundColor: [COLORS.primary, COLORS.accent, COLORS.warning],
        borderWidth: 2, borderColor: '#fff',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const pct = ((c.raw / total) * 100).toFixed(1);
              return ` ${c.label}: ${fmtCurrencyFull(c.raw)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
  registerChart(key, chart);
}

/** Sales by region — bar chart with drill-down on click. */
export function renderSalesByRegion(container, data, key = 'salesByRegion', onDrill = null) {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.region),
      datasets: [{
        label: 'Revenue',
        data: data.map((d) => d.revenue),
        backgroundColor: COLORS.primaryLight,
        borderRadius: 6, barThickness: 48,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: onDrill ? (evt, elements) => {
        if (elements.length > 0) onDrill(data[elements[0].index]);
      } : undefined,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Revenue: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Profit: ${fmtCurrencyFull(d.profit)}\n States: ${d.states.length}`;
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Drill-down: states within a region. */
export function renderStatesInRegion(container, regionData, key = 'statesDrill', onDrill = null) {
  if (!regionData || !regionData.states || regionData.states.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);
  const states = regionData.states;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: states.map((s) => s.state),
      datasets: [{
        label: 'Revenue',
        data: states.map((s) => s.revenue),
        backgroundColor: COLORS.accent,
        borderRadius: 6, barThickness: 32,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: onDrill ? (evt, elements) => {
        if (elements.length > 0) onDrill(states[elements[0].index]);
      } : undefined,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Revenue: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const s = states[c.dataIndex];
              return ` Profit: ${fmtCurrencyFull(s.profit)}\n Cities: ${s.cities.length}`;
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Drill-down: cities within a state. */
export function renderCitiesInState(container, stateData, key = 'citiesDrill') {
  if (!stateData || !stateData.cities || stateData.cities.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stateData.cities.map((c) => c.city),
      datasets: [{
        label: 'Revenue',
        data: stateData.cities.map((c) => c.revenue),
        backgroundColor: COLORS.accentLight,
        borderRadius: 6, barThickness: 28,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` Revenue: ${fmtCurrencyFull(c.raw)}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Sales by category — clustered column (revenue + profit). */
export function renderCategoryColumns(container, data, key = 'categoryColumns') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.category),
      datasets: [
        { label: 'Revenue', data: data.map((d) => d.revenue), backgroundColor: COLORS.primary, borderRadius: 6 },
        { label: 'Profit', data: data.map((d) => d.profit), backgroundColor: COLORS.accent, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtCurrencyFull(c.raw)}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Region × Category matrix table with heatmap conditional formatting. */
export function renderRegionCategoryMatrix(container, data) {
  if (!data || !data.cells || data.cells.length === 0) {
    container.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }

  const categories = [...new Set(data.cells.map((c) => c.category))].sort();
  const regions = [...new Set(data.cells.map((c) => c.region))].sort();

  function heatColor(intensity) {
    const r = Math.round(244 + (31 - 244) * intensity);
    const g = Math.round(246 + (78 - 246) * intensity);
    const b = Math.round(249 + (121 - 249) * intensity);
    return `rgb(${r},${g},${b})`;
  }
  function textColor(intensity) { return intensity > 0.55 ? '#fff' : '#1A2B3C'; }

  let html = '<table class="matrix-table"><thead><tr><th>Region \ Category</th>';
  for (const cat of categories) html += `<th>${escapeHTML(cat)}</th>`;
  html += '</tr></thead><tbody>';
  for (const region of regions) {
    html += `<tr><td><strong>${escapeHTML(region)}</strong></td>`;
    for (const cat of categories) {
      const cell = data.cells.find((c) => c.region === region && c.category === cat);
      if (cell) {
        html += `<td class="num" style="background:${heatColor(cell.intensity)};color:${textColor(cell.intensity)}">${fmtCurrency(cell.revenue)}</td>`;
      } else {
        html += '<td class="num" style="color:#ccc">—</td>';
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

/** New vs Returning — doughnut. */
export function renderNewVsReturning(container, data, key = 'newVsReturning') {
  if (!data) return showEmpty(container);
  const ctx = prepCanvas(container);
  const total = data.newCustomers + data.returningCustomers;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['New', 'Returning'],
      datasets: [{
        data: [data.newCustomers, data.returningCustomers],
        backgroundColor: [COLORS.primaryLight, COLORS.accent],
        borderWidth: 2, borderColor: '#fff',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const pct = total ? ((c.raw / total) * 100).toFixed(1) : 0;
              return ` ${c.label}: ${c.raw} (${pct}%)`;
            },
          },
        },
      },
    },
  });
  registerChart(key, chart);
}

/** Churned vs Active — doughnut. */
export function renderChurnDoughnut(container, data, key = 'churnDoughnut') {
  if (!data) return showEmpty(container);
  const ctx = prepCanvas(container);
  const active = data.totalCustomers - data.churnedCustomers;
  const total = data.totalCustomers;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Churned'],
      datasets: [{
        data: [active, data.churnedCustomers],
        backgroundColor: [COLORS.accent, COLORS.danger],
        borderWidth: 2, borderColor: '#fff',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const pct = total ? ((c.raw / total) * 100).toFixed(1) : 0;
              return ` ${c.label}: ${c.raw} (${pct}%)`;
            },
          },
        },
      },
    },
  });
  registerChart(key, chart);
}

/** Top 10 customers — horizontal bar, colored by churn status. */
export function renderTopCustomers(container, data, key = 'topCustomers') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.customer),
      datasets: [{
        label: 'Revenue',
        data: data.map((d) => d.revenue),
        backgroundColor: data.map((d) => (d.churned === 'Yes' ? COLORS.danger : COLORS.primary)),
        borderRadius: 6, barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Revenue: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Profit: ${fmtCurrencyFull(d.profit)}\n Status: ${d.churned === 'Yes' ? '⚠ Churned' : '✓ Active'}\n Type: ${d.type}`;
            },
          },
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        y: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Customer segmentation matrix table. */
export function renderSegmentationTable(container, data) {
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="chart-empty">No data</div>';
    return;
  }
  let html = `<table class="matrix-table"><thead><tr>
    <th>Region</th><th>New Customers</th><th>Returning Customers</th><th>New Revenue</th><th>Returning Revenue</th>
  </tr></thead><tbody>`;
  for (const row of data) {
    html += `<tr>
      <td><strong>${escapeHTML(row.region)}</strong></td>
      <td class="num">${row.newCount}</td>
      <td class="num">${row.returningCount}</td>
      <td class="num profit-pos">${fmtCurrency(row.newRevenue)}</td>
      <td class="num profit-pos">${fmtCurrency(row.returningRevenue)}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

/** Sales vs Profit — clustered column by month. */
export function renderSalesVsProfit(container, data, key = 'salesVsProfit') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => shortMonth(d.month)),
      datasets: [
        { label: 'Sales', data: data.map((d) => d.revenue), backgroundColor: COLORS.primary, borderRadius: 6 },
        { label: 'Profit', data: data.map((d) => d.profit), backgroundColor: COLORS.accent, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtCurrencyFull(c.raw)}` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Most profitable products — horizontal bar (green). */
export function renderMostProfitable(container, data, key = 'mostProfitable') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.product),
      datasets: [{
        label: 'Profit',
        data: data.map((d) => d.profit),
        backgroundColor: COLORS.accent,
        borderRadius: 6, barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Profit: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Revenue: ${fmtCurrencyFull(d.revenue)}\n Margin: ${fmtPctPlain(d.margin)}\n Category: ${d.category}`;
            },
          },
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        y: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Loss-making products — horizontal bar (red). */
export function renderLossMaking(container, data, key = 'lossMaking') {
  if (!data || data.length === 0) return showEmpty(container, 'No loss-making products 🎉');
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.product),
      datasets: [{
        label: 'Profit',
        data: data.map((d) => d.profit),
        backgroundColor: COLORS.danger,
        borderRadius: 6, barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Profit: ${fmtCurrencyFull(c.raw)}`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Revenue: ${fmtCurrencyFull(d.revenue)}\n Margin: ${fmtPctPlain(d.margin)}\n Category: ${d.category}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        y: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Profit margin by region — bar with conditional color. */
export function renderProfitMarginByRegion(container, data, key = 'profitMarginByRegion') {
  if (!data || data.length === 0) return showEmpty(container);
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.region),
      datasets: [{
        label: 'Profit Margin %',
        data: data.map((d) => d.margin),
        backgroundColor: data.map((d) => (d.margin < 0 ? COLORS.danger : COLORS.accent)),
        borderRadius: 6, barThickness: 48,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` Margin: ${fmtPctPlain(c.raw)}%`,
            afterLabel: (c) => {
              const d = data[c.dataIndex];
              return ` Revenue: ${fmtCurrencyFull(d.revenue)}\n Profit: ${fmtCurrencyFull(d.profit)}`;
            },
          },
        },
      },
      scales: {
        y: { ticks: { callback: (v) => `${v.toFixed(1)}%` }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Revenue trend with forecast overlay — actual solid line + forecast dashed. */
export function renderForecastTrend(container, forecastData, key = 'forecastTrend') {
  if (!forecastData || !forecastData.points || forecastData.points.length === 0) {
    return showEmpty(container);
  }
  const ctx = prepCanvas(container);
  const points = forecastData.points;

  // Split into actual and forecast segments
  const actualLabels = points.filter((p) => !p.isForecast).map((p) => shortMonth(p.month));
  const actualData = points.filter((p) => !p.isForecast).map((p) => p.revenue);
  const forecastLabels = points.map((p) => shortMonth(p.month));
  const forecastDataArr = points.map((p, i) => {
    // Forecast line: null until last actual point, then continues
    if (p.isForecast) return p.revenue;
    // For the last actual point, include it so lines connect
    if (i === actualData.length - 1) return p.revenue;
    return null;
  });

  const datasets = [
    {
      label: 'Actual Revenue',
      data: actualData,
      borderColor: COLORS.primary,
      backgroundColor: 'rgba(31, 78, 121, 0.08)',
      fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 4,
      pointBackgroundColor: COLORS.primary,
    },
  ];

  if (forecastData.sufficient) {
    datasets.push({
      label: 'Forecast (linear)',
      data: forecastDataArr,
      borderColor: COLORS.warning,
      backgroundColor: 'rgba(232, 169, 58, 0.06)',
      fill: false, tension: 0.35, borderWidth: 2.5, borderDash: [6, 4],
      pointRadius: 4, pointBackgroundColor: COLORS.warning,
    });
  } else {
    // Show insufficient data notice as a subtitle/annotation
    // The chart still renders actual data, but without forecast
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: forecastLabels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const p = points[c.dataIndex];
              const tag = p.isForecast ? ' 📈 Forecast' : '';
              return ` ${c.dataset.label}: ${fmtCurrencyFull(c.raw)}${tag}`;
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => fmtCurrency(v) }, grid: { color: gridColor() } },
        x: { grid: { display: false } },
      },
    },
  });
  registerChart(key, chart);
}

/** Mini sparkline chart for KPI cards. */
export function renderSparkline(container, values, color = '#2E75B6', key) {
  if (!values || values.length < 2) return;
  const ctx = prepCanvas(container);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: values.map((_, i) => i),
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false,
    },
  });
  registerChart(key, chart);
}

/** Render the Data Explorer table. */
export function renderDataTable(container, data) {
  if (!data || !data.rows || data.rows.length === 0) {
    container.innerHTML = '<div class="chart-empty">No records found</div>';
    return;
  }

  const columns = [
    { key: 'OrderID', label: 'Order ID' },
    { key: 'Date', label: 'Date' },
    { key: 'Region', label: 'Region' },
    { key: 'ProductCategory', label: 'Category' },
    { key: 'ProductName', label: 'Product' },
    { key: 'Sales', label: 'Sales', numeric: true, money: true },
    { key: 'Profit', label: 'Profit', numeric: true, money: true, profitColor: true },
    { key: 'Quantity', label: 'Qty', numeric: true },
    { key: 'CustomerID', label: 'Customer' },
    { key: 'CustomerType', label: 'Type' },
  ];

  const sortBy = data._sortBy || 'Date';
  const sortDir = data._sortDir || 'desc';

  let html = '<table class="data-table"><thead><tr>';
  for (const col of columns) {
    const arrow = sortBy === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '';
    html += `<th data-sort="${col.key}">${col.label}<span class="sort-arrow">${arrow}</span></th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of data.rows) {
    html += '<tr>';
    for (const col of columns) {
      let val = row[col.key];
      let cls = col.numeric ? 'num' : '';
      const isNeg = col.profitColor && (val < 0);
      if (col.money) val = fmtCurrencyFull(val);
      if (col.profitColor) cls += isNeg ? ' profit-neg' : ' profit-pos';
      html += `<td class="${cls}">${escapeHTML(val)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

/** Render pagination controls. */
export function renderPagination(container, data, onPageChange) {
  if (!data || data.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  const { page, totalPages } = data;
  let html = '';
  html += `<button class="page-btn ${page === 1 ? 'active' : ''}" data-page="${1}">« First</button>`;
  html += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹ Prev</button>`;

  // Show up to 5 page numbers around current
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next ›</button>`;
  html += `<button class="page-btn" data-page="${totalPages}">Last »</button>`;
  container.innerHTML = html;

  // Wire up page buttons
  container.querySelectorAll('.page-btn[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page, 10);
      if (p && p !== page && p >= 1 && p <= totalPages) onPageChange(p);
    });
  });
}

// Expose helpers globally for app.js
window.ChartHelpers = { fmtCurrency, fmtCurrencyFull, fmtPct, fmtPctPlain, shortMonth };
