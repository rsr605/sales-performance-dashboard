import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateDataset } from '../src/data/generator.js';
import {
  applyFilters,
  getSummary,
  getRevenueTrend,
  getTopProducts,
  getSalesByRegion,
  getSalesByCategory,
  getCustomerAnalysis,
  getTopCustomers,
  getProfitability,
  getProfitMarginByRegion,
  getRegionCategoryMatrix,
  getForecast,
  getDataTable,
} from '../src/analytics/metrics.js';

const data = generateDataset(42, 800);

describe('applyFilters', () => {
  test('returns full dataset with no filters', () => {
    assert.equal(applyFilters(data).length, data.length);
  });

  test('region filter reduces result set', () => {
    const filtered = applyFilters(data, { region: 'North' });
    assert.ok(filtered.length < data.length);
    assert.ok(filtered.every((o) => o.Region === 'North'));
  });

  test('category filter reduces result set', () => {
    const filtered = applyFilters(data, { category: 'Electronics' });
    assert.ok(filtered.length < data.length);
    assert.ok(filtered.every((o) => o.ProductCategory === 'Electronics'));
  });

  test('customer type filter reduces result set', () => {
    const filtered = applyFilters(data, { customerType: 'New' });
    assert.ok(filtered.every((o) => o.CustomerType === 'New'));
  });

  test('date range filter reduces result set', () => {
    const filtered = applyFilters(data, { startDate: '2024-06-01', endDate: '2024-06-30' });
    assert.ok(filtered.every((o) => o.Date >= '2024-06-01' && o.Date <= '2024-06-30'));
  });
});

describe('getSummary', () => {
  const summary = getSummary(data);

  test('totalRevenue equals sum of all Sales', () => {
    const expected = Math.round(data.reduce((s, o) => s + o.Sales, 0) * 100) / 100;
    assert.equal(summary.totalRevenue, expected);
  });

  test('totalProfit equals sum of all Profit', () => {
    const expected = Math.round(data.reduce((s, o) => s + o.Profit, 0) * 100) / 100;
    assert.equal(summary.totalProfit, expected);
  });

  test('totalOrders equals distinct OrderIDs', () => {
    assert.equal(summary.totalOrders, new Set(data.map((o) => o.OrderID)).size);
  });

  test('profitMargin is profit/revenue as percentage', () => {
    const expected = Math.round((summary.totalProfit / summary.totalRevenue) * 10000) / 100;
    assert.equal(summary.profitMargin, expected);
  });

  test('churnRate is in 0–100 range', () => {
    assert.ok(summary.churnRate >= 0 && summary.churnRate <= 100);
  });

  test('newCustomerPct is in 0–100 range', () => {
    assert.ok(summary.newCustomerPct >= 0 && summary.newCustomerPct <= 100);
  });

  test('distinctCustomers > 0', () => {
    assert.ok(summary.distinctCustomers > 0);
  });

  test('honors filters', () => {
    const s2 = getSummary(data, { region: 'North' });
    assert.ok(s2.totalRevenue < summary.totalRevenue);
  });
});

describe('getRevenueTrend', () => {
  const trend = getRevenueTrend(data);

  test('returns 12 monthly entries', () => {
    assert.equal(trend.length, 12);
  });

  test('months are sorted chronologically', () => {
    for (let i = 1; i < trend.length; i++) {
      assert.ok(trend[i].month > trend[i - 1].month);
    }
  });

  test('each month has revenue > 0', () => {
    for (const m of trend) assert.ok(m.revenue > 0);
  });
});

describe('getTopProducts', () => {
  const top = getTopProducts(data, {}, 5);

  test('returns at most 5 products', () => {
    assert.ok(top.length <= 5);
  });

  test('sorted descending by revenue', () => {
    for (let i = 1; i < top.length; i++) {
      assert.ok(top[i - 1].revenue >= top[i].revenue);
    }
  });

  test('honors limit param', () => {
    const top3 = getTopProducts(data, {}, 3);
    assert.ok(top3.length <= 3);
  });
});

describe('getSalesByRegion', () => {
  const regions = getSalesByRegion(data);

  test('returns 5 regions', () => {
    assert.equal(regions.length, 5);
  });

  test('each region has drill-down state data', () => {
    for (const r of regions) {
      assert.ok(r.states.length > 0, `Region ${r.region} has no states`);
    }
  });

  test('each state has city-level data', () => {
    for (const r of regions) {
      for (const s of r.states) {
        assert.ok(s.cities.length > 0, `State ${s.state} has no cities`);
      }
    }
  });

  test('sorted descending by revenue', () => {
    for (let i = 1; i < regions.length; i++) {
      assert.ok(regions[i - 1].revenue >= regions[i].revenue);
    }
  });
});

describe('getSalesByCategory', () => {
  const cats = getSalesByCategory(data);

  test('returns 4 categories', () => {
    assert.equal(cats.length, 4);
  });

  test('sorted descending by revenue', () => {
    for (let i = 1; i < cats.length; i++) {
      assert.ok(cats[i - 1].revenue >= cats[i].revenue);
    }
  });
});

describe('getCustomerAnalysis', () => {
  const ca = getCustomerAnalysis(data);

  test('totalCustomers > 0', () => {
    assert.ok(ca.totalCustomers > 0);
  });

  test('newCustomers + returningCustomers === totalCustomers', () => {
    assert.equal(ca.newCustomers + ca.returningCustomers, ca.totalCustomers);
  });

  test('churnRate in 0–100', () => {
    assert.ok(ca.churnRate >= 0 && ca.churnRate <= 100);
  });
});

describe('getTopCustomers', () => {
  const tc = getTopCustomers(data, {}, 10);

  test('returns at most 10 customers', () => {
    assert.ok(tc.length <= 10);
  });

  test('sorted descending by revenue', () => {
    for (let i = 1; i < tc.length; i++) {
      assert.ok(tc[i - 1].revenue >= tc[i].revenue);
    }
  });
});

describe('getProfitability', () => {
  const prof = getProfitability(data);

  test('mostProfitable has 5 entries', () => {
    assert.equal(prof.mostProfitable.length, 5);
  });

  test('mostProfitable sorted descending by profit', () => {
    for (let i = 1; i < prof.mostProfitable.length; i++) {
      assert.ok(prof.mostProfitable[i - 1].profit >= prof.mostProfitable[i].profit);
    }
  });

  test('lossMaking all have negative profit', () => {
    assert.ok(prof.lossMaking.length > 0);
    for (const p of prof.lossMaking) {
      assert.ok(p.profit < 0, `${p.product} should be negative`);
    }
  });

  test('all products have a margin value', () => {
    for (const p of prof.all) {
      assert.ok(typeof p.margin === 'number');
    }
  });
});

describe('getProfitMarginByRegion', () => {
  const pm = getProfitMarginByRegion(data);

  test('returns 5 regions with margin', () => {
    assert.equal(pm.length, 5);
    for (const r of pm) assert.ok(typeof r.margin === 'number');
  });
});

describe('getRegionCategoryMatrix', () => {
  const matrix = getRegionCategoryMatrix(data);

  test('returns cells and maxRevenue', () => {
    assert.ok(Array.isArray(matrix.cells));
    assert.ok(typeof matrix.maxRevenue === 'number');
  });

  test('cells have intensity in 0–1', () => {
    for (const c of matrix.cells) {
      assert.ok(c.intensity >= 0 && c.intensity <= 1);
    }
  });
});

describe('getForecast', () => {
  const forecast = getForecast(data, {}, 3);

  test('returns points with actual + forecast months', () => {
    assert.ok(forecast.points.length >= 12 + 3);
  });

  test('has sufficient flag true with enough data', () => {
    assert.equal(forecast.sufficient, true);
  });

  test('forecast points are marked isForecast=true', () => {
    const forecastPts = forecast.points.filter((p) => p.isForecast);
    assert.equal(forecastPts.length, 3);
  });

  test('actual points are marked isForecast=false', () => {
    const actualPts = forecast.points.filter((p) => !p.isForecast);
    assert.ok(actualPts.length >= 12);
  });

  test('forecast revenue values are non-negative', () => {
    const forecastPts = forecast.points.filter((p) => p.isForecast);
    for (const p of forecastPts) {
      assert.ok(p.revenue >= 0, `Forecast revenue ${p.revenue} is negative`);
    }
  });

  test('slope and intercept are numbers', () => {
    assert.ok(typeof forecast.slope === 'number');
    assert.ok(typeof forecast.intercept === 'number');
  });

  test('returns insufficient=true with < 3 months', () => {
    const small = getForecast(data, { startDate: '2024-01-01', endDate: '2024-01-15' }, 3);
    // Might be < 3 months of data → insufficient
    if (small.points.length < 3) {
      assert.equal(small.sufficient, false);
    }
  });
});

describe('getDataTable', () => {
  test('returns paginated rows with metadata', () => {
    const result = getDataTable(data, { page: 1, pageSize: 50 });
    assert.ok(result.rows.length <= 50);
    assert.equal(result.total, data.length);
    assert.ok(result.totalPages > 1);
  });

  test('page 2 returns different rows than page 1', () => {
    const p1 = getDataTable(data, { page: 1, pageSize: 50 });
    const p2 = getDataTable(data, { page: 2, pageSize: 50 });
    assert.notDeepEqual(p1.rows[0], p2.rows[0]);
  });

  test('search filters results', () => {
    const result = getDataTable(data, { search: 'electronics', page: 1, pageSize: 500 });
    assert.ok(result.rows.every((r) =>
      r.ProductCategory.toLowerCase().includes('electronics') ||
      JSON.stringify(r).toLowerCase().includes('electronics')
    ));
  });

  test('sort by Sales desc puts highest first', () => {
    const result = getDataTable(data, { sortBy: 'Sales', sortDir: 'desc', page: 1, pageSize: 10 });
    for (let i = 1; i < result.rows.length; i++) {
      assert.ok(result.rows[i - 1].Sales >= result.rows[i].Sales);
    }
  });

  test('sort by Sales asc puts lowest first', () => {
    const result = getDataTable(data, { sortBy: 'Sales', sortDir: 'asc', page: 1, pageSize: 10 });
    for (let i = 1; i < result.rows.length; i++) {
      assert.ok(result.rows[i - 1].Sales <= result.rows[i].Sales);
    }
  });

  test('respects filters', () => {
    const result = getDataTable(data, { filters: { region: 'North' }, page: 1, pageSize: 500 });
    assert.ok(result.rows.every((r) => r.Region === 'North'));
  });

  test('empty search returns all rows', () => {
    const result = getDataTable(data, { search: '', page: 1, pageSize: 500 });
    assert.equal(result.total, data.length);
  });
});
