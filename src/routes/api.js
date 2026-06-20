/**
 * API routes — maps HTTP endpoints to analytics functions.
 *
 * Every analytics endpoint reads optional filter query params:
 *   startDate, endDate, region, category, customerType
 */
import { Router } from 'express';
import * as m from '../analytics/metrics.js';
import { toCSV } from '../data/generator.js';

const router = Router();

/** Parse filter query params into a filters object. */
function parseFilters(req) {
  const { startDate, endDate, region, category, customerType } = req.query;
  const f = {};
  if (startDate) f.startDate = startDate;
  if (endDate) f.endDate = endDate;
  if (region) f.region = region;
  if (category) f.category = category;
  if (customerType) f.customerType = customerType;
  return f;
}

// --- Endpoints --------------------------------------------------------------

router.get('/summary', (req, res) => {
  try {
    res.json(m.getSummary(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/revenue-trend', (req, res) => {
  try {
    res.json(m.getRevenueTrend(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/top-products', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    res.json(m.getTopProducts(req.data, parseFilters(req), limit));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sales-by-region', (req, res) => {
  try {
    res.json(m.getSalesByRegion(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sales-by-category', (req, res) => {
  try {
    res.json(m.getSalesByCategory(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/customers', (req, res) => {
  try {
    res.json(m.getCustomerAnalysis(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/top-customers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    res.json(m.getTopCustomers(req.data, parseFilters(req), limit));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profitability', (req, res) => {
  try {
    res.json(m.getProfitability(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profit-margin-by-region', (req, res) => {
  try {
    res.json(m.getProfitMarginByRegion(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/customer-segmentation', (req, res) => {
  try {
    res.json(m.getCustomerSegmentation(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/region-category-matrix', (req, res) => {
  try {
    res.json(m.getRegionCategoryMatrix(req.data, parseFilters(req)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/filters', (req, res) => {
  try {
    res.json(m.getFilterOptions(req.data));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/forecast', (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 3;
    res.json(m.getForecast(req.data, parseFilters(req), months));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/data-table', (req, res) => {
  try {
    const options = {
      search: req.query.search || '',
      sortBy: req.query.sortBy || 'Date',
      sortDir: req.query.sortDir || 'desc',
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 50,
      filters: parseFilters(req),
    };
    res.json(m.getDataTable(req.data, options));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/export-csv', (req, res) => {
  try {
    const csv = toCSV(req.data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_dataset.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
