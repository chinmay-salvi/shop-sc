# Logging and environment

## Verbose logging (crucial points)

The ZK-JWT flow logs at every crucial step so you can trace proof generation and verification.

### Backend

- **LOG_MODE** (in `.env`): `disabled` | `basic` | `verbose` (default: `basic`).
  - `basic`: Entry/success/reject and main steps (time window, replay, Groth16 result, session issued).
  - `verbose`: Same plus JWKS fetch/cache, hash checks, proof shape, public signals, vkey load, and per-step pass/fail.

Set `LOG_MODE=verbose` when debugging:

```bash
# backend/.env
LOG_MODE=verbose
```

Crucial log points on the backend:

- `validateProof.entry` — body keys and proof/publicInputs/publicOutputs presence.
- `jwtCircuit.verifyJwtCircuitProof.entry` — payload shape.
- `jwtCircuit.verifyJwtCircuitProof.step` — time_window, server_side_hashes, replay_revocation, groth16_verify, mark_jwt_proof_used.
- `jwksService.fetchJwks.*` — JWKS fetch and key count.
- `jwksService.validateServerSideHashes.*` — Google key hash and expected aud hash check.
- `auth.verifyProof.jwt_circuit_path.*` — verification done, session issued.

### Frontend

- **NEXT_PUBLIC_LOG_MODE** (in `.env.local`): `disabled` | `basic` | `verbose` (default: `basic`).
  - Only applies in the browser; SSR does not log.

Set for debugging:

```bash
# frontend/.env.local
NEXT_PUBLIC_LOG_MODE=verbose
```

Crucial log points on the frontend:

- `zkp.parseJwtPayload.entry` / `.done` — token part count, presence of aud/exp/sub/email (no PII values).
- `zkp.buildJwtCircuitInput.entry` / `.done` — pepper, expectedAudHash, googleKeyHash from JWKS.
- `zkp.fetchGoogleKeyHashForKid.*` — JWKS fetch and key hash for `kid`.
- `zkp.generateJwtCircuitProofIfAvailable.*` — build input, artifact check, fullProve start/done, success.
- `zkp.loginWithJwtZk.*` — proof result, payload sent, post done, session saved.

PII (raw JWT, email, `sub`) is never logged; only presence or length/prefix where needed.

---

## JWKS and Google key binding

- **GOOGLE_JWKS_URL** (backend, optional): Default `https://www.googleapis.com/oauth2/v3/certs`.
- **JWKS_CACHE_TTL_MS** (backend, optional): Cache TTL in ms for JWKS (default 300000 = 5 min).
- **GOOGLE_CLIENT_ID** (backend): Used to compute `expectedAudHash` for server-side binding; must match the frontend Google Client ID so client and server hashes agree.

The backend fetches JWKS, computes Google key hashes and expected aud hash, and rejects proofs whose `googleKeyHash` or `expectedAudHash` do not match (see `jwksService.validateServerSideHashes`).

---

## Session: JWT vs HTTP-only cookie

The backend currently issues a **JWT** in the JSON response body; the frontend stores it (e.g. in memory or localStorage) and sends it on subsequent requests.

To use an **HTTP-only, secure session cookie** instead (recommended in the architecture doc for sliding sessions):

1. In `authController.verifyProof`, after `jwt.sign(...)`, set a cookie, e.g.:
   - `res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600000 })`.
2. Have the frontend rely on the cookie (no `saveToken` of the body; ensure API sends `credentials: 'include'`).
3. Optionally store `(session_id, nullifier, expires_at)` in the DB and implement sliding expiration.

Until then, the existing JWT-in-body flow remains in place.
