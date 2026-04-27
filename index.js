require("dotenv").config();
const STORES = require("./src/stores");

// Make stores available globally
global.STORES = STORES;

// Validate required environment variables on startup
const required = [
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ARIN",
  "SLACK_CHANNEL_WINTER",
  "SLACK_USER_ARIN",
  "SLACK_USER_CHENY",
  "SLACK_USER_WINTER",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:");
  missing.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

console.log(`✅ Loaded ${STORES.length} store(s)`);
STORES.forEach((s) => console.log(`   - ${s.name} (${s.domain})`));

require("./src/server");
