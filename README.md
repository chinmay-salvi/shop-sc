# shop-sc

Privacy-preserving USC-only student marketplace: ZKP-based access, cross-session identity, no PII stored.

## Core guarantees

- **Enrollment:** Google Sign-In (@usc.edu) or dev email; backend verifies token but **never stores** email or Google `sub`.
- **Access:** Client proves membership (ZK proof + stableId); backend issues JWT with `sub = stableId` (stable pseudonym).
- **Data:** Listings and chats keyed by `owner_id` / `sender_id` / `recipient_id` = stableId only. No PII in DB.

## E2E flow

1. **Enroll:** Sign in with Google (@usc.edu) or use dev email → client creates identity, sends `idToken` + `identityCommitment`. Backend verifies token (hd, email_verified), adds commitment to group, discards token.
2. **Login:** Client fetches group root, generates proof, computes stableId → sends proof + stableId → backend verifies, returns JWT with `sub = stableId`.
3. **Listings / Chats:** Create and query by `req.user.sub`; same identity gets same sub across sessions.

## Project layout

- `backend/`: Express API (enroll, group-root, verify-proof, listings, chats).
- `frontend/`: Next.js (Google Sign-In, ZKP proof, listings & chats UI).
- `shared/`: Constants (no PII).
- `docs/`: Architecture and cross-session identity.

## Quick start

1. PostgreSQL: `docker compose up -d` (or set `DB_URL`).
2. Env: copy `backend/.env.example` to `backend/.env`; set `DB_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`. Frontend: `.env.local` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value).
3. Install: `npm install`
4. Backend: `npm run dev:backend`
5. Frontend: `npm run dev:frontend`
6. Optional seed: `npm run init-group`

## Logging

Controlled by env (no PII is ever logged).

- **Backend:** `LOG_MODE=disabled|basic|verbose` in `backend/.env` (default: `basic`).
- **Frontend:** `NEXT_PUBLIC_LOG_MODE=disabled|basic|verbose` in `.env.local` (default: `basic`).

| Mode     | Backend | Frontend |
|----------|---------|----------|
| disabled | No logs from app logger | No logs from app logger |
| basic    | Request method/url/status, auth/zkp outcomes | API path + method, zkp step names |
| verbose  | Basic + body keys, timings, step details | Basic + response keys, durations |
