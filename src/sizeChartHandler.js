const db = require("./database");
const slack = require("./slackBot");
const { logNewRequest } = require("./googleSheets");
const { tagShopifyOrder } = require("./shopifyTagger");

const SKIP_KEYWORDS = [
  "cap","caps","hat","hats","beanie","beanies","headband","bandana","snapback","bucket hat","visor",
  "bag","bags","backpack","tote","pouch","wallet","purse","clutch","handbag","sling",
  "stool","stools","chair","table","desk","shelf","lamp","pillow","cushion","mug","cup",
  "poster","frame","mat","rug","towel","blanket","sheet","curtain",
  "ring","rings","necklace","bracelet","earring","earrings","watch","sunglasses","glasses",
  "belt","tie","scarf","gloves","keychain","pin","badge","sticker","phone case","mask",
];

const SIZE_PATTERNS = [
  /\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL)\b/i,
  /\b(2[4-9]|3[0-9]|4[0-4])\b/,
  /\b(EU|UK|US)?\s*([4-9]|[1-4][0-9])\b/i,
  /\bsize\b/i,
];

function needsSizeChart(productTitle, variantTitle) {
  const titleLower = (productTitle || "").toLowerCase();
  const variantLower = (variantTitle || "").toLowerCase();
  for (const keyword of SKIP_KEYWORDS) {
    if (titleLower.includes(keyword)) return { needed: false, reason: `skip keyword "${keyword}"` };
  }
  for (const pattern of SIZE_PATTERNS) {
    if (pattern.test(variantLower) || pattern.test(titleLower)) {
      return { needed: true, reason: `size detected in "${variantTitle}"` };
    }
  }
  return { needed: false, reason: `no size info in variant "${variantTitle}"` };
}

async function checkAndRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier }) {
  try {
    const { needed, reason } = needsSizeChart(productTitle, variantTitle);
    if (!needed) {
      console.log(`🚫 Skipping "${productTitle}" — ${reason}`);
      return;
    }

    const existing = db.isAlreadyRequested(productTitle);
    if (existing) {
      console.log(`⏭️  Skipping "${productTitle}" — already requested on order #${existing.first_order}`);
      return;
    }

    // Post to Slack — get back the thread timestamp
    const slackResult = await slack.postSizeChartRequest({
      storeName, orderNumber, productId, productTitle, variantTitle, sku, supplier,
    });

    const threadTs = slackResult?.ts || null;

    // Save to DB with thread ts and supplier
    db.markAsRequested(productTitle, productId, storeName, orderNumber, supplier, threadTs);

    // Tag Shopify order as pending
    try {
      await tagShopifyOrder(storeName, orderNumber, "size-chart-pending");
    } catch (e) {
      console.error("Shopify tag error:", e.message);
    }

    // Log to Google Sheets
    try {
      await logNewRequest({ productTitle, storeName, orderNumber, supplier, productId });
    } catch (e) {
      console.error("Sheets log error:", e.message);
    }

    console.log(`✅ Size chart requested for "${productTitle}" → supplier: ${supplier}`);
  } catch (err) {
    console.error(`❌ Error processing "${productTitle}":`, err.message);
  }
}

module.exports = { checkAndRequest, needsSizeChart };
