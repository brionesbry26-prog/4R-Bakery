// Runtime configuration. When the site is served by the FastAPI backend
// (the default), the API lives on the same origin under /api.
// To host the site separately, set window.BAKERY_CONFIG = { apiBaseUrl: "https://api.example.com/api" }
// in a <script> tag before app.js loads.
const cfg = (typeof window !== 'undefined' && window.BAKERY_CONFIG) || {};

export const API_BASE_URL = (cfg.apiBaseUrl || '/api').replace(/\/+$/, '');
export const API_TIMEOUT_MS = 15000;
export const MAX_QTY_PER_ITEM = 500;
