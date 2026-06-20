import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateDataset, toCSV } from '../src/data/generator.js';

describe('Data Generator', () => {
  const data = generateDataset(42, 800);

  test('produces the requested number of orders', () => {
    assert.equal(data.length, 800);
  });

  test('every order has all required fields', () => {
    const required = [
      'OrderID', 'Date', 'Month', 'Region', 'Country', 'State', 'City',
      'ProductCategory', 'ProductName', 'Sales', 'Profit', 'Quantity',
      'CustomerID', 'CustomerType', 'Churned',
    ];
    for (const o of data) {
      for (const f of required) {
        assert.ok(f in o, `Missing field ${f} in order ${o.OrderID}`);
      }
    }
  });

  test('is deterministic — same seed yields same dataset', () => {
    const data2 = generateDataset(42, 800);
    assert.deepEqual(data, data2);
  });

  test('different seed yields different dataset', () => {
    const data2 = generateDataset(99, 800);
    assert.notDeepEqual(data, data2);
  });

  test('dates span Jan–Dec 2024', () => {
    const months = new Set(data.map((o) => o.MonthNum));
    for (let m = 1; m <= 12; m++) {
      assert.ok(months.has(m), `Month ${m} missing`);
    }
  });

  test('has repeat customers (same CustomerID appears more than once)', () => {
    const counts = {};
    for (const o of data) counts[o.CustomerID] = (counts[o.CustomerID] || 0) + 1;
    const repeats = Object.values(counts).filter((c) => c > 1);
    assert.ok(repeats.length > 0, 'No repeat customers found');
  });

  test('churn rate is in a realistic range (10–30%)', () => {
    const customers = new Map();
    for (const o of data) {
      customers.set(o.CustomerID, o.Churned);
    }
    const churned = [...customers.values()].filter((c) => c === 'Yes').length;
    const rate = churned / customers.size;
    assert.ok(rate >= 0.10 && rate <= 0.30, `Churn rate ${rate} out of range`);
  });

  test('has both New and Returning customer types', () => {
    const types = new Set(data.map((o) => o.CustomerType));
    assert.ok(types.has('New'));
    assert.ok(types.has('Returning'));
  });

  test('has at least some negative-profit (loss-making) orders', () => {
    const losses = data.filter((o) => o.Profit < 0);
    assert.ok(losses.length > 0, 'No loss-making orders found');
  });

  test('all four regions are present', () => {
    const regions = new Set(data.map((o) => o.Region));
    assert.ok(regions.has('North'));
    assert.ok(regions.has('South'));
    assert.ok(regions.has('East'));
    assert.ok(regions.has('West'));
  });

  test('all three product categories are present', () => {
    const cats = new Set(data.map((o) => o.ProductCategory));
    assert.ok(cats.has('Electronics'));
    assert.ok(cats.has('Furniture'));
    assert.ok(cats.has('Office Supplies'));
  });
});

describe('CSV Export', () => {
  test('toCSV produces valid CSV with header row', () => {
    const data = generateDataset(42, 5);
    const csv = toCSV(data);
    const lines = csv.split('\n');
    assert.equal(lines[0], 'OrderID,Date,Month,Region,Country,State,City,ProductCategory,ProductName,Sales,Profit,Quantity,CustomerID,CustomerType,Churned');
    assert.equal(lines.length, 6); // header + 5 rows
  });
});
