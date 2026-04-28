/**
 * FEATURE 1 — 24 Hour Reminder System
 *
 * Every hour this runs and checks the database.
 * If a size chart was requested 24+ hours ago and is still PENDING
 * → sends a reminder to the correct supplier channel tagging them again.
 *
 * Reminder is sent only ONCE (so supplier doesn't get spammed every hour).
 * A second reminder goes out at 48 hours if still pending.
 */

const db = require("./database");

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

const SUPPLIER_CONFIG = {
  arin_cheny: {
    channelId: process.env.SLACK_CHANNEL_ARIN,
    mentionText: `<@${process.env.SLACK_USER_ARIN}> & <@${process.env.SLACK_USER_CHENY}>`,
  },
  winter: {
    channelId: process.env.SLACK_CHANNEL_WINTER,
    mentionText: `<@${process.env.SLACK_USER_WINTER}>`,
  },
};

async function sendSlackReminder({ channelId, mentionText, productTitle, orderNumber, storeName, hoursWaiting }) {
  const urgency = hoursWaiting >= 48 ? "⚠️ *URGENT —*" : "🔔 *Reminder —*";

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: channelId,
      text: `${urgency} Size chart still pending for "${productTitle}"`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `${urgency} Size chart still pending`,
              ``,
              `*Product:* ${productTitle}`,
              `*Store:* ${storeName}`,
              `*First Order #:* ${orderNumber}`,
              `*Waiting:* ${hoursWaiting} hours`,
            ].join("\n"),
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${mentionText} Could you please provide the size chart for this product? 🙏`,
          },
        },
      ],
    }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(`Slack error: ${data.error}`);
  return data;
}

async function runReminderCheck() {
  console.log("⏰ Running reminder check...");

  const pending = db.getPendingReminders(); // products still pending

  for (const row of pending) {
    const requestedAt = new Date(row.requested_at);
    const now = new Date();
    const hoursWaiting = Math.floor((now - requestedAt) / (1000 * 60 * 60));

    const shouldRemindAt24 = hoursWaiting >= 24 && !row.reminder_24_sent;
    const shouldRemindAt48 = hoursWaiting >= 48 && !row.reminder_48_sent;

    if (!shouldRemindAt24 && !shouldRemindAt48) continue;

    const config = SUPPLIER_CONFIG[row.supplier];
    if (!config || !config.channelId) {
      console.log(`⚠️ No Slack config for supplier "${row.supplier}", skipping reminder`);
      continue;
    }

    try {
      await sendSlackReminder({
        channelId: config.channelId,
        mentionText: config.mentionText,
        productTitle: row.product_title,
        orderNumber: row.first_order,
        storeName: row.store_name,
        hoursWaiting,
      });

      // Mark which reminder was sent
      if (shouldRemindAt48) {
        db.markReminderSent(row.product_name_key, "48");
        console.log(`⚠️ 48hr urgent reminder sent for "${row.product_title}"`);
      } else if (shouldRemindAt24) {
        db.markReminderSent(row.product_name_key, "24");
        console.log(`🔔 24hr reminder sent for "${row.product_title}"`);
      }
    } catch (err) {
      console.error(`❌ Failed to send reminder for "${row.product_title}":`, err.message);
    }
  }

  console.log(`✅ Reminder check done. Checked ${pending.length} pending item(s).`);
}

// Run every hour
function startReminderScheduler() {
  console.log("⏰ Reminder scheduler started (runs every hour)");
  runReminderCheck(); // run once immediately on startup
  setInterval(runReminderCheck, 60 * 60 * 1000); // then every hour
}

module.exports = { startReminderScheduler, runReminderCheck };
