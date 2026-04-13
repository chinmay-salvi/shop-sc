#!/usr/bin/env node
/**
 * Dev seed script — creates two test users, sample listings, and a conversation.
 * Prints JWT tokens you can paste into localStorage to log in without ZKP.
 *
 * Usage:  node backend/scripts/seedDev.js
 */
/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const jwt = require("jsonwebtoken");
const { pool, ensureSchema } = require("../src/config/database");

const SECRET = process.env.JWT_SECRET || "dev-secret";

// Two stable pseudonymous IDs (64-char hex)
const USER_A = "aaaa" + "0".repeat(60);
const USER_B = "bbbb" + "0".repeat(60);

const LISTINGS = [
  {
    owner_id: USER_A,
    title: "MacBook Pro 14\" M3 — Like New",
    description: "Used for one semester. No scratches, comes with original charger and box.",
    price: 1400,
    category: "Electronics",
    condition: "Like New",
    location: "Leavey Library",
  },
  {
    owner_id: USER_A,
    title: "CSCI 270 Textbook",
    description: "Introduction to Algorithms (4th Ed). Highlighted but all pages intact.",
    price: 35,
    category: "Books",
    condition: "Good",
    location: "Ronald Tutor Hall",
  },
  {
    owner_id: USER_B,
    title: "Desk Lamp — LED",
    description: "Adjustable brightness, USB-C powered. Great for dorm rooms.",
    price: 20,
    category: "Furniture",
    condition: "Good",
    location: "Parkside IRC",
  },
  {
    owner_id: USER_B,
    title: "Calculus Early Transcendentals",
    description: "Stewart 8th edition. Some highlighting in chapters 1-4.",
    price: 25,
    category: "Books",
    condition: "Fair",
    location: "Doheny Library",
  },
  {
    owner_id: USER_A,
    title: "Trek Marlin 5 Bike",
    description: "21-speed mountain bike. Perfect for commuting around campus.",
    price: 280,
    category: "Sports",
    condition: "Good",
    location: "Parking Lot X",
  },
];

const MESSAGES = [
  { sender_id: USER_B, recipient_id: USER_A, body: "Hey, is the MacBook still available?" },
  { sender_id: USER_A, recipient_id: USER_B, body: "Yes! It's in great condition. Want to meet up?" },
  { sender_id: USER_B, recipient_id: USER_A, body: "Sounds good — can we do Leavey tomorrow at 3pm?" },
  { sender_id: USER_A, recipient_id: USER_B, body: "Works for me, see you then!" },
];

async function main() {
  await ensureSchema();

  // Clear existing dev data
  await pool.query(`DELETE FROM messages WHERE sender_id IN ($1, $2) OR recipient_id IN ($1, $2)`, [USER_A, USER_B]);
  await pool.query(`DELETE FROM listings WHERE owner_id IN ($1, $2)`, [USER_A, USER_B]);

  // Insert listings
  for (const l of LISTINGS) {
    await pool.query(
      `INSERT INTO listings (owner_id, title, description, price, category, condition, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [l.owner_id, l.title, l.description, l.price, l.category, l.condition, l.location]
    );
  }
  console.log(`✓ Inserted ${LISTINGS.length} listings`);

  // Insert messages (staggered timestamps)
  for (let i = 0; i < MESSAGES.length; i++) {
    const m = MESSAGES[i];
    const ts = new Date(Date.now() - (MESSAGES.length - i) * 5 * 60 * 1000); // 5 min apart
    await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES ($1, $2, $3, $4)`,
      [m.sender_id, m.recipient_id, m.body, ts]
    );
  }
  console.log(`✓ Inserted ${MESSAGES.length} messages`);

  // Generate dev JWTs
  const tokenA = jwt.sign({ sub: USER_A, iss: "shop-sc-dev" }, SECRET, { expiresIn: "7d" });
  const tokenB = jwt.sign({ sub: USER_B, iss: "shop-sc-dev" }, SECRET, { expiresIn: "7d" });

  console.log("\n=== Dev Login Tokens ===");
  console.log("\nUser A (owner of MacBook + bike + textbook):");
  console.log(`  ID: ${USER_A}`);
  console.log(`  Token: ${tokenA}`);
  console.log("\nUser B (owner of lamp + calculus book):");
  console.log(`  ID: ${USER_B}`);
  console.log(`  Token: ${tokenB}`);
  console.log("\n=== How to use in browser ===");
  console.log("Open DevTools → Console → paste:");
  console.log(`  localStorage.setItem('sessionJwt', '<token above>'); location.reload();`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
