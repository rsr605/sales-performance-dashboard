/**
 * Analytics engine — all aggregation / measure functions.
 *
 * Every function accepts an optional `filters` object:
 *   { startDate, endDate, region, category, customerType }
 * and operates only on the filtered subset of the dataset.
 */

/**
 * Apply filters to the dataset and return the matching subset.
 * @param {Array} data
 * @param {Object} [filters={}]
 * @returns {Array}
 */
export function applyFilters(data, filters = {}) {
  const { startDate, endDate, region, category, customerType } = filters;
  return data.filter((o) => {
    if (startDate && o.Date < startDate) return false;
    if (endDate && o.Date > endDate) return false;
    if (region && o.Region !== region) return false;
    if (category && o.ProductCategory !== category) return false;
    if (customerType && o.CustomerType !== customerType) return false;
    return true;
  });
}

// --- Safe division ----------------------------------------------------------
const safeDiv = (num, den) => (den ? num / den : 0);
const round2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => Math.round(n * 10000) / 100; // returns e.g. 14.25 (%)

// --- Summary KPIs -----------------------------------------------------------

/**
 * Executive summary KPIs.
 * @returns {Object}
 */
export function getSummary(data, filters = {}) {
  const d = applyFilters(data, filters);

  const totalRevenue = round2(d.reduce((s, o) => s + o.Sales, 0));
  const totalProfit = round2(d.reduce((s, o) => s + o.Profit, 0));
  const totalOrders = new Set(d.map((o) => o.OrderID)).size;
  const totalQuantity = d.reduce((s, o) => s + o.Quantity, 0);

  // Distinct customers & churn
  const customerIds = new Set(d.map((o) => o.CustomerID));
  const distinctCustomers = customerIds.size;
  const churnedCustomers = new Set(
    d.filter((o) => o.Churned === 'Yes').map((o) => o.CustomerID)
  ).size;
  const churnRate = pct(safeDiv(churnedCustomers, distinctCustomers));

  // New customer % — a customer is "New" if they only have 1 order in the filtered set
  const orderCounts = new Map();
  for (const o of d) orderCounts.set(o.CustomerID, (orderCounts.get(o.CustomerID) || 0) + 1);
  let newCustomers = 0;
  for (const count of orderCounts.values()) {
    if (count === 1) newCustomers++;
  }
  const newCustomerPct = pct(safeDiv(newCustomers, distinctCustomers));

  // Profit margin
  const profitMargin = pct(safeDiv(totalProfit, totalRevenue));

  // MoM Revenue Growth — compare last month vs previous month present in data
  const monthly = getMonthlyTotals(d);
  let momRevenueGrowth = 0;
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    momRevenueGrowth = pct(safeDiv(last.revenue - prev.revenue, prev.revenue));
  }

  return {
    totalRevenue,
    totalProfit,
    totalOrders,
    totalQuantity,
    momRevenueGrowth,
    distinctCustomers,
    churnRate,
    newCustomerPct,
    profitMargin,
  };
}

// --- Monthly trend ----------------------------------------------------------

/**
 * Monthly revenue + profit totals.
 * @returns {Array<{month:string, revenue:number, profit:number, orders:number}>}
 */
export function getMonthlyTotals(d) {
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.Month)) {
      map.set(o.Month, { month: o.Month, revenue: 0, profit: 0, orders: new Set() });
    }
    const m = map.get(o.Month);
    m.revenue += o.Sales;
    m.profit += o.Profit;
    m.orders.add(o.OrderID);
  }
  const arr = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  return arr.map((m) => ({
    month: m.month,
    revenue: round2(m.revenue),
    profit: round2(m.profit),
    orders: m.orders.size,
  }));
}

/**
 * Revenue trend including previous-year/month comparison context.
 */
export function getRevenueTrend(data, filters = {}) {
  const d = applyFilters(data, filters);
  return getMonthlyTotals(d);
}

// --- Top products -----------------------------------------------------------

export function getTopProducts(data, filters = {}, limit = 5) {
  const d = applyFilters(data, filters);
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.ProductName)) {
      map.set(o.ProductName, { product: o.ProductName, revenue: 0, profit: 0, category: o.ProductCategory });
    }
    const p = map.get(o.ProductName);
    p.revenue += o.Sales;
    p.profit += o.Profit;
  }
  return [...map.values()]
    .map((p) => ({ ...p, revenue: round2(p.revenue), profit: round2(p.profit) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// --- Sales by region (with drill data) -------------------------------------

export function getSalesByRegion(data, filters = {}) {
  const d = applyFilters(data, filters);
  const regions = {};

  for (const o of d) {
    if (!regions[o.Region]) {
      regions[o.Region] = { region: o.Region, revenue: 0, profit: 0, states: {} };
    }
    const r = regions[o.Region];
    r.revenue += o.Sales;
    r.profit += o.Profit;

    if (!r.states[o.State]) {
      r.states[o.State] = { state: o.State, revenue: 0, profit: 0, cities: {} };
    }
    const s = r.states[o.State];
    s.revenue += o.Sales;
    s.profit += o.Profit;

    if (!s.cities[o.City]) {
      s.cities[o.City] = { city: o.City, revenue: 0, profit: 0 };
    }
    s.cities[o.City].revenue += o.Sales;
    s.cities[o.City].profit += o.Profit;
  }

  return Object.values(regions).map((r) => {
    const states = Object.values(r.states).map((s) => {
      const cities = Object.values(s.cities).map((c) => ({
        ...c,
        revenue: round2(c.revenue),
        profit: round2(c.profit),
      }));
      return {
        state: s.state,
        revenue: round2(s.revenue),
        profit: round2(s.profit),
        cities: cities.sort((a, b) => b.revenue - a.revenue),
      };
    });
    return {
      region: r.region,
      revenue: round2(r.revenue),
      profit: round2(r.profit),
      states: states.sort((a, b) => b.revenue - a.revenue),
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

// --- Sales by category -----------------------------------------------------

export function getSalesByCategory(data, filters = {}) {
  const d = applyFilters(data, filters);
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.ProductCategory)) {
      map.set(o.ProductCategory, { category: o.ProductCategory, revenue: 0, profit: 0 });
    }
    const c = map.get(o.ProductCategory);
    c.revenue += o.Sales;
    c.profit += o.Profit;
  }
  return [...map.values()]
    .map((c) => ({ ...c, revenue: round2(c.revenue), profit: round2(c.profit) }))
    .sort((a, b) => b.revenue - a.revenue);
}

// --- Customer analysis -----------------------------------------------------

export function getCustomerAnalysis(data, filters = {}) {
  const d = applyFilters(data, filters);

  // Count orders per customer — a customer is "Returning" if they have 2+ orders,
  // "New" if they have exactly 1 order in the filtered set.
  const orderCounts = new Map();
  for (const o of d) {
    orderCounts.set(o.CustomerID, (orderCounts.get(o.CustomerID) || 0) + 1);
  }
  let newCust = 0;
  let retCust = 0;
  for (const count of orderCounts.values()) {
    if (count >= 2) retCust++;
    else newCust++;
  }

  const churnedCust = new Set(d.filter((o) => o.Churned === 'Yes').map((o) => o.CustomerID));
  const totalCust = orderCounts.size;

  return {
    newCustomers: newCust,
    returningCustomers: retCust,
    churnedCustomers: churnedCust.size,
    totalCustomers: totalCust,
    churnRate: pct(safeDiv(churnedCust.size, totalCust)),
    newCustomerPct: pct(safeDiv(newCust, totalCust)),
  };
}

export function getTopCustomers(data, filters = {}, limit = 10) {
  const d = applyFilters(data, filters);
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.CustomerID)) {
      map.set(o.CustomerID, {
        customer: o.CustomerID,
        revenue: 0,
        profit: 0,
        churned: o.Churned,
        type: o.CustomerType,
      });
    }
    const c = map.get(o.CustomerID);
    c.revenue += o.Sales;
    c.profit += o.Profit;
  }
  return [...map.values()]
    .map((c) => ({ ...c, revenue: round2(c.revenue), profit: round2(c.profit) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Customer segmentation matrix: rows = region, cols = customer type.
 */
export function getCustomerSegmentation(data, filters = {}) {
  const d = applyFilters(data, filters);
  // Count orders per customer within each region to determine New vs Returning
  const regionCustomers = {}; // region -> { custId -> { orders, newRevenue, retRevenue } }
  for (const o of d) {
    if (!regionCustomers[o.Region]) regionCustomers[o.Region] = {};
    const pool = regionCustomers[o.Region];
    if (!pool[o.CustomerID]) pool[o.CustomerID] = { orders: 0, revenue: 0 };
    pool[o.CustomerID].orders++;
    pool[o.CustomerID].revenue += o.Sales;
  }
  return Object.keys(regionCustomers)
    .sort()
    .map((region) => {
      const pool = regionCustomers[region];
      let newCount = 0, retCount = 0, newRevenue = 0, retRevenue = 0;
      for (const c of Object.values(pool)) {
        if (c.orders >= 2) {
          retCount++;
          retRevenue += c.revenue;
        } else {
          newCount++;
          newRevenue += c.revenue;
        }
      }
      return {
        region,
        newCount,
        returningCount: retCount,
        newRevenue: round2(newRevenue),
        returningRevenue: round2(retRevenue),
      };
    });
}

// --- Profitability ----------------------------------------------------------

export function getProfitability(data, filters = {}) {
  const d = applyFilters(data, filters);
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.ProductName)) {
      map.set(o.ProductName, {
        product: o.ProductName,
        category: o.ProductCategory,
        revenue: 0,
        profit: 0,
        quantity: 0,
      });
    }
    const p = map.get(o.ProductName);
    p.revenue += o.Sales;
    p.profit += o.Profit;
    p.quantity += o.Quantity;
  }
  const all = [...map.values()].map((p) => ({
    ...p,
    revenue: round2(p.revenue),
    profit: round2(p.profit),
    margin: pct(safeDiv(p.profit, p.revenue)),
  }));

  const mostProfitable = [...all].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const lossMaking = all
    .filter((p) => p.profit < 0)
    .sort((a, b) => a.profit - b.profit);

  return { mostProfitable, lossMaking, all };
}

export function getProfitMarginByRegion(data, filters = {}) {
  const d = applyFilters(data, filters);
  const map = new Map();
  for (const o of d) {
    if (!map.has(o.Region)) map.set(o.Region, { region: o.Region, revenue: 0, profit: 0 });
    const r = map.get(o.Region);
    r.revenue += o.Sales;
    r.profit += o.Profit;
  }
  return [...map.values()]
    .map((r) => ({
      region: r.region,
      revenue: round2(r.revenue),
      profit: round2(r.profit),
      margin: pct(safeDiv(r.profit, r.revenue)),
    }))
    .sort((a, b) => b.margin - a.margin);
}

/**
 * Region × Category matrix with revenue + conditional color value.
 */
export function getRegionCategoryMatrix(data, filters = {}) {
  const d = applyFilters(data, filters);
  const matrix = {};
  let maxRev = 0;
  for (const o of d) {
    const key = `${o.Region}|${o.ProductCategory}`;
    if (!matrix[key]) matrix[key] = { region: o.Region, category: o.ProductCategory, revenue: 0, profit: 0 };
    matrix[key].revenue += o.Sales;
    matrix[key].profit += o.Profit;
    if (matrix[key].revenue > maxRev) maxRev = matrix[key].revenue;
  }
  const cells = Object.values(matrix).map((c) => ({
    ...c,
    revenue: round2(c.revenue),
    profit: round2(c.profit),
    intensity: maxRev ? round2(c.revenue / maxRev) : 0, // 0..1 for color scale
  }));
  // Sort by region then category for stable display
  cells.sort((a, b) =>
    a.region.localeCompare(b.region) || a.category.localeCompare(b.category)
  );
  return { cells, maxRevenue: round2(maxRev) };
}

// --- Filter option values ---------------------------------------------------

export function getFilterOptions(data) {
  const months = [...new Set(data.map((o) => o.Month))].sort();
  const regions = [...new Set(data.map((o) => o.Region))].sort();
  const categories = [...new Set(data.map((o) => o.ProductCategory))].sort();
  const customerTypes = [...new Set(data.map((o) => o.CustomerType))].sort();
  return {
    dateRange: { min: data[0]?.Date, max: data[data.length - 1]?.Date },
    months,
    regions,
    categories,
    customerTypes,
  };
}

// --- Forecast (linear regression) ------------------------------------------

/**
 * Forecast future monthly revenue using simple linear regression.
 * Returns the actual monthly data plus `forecastMonths` projected months.
 * @param {Array} data
 * @param {Object} filters
 * @param {number} [forecastMonths=3] - months to project forward
 * @returns {Object} { points: [{month, revenue, isForecast}], slope, intercept, sufficient }
 */
export function getForecast(data, filters = {}, forecastMonths = 3) {
  const d = applyFilters(data, filters);
  const monthly = getMonthlyTotals(d);

  if (monthly.length < 3) {
    return { points: monthly.map((m) => ({ ...m, isForecast: false })), slope: 0, intercept: 0, sufficient: false };
  }

  // Linear regression: y = slope * x + intercept, where x = month index (0-based)
  const n = monthly.length;
  const xs = monthly.map((_, i) => i);
  const ys = monthly.map((m) => m.revenue);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Build actual points
  const points = monthly.map((m, i) => ({
    month: m.month,
    revenue: m.revenue,
    isForecast: false,
  }));

  // Project future months
  const lastMonth = monthly[monthly.length - 1].month;
  const [lastY, lastM] = lastMonth.split('-').map(Number);
  for (let i = 1; i <= forecastMonths; i++) {
    let y = lastY;
    let m = lastM + i;
    while (m > 12) { m -= 12; y++; }
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    const predictedRevenue = round2(Math.max(0, slope * (n - 1 + i) + intercept));
    points.push({ month: monthStr, revenue: predictedRevenue, isForecast: true });
  }

  return { points, slope: round2(slope), intercept: round2(intercept), sufficient: true };
}

// --- Data table (searchable, sortable) -------------------------------------

/**
 * Return a paginated, searchable, sortable slice of the dataset for the Data Explorer.
 * @param {Array} data
 * @param {Object} options - { search, sortBy, sortDir, page, pageSize, filters }
 * @returns {Object} { rows, total, page, pageSize, totalPages }
 */
export function getDataTable(data, options = {}) {
  const { search = '', sortBy = 'Date', sortDir = 'desc', page = 1, pageSize = 50, filters = {} } = options;

  let d = applyFilters(data, filters);

  // Search across visible columns
  if (search) {
    const q = search.toLowerCase();
    d = d.filter((o) =>
      o.OrderID.toLowerCase().includes(q) ||
      o.Date.includes(q) ||
      o.Region.toLowerCase().includes(q) ||
      o.State.toLowerCase().includes(q) ||
      o.City.toLowerCase().includes(q) ||
      o.ProductCategory.toLowerCase().includes(q) ||
      o.ProductName.toLowerCase().includes(q) ||
      o.CustomerID.toLowerCase().includes(q) ||
      o.CustomerType.toLowerCase().includes(q) ||
      String(o.Sales).includes(q) ||
      String(o.Profit).includes(q) ||
      String(o.Quantity).includes(q)
    );
  }

  // Sort
  const numericCols = ['Sales', 'Profit', 'Quantity'];
  const dir = sortDir === 'asc' ? 1 : -1;
  d.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    if (numericCols.includes(sortBy)) {
      return (av - bv) * dir;
    }
    return String(av).localeCompare(String(bv)) * dir;
  });

  const total = d.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const rows = d.slice(startIdx, startIdx + pageSize);

  return { rows, total, page, pageSize, totalPages };
}
