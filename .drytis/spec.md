# Sales Performance Dashboard — Spec

## Overview
An interactive, multi-page Sales Performance Dashboard web app that mirrors a
real Power BI / Tableau corporate report. Serves a realistic generated dataset
with a CSV export, computes all analytics server-side via a Node/Express API,
and renders four pages of Chart.js visuals with global filters and drill-downs.

## Tech Stack
- **Backend:** Node.js + Express (no DB; data is generated in-memory at boot)
- **Frontend:** Vanilla HTML/CSS/JS + Chart.js (loaded via CDN)
- **Data:** Seeded generator → ~800 orders over 12 months, repeat customers,
  ~18% churn, mixed profit/loss lines
- **Export:** `/api/export-csv` downloads the full dataset for Power BI/Tableau

## Key Decisions
- In-memory dataset (deterministic via seed) — no external DB dependency,
  fast boot, instant filter response.
- All aggregations computed server-side so the frontend stays thin.
- Single-page app shell with client-side page switching (no router library).
- Corporate blue/green theme, system font stack, no build step.

## Calculated Measures
- Total Revenue / Profit / Orders / Quantity
- MoM Revenue Growth %
- Profit Margin %
- Churn Rate %
- New Customer %
- Cumulative Revenue
