# Task: CSV Import + Feature Enhancements

## Overview
Add CSV import capability and a suite of UI/UX enhancements to make the dashboard
more attractive and functional.

## Files to Create
- `public/js/upload.js` — CSV upload modal logic + drag-and-drop
- `public/js/forecast.js` — linear regression forecast calculator

## Files to Modify
- `server.js` — add POST /api/import-csv, add dataset source switching
- `src/routes/api.js` — add import endpoint, forecast endpoint
- `src/analytics/metrics.js` — add getForecast, getDataTable, getSearchResults
- `public/index.html` — upload modal, dark mode toggle, Data Explorer page,
  new nav tab, forecast toggle, data source indicator
- `public/css/dashboard.css` — dark theme variables, animations, modal styles,
  sparkline styles, table styles
- `public/js/charts.js` — add renderForecastTrend, renderSparkline
- `public/js/app.js` — wire upload, dark mode, data explorer, forecast toggle,
  animated counters, data source switching
- `test/metrics.test.js` — tests for new analytics functions

## Acceptance Criteria

### CSV Import
- [ ] POST /api/import-csv accepts multipart file upload
- [ ] Parses CSV with the expected schema (OrderID, Date, Region, etc.)
- [ ] Validates required columns; returns 400 with helpful message if missing
- [ ] Replaces the active dataset; all charts update immediately
- [ ] "Import CSV" button in header opens upload modal
- [ ] Upload modal supports drag-and-drop + file picker
- [ ] Shows upload status (parsing, success, error)
- [ ] After upload, data source indicator changes to "Custom Data"
- [ ] Can revert to sample data via "Reset to Sample" button

### Dark / Light Mode Toggle
- [ ] Theme toggle button in header (sun/moon icon)
- [ ] Dark theme: dark backgrounds, light text, adjusted chart colors
- [ ] Light theme = current theme (default)
- [ ] Preference persists in localStorage
- [ ] Charts re-render with theme-appropriate colors

### Animated KPI Counters
- [ ] KPI values animate from 0 to final value on page load/filter change
- [ ] Easing animation (~800ms)
- [ ] Numbers format correctly during animation (currency, %)

### Sparklines
- [ ] Mini trend sparkline appears in each KPI card
- [ ] Shows last 12 months of that metric's trend
- [ ] Color matches trend direction (green up, red down)

### Data Explorer Page
- [ ] New "Data Explorer" nav tab (5th page)
- [ ] Searchable, sortable, paginated table of all orders
- [ ] Columns: OrderID, Date, Region, Category, Product, Sales, Profit, Qty, Customer, Type
- [ ] Click column header to sort asc/desc
- [ ] Search box filters across all columns
- [ ] Pagination (50 rows per page)

### Revenue Forecast
- [ ] Toggle button on Sales Performance page: "Show Forecast"
- [ ] Adds a dashed forecast line extending 3 months beyond actual data
- [ ] Uses linear regression on monthly revenue
- [ ] Forecast data shown in legend/tooltip

### Print / Export Dashboard
- [ ] "Print" button in header
- [ ] Calls window.print() with print-optimized CSS

### Data Source Indicator
- [ ] Badge in header showing "Sample Data" or "Custom Data"
- [ ] Updates on import/revert

## Edge Cases
- Invalid CSV format → clear error message
- CSV with extra columns → ignored gracefully
- CSV with missing optional fields → defaults applied
- Empty search in Data Explorer → shows all rows
- Forecast with < 3 months of data → show "insufficient data" message
