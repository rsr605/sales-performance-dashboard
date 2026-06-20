# Scope

## In Scope
- Four dashboard pages: Executive Summary, Sales Performance, Customer Analysis,
  Profitability Analysis
- Data generator producing realistic sample data (CSV export)
- Server-side analytics engine computing all measures
- REST API with global filter support (date range, region, category, customer type)
- Chart.js visualizations: line, bar, column, doughnut, matrix tables
- KPI cards with trend indicators
- Drill-down Region → State → City
- Hover tooltips
- CSV download endpoint

## Out of Scope
- User authentication / multi-tenancy
- Real-time data streaming
- PDF export of the dashboard
- Machine-learning forecasting (future enhancement)

## Phases
1. Data generator + CSV export
2. Analytics engine
3. API routes with filters
4. Frontend shell + theme
5–8. Four dashboard pages
9. Global filters + interactivity
10. Testing + polish
