# Task: Dashboard Build

## Files to Create
- `package.json`
- `server.js`
- `src/data/generator.js` — seeded dataset generator
- `src/analytics/metrics.js` — all aggregation functions
- `src/routes/api.js` — Express API routes
- `public/index.html` — app shell + 4 page sections
- `public/css/dashboard.css` — corporate theme
- `public/js/api.js` — API client
- `public/js/app.js` — state, nav, filters
- `public/js/charts.js` — Chart.js renderers
- `test/generator.test.js` — generator unit tests
- `test/metrics.test.js` — analytics unit tests

## Acceptance Criteria

### Data Generator
- [ ] Produces ~800 orders spanning 12 months (Jan–Dec 2024)
- [ ] Each order has: OrderID, Date, Month, Region, Country, State, City,
      ProductCategory, ProductName, Sales, Profit, Quantity, CustomerID,
      CustomerType, Churned
- [ ] CustomerID repeats (repeat customers exist)
- [ ] ~18% churn rate (Churned = "Yes")
- [ ] Mix of New/Returning customer types
- [ ] Mix of profitable and loss-making (negative profit) orders
- [ ] Deterministic: same seed → same dataset
- [ ] CSV export endpoint returns valid CSV with header row

### Analytics Engine
- [ ] `getSummary(filters)` returns { totalRevenue, totalProfit, totalOrders,
      momRevenueGrowth, distinctCustomers, profitMargin, churnRate, newCustomerPct }
- [ ] `getRevenueTrend(filters)` returns monthly [{ month, revenue, profit, prevRevenue }]
- [ ] `getTopProducts(filters, limit)` returns [{ product, revenue, profit }] DESC by revenue
- [ ] `getSalesByRegion(filters)` returns [{ region, revenue, profit }] + drill data
- [ ] `getSalesByCategory(filters)` returns [{ category, revenue, profit }]
- [ ] `getCustomerAnalysis(filters)` returns new/returning/churn counts
- [ ] `getTopCustomers(filters, limit)` returns [{ customer, revenue, churned }]
- [ ] `getProfitability(filters)` returns profitable + loss-making products
- [ ] All functions accept and apply a filters object: { startDate, endDate,
      region, category, customerType }

### API
- [ ] `GET /api/summary` — summary KPIs
- [ ] `GET /api/revenue-trend` — monthly trend
- [ ] `GET /api/top-products?limit=5`
- [ ] `GET /api/sales-by-region`
- [ ] `GET /api/sales-by-category`
- [ ] `GET /api/customers`
- [ ] `GET /api/top-customers?limit=10`
- [ ] `GET /api/profitability`
- [ ] `GET /api/profit-margin-by-region`
- [ ] `GET /api/export-csv` — CSV download
- [ ] `GET /api/filters` — available filter option values
- [ ] All endpoints apply query-param filters correctly

### Frontend — Shell & Navigation
- [ ] Header with title + page navigation tabs (4 pages)
- [ ] Global filter bar: date range, region, category, customer type
- [ ] Blue/green corporate theme applied
- [ ] Smooth page switching (only active page visible)

### Frontend — Executive Summary Page
- [ ] 4 KPI cards: Total Revenue, Total Profit, Total Orders, MoM Growth %
- [ ] Revenue trend line chart (monthly)
- [ ] Top 5 Products horizontal bar
- [ ] Revenue by Category doughnut
- [ ] Key insights text box

### Frontend — Sales Performance Page
- [ ] Monthly revenue trend line chart
- [ ] Sales by Region bar chart (with drill-down to state/city)
- [ ] Sales by Product Category column chart
- [ ] Region × Category matrix table with conditional formatting

### Frontend — Customer Analysis Page
- [ ] 3 KPI cards: Distinct Customers, Churn Rate %, New Customer %
- [ ] New vs Returning doughnut chart
- [ ] Top 10 customers bar (colored by churn)
- [ ] Customer segmentation matrix

### Frontend — Profitability Page
- [ ] 2 KPI cards: Profit Margin %, Total Profit
- [ ] Sales vs Profit clustered column (monthly)
- [ ] Most profitable products (top 5 bar, green)
- [ ] Loss-making products (bottom 5 bar, red)
- [ ] Profit margin by region bar (conditional color)

### Interactivity
- [ ] Changing any filter re-fetches and re-renders all visible charts
- [ ] Region drill-down works (click region bar → states)
- [ ] Chart tooltips show extra detail
- [ ] "Apply Filters" button triggers refresh
- [ ] "Reset Filters" clears all

### Tests
- [ ] Generator test: correct row count, all fields present, deterministic
- [ ] Generator test: churn rate in 12–25% range
- [ ] Generator test: at least some negative-profit orders
- [ ] Metrics test: totalRevenue = sum of all Sales
- [ ] Metrics test: MoM growth calculated correctly
- [ ] Metrics test: churn rate = churned / total customers
- [ ] Metrics test: filters reduce result set correctly
- [ ] Metrics test: top products sorted DESC

## Edge Cases
- Empty filter result (no matching orders) → charts show "No data" message
- Division by zero in growth/margin → return 0
- Region drill-down with no sub-data → graceful empty state
