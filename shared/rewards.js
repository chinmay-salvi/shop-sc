/**
 * Rewards rules (kept in sync with DB aggregation in backend/src/services/rewardsService.js).
 * Tier = f(completed buys + completed sales). Tokens = buys × TOKENS_PER_BUY + sales × TOKENS_PER_SALE.
 */
const TIER_THRESHOLDS = [
  { minTotal: 0, tier: "Bronze" },
  { minTotal: 3, tier: "Silver" },
  { minTotal: 10, tier: "Gold" },
  { minTotal: 25, tier: "Platinum" }
];

const TOKENS_PER_BUY = 10;
const TOKENS_PER_SALE = 15;

function computeTierFromTotal(total) {
  const n = Number(total) || 0;
  let tier = TIER_THRESHOLDS[0].tier;
  for (const t of TIER_THRESHOLDS) {
    if (n >= t.minTotal) tier = t.tier;
  }
  return tier;
}

function computeTokens(buys, sales) {
  return (Number(buys) || 0) * TOKENS_PER_BUY + (Number(sales) || 0) * TOKENS_PER_SALE;
}

/** @param {number} total - completed buys + completed sales */
function nextTierProgress(total) {
  const n = Number(total) || 0;
  const sorted = [...TIER_THRESHOLDS].sort((a, b) => a.minTotal - b.minTotal);
  const next = sorted.find((t) => t.minTotal > n);
  if (!next) {
    return { nextTier: null, tradesUntilNext: 0, atMax: true, nextMinTotal: null };
  }
  return {
    nextTier: next.tier,
    tradesUntilNext: next.minTotal - n,
    atMax: false,
    nextMinTotal: next.minTotal
  };
}

module.exports = {
  TIER_THRESHOLDS,
  TOKENS_PER_BUY,
  TOKENS_PER_SALE,
  computeTierFromTotal,
  computeTokens,
  nextTierProgress
};
