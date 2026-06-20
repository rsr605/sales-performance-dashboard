# Architecture

## Directory Structure
```
/workspace
├── server.js                 # Express entry — serves API + static files
├── package.json
├── src/
│   ├── data/
│   │   └── generator.js      # Seeded dataset generator
│   ├── analytics/
│   │   └── metrics.js        # All aggregation functions
│   └── routes/
│       └── api.js            # API route handlers
├── public/                   # Static frontend
│   ├── index.html            # App shell + page sections
│   ├── css/
│   │   └── dashboard.css     # Corporate theme
│   └── js/
│       ├── app.js            # State, page nav, filter management
│       ├── api.js            # API client (fetch wrapper)
│       └── charts.js         # Chart.js factory + renderers
├── test/
│   ├── generator.test.js     # Generator unit tests
│   └── metrics.test.js       # Analytics unit tests
└── .drytis/
    └── specs/
        └── dashboard-build.md
```

## Data Flow
1. On server boot → `generator.js` produces the full dataset (array of order objects)
2. Dataset held in module-level variable in `metrics.js`
3. API route receives query params (filters) → calls analytics fn → returns JSON
4. Frontend `api.js` fetches → `charts.js` renders Chart.js visual
5. Filter change → all affected charts re-fetch and re-render

## Routing
- `GET /` → serves `public/index.html`
- `GET /api/*` → JSON analytics endpoints
- All other static assets served from `public/`

## No External Database
The dataset is generated once at boot with a fixed seed. All analytics are
computed in-memory on each request. This keeps the app self-contained and
fast for a demo/portfolio project.
