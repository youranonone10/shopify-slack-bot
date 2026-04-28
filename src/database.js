/**
 * Database module
 * Uses SQLite — zero cost, file stored on the server.
 *
 * ✅ Tracks by PRODUCT NAME (not SKU or variant).
 * ✅ Supports: reminders, status tracking, Slack thread linking, supplier info.
 */
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/requests.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS size_chart_requests (
    product_name_key  TEXT PRIMARY KEY,
    product_title     TEXT,
    product_id        TEXT,
    store_name        TEXT,
    supplier          TEXT,
    first_order       TEXT,
    status            TEXT DEFAULT 'pending',
    slack_thread_ts   TEXT,
    reminder_24_sent  INTEGER DEFAULT 0,
    reminder_48_sent  INTEGER DEFAULT 0,
    requested_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_at       DATETIME
  )
`);

function normaliseTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function isAlreadyRequested(productTitle) {
  const key = normaliseTitle(productTitle);
  return db.prepare("SELECT * FROM size_chart_requests WHERE product_name_key = ?").get(key) || null;
}

function getRequestBySlackThread(threadTs) {
  return db.prepare("SELECT * FROM size_chart_requests WHERE slack_thread_ts = ?").get(threadTs) || null;
}

function getAllRequested() {
  return db.prepare("SELECT * FROM size_chart_requests ORDER BY requested_at DESC").all();
}

function getPendingReminders() {
  return db.prepare("SELECT * FROM size_chart_requests WHERE status = 'pending'").all();
}

function markAsRequested(productTitle, productId, storeName, orderNumber, supplier, slackThreadTs) {
  const key = normaliseTitle(productTitle);
  db.prepare(`
    INSERT OR IGNORE INTO size_chart_requests
      (product_name_key, product_title, product_id, store_name, supplier, first_order, slack_thread_ts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(key, productTitle, String(productId), storeName, supplier, String(orderNumber), slackThreadTs || null);
}

function saveSlackThread(productTitle, threadTs) {
  const key = normaliseTitle(productTitle);
  db.prepare("UPDATE size_chart_requests SET slack_thread_ts = ? WHERE product_name_key = ?").run(threadTs, key);
}

function markAsReceived(productNameKey) {
  db.prepare("UPDATE size_chart_requests SET status = 'received', received_at = CURRENT_TIMESTAMP WHERE product_name_key = ?").run(productNameKey);
}

function markReminderSent(productNameKey, hours) {
  const col = hours === "48" ? "reminder_48_sent" : "reminder_24_sent";
  db.prepare(`UPDATE size_chart_requests SET ${col} = 1 WHERE product_name_key = ?`).run(productNameKey);
}

function removeRequest(productTitle) {
  const key = normaliseTitle(productTitle);
  return db.prepare("DELETE FROM size_chart_requests WHERE product_name_key = ?").run(key).changes > 0;
}

module.exports = {
  normaliseTitle, isAlreadyRequested, getRequestBySlackThread,
  getAllRequested, getPendingReminders, markAsRequested,
  saveSlackThread, markAsReceived, markReminderSent, removeRequest,
};
