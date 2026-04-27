# Shopify → Slack Size Chart Bot

Automatically asks your supplier for a size chart on Slack whenever a new order 
is placed on any of your Shopify stores — but only once per product, never twice.

---

## How It Works

1. Customer places an order on any Shopify store
2. Shopify sends a webhook to this server
3. Server checks: has this product's size chart already been requested?
   - **YES** → do nothing (already asked)
   - **NO** → post to Slack, tag your supplier, mark as done
4. Supplier sees the Slack message and provides the size chart

---

## Setup Guide (Step by Step)

### Step 1 — Deploy the Server (Free on Railway)

1. Go to **railway.app** and sign up (free)
2. Click "New Project" → "Deploy from GitHub repo"
3. Upload this code folder or connect your GitHub
4. Railway will give you a public URL like `https://your-app.railway.app`

### Step 2 — Create Your Slack Bot

1. Go to **api.slack.com/apps** → "Create New App" → "From scratch"
2. Name it "Size Chart Bot", pick your workspace
3. Go to **OAuth & Permissions** → under "Bot Token Scopes" add:
   - `chat:write`
   - `chat:write.public`
4. Click "Install to Workspace" → copy the **Bot Token** (starts with `xoxb-`)
5. Invite the bot to your Slack channel: type `/invite @SizeChartBot` in the channel

### Step 3 — Get Your Slack IDs

**Channel ID:**
- Right-click your Slack channel → "View channel details" → scroll to bottom → copy ID

**Supplier User ID:**
- Click on your supplier's Slack profile → "More" → "Copy member ID"

### Step 4 — Set Up Shopify Webhooks

Do this for **each** of your Shopify stores:

1. Go to Shopify Admin → **Settings → Notifications → Webhooks**
2. Click "Create webhook"
3. Event: **Order creation**
4. Format: **JSON**
5. URL: `https://your-app.railway.app/webhook/order-created`
6. Click Save → copy the **Signing secret** shown

### Step 5 — Add Environment Variables

In Railway, go to your project → Variables tab → add these:

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNEL_ID=C0123456789
SUPPLIER_SLACK_USER_ID=U0123456789
WEBHOOK_SECRET_STORE1=secret-from-shopify-store-1
WEBHOOK_SECRET_STORE2=secret-from-shopify-store-2
WEBHOOK_SECRET_STORE3=secret-from-shopify-store-3
```

### Step 6 — Add Your Stores

Edit `src/stores.js` and add each of your stores:

```js
{
  domain: "your-store.myshopify.com",  // exact Shopify domain
  name: "Store UK",                     // shown in Slack messages
  webhookSecret: process.env.WEBHOOK_SECRET_STORE1,
}
```

### Step 7 — Deploy and Test

1. Place a test order on one of your stores
2. Check your Slack channel — you should see the message
3. Place another order for the **same product** → no message (correct!)

---

## What the Slack Message Looks Like

```
📦 Size Chart Request
─────────────────────
Store:       Store UK
Order #:     4521
Product:     Nike Air Hoodie
Variant:     Black / XL
SKU:         NAH-BLK-XL
Product ID:  7829103456

@Dayone Please provide the size chart for this product. 🙏
```

---

## Managing Requests

If you ever want to **re-request** a size chart for a product 
(e.g. supplier sent wrong one), delete it from the database:

Open the Railway terminal and run:
```
node -e "const db = require('./src/database'); db.removeRequest('PRODUCT_ID_HERE')"
```

---

## Cost

| Service | Cost |
|---------|------|
| Railway hosting | Free (up to 500 hrs/month) |
| SQLite database | Free (file on server) |
| Slack bot | Free |
| **Total** | **$0/month** |

---

## Files Explained

```
index.js              → App entry point, loads config, starts server
src/server.js         → Express server, receives Shopify webhooks
src/sizeChartHandler.js → Core logic: check DB → post Slack
src/database.js       → SQLite DB: tracks requested products
src/slackBot.js       → Formats and sends Slack messages
src/stores.js         → Your Shopify store configurations
.env.example          → Template for your environment variables
```
