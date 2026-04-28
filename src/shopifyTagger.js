/**
 * FEATURE 6 — Auto-Tag Shopify Orders
 *
 * When a size chart is requested → tags the Shopify order with "size-chart-pending"
 * When size chart is received   → updates tag to "size-chart-done"
 *
 * This lets you filter orders in Shopify Admin by tag to see
 * which orders are waiting for size charts and which are complete.
 *
 * Requires: SHOPIFY_ACCESS_TOKEN_{STORE} env variables
 */

const STORES = require("./stores");

// Build a map of store name → domain for easy lookup
function getStoreDomain(storeName) {
  const store = STORES.find((s) => s.name === storeName);
  return store ? store.domain : null;
}

// Get the Shopify access token for a specific store domain
function getAccessToken(domain) {
  // Map store domain to its env variable
  // Format: SHOPIFY_TOKEN_storename (letters only, uppercase)
  const key = "SHOPIFY_TOKEN_" + domain.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return process.env[key];
}

/**
 * Fetch current tags on an order and add a new tag
 */
async function tagShopifyOrder(storeName, orderNumber, newTag) {
  const domain = getStoreDomain(storeName);
  if (!domain) {
    console.log(`⚠️ Cannot tag order — unknown store name: ${storeName}`);
    return;
  }

  const accessToken = getAccessToken(domain);
  if (!accessToken) {
    console.log(`⚠️ No Shopify access token for ${domain} — skipping tag`);
    return;
  }

  try {
    // Step 1: Find the order ID by order number
    const searchRes = await fetch(
      `https://${domain}/admin/api/2026-04/orders.json?name=%23${orderNumber}&status=any`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );
    const searchData = await searchRes.json();
    const order = searchData.orders?.[0];
    if (!order) {
      console.log(`⚠️ Order #${orderNumber} not found in ${storeName}`);
      return;
    }

    // Step 2: Build updated tag list
    const existingTags = order.tags ? order.tags.split(", ").map((t) => t.trim()) : [];

    // Remove opposite tag if present
    const oppositeTag = newTag === "size-chart-done" ? "size-chart-pending" : "size-chart-done";
    const filteredTags = existingTags.filter((t) => t !== oppositeTag && t !== newTag);
    filteredTags.push(newTag);

    // Step 3: Update the order
    const updateRes = await fetch(
      `https://${domain}/admin/api/2026-04/orders/${order.id}.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ order: { id: order.id, tags: filteredTags.join(", ") } }),
      }
    );

    const updateData = await updateRes.json();
    if (updateData.order) {
      console.log(`🏷️  Tagged order #${orderNumber} in ${storeName} with "${newTag}"`);
    } else {
      console.error(`Failed to tag order:`, updateData);
    }
  } catch (err) {
    console.error(`❌ Shopify tagging error for order #${orderNumber}:`, err.message);
  }
}

module.exports = { tagShopifyOrder };
