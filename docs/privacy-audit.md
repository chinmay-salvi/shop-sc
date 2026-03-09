# Privacy audit: no PII stored

## Database tables (backend)

| Table | Purpose | PII? |
|------|---------|-----|
| `identity_commitments` | commitment only | No |
| `used_nullifiers` | nullifier_hash, used_at | No |
| `revoked_nullifiers` | nullifier_hash, reason, revoked_at | No |
| `listings` | owner_id (stableId), title, description | No |
| `messages` | sender_id, recipient_id (stableIds), body | No |

We do **not** store: email, name, Google `sub`, or any other identifier that links to a real person.

## Enrollment

- **Google path:** Backend receives Google ID token, verifies signature and claims (`iss`, `aud`, `exp`, `hd=usc.edu`, `email_verified`). We do **not** read, log, or persist `email` or `sub`. Token is discarded after verification.
- **Dev path:** Backend receives email string for suffix check only; it is **not** stored.

## Logs and env

- No logging of tokens, email, or decoded Google payload.
- Env: `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `DB_URL` only. No PII in env.

## Cross-session identity

- Stable pseudonym = `SHA-256(commitment + domain)` computed client-side; sent as `stableId` at verify-proof. Backend uses it as JWT `sub` and as `owner_id` / `sender_id` / `recipient_id`. Same identity → same stableId; no link to real identity.
