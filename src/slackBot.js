/**
 * Slack Bot Module
 * Posts size chart requests to the correct Slack channel
 * and tags the correct supplier(s) based on the store's supplier group.
 *
 * Supplier groups:
 *  "arin_cheny" → SLACK_CHANNEL_ARIN   → tags @Arin & @Cheny
 *  "winter"     → SLACK_CHANNEL_WINTER → tags @Winter
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Slack User IDs for each supplier (set these in Railway Variables)
const SUPPLIER_CONFIG = {
  arin_cheny: {
    channelId: process.env.SLACK_CHANNEL_ARIN,
    // Tag both Arin and Cheny
    mentionText: `<@${process.env.SLACK_USER_ARIN}> & <@${process.env.SLACK_USER_CHENY}>`,
    label: "Arin & Cheny",
  },
  winter: {
    channelId: process.env.SLACK_CHANNEL_WINTER,
    mentionText: `<@${process.env.SLACK_USER_WINTER}>`,
    label: "Winter Early",
  },
};

async function postSizeChartRequest({
  storeName,
  orderNumber,
  productId,
  productTitle,
  variantTitle,
  sku,
  supplier, // "arin_cheny" or "winter"
}) {
  if (!SLACK_BOT_TOKEN) {
    throw new Error("Missing SLACK_BOT_TOKEN in environment variables");
  }

  const config = SUPPLIER_CONFIG[supplier];
  if (!config) {
    throw new Error(`Unknown supplier group: "${supplier}"`);
  }
  if (!config.channelId) {
    throw new Error(`Missing Slack channel ID for supplier group: "${supplier}"`);
  }

  const variantLine = variantTitle && variantTitle !== "Default Title"
    ? `*Variant:* ${variantTitle}`
    : "";

  // Plain text fallback (shown in notifications)
  const text = `📦 Size Chart Request — ${productTitle} (Order #${orderNumber})`;

  // Rich block message matching your exact format
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*Store:* ${storeName}`,
          `*Order #:* ${orderNumber}`,
          `*Product name :* ${productTitle}`,
          `*Product ID:* \`${productId}\``,
          variantLine,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${config.mentionText} Please provide the size chart for this product. 🙏`,
      },
    },
  ];

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: config.channelId,
      text,
      blocks,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  console.log(`📨 Slack message sent to ${config.label} channel for "${productTitle}"`);
  return data;
}

module.exports = { postSizeChartRequest };
