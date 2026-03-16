# shop-sc
Privacy-preserving USC-only student marketplace: ZKP-based access, cross-session identity, no PII stored.

## Core guarantees
* Enrollment: Google Sign-In (@usc.edu) or dev email; backend verifies token but never stores email or Google `sub`.
* Access: Client proves membership (ZK proof + stableId); backend issues JWT with `sub = stableId` (stable pseudonym).
* Data: Listings and chats keyed by `owner_id` / `sender_id` / `recipient_id` = stableId only. No PII in DB.

## E2E flow
1. Enroll: Sign in with Google (@usc.edu) or use dev email → client creates identity, sends `idToken` + `identityCommitment`. Backend verifies token (hd, email_verified), adds commitment to group, discards token.
2. Login: Client fetches group root, generates proof, computes stableId → sends proof + stableId → backend verifies, returns JWT with `sub = stableId`.
3. Listings / Chats: Create and query by `req.user.sub`; same identity gets same sub across sessions.

## Project layout
* `backend/`: Express API (enroll, group-root, verify-proof, listings, chats, ai-chat).
* `frontend/`: Next.js (Google Sign-In, ZKP proof, listings & chats UI).
* `frontend/components/AIChatbot.jsx`: Floating AI chat widget (Tommy Trojan) powered by Groq. Shows real listings with images, supports markdown responses, and requires JWT authentication.
* `shared/`: Constants (no PII).
* `docs/`: Architecture and cross-session identity.

## Quick start
1. PostgreSQL: `docker compose up -d` (or set `DB_URL`).
2. Env: copy `backend/.env.example` to `backend/.env`; set `DB_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`. Frontend: `.env.local` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value).
3. AI Chatbot: Get a free Groq API key at https://console.groq.com and add `GROQ_API_KEY=your-key` to `backend/.env`. Install the SDK: `cd backend && npm install groq-sdk`.
4. Install: `npm install`
5. Backend: `npm run dev:backend`
6. Frontend: `npm run dev:frontend`
7. Optional seed: `npm run init-group`

## AI Chatbot (Tommy Trojan)
A floating chat widget powered by Groq (llama-3.3-70b-versatile) that helps USC students navigate the marketplace.

Features:
* Shows real listings from the database with images and clickable links
* Responds only based on actual marketplace data — no made-up listings
* Requires JWT authentication (only accessible to verified USC students)
* Supports markdown formatting for clean, readable responses
* Clear chat button to reset the conversation
* Privacy-safe: never references or stores any PII

To use:
* Log in with your USC account
* Click the 🤖 button in the bottom-right corner
* Ask Tommy Trojan anything about the marketplace!

Example questions:
* "Show me all listings"
* "Are there any items under $20?"
* "Help me write a listing description for my laptop"
* "What categories are available?"

## Logging
Controlled by env (no PII is ever logged).
* Backend: `LOG_MODE=disabled|basic|verbose` in `backend/.env` (default: `basic`).
* Frontend: `NEXT_PUBLIC_LOG_MODE=disabled|basic|verbose` in `.env.local` (default: `basic`).

| Mode | Backend | Frontend |
|------|---------|----------|
| disabled | No logs from app logger | No logs from app logger |
| basic | Request method/url/status, auth/zkp outcomes | API path + method, zkp step names |
| verbose | Basic + body keys, timings, step details | Basic + response keys, durations |
