/**
 * App controller — page navigation, filter management, data loading & rendering.
 *
 * Features:
 * - 5 pages (Executive, Sales, Customer, Profitability, Data Explorer)
 * - Global filters with apply/reset
 * - CSV import / sample data switching
 * - Dark / light theme toggle (persists in localStorage)
 * - Animated KPI counters with sparklines
 * - Revenue forecast toggle on Sales page
 * - Print dashboard
 * - Drill-down Region → State → City
 *
 * Loaded as ES module.
 */

import * as Charts from './charts.js';

const { fetchJSON } = window.DashboardAPI;
const H = window.ChartHelpers;

// --- State ------------------------------------------------------------------
let currentPage = 'executive';
let filters = {};
let drillState = { region: null, state: null };
let showForecast = false;
let explorerState = { search: '', sortBy: 'Date', sortDir: 'desc', page: 1 };

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

// --- DOM helpers ------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/** Get all chart-body elements within a page as an array. */
function bodyIn(pageId) {
  return [...$$(`#${pageId} .chart-body`)];
}

// --- Page Navigation --------------------------------------------------------
function switchPage(page) {
  currentPage = page;
  $$('.page').forEach((p) => p.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');
  $$('.nav-tab').forEach((t) => t.classList.toggle('active', t.dataset.page === page));

  if (page !== 'sales') drillState = { region: null, state: null };
  renderPage(page);
}

// --- Filter Management ------------------------------------------------------
function collectFilters() {
  const f = {};
  const sd = $('#filterStartDate').value;
  const ed = $('#filterEndDate').value;
  const region = $('#filterRegion').value;
  const category = $('#filterCategory').value;
  const ct = $('#filterCustomerType').value;
  if (sd) f.startDate = sd;
  if (ed) f.endDate = ed;
  if (region) f.region = region;
  if (category) f.category = category;
  if (ct) f.customerType = ct;
  return f;
}

function applyFilters() {
  filters = collectFilters();
  explorerState.page = 1;
  renderPage(currentPage);
}

function resetFilters() {
  $('#filterStartDate').value = '';
  $('#filterEndDate').value = '';
  $('#filterRegion').value = '';
  $('#filterCategory').value = '';
  $('#filterCustomerType').value = '';
  filters = {};
  explorerState.page = 1;
  renderPage(currentPage);
}

async function initFilterOptions() {
  const opts = await fetchJSON('filters');
  if (opts.dateRange) {
    $('#filterStartDate').min = opts.dateRange.min;
    $('#filterStartDate').max = opts.dateRange.max;
    $('#filterEndDate').min = opts.dateRange.min;
    $('#filterEndDate').max = opts.dateRange.max;
  }
  const regionSel = $('#filterRegion');
  // Clear existing options except "All"
  regionSel.innerHTML = '<option value="">All Regions</option>';
  for (const r of opts.regions || []) {
    regionSel.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`);
  }
  const catSel = $('#filterCategory');
  catSel.innerHTML = '<option value="">All Categories</option>';
  for (const c of opts.categories || []) {
    catSel.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`);
  }
}

// --- Theme (Dark/Light) -----------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('dashboard-theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  const btn = $('#themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('dashboard-theme', next);
  // Re-render current page so charts pick up new colors
  renderPage(currentPage);
}

// --- Animated KPI Counters --------------------------------------------------
function animateValue(el, start, end, duration, formatter) {
  if (!el) return;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = start + (end - start) * eased;
    el.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = formatter(end);
  }
  requestAnimationFrame(step);
}

function loadSummaryKPIs(data, trend) {
  animateValue($('#kpiRevenue'), 0, data.totalRevenue, 800, (v) => H.fmtCurrencyFull(Math.round(v * 100) / 100));
  animateValue($('#kpiProfit'), 0, data.totalProfit, 800, (v) => H.fmtCurrencyFull(Math.round(v * 100) / 100));
  animateValue($('#kpiOrders'), 0, data.totalOrders, 600, (v) => Math.round(v).toLocaleString());

  const momEl = $('#kpiMoM');
  if (momEl) momEl.textContent = H.fmtPct(data.momRevenueGrowth);
  const trendEl = $('#kpiMoMTrend');
  if (trendEl) {
    trendEl.textContent = data.momRevenueGrowth > 0 ? '▲ vs last month' : data.momRevenueGrowth < 0 ? '▼ vs last month' : '— vs last month';
    trendEl.className = 'kpi-trend ' + (data.momRevenueGrowth > 0 ? 'up' : data.momRevenueGrowth < 0 ? 'down' : 'neutral');
  }

  // Sparklines
  addSparkline('kpiRevenue', trend, 'revenue');
  addSparkline('kpiProfit', trend, 'profit');
}

function addSparkline(kpiId, trendData, field) {
  const card = $(`#${kpiId}`)?.closest('.kpi-card');
  if (!card) return;
  // Remove old sparkline
  card.querySelectorAll('.kpi-sparkline').forEach((s) => s.remove());
  const values = trendData.map((m) => m[field]);
  if (values.length < 2) return;
  const sparkDiv = document.createElement('div');
  sparkDiv.className = 'kpi-sparkline';
  card.appendChild(sparkDiv);
  const trendUp = values[values.length - 1] >= values[0];
  Charts.renderSparkline(sparkDiv, values, trendUp ? '#2E9E5B' : '#E04545', `spark-${kpiId}`);
}

function loadCustomerKPIs(data) {
  animateValue($('#kpiCustTotal'), 0, data.totalCustomers, 600, (v) => Math.round(v).toLocaleString());
  $('#kpiChurn').textContent = H.fmtPctPlain(data.churnRate) + '%';
  $('#kpiNewCust').textContent = H.fmtPctPlain(data.newCustomerPct) + '%';
}

function loadProfitKPIs(summary) {
  $('#kpiMargin').textContent = H.fmtPctPlain(summary.profitMargin) + '%';
  animateValue($('#kpiTotalProfit'), 0, summary.totalProfit, 800, (v) => H.fmtCurrencyFull(Math.round(v * 100) / 100));
}

// --- Data Source Indicator --------------------------------------------------
async function updateDataSource() {
  try {
    const ds = await fetchJSON('data-source');
    const badge = $('#dataSourceBadge');
    const text = $('#dataSourceText');
    if (ds.dataSource === 'custom') {
      badge.classList.add('custom');
      text.textContent = `Custom Data (${ds.rowCount} rows)`;
    } else {
      badge.classList.remove('custom');
      text.textContent = `Sample Data (${ds.rowCount} rows)`;
    }
  } catch (e) { /* ignore */ }
}

// --- Insights ---------------------------------------------------------------
function generateInsights(summary, topProducts, categoryData, profitability) {
  const insights = [];

  if (summary.momRevenueGrowth > 0) {
    insights.push(`Revenue grew <strong>+${summary.momRevenueGrowth.toFixed(1)}%</strong> month-over-month, indicating positive sales momentum.`);
  } else if (summary.momRevenueGrowth < 0) {
    insights.push(`Revenue declined <strong>${summary.momRevenueGrowth.toFixed(1)}%</strong> month-over-month — investigate the cause.`);
  }

  if (topProducts.length > 0) {
    insights.push(`The top product <strong>${escapeHTML(topProducts[0].product)}</strong> generated <strong>${H.fmtCurrencyFull(topProducts[0].revenue)}</strong> in revenue.`);
  }

  if (categoryData.length > 0) {
    const topCat = categoryData[0];
    const totalRev = categoryData.reduce((s, c) => s + c.revenue, 0);
    const share = ((topCat.revenue / totalRev) * 100).toFixed(1);
    insights.push(`The <strong>${escapeHTML(topCat.category)}</strong> category leads with <strong>${share}%</strong> of total revenue.`);
  }

  if (profitability.lossMaking.length > 0) {
    const lossNames = profitability.lossMaking.map((p) => escapeHTML(p.product)).join(', ');
    insights.push(`⚠ <strong>${profitability.lossMaking.length} loss-making product(s)</strong> detected: ${lossNames}. A pricing or cost review is recommended.`);
  } else {
    insights.push(`✅ All products are profitable — no loss-makers detected.`);
  }

  if (summary.churnRate > 15) {
    insights.push(`The churn rate of <strong>${summary.churnRate.toFixed(1)}%</strong> is above the 15% threshold — customer retention initiatives are recommended.`);
  }

  insights.push(`Overall profit margin stands at <strong>${summary.profitMargin.toFixed(1)}%</strong>.`);

  return insights;
}

// --- Page Renderers ---------------------------------------------------------
async function renderPage(page) {
  try {
    switch (page) {
      case 'executive': await renderExecutive(); break;
      case 'sales': await renderSales(); break;
      case 'customer': await renderCustomer(); break;
      case 'profit': await renderProfit(); break;
      case 'explorer': await renderExplorer(); break;
    }
  } catch (err) {
    console.error(`Failed to render page ${page}:`, err);
  }
}

async function renderExecutive() {
  const bodies = bodyIn('page-executive');

  const [summary, trend, topProducts, categoryData, profitability] = await Promise.all([
    fetchJSON('summary', filters),
    fetchJSON('revenue-trend', filters),
    fetchJSON('top-products', { ...filters, limit: 5 }),
    fetchJSON('sales-by-category', filters),
    fetchJSON('profitability', filters),
  ]);

  loadSummaryKPIs(summary, trend);

  Charts.renderRevenueTrend(bodies[0], trend, 'execTrend');
  Charts.renderTopProducts(bodies[1], topProducts, 'execTopProducts');
  Charts.renderCategoryDoughnut(bodies[2], categoryData, 'execCatDoughnut');

  const insights = generateInsights(summary, topProducts, categoryData, profitability);
  $('#execInsights').innerHTML = insights.map((i) => `<li>${i}</li>`).join('');
}

async function renderSales() {
  const bodies = bodyIn('page-sales');

  if (showForecast) {
    // Fetch forecast data for the trend chart
    const [forecast, regionData, categoryData, matrix] = await Promise.all([
      fetchJSON('forecast', { ...filters, months: 3 }),
      fetchJSON('sales-by-region', filters),
      fetchJSON('sales-by-category', filters),
      fetchJSON('region-category-matrix', filters),
    ]);

    Charts.renderForecastTrend(bodies[0], forecast, 'salesForecast');
    if (!forecast.sufficient) {
      // Show insufficient data warning on the chart title area
      const toggle = $('#forecastToggle');
      if (toggle) toggle.textContent = '⚠ Not enough data for forecast';
    }
    renderSalesRegionChart(bodies[1], regionData);
    Charts.renderCategoryColumns(bodies[2], categoryData, 'salesCategory');
    Charts.renderRegionCategoryMatrix(bodies[3], matrix);
  } else {
    const [trend, regionData, categoryData, matrix] = await Promise.all([
      fetchJSON('revenue-trend', filters),
      fetchJSON('sales-by-region', filters),
      fetchJSON('sales-by-category', filters),
      fetchJSON('region-category-matrix', filters),
    ]);

    Charts.renderRevenueTrend(bodies[0], trend, 'salesTrend');
    renderSalesRegionChart(bodies[1], regionData);
    Charts.renderCategoryColumns(bodies[2], categoryData, 'salesCategory');
    Charts.renderRegionCategoryMatrix(bodies[3], matrix);
  }
}

function renderSalesRegionChart(container, regionData) {
  const breadcrumb = $('#drillBreadcrumb');

  if (!drillState.region) {
    breadcrumb.style.display = 'none';
    Charts.renderSalesByRegion(container, regionData, 'salesRegion', (region) => {
      drillState.region = region;
      drillState.state = null;
      renderSalesDrill();
    });
  } else {
    renderSalesDrill();
  }
}

async function renderSalesDrill() {
  const bodies = bodyIn('page-sales');
  const container = bodies[1];
  const breadcrumb = $('#drillBreadcrumb');

  if (!drillState.region) return;

  if (!drillState.state) {
    breadcrumb.style.display = 'flex';
    breadcrumb.innerHTML = `<a id="drillBack">All Regions</a><span class="sep">›</span><span>${escapeHTML(drillState.region.region)}</span>`;
    $('#drillBack').onclick = () => {
      drillState = { region: null, state: null };
      renderSales();
    };
    Charts.renderStatesInRegion(container, drillState.region, 'salesStates', (state) => {
      drillState.state = state;
      renderSalesDrill();
    });
  } else {
    breadcrumb.style.display = 'flex';
    breadcrumb.innerHTML = `<a id="drillBack">All Regions</a><span class="sep">›</span><a id="drillBackRegion">${escapeHTML(drillState.region.region)}</a><span class="sep">›</span><span>${escapeHTML(drillState.state.state)}</span>`;
    $('#drillBack').onclick = () => {
      drillState = { region: null, state: null };
      renderSales();
    };
    $('#drillBackRegion').onclick = () => {
      drillState.state = null;
      renderSalesDrill();
    };
    Charts.renderCitiesInState(container, drillState.state, 'salesCities');
  }
}

async function renderCustomer() {
  const bodies = bodyIn('page-customer');
  const [analysis, topCustomers, segmentation] = await Promise.all([
    fetchJSON('customers', filters),
    fetchJSON('top-customers', { ...filters, limit: 10 }),
    fetchJSON('customer-segmentation', filters),
  ]);

  loadCustomerKPIs(analysis);

  Charts.renderNewVsReturning(bodies[0], analysis, 'custNewVsRet');
  Charts.renderChurnDoughnut(bodies[1], analysis, 'custChurn');
  Charts.renderTopCustomers(bodies[2], topCustomers, 'custTopCustomers');
  Charts.renderSegmentationTable(bodies[3], segmentation);
}

async function renderProfit() {
  const bodies = bodyIn('page-profit');
  const [summary, trend, profitability, marginByRegion] = await Promise.all([
    fetchJSON('summary', filters),
    fetchJSON('revenue-trend', filters),
    fetchJSON('profitability', filters),
    fetchJSON('profit-margin-by-region', filters),
  ]);

  loadProfitKPIs(summary);

  Charts.renderSalesVsProfit(bodies[0], trend, 'profitSalesVsProfit');
  Charts.renderMostProfitable(bodies[1], profitability.mostProfitable, 'profitMostProfitable');
  Charts.renderLossMaking(bodies[2], profitability.lossMaking, 'profitLossMaking');
  Charts.renderProfitMarginByRegion(bodies[3], marginByRegion, 'profitMarginByRegion');
}

// --- Data Explorer ----------------------------------------------------------
async function renderExplorer() {
  const params = {
    ...filters,
    search: explorerState.search,
    sortBy: explorerState.sortBy,
    sortDir: explorerState.sortDir,
    page: explorerState.page,
    pageSize: 50,
  };

  const data = await fetchJSON('data-table', params);
  data._sortBy = explorerState.sortBy;
  data._sortDir = explorerState.sortDir;

  const scroll = $('#dataTableScroll');
  Charts.renderDataTable(scroll, data);

  const info = $('#dataTableInfo');
  if (data.total === 0) {
    info.textContent = '0 rows';
  } else {
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    info.textContent = `${start}–${end} of ${data.total} rows`;
  }

  Charts.renderPagination($('#pagination'), data, (newPage) => {
    explorerState.page = newPage;
    renderExplorer();
  });

  // Wire sort column headers
  scroll.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (explorerState.sortBy === col) {
        explorerState.sortDir = explorerState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        explorerState.sortBy = col;
        explorerState.sortDir = 'asc';
      }
      renderExplorer();
    });
  });
}

// --- CSV Import -------------------------------------------------------------
function openUploadModal() {
  $('#uploadModal').classList.add('active');
  hideUploadStatus();
}

function closeUploadModal() {
  $('#uploadModal').classList.remove('active');
}

function showUploadStatus(msg, type) {
  const el = $('#uploadStatus');
  el.className = `upload-status show ${type}`;
  el.textContent = msg;
}

function hideUploadStatus() {
  const el = $('#uploadStatus');
  el.className = 'upload-status';
  el.textContent = '';
}

async function handleFileUpload(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    showUploadStatus('❌ Please select a CSV file.', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showUploadStatus('❌ File too large. Maximum size is 10MB.', 'error');
    return;
  }

  showUploadStatus('⏳ Parsing and uploading...', 'loading');

  try {
    const text = await file.text();
    const res = await fetch('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    });
    const result = await res.json();

    if (!res.ok) {
      showUploadStatus(`❌ ${result.error}`, 'error');
      return;
    }

    let msg = `✅ Successfully imported ${result.rowCount} orders!`;
    if (result.warnings && result.warnings.length > 0) {
      msg += ` (${result.warnings.length} warnings)`;
    }
    showUploadStatus(msg, 'success');

    // Refresh data source indicator and re-init filters
    await updateDataSource();
    await initFilterOptions();

    // Re-render current page after a short delay
    setTimeout(() => {
      closeUploadModal();
      renderPage(currentPage);
    }, 1500);
  } catch (e) {
    showUploadStatus(`❌ Upload failed: ${e.message}`, 'error');
  }
}

async function resetToSampleData() {
  try {
    const res = await fetch('/api/reset-data', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      showUploadStatus(`✅ Reverted to sample data (${result.rowCount} rows).`, 'success');
      await updateDataSource();
      await initFilterOptions();
      setTimeout(() => {
        closeUploadModal();
        renderPage(currentPage);
      }, 1500);
    }
  } catch (e) {
    showUploadStatus(`❌ Reset failed: ${e.message}`, 'error');
  }
}

// --- Export -----------------------------------------------------------------
function exportCSV() {
  const params = new URLSearchParams(filters);
  window.location.href = `/api/export-csv?${params.toString()}`;
}

// --- Init -------------------------------------------------------------------
async function init() {
  initTheme();

  // Navigation
  $$('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchPage(tab.dataset.page));
  });

  // Filters
  $('#applyFiltersBtn').addEventListener('click', applyFilters);
  $('#resetFiltersBtn').addEventListener('click', resetFilters);
  $('#exportBtn').addEventListener('click', exportCSV);

  // Theme toggle
  $('#themeToggle').addEventListener('click', toggleTheme);

  // Print
  $('#printBtn').addEventListener('click', () => window.print());

  // Forecast toggle
  $('#forecastToggle').addEventListener('click', () => {
    showForecast = !showForecast;
    const btn = $('#forecastToggle');
    btn.classList.toggle('active', showForecast);
    btn.textContent = showForecast ? '📉 Hide Forecast' : '📈 Show Forecast';
    renderSales();
  });

  // Upload modal
  $('#importBtn').addEventListener('click', openUploadModal);
  $('#closeModalBtn').addEventListener('click', closeUploadModal);
  $('#resetDataBtn').addEventListener('click', resetToSampleData);
  $('#uploadModal').addEventListener('click', (e) => {
    if (e.target === $('#uploadModal')) closeUploadModal();
  });

  // Drop zone
  const dropZone = $('#dropZone');
  const fileInput = $('#fileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
  });

  // Data Explorer search (debounced)
  let searchTimer;
  $('#searchBox').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      explorerState.search = e.target.value;
      explorerState.page = 1;
      if (currentPage === 'explorer') renderExplorer();
    }, 300);
  });

  await updateDataSource();
  await initFilterOptions();
  await renderExecutive();
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
