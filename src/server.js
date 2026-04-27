const express = require("express");
const crypto = require("crypto");
const { checkAndRequest } = require("./sizeChartHandler");

const app = express();

// Parse raw body for Shopify HMAC verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── Shopify Webhook Verification ───────────────────────────────────────────
function verifyShopifyWebhook(req, secret) {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!hmac) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

// ─── Webhook Endpoint (one URL handles ALL stores) ──────────────────────────
app.post("/webhook/order-created", async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"];

  // Find the matching store config
  const store = global.STORES.find((s) => s.domain === shopDomain);
  if (!store) {
    console.log(`Unknown store: ${shopDomain}`);
    return res.status(401).send("Unknown store");
  }

  // Verify the webhook is really from Shopify
  if (!verifyShopifyWebhook(req, store.webhookSecret)) {
    console.log(`Invalid HMAC for store: ${shopDomain}`);
    return res.status(401).send("Invalid signature");
  }

  // Respond to Shopify immediately (they require < 5s response)
  res.status(200).send("OK");

  // Process the order in background
  const order = req.body;
  console.log(
    `New order #${order.order_number} from ${shopDomain} with ${order.line_items.length} item(s)`
  );

  for (const item of order.line_items) {
    await checkAndRequest({
      storeName: store.name,
      orderNumber: order.order_number,
      productId: String(item.product_id),
      productTitle: item.title,
      variantTitle: item.variant_title,
      sku: item.sku,
      supplier: store.supplier, // "arin_cheny" or "winter"
    });
  }
});

// Health check
app.get("/", (req, res) => res.send("Shopify → Slack bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
