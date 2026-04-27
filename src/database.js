/**
 * Database module
 * Uses SQLite so you pay $0 — file stored on the server.
 *
 * ✅ Tracks by PRODUCT NAME (not SKU or variant).
 * So "Baggy Jeans" XL Black and "Baggy Jeans" L Black are treated as the
 * SAME product — size chart is only requested once.
 */
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/requests.db");

const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS size_chart_requests (
    product_name_key  TEXT PRIMARY KEY,
    product_title     TEXT,
    product_id        TEXT,
    store_name        TEXT,
    first_order       TEXT,
    requested_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Normalise a product title into a stable lookup key.
 * "Baggy Jeans - Black" and "baggy jeans black" both → "baggy jeans black"
 * Strips punctuation/extra spaces so minor title differences don't fool it.
 */
function normaliseTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // remove punctuation
    .replace(/\s+/g, " ")          // collapse spaces
    .trim();
}

/**
 * Has a size chart already been requested for this product NAME?
 * Returns the existing DB row (with original title) or null.
 */
function isAlreadyRequested(productTitle) {
  const key = normaliseTitle(productTitle);
  const row = db.prepare(
    "SELECT product_name_key, product_title FROM size_chart_requests WHERE product_name_key = ?"
  ).get(key);
  return row || null;
}

/**
 * Mark a product name as requested so it's never asked again.
 */
function markAsRequested(productTitle, productId, storeName, orderNumber) {
  const key = normaliseTitle(productTitle);
  db.prepare(`
    INSERT OR IGNORE INTO size_chart_requests
      (product_name_key, product_title, product_id, store_name, first_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, productTitle, String(productId), storeName, String(orderNumber));
}

/**
 * List all products that have been requested (for admin review).
 */
function getAllRequested() {
  return db.prepare("SELECT * FROM size_chart_requests ORDER BY requested_at DESC").all();
}

/**
 * Remove a product by name so the bot will ask again next order.
 * Useful if supplier provided a wrong/missing size chart.
 */
function removeRequest(productTitle) {
  const key = normaliseTitle(productTitle);
  const changes = db.prepare(
    "DELETE FROM size_chart_requests WHERE product_name_key = ?"
  ).run(key).changes;
  return changes > 0;
}

module.exports = { isAlreadyRequested, markAsRequested, getAllRequested, removeRequest, normaliseTitle };
