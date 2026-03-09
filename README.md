# ShopSC The Privacy-First USC Marketplace

> Buy and sell within the USC community using zero-knowledge proofs. Your identity is verified, never stored.

![ShopSC](https://img.shields.io/badge/USC-Exclusive-990000?style=for-the-badge)
![ZK Proofs](https://img.shields.io/badge/Zero--Knowledge-Proofs-green?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Zero-PII-blue?style=for-the-badge)

---

## What is ShopSC?

ShopSC is a peer-to-peer marketplace exclusively for USC students and faculty. Instead of asking you to create an account with your name, email, or student ID, ShopSC uses **zero-knowledge proofs** (zk-SNARKs) to verify you belong to the USC community â€” without ever learning who you are.

- âœ… Your `@usc.edu` email is verified in-circuit â€” it never leaves your browser
- âœ… No names, no emails, no student IDs stored in the database
- âœ… Each user gets a stable anonymous pseudonym derived from their ZK identity
- âœ… Listings, purchases, and messages happen between anonymous Trojans

---

## How the ZK Auth Works

```
Browser                              Backend
  â”‚                                     â”‚
  â”‚  1. Generate Semaphore Identity      â”‚
  â”‚     (random keypair, stored locally) â”‚
  â”‚                                     â”‚
  â”‚  2. Enroll: send commitment only â”€â”€â–ºâ”‚ Add commitment to Merkle group
  â”‚     (no email sent to backend)       â”‚
  â”‚                                     â”‚
  â”‚  3. Generate ZK proof locally        â”‚
  â”‚     - Fetches group root        â—„â”€â”€â”€â”‚
  â”‚     - Builds Merkle witness          â”‚
  â”‚     - Groth16 proof in browser       â”‚
  â”‚                                     â”‚
  â”‚  4. Send proof + stableId â”€â”€â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚ Verify proof on-chain style
  â”‚     (no email, no sub, no PII)       â”‚ Issue JWT session token
  â”‚                                     â”‚
  â”‚â—„â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ JWT token â”€â”€â”€â”€â”€ â”‚
```

The backend **never** sees your email. It only receives a cryptographic proof that you possess a valid USC identity.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ZK Proofs | Semaphore Protocol (Groth16 / snarkjs) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (session) + ZK proof (identity) |
| Identity | `@semaphore-protocol/identity` |

---

## Project Structure

```
shopsc-full/
â”œâ”€â”€ frontend-ui/               # Vite + React frontend
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”‚   â”œâ”€â”€ pages/         # home, marketplace, auth, profile, create-listing
â”‚   â”‚   â”‚   â”œâ”€â”€ components/    # navigation, AuthContext, UI components
â”‚   â”‚   â”‚   â””â”€â”€ routes.ts
â”‚   â”‚   â””â”€â”€ lib/
â”‚   â”‚       â”œâ”€â”€ zkp.ts         # All ZK proof logic (runs in browser)
â”‚   â”‚       â”œâ”€â”€ api.ts         # API fetch wrapper
â”‚   â”‚       â”œâ”€â”€ auth.ts        # JWT token storage
â”‚   â”‚       â””â”€â”€ logger.ts      # Configurable log levels
â”‚   â””â”€â”€ .env.local             # Frontend environment config
â”‚
â””â”€â”€ backend/
    â”œâ”€â”€ backend/               # Express API server
    â”‚   â”œâ”€â”€ src/
    â”‚   â”‚   â”œâ”€â”€ controllers/   # authController, listingController
    â”‚   â”‚   â”œâ”€â”€ services/      # zkpService, groupManager, googleAuth
    â”‚   â”‚   â”œâ”€â”€ middleware/    # validateProof, authenticate
    â”‚   â”‚   â”œâ”€â”€ models/        # nullifier, identityBackup, listing
    â”‚   â”‚   â””â”€â”€ routes/        # auth, listings, chat
    â”‚   â””â”€â”€ .env               # Backend environment config
    â””â”€â”€ circuits/              # Circom ZK circuits (JWT path)
```

---

## Prerequisites

- **Node.js** v18 or higher â€” [download](https://nodejs.org)
- **PostgreSQL** â€” [download](https://www.postgresql.org/download/)

Check versions:
```bash
node --version   # should be 18+
psql --version
```

---

## Installation & Setup

### 1. Clone or extract the project

```bash
unzip shopsc-full.zip
cd shopsc-full
```

### 2. Set up the database

```bash
# Create the postgres user (if it doesn't exist)
createuser -s postgres

# Create the database
createdb shopsc
```

If PostgreSQL isn't running:
```bash
# macOS
brew services start postgresql@14

# Linux
sudo service postgresql start
```

### 3. Configure environment files

**Backend** â€” `backend/backend/.env`:
```env
DB_URL=postgresql://postgres:postgres@localhost:5432/shopsc
JWT_SECRET=shopsc-dev-secret-change-in-production
GOOGLE_CLIENT_ID=
LOG_MODE=basic
PORT=4000
```

**Frontend** â€” `frontend-ui/.env.local`:
```env
VITE_API_BASE=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=
VITE_LOG_MODE=basic
VITE_ZKP_APP_PEPPER=shop-sc-pepper-v1
VITE_USE_JWT_ZK_LOGIN=false
```

### 4. Install dependencies

**Backend:**
```bash
cd backend/backend
npm install
```

**Frontend:**
```bash
cd frontend-ui
npm install
npm install @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof snarkjs
```

---

## Running the App

Open **two terminal windows**.

**Terminal 1 â€” Backend:**
```bash
cd shopsc-full/backend/backend
node src/server.js
```
Expected output: `Server running on port 4000`

**Terminal 2 â€” Frontend:**
```bash
cd shopsc-full/frontend-ui
npm run dev
```
Expected output: `Local: http://localhost:5173`

Open **http://localhost:5173** in your browser.

---

## Auth Flow (Dev Mode)

Since Google OAuth requires a live domain, development uses an email-based enrollment path:

1. Go to `http://localhost:5173/auth`
2. Click **Dev email enroll**
3. Enter any `@usc.edu` address (e.g. `test@usc.edu`)
4. Click **Enroll Anonymously** â€” this creates your Semaphore identity and registers it with the backend group
5. Click **Verify & Get Session** â€” a Groth16 ZK proof is generated entirely in your browser
6. You're redirected to the marketplace as a verified anonymous Trojan
7. Click your **profile avatar** (top right) for the dropdown menu with Sign Out

---

## API Reference

### Auth Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/enroll` | Register an identity commitment |
| `POST` | `/api/auth/verify-proof` | Submit ZK proof, receive JWT |
| `POST` | `/api/auth/backup-identity` | AES-GCM encrypted identity backup |
| `POST` | `/api/auth/recover-identity` | Restore identity from backup |

### Listing Routes (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/listings` | Browse marketplace listings |
| `POST` | `/api/listings` | Create a new listing |
| `DELETE` | `/api/listings/:id` | Remove your listing |

### Group Route

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/group` | Fetch Merkle group root + commitments |

---

## Privacy Design

| What | How |
|------|-----|
| USC verification | Email checked in ZK circuit â€” never transmitted |
| Identity | Semaphore keypair, generated and stored locally in browser |
| Pseudonym | SHA-256(commitment + domain) â€” stable across sessions, unlinkable to email |
| Sessions | Short-lived JWT signed with nullifier hash |
| Replay prevention | Nullifier stored in DB after first use |
| Backups | AES-GCM encrypted with user password, key never leaves browser |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '.../server.js'` | Wrong directory | `cd backend/backend` then run |
| `role "postgres" does not exist` | Missing DB user | `createuser -s postgres` |
| `database "shopsc" does not exist` | Missing DB | `createdb shopsc` |
| `Failed to fetch` | Backend not running | Start backend first |
| `leaf at index -1` | Identity not in group | Clear localStorage, re-enroll |
| `PROOF_REPLAY_DETECTED` | Nullifier already used | Clear localStorage + DB (see below) |
| Port 5173 in use | Another process | `npm run dev -- --port 3000` |

### Reset everything (dev)

Clear browser storage:
1. DevTools â†’ Application tab â†’ Local Storage â†’ `http://localhost:5173`
2. Select all keys â†’ Delete

Clear the database:
```bash
cd backend/backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/shopsc' });
pool.query('TRUNCATE nullifiers, identity_commitments RESTART IDENTITY CASCADE', (err) => {
  console.log(err || 'Database cleared');
  pool.end();
});
"
```

---

## Production Checklist

- [ ] Replace `JWT_SECRET` with a strong random secret
- [ ] Set `GOOGLE_CLIENT_ID` to your real Google OAuth client ID
- [ ] Enable `VITE_USE_JWT_ZK_LOGIN=true` for full JWT ZK circuit path
- [ ] Run circuit setup: `cd backend/circuits && npm run setup`
- [ ] Copy circuit artifacts: `npm run copy-to-frontend`
- [ ] Use HTTPS (required for Google OAuth)
- [ ] Set `VITE_LOG_MODE=disabled` in production
- [ ] Use a managed PostgreSQL instance (not local)

---

## License

MIT â€” built for the USC community. Fight On! âœŒï¸
