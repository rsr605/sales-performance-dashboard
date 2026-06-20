# Task: Rebrand to Credit Samadhaan + Indian Currency

## Context
The Sales Performance Dashboard currently uses USD ($) formatting, US geography, and generic office products. Rebrand it for **Credit Samadhaan** (Samadhaan Credit Consultancy Pvt. Ltd., Indore-based credit score improvement company) with Indian Rupee (₹) currency, Indian geography, and credit/financial service products.

## Files to Change
- `src/data/generator.js` — Indian geography, credit service products, INR pricing
- `public/js/charts.js` — currency formatting functions (₹ + Indian numbering: Lakh/Crore)
- `public/index.html` — company branding, title, logo, footer
- `public/css/dashboard.css` — theme colors (Credit Samadhaan blue/green)
- `public/js/app.js` — branding references, insights text
- `test/generator.test.js` — update assertions for new geography/products

## Acceptance Criteria

### Currency Formatting
- [ ] All currency displayed with ₹ symbol (not $)
- [ ] Compact format uses Indian numbering: ₹1.5L (lakhs), ₹2.3Cr (crores), ₹45K (thousands)
- [ ] Full format uses Indian grouping: ₹16,06,652.48
- [ ] Chart axis labels, tooltips, KPI cards, tables all show ₹

### Generator — Indian Geography
- [ ] Regions: North, South, East, West, Central (Indian regions)
- [ ] States: Indian states (Delhi, Maharashtra, Madhya Pradesh, Karnataka, etc.)
- [ ] Cities: Indian cities (Indore, Mumbai, Bengaluru, Delhi, etc.)
- [ ] Country: India
- [ ] Indore (Credit Samadhaan HQ city) included under Madhya Pradesh

### Generator — Credit Service Products
- [ ] Product categories: Credit Repair, Credit Monitoring, Consulting, Franchise Services
- [ ] Products: realistic credit/financial services (Credit Report Correction, CIBIL Dispute Filing, Monthly Score Monitor, Loan Recommendation, Kendra Setup, etc.)
- [ ] INR-appropriate base prices (₹500 – ₹2,00,000 range)
- [ ] Mix of profitable and loss-making services maintained
- [ ] Deterministic seed still works

### Branding
- [ ] Title: "Credit Samadhaan — Performance Dashboard"
- [ ] Header logo shows Credit Samadhaan branding
- [ ] Footer shows: Samadhaan Credit Consultancy Pvt. Ltd., 502, Shagun Tower, AB Road, Vijay Nagar, Indore, Madhya Pradesh 452010
- [ ] Blue/green corporate theme maintained (matches their brand)

### Tests
- [ ] Generator tests updated and passing
- [ ] Metrics tests still passing
- [ ] All 63+ tests green

## Edge Cases
- Indian currency format handles negative values (losses)
- Lakh/Crore abbreviation thresholds correct (1L = 100,000, 1Cr = 10,000,000)
