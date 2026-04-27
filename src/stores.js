/**
 * STORE CONFIGURATION
 * Add all your Shopify stores here.
 * Each store needs:
 *  - domain: your Shopify store URL
 *  - name: friendly name shown in Slack messages
 *  - webhookSecret: from Shopify > Settings > Notifications > Webhooks
 */

const STORES = [
  {
    domain: "x6d11a-x1.myshopify.com",
    name: "herohonda",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE1,
  },
  // ← Add more stores here following the same pattern
];

module.exports = STORES;
