const { uscGroup } = require("../services/groupManager");
const { logBasic, logVerbose } = require("../config/logger");

function getGroupRoot(_req, res) {
  logVerbose("group.getGroupRoot");
  if (!uscGroup.isLoaded) {
    logBasic("group.getGroupRoot", { error: "GROUP_NOT_INITIALIZED" });
    return res.status(503).json({ error: "GROUP_NOT_INITIALIZED" });
  }
  const root = uscGroup.getRoot();
  logBasic("group.getGroupRoot", { rootPrefix: root.slice(0, 16) + "…" });
  return res.json({ root });
}

function getGroup(_req, res) {
  logVerbose("group.getGroup");
  if (!uscGroup.isLoaded) {
    logBasic("group.getGroup", { error: "GROUP_NOT_INITIALIZED" });
    return res.status(503).json({ error: "GROUP_NOT_INITIALIZED" });
  }
  const commitments = uscGroup.group.members.map((m) => m.toString());
  const depth = uscGroup.depth;
  logBasic("group.getGroup", { commitmentCount: commitments.length, depth });
  return res.json({ commitments, depth });
}

module.exports = {
  getGroupRoot,
  getGroup
};
