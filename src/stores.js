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
    domain: "herohonda-2.myshopify.com",
    name: "herohonda",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE1,
  },
  {
    domain: "your-store-2.myshopify.com",
    name: "Store US",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE2,
  },
  {
    domain: "your-store-3.myshopify.com",
    name: "Store AE",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE3,
  },
  // ← Add more stores here following the same pattern
];

module.exports = STORES;
