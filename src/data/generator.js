/**
 * Seeded dataset generator.
 *
 * Produces a realistic sales dataset of ~800 orders spanning 12 months (2024),
 * with repeat customers, ~18% churn, and a mix of profitable / loss-making lines.
 *
 * Deterministic: the same seed always yields the same dataset.
 */

// --- Mulberry32 — small, fast, deterministic PRNG ---------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Domain constants -------------------------------------------------------

const REGIONS = {
  North: {
    country: 'USA',
    states: {
      'New York': ['Albany', 'Buffalo', 'Rochester', 'New York City'],
      'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Harrisburg'],
    },
  },
  South: {
    country: 'USA',
    states: {
      Texas: ['Houston', 'Dallas', 'Austin', 'San Antonio'],
      Florida: ['Miami', 'Orlando', 'Tampa'],
      Georgia: ['Atlanta', 'Savannah'],
    },
  },
  East: {
    country: 'USA',
    states: {
      'New Jersey': ['Newark', 'Trenton'],
      Massachusetts: ['Boston', 'Cambridge'],
      Connecticut: ['Hartford', 'New Haven'],
    },
  },
  West: {
    country: 'USA',
    states: {
      California: ['San Jose', 'Los Angeles', 'San Diego', 'San Francisco'],
      Washington: ['Seattle', 'Spokane'],
      Oregon: ['Portland', 'Eugene'],
    },
  },
};

// Products with `lossProb` > 0 have an elevated chance of selling at a loss
// AND a thinner upside margin, so they aggregate to genuinely negative profit
// at the product level — creating real loss-makers for the profitability page.
const PRODUCTS = {
  Electronics: [
    { name: 'Wireless Mouse', basePrice: 35 },
    { name: 'USB Hub', basePrice: 25 },
    { name: 'Laptop Stand', basePrice: 45 },
    { name: 'Bluetooth Speaker', basePrice: 80 },
    { name: '4K Monitor', basePrice: 450, lossProb: 0.72, lossMargin: [0.15, 0.35], winMargin: [0.05, 0.15] },
    { name: 'Webcam', basePrice: 60 },
    { name: 'Tablet', basePrice: 300 },
    { name: 'Mechanical Keyboard', basePrice: 90 },
  ],
  Furniture: [
    { name: 'Office Chair', basePrice: 320, lossProb: 0.72, lossMargin: [0.15, 0.35], winMargin: [0.05, 0.15] },
    { name: 'Standing Desk', basePrice: 480 },
    { name: 'Bookshelf', basePrice: 180 },
    { name: 'Desk Lamp', basePrice: 35 },
    { name: 'Filing Cabinet', basePrice: 140 },
  ],
  'Office Supplies': [
    { name: 'Pens (Pack)', basePrice: 8 },
    { name: 'Stapler', basePrice: 12 },
    { name: 'Folder Set', basePrice: 15 },
    { name: 'Sticky Notes', basePrice: 5 },
    { name: 'Notebook', basePrice: 10 },
    { name: 'Whiteboard', basePrice: 65 },
  ],
};

const CATEGORIES = Object.keys(PRODUCTS);

// Generate a pool of 120 customers — some will be returning, ~18% churned
const CUSTOMER_POOL_SIZE = 120;
const TARGET_CHURN_RATE = 0.18;

/**
 * Generate the full dataset.
 * @param {number} [seed=42]  - PRNG seed for deterministic output.
 * @param {number} [count=800] - Approximate number of orders to generate.
 * @returns {Array<Object>} array of order objects.
 */
export function generateDataset(seed = 42, count = 800) {
  const rand = mulberry32(seed);

  // --- Build customer pool -------------------------------------------------
  const customers = [];
  for (let i = 0; i < CUSTOMER_POOL_SIZE; i++) {
    const id = `CUST-${1000 + i}`;
    const churned = rand() < TARGET_CHURN_RATE;
    customers.push({ id, churned, firstOrderMonth: null });
  }

  // --- Helpers -------------------------------------------------------------
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const regionNames = Object.keys(REGIONS);

  const round2 = (n) => Math.round(n * 100) / 100;

  const orders = [];

  for (let i = 0; i < count; i++) {
    // Date: spread across Jan–Dec 2024
    const month = 1 + Math.floor(rand() * 12); // 1..12
    const day = 1 + Math.floor(rand() * 28);   // 1..28 (safe for all months)
    const dateStr = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthStr = `2024-${String(month).padStart(2, '0')}`;

    // Geo
    const region = pick(regionNames);
    const regionData = REGIONS[region];
    const stateNames = Object.keys(regionData.states);
    const state = pick(stateNames);
    const city = pick(regionData.states[state]);

    // Product
    const category = pick(CATEGORIES);
    const product = pick(PRODUCTS[category]);

    // Quantity: 1–30
    const quantity = 1 + Math.floor(rand() * 30);

    // Sales: unit price varies ±30% around base, times quantity
    const priceVariance = 0.7 + rand() * 0.6; // 0.7x .. 1.3x
    const unitPrice = round2(product.basePrice * priceVariance);
    const sales = round2(unitPrice * quantity);

    // Profit margin: products with elevated lossProb sell at a loss most of the
    // time with deeper loss margins and thin upside margins, making them
    // genuine aggregate loss-makers. All other products have a small chance
    // of a per-order loss but stay profitable overall.
    const lossChance = product.lossProb ?? 0.10;
    let margin;
    if (rand() < lossChance) {
      if (product.lossMargin) {
        margin = -(product.lossMargin[0] + rand() * (product.lossMargin[1] - product.lossMargin[0]));
      } else {
        margin = -(0.02 + rand() * 0.23); // -2% .. -25%
      }
    } else {
      if (product.winMargin) {
        margin = product.winMargin[0] + rand() * (product.winMargin[1] - product.winMargin[0]); // thin upside
      } else {
        margin = 0.15 + rand() * 0.30; // 15% .. 45%
      }
    }
    const profit = round2(sales * margin);

    // Customer — bias toward repeat customers (70% chance to reuse an existing one
    // after the first few orders)
    let customer;
    if (i > 15 && rand() < 0.7) {
      customer = pick(customers);
    } else {
      customer = pick(customers);
    }

    // Customer type: New if this is their first order chronologically, else Returning
    let customerType = 'New';
    if (customer.firstOrderMonth !== null) {
      // Already ordered before — but "before" means an earlier month
      if (month > customer.firstOrderMonth) {
        customerType = 'Returning';
      }
    }
    if (customer.firstOrderMonth === null || month < customer.firstOrderMonth) {
      customer.firstOrderMonth = month;
    }

    orders.push({
      OrderID: `ORD-${10001 + i}`,
      Date: dateStr,
      Month: monthStr,
      MonthNum: month,
      Region: region,
      Country: regionData.country,
      State: state,
      City: city,
      ProductCategory: category,
      ProductName: product.name,
      Sales: sales,
      Profit: profit,
      Quantity: quantity,
      CustomerID: customer.id,
      CustomerType: customerType,
      Churned: customer.churned ? 'Yes' : 'No',
    });
  }

  // Sort chronologically so "first order" logic is consistent
  orders.sort((a, b) => a.Date.localeCompare(b.Date));

  // Re-derive CustomerType after sorting (a customer's earliest order = New)
  const seenCustomers = new Set();
  for (const o of orders) {
    if (seenCustomers.has(o.CustomerID)) {
      o.CustomerType = 'Returning';
    } else {
      o.CustomerType = 'New';
      seenCustomers.add(o.CustomerID);
    }
  }

  return orders;
}

/**
 * Convert the dataset to CSV format.
 * @param {Array<Object>} data
 * @returns {string} CSV text with header row.
 */
export function toCSV(data) {
  if (!data.length) return '';
  const headers = [
    'OrderID', 'Date', 'Month', 'Region', 'Country', 'State', 'City',
    'ProductCategory', 'ProductName', 'Sales', 'Profit', 'Quantity',
    'CustomerID', 'CustomerType', 'Churned',
  ];
  const rows = data.map((o) =>
    headers.map((h) => {
      const val = o[h];
      // Escape values containing commas
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export { REGIONS, PRODUCTS, CATEGORIES };

// --- CSV Parser (for import) ------------------------------------------------

const REQUIRED_COLUMNS = [
  'OrderID', 'Date', 'Region', 'ProductCategory', 'ProductName',
  'Sales', 'Profit', 'Quantity', 'CustomerID', 'CustomerType', 'Churned',
];

const NUMERIC_COLUMNS = ['Sales', 'Profit', 'Quantity'];

/**
 * Parse a CSV string into an array of order objects.
 * Validates required columns and coerces types.
 *
 * @param {string} csvText
 * @returns {{ data: Array<Object>, errors: Array<string>, warnings: Array<string> }}
 */
export function parseCSV(csvText) {
  const errors = [];
  const warnings = [];

  // Split into lines, handle \r\n and \n
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { data: [], errors: ['CSV must have a header row and at least one data row.'], warnings };
  }

  // Parse header — handle quoted headers
  const headers = parseCSVLine(lines[0]);

  // Check for required columns (case-insensitive)
  const headerMap = {}; // lowercase header → actual header
  for (const h of headers) {
    headerMap[h.toLowerCase().trim()] = h.trim();
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !(c.toLowerCase() in headerMap));
  if (missing.length > 0) {
    return {
      data: [],
      errors: [`Missing required columns: ${missing.join(', ')}. Expected columns: ${REQUIRED_COLUMNS.join(', ')}`],
      warnings,
    };
  }

  // Helper to get column value by required name
  const getCol = (rowObj, colName) => {
    const actualHeader = headerMap[colName.toLowerCase()];
    return actualHeader ? rowObj[actualHeader] : undefined;
  };

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j].trim()] = values[j]?.trim() ?? '';
    }

    // Build order object
    const dateStr = getCol(rowObj, 'Date') || '';
    const monthStr = dateStr.length >= 7 ? dateStr.slice(0, 7) : '';

    const order = {
      OrderID: getCol(rowObj, 'OrderID') || `ORD-${10000 + i}`,
      Date: dateStr,
      Month: monthStr,
      MonthNum: dateStr.length >= 7 ? parseInt(dateStr.slice(5, 7), 10) || 0 : 0,
      Region: getCol(rowObj, 'Region') || 'Unknown',
      Country: getCol(rowObj, 'Country') || 'Unknown',
      State: getCol(rowObj, 'State') || 'Unknown',
      City: getCol(rowObj, 'City') || 'Unknown',
      ProductCategory: getCol(rowObj, 'ProductCategory') || 'Unknown',
      ProductName: getCol(rowObj, 'ProductName') || 'Unknown',
      Sales: parseFloat(getCol(rowObj, 'Sales')) || 0,
      Profit: parseFloat(getCol(rowObj, 'Profit')) || 0,
      Quantity: parseInt(getCol(rowObj, 'Quantity'), 10) || 1,
      CustomerID: getCol(rowObj, 'CustomerID') || `CUST-${i}`,
      CustomerType: getCol(rowObj, 'CustomerType') || 'New',
      Churned: getCol(rowObj, 'Churned') || 'No',
    };

    // Validate numeric columns
    for (const nc of NUMERIC_COLUMNS) {
      const raw = getCol(rowObj, nc);
      if (raw && isNaN(parseFloat(raw))) {
        warnings.push(`Row ${i + 1}: column "${nc}" value "${raw}" is not numeric, defaulting to 0.`);
      }
    }

    data.push(order);
  }

  if (data.length === 0) {
    errors.push('No valid data rows found.');
  }

  return { data, errors, warnings };
}

/**
 * Parse a single CSV line, handling quoted fields with embedded commas.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
