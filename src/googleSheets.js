/**
 * FEATURE 9 — Google Sheets Logger
 *
 * Every size chart request is automatically logged to a Google Sheet with:
 * - Product Name
 * - Store
 * - Order #
 * - Supplier
 * - Status (Pending / Received)
 * - Date Requested
 * - Date Received
 *
 * When supplier confirms → status column updates automatically.
 *
 * SETUP:
 * 1. Go to console.cloud.google.com
 * 2. Create a project → enable "Google Sheets API"
 * 3. Create a Service Account → download JSON key
 * 4. Copy the JSON content → paste as GOOGLE_SERVICE_ACCOUNT_JSON in Railway
 * 5. Share your Google Sheet with the service account email (Editor access)
 * 6. Copy the Sheet ID from the URL → add as GOOGLE_SHEET_ID in Railway
 */

const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Size Chart Requests"; // tab name in your Google Sheet

// Column layout (1-indexed)
const COLS = {
  PRODUCT_NAME: 1,
  STORE:        2,
  ORDER:        3,
  SUPPLIER:     4,
  STATUS:       5,
  REQUESTED_AT: 6,
  RECEIVED_AT:  7,
  PRODUCT_ID:   8,
};

async function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

async function getSheetsClient() {
  const auth = await getAuthClient();
  return google.sheets({ version: "v4", auth });
}

/**
 * Ensure the header row exists in the sheet
 */
async function ensureHeaders(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:H1`,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          "Product Name", "Store", "Order #", "Supplier",
          "Status", "Date Requested", "Date Received", "Product ID"
        ]],
      },
    });
  }
}

/**
 * Add a new row when a size chart is first requested
 */
async function logNewRequest({ productTitle, storeName, orderNumber, supplier, productId }) {
  if (!SHEET_ID) {
    console.log("⚠️ GOOGLE_SHEET_ID not set — skipping Sheets log");
    return;
  }

  try {
    const sheets = await getSheetsClient();
    await ensureHeaders(sheets);

    const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          productTitle,
          storeName,
          String(orderNumber),
          supplier === "arin_cheny" ? "Arin & Cheny" : "Winter Early",
          "Pending ⏳",
          now,
          "", // received at — empty for now
          productId,
        ]],
      },
    });

    console.log(`📊 Logged "${productTitle}" to Google Sheets`);
  } catch (err) {
    console.error("❌ Google Sheets log failed:", err.message);
  }
}

/**
 * Update the status column when size chart is received
 */
async function updateSheetStatus(productNameKey, status, receivedAt) {
  if (!SHEET_ID) return;

  try {
    const sheets = await getSheetsClient();

    // Find the row with this product
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:H`,
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(
      (row) => row[0] && row[0].toLowerCase().trim() === productNameKey.replace(/-/g, " ")
    );

    if (rowIndex === -1) {
      console.log(`⚠️ Product not found in sheet for status update`);
      return;
    }

    const sheetRow = rowIndex + 1; // Sheets is 1-indexed
    const receivedTime = new Date(receivedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });

    // Update status column (E) and received date column (G)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `${SHEET_NAME}!E${sheetRow}`, values: [[status]] },
          { range: `${SHEET_NAME}!G${sheetRow}`, values: [[receivedTime]] },
        ],
      },
    });

    console.log(`📊 Updated Google Sheet status for row ${sheetRow} → ${status}`);
  } catch (err) {
    console.error("❌ Google Sheets status update failed:", err.message);
  }
}

module.exports = { logNewRequest, updateSheetStatus };
