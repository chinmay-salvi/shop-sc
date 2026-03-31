const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { pool } = require("../config/database");
const { refreshRewards } = require("../services/rewardsService");

const router = express.Router();

router.get("/me", authenticate, async (req, res) => {
  try {
    const rewards = await refreshRewards(pool, req.user.sub);
    if (!rewards) {
      return res.status(500).json({ error: "REWARDS_UPSERT_FAILED" });
    }
    console.log("[rewards] sub:", req.user.sub, "| tier:", rewards.tier, "| tokens:", rewards.tokens, "| buys:", rewards.buys, "| sales:", rewards.sales);
    return res.json(rewards);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "REWARDS_FAILED" });
  }
});

module.exports = router;
