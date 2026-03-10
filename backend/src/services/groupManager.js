// OFF-CHAIN GROUP MANAGEMENT (NO BLOCKCHAIN)
const { Group } = require("@semaphore-protocol/group");
const { saveGroupToDB, loadGroupFromDB } = require("../models/group");
const { logBasic, logVerbose } = require("../config/logger");

class USCStudentGroup {
  constructor(depth = 20) { // Depth 20 = 1M capacity
    this.group = new Group([], depth);
    this.depth = depth;
    this.isLoaded = false;
  }

  async init() {
    logBasic("group.init started");
    // RECONSTRUCT GROUP FROM DATABASE ON STARTUP (critical for persistence)
    this.group = new Group([], this.depth);
    const commitments = await loadGroupFromDB(); // Returns [{commitment: "0x..."}]
    logVerbose("group.init loaded commitments", { count: commitments.length });
    commitments.forEach(c => this.group.addMember(BigInt(c.commitment)));
    this.isLoaded = true;
    logBasic("group.init done", { members: this.group.size, rootPrefix: this.group.root.toString().slice(0, 16) + "…" });
    console.log(`✅ USC Group loaded (${this.group.size} members)`);
  }

  async addMember(commitment) {
    if (!this.isLoaded) throw new Error("Group not initialized");
    const normalized = BigInt(commitment);
    if (this.group.indexOf(normalized) !== -1) {
      logVerbose("group.addMember skipped", { reason: "already member" });
      return false;
    }
    this.group.addMember(normalized);
    await saveGroupToDB(normalized); // Persist to PostgreSQL
    logVerbose("group.addMember added", { size: this.group.size });
    return true;
  }

  getRoot() {
    return this.group.root.toString();
  }
}

// Singleton export (import anywhere in backend)
const uscGroup = new USCStudentGroup();
module.exports = { uscGroup, initGroup: () => uscGroup.init() };