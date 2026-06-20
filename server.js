/**
 * Express server entry.
 * Serves the static frontend (public/) and the JSON analytics API.
 *
 * Supports two data sources:
 *   - Sample data (generated at boot)
 *   - Custom data (uploaded via POST /api/import-csv)
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateDataset, parseCSV } from './src/data/generator.js';
import apiRoutes from './src/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Generate sample dataset once at boot -----------------------------------
const sampleDataset = generateDataset(42, 800);
console.log(`[boot] Generated ${sampleDataset.length} sample orders`);

// Active dataset state — starts as sample, switches on import
let activeDataset = sampleDataset;
let dataSource = 'sample'; // 'sample' | 'custom'

// Body parsing for CSV import (text/plain — we read the raw body)
app.use(express.text({ limit: '10mb', type: 'text/csv' }));
app.use(express.urlencoded({ extended: true }));

// Inject active dataset + data source into request objects
app.use((req, _res, next) => {
  req.data = activeDataset;
  req.dataSource = dataSource;
  next();
});

// --- CSV Import endpoint ----------------------------------------------------
app.post('/api/import-csv', (req, res) => {
  try {
    const csvText = typeof req.body === 'string' ? req.body : '';

    if (!csvText.trim()) {
      return res.status(400).json({ error: 'No CSV data received. Make sure the file is uploaded as text/csv.' });
    }

    const result = parseCSV(csvText);

    if (result.errors.length > 0) {
      return res.status(400).json({ error: result.errors.join(' '), warnings: result.warnings });
    }

    // Replace active dataset
    activeDataset = result.data;
    dataSource = 'custom';
    console.log(`[import] Loaded ${result.data.length} orders from CSV upload`);

    res.json({
      success: true,
      rowCount: result.data.length,
      warnings: result.warnings,
      dataSource: 'custom',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Reset to sample data ---------------------------------------------------
app.post('/api/reset-data', (_req, res) => {
  activeDataset = sampleDataset;
  dataSource = 'sample';
  console.log('[reset] Reverted to sample dataset');
  res.json({ success: true, rowCount: sampleDataset.length, dataSource: 'sample' });
});

// --- Data source status -----------------------------------------------------
app.get('/api/data-source', (req, res) => {
  res.json({ dataSource: req.dataSource, rowCount: req.data.length });
});

// --- Routes -----------------------------------------------------------------
app.use('/api', apiRoutes);
app.use(express.static(join(__dirname, 'public')));

// Fallback: serve index.html for any non-API, non-static route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`[server] Dashboard running on http://localhost:${PORT}`);
});
