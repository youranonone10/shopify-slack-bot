const db = require("./database");
const slack = require("./slackBot");

/**
 * Core logic — checks by PRODUCT NAME only, not SKU or variant.
 *
 * Example:
 *   Order 1 → "Baggy Jeans" size XL, colour Black  → asks Slack ✅
 *   Order 2 → "Baggy Jeans" size L,  colour Black  → SKIPS (same product name) ⏭️
 *   Order 3 → "Slim Chinos" size M,  colour Blue   → asks Slack ✅ (different product)
 */
async function checkAndRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku }) {
  try {
    const existing = db.isAlreadyRequested(productTitle);

    if (existing) {
      console.log(
        `⏭️  Skipping "${productTitle}" — already requested (first asked on order #${existing.first_order})`
      );
      return;
    }

    // Not seen before → post to Slack, then record it
    await slack.postSizeChartRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku });
    db.markAsRequested(productTitle, productId, storeName, orderNumber);

    console.log(`✅ Size chart requested for "${productTitle}"`);
  } catch (err) {
    console.error(`❌ Error processing "${productTitle}":`, err.message);
  }
}

module.exports = { checkAndRequest };
