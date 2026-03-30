#!/usr/bin/env node
/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { pool, ensureSchema } = require("../src/config/database");
const { refreshRewards } = require("../src/services/rewardsService");

const USERS = [
  { stableId: process.env.SUB || 'fallback_test_id', buys: 5, sales: 5 },
];

const GHOST = "f".repeat(64);

async function ensureSeedListingId() {
  const existing = await pool.query("SELECT id FROM listings ORDER BY id ASC LIMIT 1");
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO listings (owner_id, title, deleted_at) VALUES ($1, $2, NOW()) RETURNING id`,
    [GHOST, "[seed] rewards anchor"]
  );
  return ins.rows[0].id;
}

async function main() {
  await ensureSchema();
  const listingId = await ensureSeedListingId();

  for (const { stableId, buys, sales } of USERS) {
    await pool.query(`DELETE FROM transactions WHERE buyer_id = $1 OR seller_id = $1`, [stableId]);
    for (let i = 0; i < buys; i++) {
      await pool.query(
        `INSERT INTO transactions (listing_id, buyer_id, seller_id, status) VALUES ($1, $2, $3, 'completed')`,
        [listingId, stableId, GHOST]
      );
    }
    for (let j = 0; j < sales; j++) {
      await pool.query(
        `INSERT INTO transactions (listing_id, buyer_id, seller_id, status) VALUES ($1, $2, $3, 'completed')`,
        [listingId, GHOST, stableId]
      );
    }
    const row = await refreshRewards(pool, stableId);
    console.log("Seeded", stableId.slice(0, 12) + "…", row);
    if (row) {
      console.log(
        `  → ${row.buys} buys + ${row.sales} sales = ${row.buys + row.sales} total trades | tier: ${row.tier} | tokens: ${row.tokens}`
      );
    }
  }

  await refreshRewards(pool, GHOST);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
