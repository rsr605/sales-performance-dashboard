# Patterns

## Naming
- **Files:** lowercase-hyphenated for data/analytics (`generator.js`, `metrics.js`);
  camelCase for JS identifiers.
- **Variables / functions:** camelCase (`totalRevenue`, `getRevenueTrend`).
- **Constants:** UPPER_SNAKE (`CHURN_RATE`, `REGIONS`).
- **API endpoints:** kebab or flat path segments (`/api/top-products`).

## Error Handling
- API routes wrapped in try/catch → respond `500` with `{ error: message }`.
- Frontend `api.js` catches fetch failures → shows a small "data unavailable"
  banner in the affected chart container.

## Test Conventions
- Framework: Node's built-in `node:test` + `node:assert` (no external deps).
- Tests live in `/workspace/test/` mirroring `src/` structure.
- Unit tests: generator output shape, analytics math (sums, growth %, churn).
- Run with `npm test`.

## Code Style
- Plain ES modules (`import`/`export`) throughout.
- No transpiler / bundler — Node runs the source directly.
- JSDoc comments on exported functions.

## Frontend
- No framework — plain DOM manipulation.
- Chart.js loaded via CDN (`<script>` tag in index.html).
- CSS custom properties for theme colors.
- Each page is a `<section>` toggled via `display: none/block`.
