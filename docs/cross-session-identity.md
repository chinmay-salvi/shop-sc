# Cross-session identity (stable pseudonym)

For the full zero-knowledge authentication design (JWT-in-circuit, nullifier derivation, backend trust model), see [zk-auth-architecture.md](./zk-auth-architecture.md).

## Goal

Same user can access **their** listings, chats, etc. across sessions (and after logout/login), without the backend ever storing email or Google `sub`. Different users (different Google accounts) get different stable IDs so the backend can differentiate them.

## JWT ZK flow (recommended when `NEXT_PUBLIC_USE_JWT_ZK_LOGIN=true`)

1. **Nullifier** = Poseidon(Google `sub`, pepper), computed in-circuit. Same Google account → same nullifier every time; different Google accounts → different nullifiers.

2. On **verify-proof**, the client sends the ZK proof; the backend reads the **nullifier** from the proof and issues a JWT with **`sub` = nullifier**.

3. **Protected routes** use `req.user.sub` (from JWT) as the stable user id:
   - Listings: `owner_id = req.user.sub`
   - Chats: `sender_id` / `recipient_id = req.user.sub`

4. **Persistent identity**: Same user logging in again (same Google account) gets the same nullifier → same `sub` in the new JWT → they see the same listings/chats. **Different users**: Different Google accounts → different nullifiers → different `sub` → backend treats them as different users.

## Semaphore flow (legacy)

1. **Client** derives a **stable pseudonymous ID** from the identity commitment:
   - `stableId = SHA-256(commitment + ":shop-sc-stable-id")` (hex)
   - Same identity → same `stableId` every time; unguessable by others.

2. On **verify-proof**, the client sends the ZK proof **and** `stableId`. Backend verifies the proof, then issues a JWT with `sub = stableId`.

3. **Protected routes** use `req.user.sub` (from JWT) as the **owner id** for resources (same as above).

4. Next session: user proves again (new nullifier), sends same `stableId` → same `sub` in new JWT → they see the same listings/chats.

## Backend usage

- **JWT subject** = `stableId` = persistent pseudonymous user id.
- **Listings**: store `owner_id` = `req.user.sub`; "my listings" = `WHERE owner_id = req.user.sub`.
- **Chats**: store `sender_id` / `participant_id` = `req.user.sub`; filter by `req.user.sub` for "my conversations".
- **Never** store or log email/Google `sub`; only `req.user.sub` (stable pseudonym) and optional `req.user.nullifierHash` for revocation.

## API

- `GET /api/listings/mine` — returns listings where `owner_id = req.user.sub` (requires `Authorization: Bearer <token>`).
- `POST /api/listings` — creates listing with `owner_id = req.user.sub`.
- `GET /api/listings` — public list (no auth); `owner_id` is the stable pseudonym (not PII).
