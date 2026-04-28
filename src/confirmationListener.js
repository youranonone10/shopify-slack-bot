/**
 * FEATURE 2 — Supplier Confirmation Listener
 *
 * When a supplier replies in the thread with a file/image or confirmation keywords,
 * the bot replies with ✅ confirmed message and marks as received.
 */

const db = require("./database");
const { updateSheetStatus } = require("./googleSheets");
const { tagShopifyOrder } = require("./shopifyTagger");

const CONFIRMATION_KEYWORDS = [
  "done", "sent", "here", "attached", "please find", "size chart",
  "chart", "uploaded", "updated", "check", "✅", "👍",
];

function isConfirmation(text, hasFiles) {
  if (hasFiles) return true;
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONFIRMATION_KEYWORDS.some((kw) => lower.includes(kw));
}

async function handleSlackEvent(payload) {
  const event = payload.event;
  if (!event) return;

  // CRITICAL: Ignore ALL bot messages to prevent infinite loop
  if (event.bot_id) return;
  if (event.bot_profile) return;
  if (event.subtype === "bot_message") return;
  if (event.username === "Test BOT") return;

  // Only care about threaded replies (thread_ts exists and differs from ts)
  if (!event.thread_ts || event.thread_ts === event.ts) return;

  const messageText = event.text || "";
  const hasFiles = event.files && event.files.length > 0;

  if (!isConfirmation(messageText, hasFiles)) return;

  const threadTs = event.thread_ts;
  const channelId = event.channel;

  // Find which product this thread belongs to
  const request = db.getRequestBySlackThread(threadTs);
  if (!request) {
    console.log(`No request found for thread ${threadTs}`);
    return;
  }

  if (request.status === "received") {
    console.log(`Already marked received for "${request.product_title}"`);
    return;
  }

  console.log(`✅ Supplier confirmed size chart for "${request.product_title}"`);

  // 1. Mark as received in DB
  db.markAsReceived(request.product_name_key);

  // 2. Reply with ✅ confirmation (text only, no image forwarding)
  await replyConfirmation(channelId, threadTs, request.product_title);

  // 3. Update Google Sheets
  try {
    await updateSheetStatus(request.product_name_key, "Received ✅", new Date().toISOString());
  } catch (err) {
    console.error("Google Sheets update failed:", err.message);
  }

  // 4. Tag Shopify order as done
  try {
    await tagShopifyOrder(request.store_name, request.first_order, "size-chart-done");
  } catch (err) {
    console.error("Shopify tag update failed:", err.message);
  }
}

async function replyConfirmation(channelId, threadTs, productTitle) {
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
