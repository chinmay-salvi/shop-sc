# ShopSC — The Privacy-First USC Marketplace

> Buy and sell within the USC community using zero-knowledge proofs. Your identity is verified, never stored.

![ShopSC](https://img.shields.io/badge/USC-Exclusive-990000?style=for-the-badge)
![ZK Proofs](https://img.shields.io/badge/Zero--Knowledge-Proofs-green?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Zero-PII-blue?style=for-the-badge)

---

## What is ShopSC?

ShopSC is a peer-to-peer marketplace exclusively for USC students and faculty. Instead of asking you to create an account with your name, email, or student ID, ShopSC uses **zero-knowledge proofs** (zk-SNARKs) to verify you belong to the USC community — without ever learning who you are.

- ✅ Your `@usc.edu` email is verified via Google OAuth — it never leaves your browser
- ✅ No names, no emails, no student IDs stored in the database
- ✅ Each user gets a stable anonymous pseudonym derived from their ZK identity
- ✅ Same anonymous ID across sessions — log out and back in, same identity
- ✅ Identity backup/recovery so you never lose access across devices

---

## How the ZK Auth Works

```
Browser                                    Backend
  │                                           │
  │  1. Sign in with Google (@usc.edu)        │
  │     Google popup → access token           │
  │                                           │
  │  2. Enroll: verify USC domain ───────────►│ Check @usc.edu via Google userinfo
  │     Send identity commitment only         │ Add commitment to Merkle group
  │     (no email sent or stored)             │
  │                                           │
  │  3. Generate ZK proof locally             │
  │     - Fetch group Merkle root        ◄───│
  │     - Build Merkle witness                │
  │     - Groth16 proof in browser            │
  │                                           │
  │  4. Send proof + stableId ───────────────►│ Verify proof cryptographically
  │     (no email, no sub, no PII)            │ Issue JWT session token
  │                                           │
  │ ◄──────────────────── JWT token ─────────│
```

The backend **never** sees your email. It only receives a cryptographic proof that you have a valid USC Google account.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Google OAuth | `@react-oauth/google` |
| ZK Proofs | Semaphore Protocol (Groth16 / snarkjs) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (session) + ZK proof (identity) |

---

## Project Structure

```
shopsc-full/
├── frontend-ui/                  # Vite + React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/            # home, marketplace, auth, profile, create-listing
│   │   │   ├── components/       # navigation, AuthContext, UI components
│   │   │   └── routes.ts
│   │   ├── lib/
│   │   │   ├── zkp.ts            # All ZK proof logic (runs in browser)
│   │   │   ├── api.ts            # API fetch wrapper
│   │   │   ├── auth.ts           # JWT token storage + logout
│   │   │   └── logger.ts         # Configurable log levels
│   │   ├── main.tsx              # App entry + GoogleOAuthProvider
│   │   └── vite-env.d.ts         # Vite env type declarations
│   ├── tsconfig.json
│   └── .env.local                # Frontend environment config
│
└── backend/
    └── backend/                  # Express API server
        ├── src/
        │   ├── controllers/      # authController, listingController
        │   ├── services/         # zkpService, groupManager, googleAuth
        │   ├── middleware/        # validateProof, authenticate
        │   ├── models/           # nullifier, identityBackup, listing
        │   └── routes/           # auth, listings, chat
        ├── data/
        │   └── usc_group.json    # Semaphore group (Merkle tree)
        └── .env                  # Backend environment config
```

---

## Prerequisites

- **Node.js** v18 or higher — [download](https://nodejs.org)
- **PostgreSQL** running locally — [download](https://www.postgresql.org/download/)
- **Google OAuth client ID** — see setup below

Check versions:
```bash
node --version    # should be 18+
psql --version
```

---

## Installation & Setup

### 1. Extract and enter the project

```bash
unzip shopsc-full.zip
cd shopsc-full
```

### 2. Set up PostgreSQL

```bash
# Create the postgres user (if it doesn't exist)
createuser -s postgres

# Create the database
createdb shopsc
```

Start PostgreSQL if it isn't running:
```bash
# macOS
brew services start postgresql@14

# Linux
sudo service postgresql start
```

### 3. Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `ShopSC`
   - Add your email as support email
   - Add your `@usc.edu` as a test user
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173`
5. Copy the **Client ID**

### 4. Configure environment files

**Frontend** — `frontend-ui/.env.local`:
```env
VITE_API_BASE=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_LOG_MODE=basic
VITE_ZKP_APP_PEPPER=shop-sc-pepper-v1
VITE_USE_JWT_ZK_LOGIN=false
```

**Backend** — `backend/backend/.env`:
```env
DB_URL=postgresql://postgres:postgres@localhost:5432/shopsc
JWT_SECRET=shopsc-dev-secret-change-in-production
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
LOG_MODE=basic
PORT=4000
```

### 5. Install dependencies

**Backend:**
```bash
cd backend/backend
npm install
```

**Frontend:**
```bash
cd frontend-ui
npm install
npm install @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof snarkjs @react-oauth/google
```

---

## Running the App

Open **two terminal windows**.

**Terminal 1 — Backend:**
```bash
cd shopsc-full/backend/backend
node src/server.js
```
Expected: `✅ USC Group loaded (0 members)` and `Backend listening on http://localhost:4000`

**Terminal 2 — Frontend:**
```bash
cd shopsc-full/frontend-ui
npm run dev
```
Expected: `Local: http://localhost:5173`

Open **http://localhost:5173** in your browser.

---

## Auth Flow

### Production (Google OAuth)
1. Go to `/auth`
2. Click **Continue with Google (@usc.edu)**
3. Sign in with your real USC Google account
4. USC domain is verified — anonymous Semaphore identity created
5. Click **Verify & Get Session** — ZK proof generated in browser
6. Redirected to marketplace as a verified anonymous Trojan

### Development (no Google account needed)
1. Go to `/auth`
2. Click **Dev email enroll**
3. Enter any `@usc.edu` address (e.g. `test@usc.edu`)
4. Click **Enroll Anonymously**
5. Click **Verify & Get Session**

### Identity Backup (important!)
Your anonymous identity lives **only in your browser**. If you clear browser data or switch devices, set a backup password on the verify screen. You can recover your exact same identity on any device using that password.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `identity_commitments` | Semaphore commitments (no PII) |
| `used_nullifiers` | One-time proof nullifiers (replay prevention) |
| `revoked_nullifiers` | Banned identities |
| `identity_backups` | AES-GCM encrypted identity blobs |
| `listings` | Marketplace listings |
| `messages` | Anonymous messages between users |

---

## API Reference

### Auth Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/enroll` | Register identity commitment |
| `POST` | `/api/auth/verify-proof` | Submit ZK proof, receive JWT |
| `POST` | `/api/auth/backup-identity` | Encrypted identity backup |
| `POST` | `/api/auth/recover-identity` | Restore identity from backup |

### Group Route

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/group` | Fetch Merkle group commitments + root |

### Listing Routes (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/listings` | Browse marketplace |
| `POST` | `/api/listings` | Create listing |
| `DELETE` | `/api/listings/:id` | Remove listing |

---

## Privacy Design

| What | How |
|------|-----|
| USC verification | Email checked via Google userinfo — never transmitted to our backend |
| Identity | Semaphore keypair, generated and stored locally in browser only |
| Pseudonym | SHA-256(commitment + domain) — stable, unlinkable to email |
| Sessions | Short-lived JWT signed with nullifier hash |
| Replay prevention | Nullifier stored in DB after first use |
| Re-login | Same nullifier = same identity, re-issues JWT without re-verification |
| Backups | AES-GCM encrypted with user password — server cannot decrypt |

---

## Useful Commands

**Check database contents:**
```bash
cd backend/backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/shopsc' });
async function check() {
  const tables = ['identity_commitments', 'used_nullifiers', 'identity_backups', 'listings'];
  for (const t of tables) {
    const r = await pool.query('SELECT COUNT(*) FROM ' + t);
    console.log(t + ': ' + r.rows[0].count + ' rows');
  }
  pool.end();
}
check().catch(console.error);
"
```

**Reset everything (fresh start):**
```bash
# Clear database
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/shopsc' });
pool.query('TRUNCATE identity_commitments, used_nullifiers, revoked_nullifiers, used_jwt_proofs, identity_backups, listings, messages RESTART IDENTITY CASCADE', (err) => {
  console.log(err || '✅ Database cleared');
  pool.end();
});
"

# Clear group file
echo '{"members":[],"root":"0"}' > data/usc_group.json
```
Then clear localStorage in browser DevTools → Application → Local Storage → Clear All.

**Kill backend if port 4000 is busy:**
```bash
lsof -ti :4000 | xargs kill -9
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `EADDRINUSE: port 4000` | Old backend still running | `lsof -ti :4000 \| xargs kill -9` |
| `Cannot find module '.../server.js'` | Wrong directory | `cd backend/backend` then run |
| `role "postgres" does not exist` | Missing DB user | `createuser -s postgres` |
| `Failed to fetch` | Backend not running | Start backend first |
| `leaf at index -1` | Identity not in group | Clear localStorage + DB, re-enroll |
| `PROOF_REPLAY_DETECTED` | Old code — should be fixed | Update `zkpService.js` |
| Google button grayed out | Client ID not set | Add `VITE_GOOGLE_CLIENT_ID` to `.env.local` |
| Google: `access_denied` | Not added as test user | Add your email in Google Cloud Console → OAuth consent screen → Test users |

---

## Going to Production

- [ ] Replace `JWT_SECRET` with a strong random secret
- [ ] Add your production domain to Google OAuth authorized origins
- [ ] Publish the Google OAuth app (OAuth consent screen → Publish App)
- [ ] Use HTTPS (required for Google OAuth in production)
- [ ] Use a managed PostgreSQL instance
- [ ] Set `VITE_LOG_MODE=disabled`
- [ ] Set strong `VITE_ZKP_APP_PEPPER` value

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push and open a pull request

---

## License

MIT — built for the USC community. Fight On! ✌️
