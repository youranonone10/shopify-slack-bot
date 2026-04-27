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

  // ── WINTER EARLY STORES (3 stores) ───────────────────────────────────────
  {
    domain: "u0kuam-k7.myshopify.com",    // ← replace with real domain
    name: "ThreadRevolution",
    supplier: "winter",
    webhookSecret: process.env.WEBHOOK_SECRET_WINTER1,
  },
];

module.exports = STORES;
