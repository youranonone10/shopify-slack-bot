/**
 * STORE CONFIGURATION
 *
 * Each store is linked to a supplier group.
 * Supplier group controls:
 *  - which Slack channel gets the message
 *  - which suppliers are tagged in the message
 *
 * SUPPLIER GROUPS:
 *  "arin_cheny"  → posts to SLACK_CHANNEL_ARIN   → tags @Arin & @Cheny
 *  "winter"      → posts to SLACK_CHANNEL_WINTER  → tags @Winter
 *
 * HOW TO ADD A STORE:
 *  1. Copy one of the entries below
 *  2. Set the correct domain, name, supplier, and webhookSecret env var
 */

const STORES = [

  // ── ARIN & CHENY STORES (7-8 stores) ─────────────────────────────────────
  {
    domain: "x6d11a-x1.myshopify.com",        // ← your real store domain
    name: "Urban Couture",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE1,
  },
  {
    domain: "1mswpm-7e.myshopify.com",      // ← replace with real domain
    name: "BARMUNDA FASHION",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE2,
  },
  {
    domain: "arin-store-3.myshopify.com",      // ← replace with real domain
    name: "Store 3",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE3,
  },
  {
    domain: "arin-store-4.myshopify.com",      // ← replace with real domain
    name: "Store 4",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE4,
  },
  {
    domain: "arin-store-5.myshopify.com",      // ← replace with real domain
    name: "Store 5",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE5,
  },
  {
    domain: "arin-store-6.myshopify.com",      // ← replace with real domain
    name: "Store 6",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE6,
  },
  {
    domain: "arin-store-7.myshopify.com",      // ← replace with real domain
    name: "Store 7",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE7,
  },
  {
    domain: "arin-store-8.myshopify.com",      // ← replace with real domain
    name: "Store 8",
    supplier: "arin_cheny",
    webhookSecret: process.env.WEBHOOK_SECRET_STORE8,
  },

  // ── WINTER EARLY STORES (3 stores) ───────────────────────────────────────
  {
    domain: "u0kuam-k7.myshopify.com",    // ← replace with real domain
    name: "ThreadRevolution",
    supplier: "winter",
    webhookSecret: process.env.WEBHOOK_SECRET_WINTER1,
  },
  {
    domain: "winter-store-2.myshopify.com",    // ← replace with real domain
    name: "Winter Store 2",
    supplier: "winter",
    webhookSecret: process.env.WEBHOOK_SECRET_WINTER2,
  },
  {
    domain: "winter-store-3.myshopify.com",    // ← replace with real domain
    name: "Winter Store 3",
    supplier: "winter",
    webhookSecret: process.env.WEBHOOK_SECRET_WINTER3,
  },

];

module.exports = STORES;
