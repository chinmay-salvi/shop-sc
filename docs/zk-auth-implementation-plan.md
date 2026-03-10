# Neighbor-Know: Zero-Knowledge Auth — Implementation Plan

This document is a step-by-step implementation plan for the [ZK authentication architecture](./zk-auth-architecture.md). It assumes the **target state**: the backend never sees the Google JWT; the client proves possession of a valid @usc.edu JWT in a zk-SNARK and sends only the proof and public inputs/outputs.

---

## Overview

| Phase | Description | Deliverable |
|-------|-------------|-------------|
| **1** | Token acquisition (Implicit Flow) | Frontend uses GIS with `response_type=id_token`; JWT stays in browser only. |
| **2** | ZK circuit (Circom) | Circuit that verifies JWT signature, domain, audience, time; outputs nullifier. |
| **3** | Trusted setup & verification key | Groth16 setup; backend has `vkey.json`; optional WASM prover build. |
| **4** | Client proof pipeline | Frontend: parse JWT → build circuit inputs → run WASM prover → send proof + public I/O. |
| **5** | Backend verification & sessions | Verify proof with vkey; check time window; issue session tied to nullifier (cookie or JWT). |
| **6** | Integration & migration | Wire UI to new flow; optional coexistence with current Semaphore flow; docs/tests. |

---

## Phase 1: Token Acquisition (Implicit Flow)

**Goal:** Ensure the Google ID token is obtained via Implicit Flow and never sent to the backend for verification.

### 1.1 Confirm Google Cloud configuration

- [ ] In Google Cloud Console, ensure **Authorized JavaScript origins** include your frontend origin(s) (e.g. `http://localhost:3000`, production URL).
- [ ] No backend redirect URI is required for Implicit Flow; the token is returned to the client only.

### 1.2 Frontend: use Implicit Flow only

- [ ] Use **Google Identity Services (GIS)** with **Implicit Flow**: `response_type: 'id_token'` (no `code`).
- [ ] Current `@react-oauth/google` with `GoogleLogin` / `useGoogleLogin` can be configured for credential (id_token) only; confirm that no authorization code is ever requested or sent to the backend.
- [ ] **Contract:** After this phase, the frontend must **never** send the raw `idToken` to the backend for the main ZK path. The only exception is an optional **dev/enrollment fallback** (e.g. email-based or one-time backend verification) if you choose to keep it.

### 1.3 Document the contract

- [ ] In code or docs, state clearly: “Production login path: JWT is used only client-side as input to the ZK circuit; it is never sent to the server.”

**Exit criterion:** Frontend can obtain a Google id_token in the browser without the backend ever receiving it.

---

## Phase 2: Zero-Knowledge Circuit (Circom)

**Goal:** Implement the Circom circuit that takes the JWT (private) and public parameters, and outputs the nullifier and any required public signals.

### 2.1 Repository layout for circuits

- [ ] Create a dedicated directory, e.g. `circuits/` or `zkp-circuit/`, for Circom and build artifacts.
- [ ] Add a README there describing how to compile and run the trusted setup (see Phase 3).

Suggested layout:

```
circuits/
  jwt_usc_main.circom    # Main circuit (or split into components)
  (optional) rsa/
  (optional) poseidon/
  package.json           # circom, snarkjs, etc.
  scripts/
    build.sh             # compile to R1CS + WASM
    setup.sh             # trusted setup, export vkey
```

### 2.2 Circuit inputs (align with architecture)

- **Private inputs:** JWT payload (as field elements or chunks), JWT signature (RSA-2048 as needed by your constraint system).
- **Public inputs:** Google RS256 public key (or its hash), domain string `@usc.edu`, app pepper, client Unix timestamp, Neighbor-Know Google Client ID (for `aud`).

Exact encoding (e.g. how to turn `email` into field elements for the DFA) should be specified in the circuit README.

### 2.3 Circuit constraints (in order)

1. **Signature authentication**
   - Use BigInt/field arithmetic to verify RSA-2048 signature inside the circuit.
   - **Note:** This is the main engineering bottleneck (millions of constraints; 10–15 s prover time on typical hardware). Options:
     - Use an existing Circom RSA library (e.g. `circom-rsa`, or community templates) and adapt to RS256.
     - Consider a smaller proof system or curve for prototyping, then scale to production curve (e.g. bn128) once the pipeline works.
   - [ ] Implement or integrate RSA verification in Circom and document constraint count and estimated prover time. See **[rsa-in-circuit-plan.md](./rsa-in-circuit-plan.md)** for a concrete plan and relevant docs.

2. **Domain match**
   - [ ] Parse the `email` claim (from private payload) and assert the suffix equals `@usc.edu` (e.g. via a DFA or fixed-length string comparison in field elements).

3. **Audience check**
   - [ ] Assert that the `aud` claim equals the public input “Neighbor-Know Google Client ID”.

4. **Time check**
   - [ ] Assert `clientTimestamp < exp` (both as public and private inputs as needed; exact placement depends on circuit design).

5. **Nullifier output**
   - [ ] Extract `sub` from the payload; compute `nullifier = Poseidon(sub, pepper)` (or the exact formula from your spec); expose nullifier as a **public output**.

### 2.4 Poseidon and encoding

- [ ] Use a Circom Poseidon template (or standard library) and agree on parameterization (e.g. used by snarkjs).
- [ ] Define encoding of `sub` and `pepper` into field elements so the same (sub, pepper) always yields the same nullifier.

### 2.5 Build and test (local)

- [ ] Compile circuit to R1CS (and optionally to WASM for the prover).
- [ ] Run a local test: sample JWT (or mock payload/signature), generate witness, run full prover + verifier to confirm the circuit is correct.

**Exit criterion:** Circuit compiles; prover produces a valid proof; verifier accepts it when given the correct public inputs/outputs.

---

## Phase 3: Trusted Setup and Verification Key

**Goal:** Run the Groth16 trusted setup once and make the verification key available to the backend.

### 3.1 Trusted setup (Groth16)

- [ ] Use `snarkjs` (or equivalent) to run the powers-of-tau ceremony and circuit-specific phase.
- [ ] Export `verification_key.json` (or equivalent) for the backend.
- [ ] Store the verification key in a location the backend can read (e.g. `backend/src/config/jwt_circuit_vkey.json` or from env).

### 3.2 Prover build (WASM)

- [ ] Compile the circuit to WASM so the browser can generate proofs (e.g. `snarkjs zkey export bellman` or use the built-in WASM export).
- [ ] Document the exact command and where the WASM + witness generator live (e.g. under `circuits/build/` or a path the frontend can fetch).

### 3.3 Versioning and rotation

- [ ] Decide how to version the circuit (e.g. vkey filename or API header). If you ever change the circuit, you will need a new trusted setup and a new vkey; the backend should know which vkey to use.

**Exit criterion:** Backend has access to a verification key; frontend has access to the WASM (and any required .zkey or similar) to generate proofs.

---

## Phase 4: Client-Side Proof Pipeline

**Goal:** From a Google id_token in memory, produce the proof and public inputs/outputs, and send only those to the backend.

### 4.1 JWT parsing (client-side only)

- [ ] In the frontend, parse the JWT (header, payload, signature) without sending it to the server.
- [ ] Extract: `email`, `sub`, `aud`, `iat`, `exp`, and the raw signature bytes for use as private inputs (and any public inputs that come from the token, if needed).
- [ ] Ensure the token is discarded (or overwritten) after proof generation; do not log or store the raw JWT.

### 4.2 Public inputs (client-side)

- [ ] **Google RS256 key (or hash):** Obtain Google’s current RS256 public key (e.g. from JWKS). The circuit expects a fixed encoding (e.g. hash) as public input; the client must use the same encoding and pass it as a public input.
- [ ] **Domain string:** `@usc.edu` (fixed).
- [ ] **App pepper:** Load from config (e.g. `NEXT_PUBLIC_APP_PEPPER` or a constant derived from a public constant). Must match what the circuit and backend expect.
- [ ] **Current time:** `Math.floor(Date.now() / 1000)` at proof generation time.
- [ ] **Client ID (audience):** Neighbor-Know’s Google Client ID (public).

### 4.3 Witness and proof generation

- [ ] Build the circuit’s input (witness): private inputs from JWT; public inputs as above.
- [ ] Run the WASM prover in the browser (e.g. via snarkjs or a wrapper). Handle long-running proof generation (10–15 s) with a clear loading state and optional cancellation.
- [ ] Collect the proof (e.g. `pi_a`, `pi_b`, `pi_c`) and all public inputs and public outputs (including the nullifier).

### 4.4 API request

- [ ] Define the payload to `POST /auth/verify-proof` for the **JWT-circuit flow**: e.g. `{ proof, publicInputs, publicOutputs }` or a single flattened structure that includes nullifier and client timestamp.
- [ ] Do **not** send the JWT or any PII. Send only: proof + public inputs + public outputs (nullifier, etc.).

### 4.5 Frontend auth module refactor

- [ ] Add a new code path: “login with JWT ZK” (obtain id_token → generate proof → call verify-proof with proof only).
- [ ] Keep or remove the old “enroll with idToken” path: for full ZK, remove sending idToken to backend; optionally keep a dev-only path that uses backend verification for testing.
- [ ] Update `verifyProofAndCreateSession` (or equivalent) so that when using the JWT circuit, it uses the new pipeline and does not call `/auth/enroll` with the token.

**Exit criterion:** Frontend can, from a Google id_token in memory, produce a valid proof and public I/O and send them to the backend without ever sending the JWT.

---

## Phase 5: Backend Verification and Sessions

**Goal:** Backend verifies the JWT-circuit proof, enforces time window, and issues a session keyed by the nullifier.

### 5.1 Verification key and verification logic

- [ ] Load the verification key (from Phase 3) in the backend (e.g. at startup or on first use).
- [ ] Implement a verifier function that takes the proof + public inputs + public outputs and runs the Groth16 verification (e.g. via `snarkjs` or a native binding).
- [ ] Replace or branch the current Semaphore-based `verifyAccessProof`: for the JWT-circuit flow, use this new verifier instead of Semaphore’s `verifyProof`.

### 5.2 Payload validation

- [ ] Validate the request body: required fields (proof, public inputs including timestamp, nullifier as public output).
- [ ] Validate types and value ranges (e.g. nullifier format, timestamp as integer).

### 5.3 Time window check

- [ ] Read the client’s timestamp from the public inputs.
- [ ] Compare with server time: e.g. `|clientTs - serverTs| <= ALLOWED_SKEW` (e.g. 120 seconds). Reject if outside the window.
- [ ] Optionally also enforce that `clientTs <= token exp` is already guaranteed by the circuit; backend can double-check if exp is passed as a public input.

### 5.4 Replay and revocation

- [ ] Use the **nullifier** as the unique proof instance id: check `used_nullifiers` (or equivalent) and reject if already used.
- [ ] Mark the nullifier as used after successful verification.
- [ ] Keep support for `revoked_nullifiers` if you use revocation; check before accepting the proof.

### 5.5 Session issuance

- [ ] **Subject:** Use the **nullifier** as the stable pseudonymous user id (same user → same nullifier every time). So `sub = nullifier` (or a deterministic derivative if you prefer).
- [ ] **Sliding session:** Either:
  - **Option A:** Issue a JWT with `sub = nullifier`, store nothing server-side; rely on JWT expiry and optional refresh, or  
  - **Option B (architecture doc):** Issue an HTTP-only, secure cookie with a session id; store in DB `(session_id, nullifier, expires_at)` and implement sliding expiration (e.g. extend `expires_at` on each request; 7 days of inactivity).
- [ ] Do not store the Google JWT or email; store only nullifier (or session id → nullifier) and expiry.

### 5.6 Auth controller and routes

- [ ] Update `authController.verifyProof` to accept the new payload shape and call the new verifier when the payload is the JWT-circuit format.
- [ ] Optionally keep the old Semaphore verify path behind a feature flag or a different endpoint until migration is complete.
- [ ] Ensure `validateProofPayload` (or a new middleware) validates the JWT-circuit payload (proof + public inputs/outputs) and rejects malformed requests.

### 5.7 Constants and config

- [ ] **App pepper:** Must match the circuit and frontend (e.g. `ZKP_APP_PEPPER` in backend env; same value as frontend public constant).
- [ ] **Allowed timestamp skew:** e.g. `ZKP_TIME_SKEW_SECONDS=120`.
- [ ] **Google key hash (if used in verification):** Backend may need to know the expected Google public key hash to validate that the public inputs are consistent (optional extra check).

**Exit criterion:** Backend verifies JWT-circuit proofs, enforces time and replay checks, and issues a session (JWT or cookie) keyed by nullifier without ever receiving the user’s JWT or PII.

---

## Phase 6: Integration and Migration

**Goal:** Wire the UI to the new flow, handle errors and loading, and optionally support both flows during transition.

### 6.1 Frontend UI flow

- [ ] **Login:** “Sign in with Google” → obtain id_token in browser → show “Generating proof…” (with realistic message, e.g. “This may take 10–15 seconds”) → call new verify-proof → on success, store session (token or cookie) and redirect.
- [ ] Remove or hide “Enroll” as a separate step for the main flow (no idToken sent to backend). Optionally keep “Enroll (dev)” with email for local testing.
- [ ] **Identity backup/recovery:** The current backup is for Semaphore identity. For the JWT-circuit flow, the “identity” is the Google account; recovery might mean “sign in again with Google” and re-prove. Decide whether to keep Semaphore-based backup for a transition period or remove it from the main UX.

### 6.2 Error handling and messaging

- [ ] Map backend errors (e.g. `INVALID_PROOF`, `PROOF_REPLAY_DETECTED`, `TIMESTAMP_OUT_OF_RANGE`) to user-friendly messages.
- [ ] If proof generation fails or times out, allow retry; consider a “cancel” for long-running proof generation if the UI supports it.

### 6.3 Backend: group and enrollment (optional)

- [ ] For full ZK, the backend no longer needs to verify the Google token at enrollment or maintain a Merkle group for this flow. You can:
  - Remove or deprecate `POST /auth/enroll` for the production path, or  
  - Keep it only for a dev/email path or for backward compatibility during migration.
- [ ] If you keep Semaphore for a while, use a feature flag or separate endpoints so the frontend can choose “login with JWT ZK” vs “login with Semaphore.”

### 6.4 Docs and tests

- [ ] Update [cross-session-identity.md](./cross-session-identity.md): state that the persistent id is the **nullifier** (from the JWT circuit), and that listings/chats use `req.user.sub` = nullifier.
- [ ] Update [demo-script.md](./demo-script.md) to reflect the new flow: no enrollment step that sends idToken; show proof generation and verify-proof only.
- [ ] Add or update tests: (1) backend verifier accepts a valid proof and rejects invalid/time/replay; (2) frontend (or E2E) can complete login without sending JWT to the server.

### 6.5 Performance and UX

- [ ] Document actual proof generation time on target hardware (e.g. 10–15 s); consider a progress indicator or staged messages (“Building witness…”, “Proving…”).
- [ ] If needed, explore optimizations (different curve, proof aggregation, or precomputation) as a follow-up; the architecture doc already notes this as Phase 6.

**Exit criterion:** End-to-end login using only the JWT ZK flow works in the UI; backend never sees the JWT; docs and tests are updated.

---

## Dependency Summary

```
Phase 1 (Implicit Flow)     → no hard dependency
Phase 2 (Circuit)           → Phase 1 contract (JWT only in browser)
Phase 3 (Setup + WASM)      → Phase 2 (circuit compiles)
Phase 4 (Client pipeline)   → Phase 1 + 3 (token in browser, WASM + vkey available)
Phase 5 (Backend verify)    → Phase 3 (vkey)
Phase 6 (Integration)      → Phase 4 + 5
```

---

## Suggested Implementation Order

1. **Phase 1** — Quick win; confirm Implicit Flow and document contract.
2. **Phase 2** — Critical path; start with circuit structure and Poseidon + domain/audience/time; add RSA last (or use existing Circom RSA if available).
3. **Phase 3** — As soon as the circuit is stable, run trusted setup and export vkey + WASM.
4. **Phase 5 (backend)** — Implement verifier and time/replay checks in parallel with Phase 4; use test proofs from Phase 2/3.
5. **Phase 4** — Implement frontend proof pipeline and wire to backend.
6. **Phase 6** — UI, errors, docs, tests, and optional migration/coexistence.

---

## Checklist Summary (high level)

| # | Task |
|---|------|
| 1 | Google Cloud: Authorized JavaScript origins; Implicit Flow only. |
| 2 | Circuit repo layout; Circom main file and constraints (RSA, domain, aud, time, Poseidon nullifier). |
| 3 | Build circuit; run trusted setup; export vkey; build WASM prover. |
| 4 | Frontend: parse JWT in memory; build witness; run WASM prover; send proof + public I/O only. |
| 5 | Backend: load vkey; verify proof; check time window; replay/revocation; issue session (nullifier = sub). |
| 6 | UI: login → proof → verify; no enroll with idToken; update docs and tests. |

Once this plan is done, implementation can proceed step by step with clear exit criteria for each phase.
