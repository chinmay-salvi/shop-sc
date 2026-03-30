const {
  computeTierFromTotal,
  computeTokens
} = require("../../../shared/rewards");

function computeTier(buys, sales) {
  const total = (Number(buys) || 0) + (Number(sales) || 0);
  return computeTierFromTotal(total);
}

/**
 * @param {import("pg").Pool} db
 * @param {string} stableId
 * @returns {Promise<{ stable_id: string, tier: string, tokens: number, buys: number, sales: number, updated_at: Date } | null>}
 */
async function refreshRewards(db, stableId) {
  const buyerRes = await db.query(
    `SELECT COUNT(*)::int AS n FROM transactions WHERE buyer_id = $1 AND status = 'completed'`,
    [stableId]
  );
  const sellerRes = await db.query(
    `SELECT COUNT(*)::int AS n FROM transactions WHERE seller_id = $1 AND status = 'completed'`,
    [stableId]
  );

  const buys = buyerRes.rows[0]?.n ?? 0;
  const sales = sellerRes.rows[0]?.n ?? 0;
  const tier = computeTier(buys, sales);
  const tokens = computeTokens(buys, sales);

  const result = await db.query(
    `INSERT INTO user_rewards (stable_id, successful_buys, successful_sales, token_balance, tier, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (stable_id) DO UPDATE SET
       successful_buys = EXCLUDED.successful_buys,
       successful_sales = EXCLUDED.successful_sales,
       token_balance = EXCLUDED.token_balance,
       tier = EXCLUDED.tier,
       updated_at = NOW()
     RETURNING stable_id, successful_buys, successful_sales, token_balance, tier, updated_at`,
    [stableId, buys, sales, tokens, tier]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    stable_id: row.stable_id,
    tier: row.tier,
    tokens: row.token_balance,
    buys: row.successful_buys,
    sales: row.successful_sales,
    updated_at: row.updated_at
  };
}

module.exports = {
  refreshRewards
};
