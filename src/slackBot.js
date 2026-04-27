/**
 * Slack Bot Module
 * Posts size chart requests to your Slack channel and tags the supplier.
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const SUPPLIER_SLACK_USER_ID = process.env.SUPPLIER_SLACK_USER_ID; // e.g. "U0123456789"

async function postSizeChartRequest({ storeName, orderNumber, productId, productTitle, variantTitle, sku }) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    throw new Error("Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID in environment variables");
  }

  const skuLine = sku ? `*SKU:* \`${sku}\`` : "";
  const variantLine = variantTitle && variantTitle !== "Default Title"
    ? `*Variant:* ${variantTitle}`
    : "";

  const text = [
    `:package: *New Size Chart Request*`,
    ``,
    `*Store:* ${storeName}`,
    `*Order #:* ${orderNumber}`,
    `*Product:* ${productTitle}`,
    variantLine,
    skuLine,
    `*Product ID:* \`${productId}\``,
    ``,
    `<@${SUPPLIER_SLACK_USER_ID}> Please provide the size chart for this product. Thank you! :pray:`,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text,
      // Rich block format for better readability
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📦 Size Chart Request", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Store:*\n${storeName}` },
            { type: "mrkdwn", text: `*Order #:*\n${orderNumber}` },
            { type: "mrkdwn", text: `*Product:*\n${productTitle}` },
            { type: "mrkdwn", text: `*Product ID:*\n\`${productId}\`` },
            ...(variantLine ? [{ type: "mrkdwn", text: `*Variant:*\n${variantTitle}` }] : []),
            ...(sku ? [{ type: "mrkdwn", text: `*SKU:*\n\`${sku}\`` }] : []),
          ],
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${SUPPLIER_SLACK_USER_ID}> Please provide the size chart for this product. :pray:`,
          },
        },
      ],
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

module.exports = { postSizeChartRequest };
