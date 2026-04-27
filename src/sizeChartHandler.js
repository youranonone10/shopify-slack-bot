const db = require("./database");
const slack = require("./slackBot");

/**
 * Core logic — checks by PRODUCT NAME only, not SKU or variant.
 * Routes Slack message to the correct supplier channel based on store config.
 *
 * Example:
 *   Order 1 → "Baggy Jeans" XL Black  (Arin store)   → posts to Arin channel ✅
 *   Order 2 → "Baggy Jeans" L  Black  (Arin store)   → SKIPS (same product name) ⏭️
 *   Order 3 → "Slim Chinos"  M  Blue  (Winter store)  → posts to Winter channel ✅
 */
async function checkAndRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier }) {
  try {
    const existing = db.isAlreadyRequested(productTitle);

    if (existing) {
      console.log(
        `⏭️  Skipping "${productTitle}" — already requested (first asked on order #${existing.first_order})`
      );
      return;
    }

    // Not seen before → post to the correct supplier's Slack channel
    await slack.postSizeChartRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier });
    db.markAsRequested(productTitle, productId, storeName, orderNumber);

    console.log(`✅ Size chart requested for "${productTitle}" → supplier: ${supplier}`);
  } catch (err) {
    console.error(`❌ Error processing "${productTitle}":`, err.message);
  }
}

module.exports = { checkAndRequest };
