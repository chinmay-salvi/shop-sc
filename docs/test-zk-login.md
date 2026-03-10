# How to Test the ZK Login Workflow

End-to-end steps to test the JWT ZK login (id_token stays in browser; only proof is sent to the backend).

---

## Implementation status

| Component | Status | Notes |
|-----------|--------|--------|
| Implicit flow (id_token in browser only) | Done | Frontend uses Google GIS; no id_token sent to backend. |
| Circuit (nullifier, time, aud, email/sig placeholders) | Done | Real RSA-in-circuit and in-circuit @usc.edu DFA are optional next steps. |
| Server-side binding (JWKS + key/aud hash check) | Done | Backend fetches Google JWKS and enforces `googleKeyHash` and `expectedAudHash`. |
| Frontend JWKS → `googleKeyHash` for proof | Done | Client fetches JWKS by JWT `kid` so proof passes server check. |
| Verbose logging | Done | Set `LOG_MODE=verbose` (backend) and `NEXT_PUBLIC_LOG_MODE=verbose` (frontend). |
| Session (JWT with `sub` = nullifier) | Done | Optional: HTTP-only cookie (see [logging-and-env.md](./logging-and-env.md)). |

You can test the full flow end-to-end once circuit artifacts and env are set up below.

---

## Prerequisites

- Node 18+ and npm
- PostgreSQL (e.g. via Docker)
- A **Google account with @usc.edu** (or a Google Cloud project configured for testing)

---

## 1. Google Cloud setup (one-time)

You need a Google OAuth 2.0 Client ID so the frontend can get an id_token.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins:** add **exactly** the origin your app uses:
   - For Next.js dev: `http://localhost:3000` (no trailing slash; port must match).
   - If you use `http://127.0.0.1:3000`, add that as a **separate** origin.
   - Save after adding; changes can take a minute to apply.
5. Save and copy the **Client ID** (e.g. `123456789-xxx.apps.googleusercontent.com`).

---

## 2. Environment variables

**Backend** (`backend/.env`):

- `DB_URL` – PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/shop_sc`).
- `JWT_SECRET` – any secret string (e.g. `dev-secret`).
- `GOOGLE_CLIENT_ID` – **required for ZK path** (server compares `expectedAudHash` to client; use the same value as frontend Client ID).
- `LOG_MODE=verbose` – optional; enables detailed logs at every verification step.

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_USE_JWT_ZK_LOGIN=true` (already set for ZK login).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` – **required**: paste the Client ID from step 1.
- `NEXT_PUBLIC_API_BASE` – optional; defaults to `http://localhost:4000/api`.

Example `frontend/.env.local`:

```bash
NEXT_PUBLIC_USE_JWT_ZK_LOGIN=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

---

## 3. Circuit artifacts (one-time or after circuit changes)

The browser needs the WASM prover and proving key; the backend needs the verification key.

```bash
cd circuits
npm install
npm run build    # Compile circuit (requires circom)
npm run setup   # Trusted setup → verification_key.json + jwt_usc_main_final.zkey
npm run copy-to-frontend
```

Then copy the verification key to the backend:

```bash
cp build/verification_key.json ../backend/src/config/jwt_circuit_vkey.json
```

If `frontend/public/zkp/` already has `jwt_usc_main_js/jwt_usc_main.wasm` and `jwt_usc_main_final.zkey`, and `backend/src/config/jwt_circuit_vkey.json` exists, you can skip this step.

---

## 4. Start services

**Terminal 1 – PostgreSQL:**

```bash
cd shop-sc
docker compose up -d postgres
```

**Terminal 2 – Backend:**

```bash
cd shop-sc
npm run dev:backend
```

Wait until you see: `Backend listening on http://localhost:4000`.

**Terminal 3 – Frontend:**

```bash
cd shop-sc
npm run dev:frontend
```

Wait until Next.js is ready (e.g. `Ready on http://localhost:3000`).

---

## 5. Run the test

1. Open a browser and go to **http://localhost:3000**.
2. You should see:
   - “Sign in with Google (@usc.edu). Your token stays in this browser; only a ZK proof is sent.”
   - A **Sign in with Google** button.
3. Click **Sign in with Google**.
4. Sign in with a **@usc.edu** Google account (or the account allowed by your OAuth consent screen).
5. After Google redirects back:
   - The UI will show something like “Generating ZK proof…”.
   - Proof generation usually takes a few seconds (WASM + prover in the browser).
6. On success:
   - Message: “Signed in. Go to Listings or Chats.”
   - Links appear: **Listings** | **Chats**.
7. Click **Listings** → you should see the listings page (and “My listings” if you create one). The session is keyed by the ZK nullifier; no PII is sent to the backend.

---

## 6. What to check

| Check | How |
|-------|-----|
| ZK path is used | UI shows “Sign in with Google (@usc.edu). Your token stays in this browser…” (no “Enroll” step). |
| Proof is generated | “Generating ZK proof…” appears after Google sign-in; then “Signed in.” |
| Session works | After login, **Listings** and **Chats** are reachable; creating a listing ties it to your nullifier. |
| No id_token to backend | Backend never receives the raw Google JWT; only proof + public inputs/outputs. You can confirm in backend logs (no idToken in request body for `/auth/verify-proof` when using ZK path). |

---

## 7. Troubleshooting

- **“No credential from Google”**  
  Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local` and that `http://localhost:3000` is in Authorized JavaScript origins. Restart the frontend after changing env.

- **“JWT ZK proof not available”**  
  Ensure circuit artifacts are in `frontend/public/zkp/` (run `cd circuits && npm run copy-to-frontend`). Reload the app.

- **Proof fails or “INVALID_PROOF”**  
  Ensure `backend/src/config/jwt_circuit_vkey.json` exists (copy from `circuits/build/verification_key.json`). Restart the backend.

- **“TIMESTAMP_OUT_OF_RANGE”**  
  Server and client clocks differ by more than ~2 minutes. Sync time or increase `ZKP_TIME_SKEW_SECONDS` in the backend (e.g. in `.env`).

- **“GOOGLE_KEY_HASH_MISMATCH”**  
  Client’s `googleKeyHash` is not in the current Google JWKS. Ensure frontend can reach `https://www.googleapis.com/oauth2/v3/certs`; backend fetches the same URL. If you see this in dev, check network/CORS; backend uses server-side fetch.

- **“EXPECTED_AUD_HASH_MISMATCH”**  
  Backend `GOOGLE_CLIENT_ID` must match the frontend Client ID used to sign in. Set `GOOGLE_CLIENT_ID` in `backend/.env` to the same value as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

- **“JWKS_FETCH_FAILED” / “JWKS_NO_KEYS”**  
  Backend could not fetch or parse Google’s JWKS. Check outbound HTTPS from the backend to `www.googleapis.com`.

- **Google button missing**  
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is missing or empty. Rebuild/restart the frontend after setting it.

---

## 8. Optional: test legacy flow

To test the **Semaphore** flow (enroll with idToken, then verify proof):

1. In `frontend/.env.local`, set `NEXT_PUBLIC_USE_JWT_ZK_LOGIN=false` (or remove the line).
2. Restart the frontend.
3. You should see the enroll UI: Google or dev email → Enroll → then “Verify proof (login)”. Backend will receive the idToken on enroll (for hd=usc.edu check only; it is not stored).
