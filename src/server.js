const express = require("express");
const crypto = require("crypto");
const { checkAndRequest } = require("./sizeChartHandler");
const { handleSlackEvent } = require("./confirmationListener");
const { startReminderScheduler } = require("./reminder");

const app = express();

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

// ─── Shopify Webhook Verification ────────────────────────────────────────────
function verifyShopifyWebhook(req, secret) {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!hmac) return false;
  const digest = crypto.createHmac("sha256", secret).update(req.rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

// ─── Shopify Order Webhook ────────────────────────────────────────────────────
app.post("/webhook/order-created", async (req, res) => {
  const shopDomain = req.headers["x-shopify-shop-domain"];
  const store = global.STORES.find((s) => s.domain === shopDomain);
  if (!store) {
    console.log(`Unknown store: ${shopDomain}`);
    return res.status(401).send("Unknown store");
  }
  if (!verifyShopifyWebhook(req, store.webhookSecret)) {
    console.log(`Invalid HMAC for store: ${shopDomain}`);
    return res.status(401).send("Invalid signature");
  }

  res.status(200).send("OK");

  const order = req.body;
  console.log(`New order #${order.order_number} from ${shopDomain}`);

  for (const item of order.line_items) {
    await checkAndRequest({
      storeName: store.name,
      orderNumber: order.order_number,
      productId: String(item.product_id),
      productTitle: item.title,
      variantTitle: item.variant_title,
      sku: item.sku,
      supplier: store.supplier,
    });
  }
});

// ─── Slack Events (supplier confirmations) ────────────────────────────────────
app.post("/slack/events", async (req, res) => {
  const body = req.body;

  // Slack URL verification challenge (one-time setup)
  if (body.type === "url_verification") {
    return res.json({ challenge: body.challenge });
  }

  res.status(200).send("OK");

  // Handle the event in background
  try {
    await handleSlackEvent(body);
  } catch (err) {
    console.error("Slack event error:", err.message);
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Shopify → Slack bot is running ✅"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startReminderScheduler(); // start 24/48hr reminder checks
});
