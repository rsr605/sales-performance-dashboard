# Infrastructure

## Proxy Routes (Caddy)
- **Reverse proxy** at `/` → port 3000 (Node/Express server)

## Background Services
- **`sales-dashboard`** — `node server.js` (production command, serves API + static)
  - Working directory: `/workspace`
  - Port: 3000

## Environment Variables
- `PORT` = 3000
- `NODE_ENV` = production

## Ports
- 3000 — Express server (API + static files)

## Data
- No external database — dataset generated in-memory at boot via seeded generator.
