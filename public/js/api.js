/**
 * API client — thin fetch wrapper for all dashboard endpoints.
 * Exposes a global `DashboardAPI` object (loaded before charts.js and app.js).
 */

const API_BASE = '/api';

/**
 * Fetch JSON from an API endpoint with optional query params.
 * @param {string} endpoint - e.g. 'summary', 'revenue-trend'
 * @param {Object} [params={}] - query parameters
 * @returns {Promise<any>}
 */
async function fetchJSON(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Expose globally
window.DashboardAPI = { fetchJSON };
