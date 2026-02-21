#!/usr/bin/env node
/* eslint-disable no-console */
const { ensureSchema } = require("../backend/src/config/database");
const { initGroup, uscGroup } = require("../backend/src/services/groupManager");

async function main() {
  const sampleCommitments = [
    "1001",
    "1002",
    "1003",
    "1004",
    "1005"
  ];

  await ensureSchema();
  await initGroup();

  let added = 0;
  for (const commitment of sampleCommitments) {
    const wasAdded = await uscGroup.addMember(BigInt(commitment));
    if (wasAdded) added += 1;
  }

  console.log(`Seeded commitments: ${added}/${sampleCommitments.length}`);
  console.log(`Current group root: ${uscGroup.getRoot()}`);
  console.log(`✅ USC Group loaded (${uscGroup.group.size} members)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
