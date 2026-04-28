/**
 * FEATURE 2 — Supplier Confirmation Listener
 *
 * When a supplier replies in Slack with keywords like "done", "sent", "here you go",
 * or uploads a file/image (the size chart), the bot:
 *  1. Replies with ✅ "Size chart received, thank you!"
 *  2. Marks the product as RECEIVED in the database
 *  3. Updates Google Sheets status to "Received ✅"
 *  4. Auto-tags the Shopify order with "size-chart-done"
 *
 * Setup required:
 *  - In api.slack.com → Event Subscriptions → enable
 *  - Subscribe to: message.channels
 *  - Request URL: https://your-railway-url.app/slack/events
 */

const db = require("./database");
const { updateSheetStatus } = require("./googleSheets");
const { tagShopifyOrder } = require("./shopifyTagger");

// Keywords that mean the supplier has sent the size chart
const CONFIRMATION_KEYWORDS = [
  "done", "sent", "here", "attached", "please find", "size chart",
  "chart", "uploaded", "updated", "check", "✅", "👍",
];

function isConfirmation(text, hasFiles) {
  if (hasFiles) return true; // any file/image upload counts
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONFIRMATION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Handle incoming Slack events (message posted in channel)
 */
async function handleSlackEvent(payload) {
  // Ignore bot's own messages to prevent infinite loops
  if (payload.event?.bot_id) return;
  if (payload.event?.subtype === "bot_message") return;

  const event = payload.event;
  if (!event || event.type !== "message") return;

  const messageText = event.text || "";
  const hasFiles = event.files && event.files.length > 0;
  const channelId = event.channel;
  const threadTs = event.thread_ts || event.ts;

  if (!isConfirmation(messageText, hasFiles)) return;

  // Find which product this thread belongs to
  const request = db.getRequestBySlackThread(threadTs);
  if (!request) return; // message not related to any size chart request

  if (request.status === "received") return; // already marked done

  console.log(`✅ Supplier confirmed size chart for "${request.product_title}"`);

  // 1. Mark as received in DB
  db.markAsReceived(request.product_name_key);

  // 2. Reply in Slack thread
  await replyInThread(channelId, threadTs, request.product_title);

  // 3. Update Google Sheets
  try {
    await updateSheetStatus(request.product_name_key, "Received ✅", new Date().toISOString());
  } catch (err) {
    console.error("Google Sheets update failed:", err.message);
  }

  // 4. Tag Shopify order
  try {
    await tagShopifyOrder(request.store_name, request.first_order, "size-chart-done");
  } catch (err) {
    console.error("Shopify tag update failed:", err.message);
  }
}

async function replyInThread(channelId, threadTs, productTitle) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: channelId,
      thread_ts: threadTs,
      text: `✅ Size chart received for *${productTitle}*! Thank you. The order has been tagged in Shopify. 🎉`,
    }),
  });

  const data = await response.json();
  if (!data.ok) console.error("Failed to reply in thread:", data.error);
}

module.exports = { handleSlackEvent };
