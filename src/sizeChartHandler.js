const db = require("./database");
const slack = require("./slackBot");

// ─── Products that NEVER need a size chart ────────────────────────────────────
// If a product title contains any of these words, the bot will skip it entirely.
// Add more words here anytime you find products that don't need size charts.
const SKIP_KEYWORDS = [
  // Accessories / headwear
  "cap", "caps", "hat", "hats", "beanie", "beanies", "headband", "bandana",
  "snapback", "bucket hat", "visor",

  // Bags
  "bag", "bags", "backpack", "tote", "pouch", "wallet", "purse", "clutch",
  "handbag", "sling",

  // Home / furniture / decor
  "stool", "stools", "chair", "table", "desk", "shelf", "lamp", "pillow",
  "cushion", "mug", "cup", "poster", "frame", "mat", "rug", "towel",
  "blanket", "sheet", "curtain",

  // Jewellery / accessories
  "ring", "rings", "necklace", "bracelet", "earring", "earrings", "watch",
  "sunglasses", "glasses", "belt", "tie", "scarf", "gloves",

  // Other non-sized items
  "keychain", "pin", "badge", "sticker", "phone case", "mask",
];

// ─── Clothing & shoe size patterns ───────────────────────────────────────────
// The bot checks the variant title for these patterns.
// If a match is found → product has a size → ask for size chart.
const SIZE_PATTERNS = [
  // Clothing sizes: XS, S, M, L, XL, XXL, 2XL, 3XL etc.
  /\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL)\b/i,

  // Numeric clothing sizes: 28, 30, 32, 34 etc. (trouser waists)
  /\b(2[4-9]|3[0-9]|4[0-4])\b/,

  // Shoe sizes (UK/EU/US): numbers like 6, 7, 8 ... 47, or "EU 42", "UK 9"
  /\b(EU|UK|US)?\s*([4-9]|[1-4][0-9])\b/i,

  // Explicit size label: "Size 10", "Size M"
  /\bsize\b/i,
];

/**
 * Returns true if this product NEEDS a size chart.
 * Logic:
 *  1. If product title contains a skip keyword → NO (e.g. cap, bag, stool)
 *  2. If variant title contains a size pattern → YES (e.g. XL, EU42, Size 10)
 *  3. If no size pattern found in variant → NO (no sizing info at all)
 */
function needsSizeChart(productTitle, variantTitle) {
  const titleLower = (productTitle || "").toLowerCase();
  const variantLower = (variantTitle || "").toLowerCase();

  // Rule 1 — skip non-sized product types
  for (const keyword of SKIP_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      return { needed: false, reason: `product type contains "${keyword}"` };
    }
  }

  // Rule 2 — check variant for size indicators
  for (const pattern of SIZE_PATTERNS) {
    if (pattern.test(variantLower) || pattern.test(titleLower)) {
      return { needed: true, reason: `size detected in variant "${variantTitle}"` };
    }
  }

  // Rule 3 — no size info found, skip
  return { needed: false, reason: `no size info found in variant "${variantTitle}"` };
}

/**
 * Core logic — checks by PRODUCT NAME only, not SKU or variant.
 * Routes Slack message to the correct supplier channel based on store config.
 *
 * Example:
 *   "Baggy Jeans XL Black"  → has size → asks ✅
 *   "Baggy Jeans L  Black"  → same product already asked → skips ⏭️
 *   "Baseball Cap"          → skip keyword match → skips ⏭️
 *   "Wooden Stool"          → skip keyword match → skips ⏭️
 *   "Nike Air Force EU 42"  → shoe size detected → asks ✅
 */
async function checkAndRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier }) {
  try {
    // Step 1 — does this product even need a size chart?
    const { needed, reason } = needsSizeChart(productTitle, variantTitle);
    if (!needed) {
      console.log(`🚫 Skipping "${productTitle}" — ${reason}`);
      return;
    }

    // Step 2 — has it already been requested?
    const existing = db.isAlreadyRequested(productTitle);
    if (existing) {
      console.log(`⏭️  Skipping "${productTitle}" — already requested on order #${existing.first_order}`);
      return;
    }

    // Step 3 — post to the correct supplier's Slack channel
    await slack.postSizeChartRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier });
    db.markAsRequested(productTitle, productId, storeName, orderNumber);

    console.log(`✅ Size chart requested for "${productTitle}" → supplier: ${supplier}`);
  } catch (err) {
    console.error(`❌ Error processing "${productTitle}":`, err.message);
  }
}

module.exports = { checkAndRequest, needsSizeChart };
