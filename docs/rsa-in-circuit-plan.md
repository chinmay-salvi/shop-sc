# Plan: In-Circuit RSA-2048 JWT Signature Verification (Constraint #1)

This document is a concrete plan to replace the `signatureValid` placeholder in `jwt_usc_main.circom` with **real RSA-2048 RS256 signature verification** inside the circuit. When done, the ZK proof will cryptographically prove "this payload came from a Google-signed JWT" instead of trusting the client.

---

## 1. Background

- **Google JWTs** use **RS256**: RSA-2048 with PKCS#1 v1.5 padding and SHA-256 over the signed message `base64url(header).base64url(payload)`.
- **In-circuit**: We need a Circom circuit that takes (message, messageLength, RSA public key, signature) and constrains that `signature^e mod n` equals the padded hash of the message (PKCS#1 v1.5 + SHA-256). Exponent `e` is usually 65537.
- **Cost**: RSA-2048 in Circom is ~500k–2M+ constraints; prover time often **10–30 seconds** in the browser depending on device. Your current circuit is tiny by comparison.

---

## 2. Two Main Approaches

### Option A: Use a low-level RSA circuit, wire JWT yourself

Use a library that only does **RSA verify** (message + pubkey + signature → valid/ invalid). You keep your existing circuit structure and **replace** the `signatureValid === 1` block with a subcircuit that:

- Takes private inputs: signed message (header + payload), signature (as limbs).
- Takes public inputs: RSA modulus `n` (and optionally exponent `e`) as limbs, or hash of the public key.
- Constrains: RSA verify (PKCS#1 v1.5 + SHA-256) on the message and signature.

**Libraries:**

| Project | Repo | Notes |
|--------|------|--------|
| **circom-rsa-verify** | [zkp-application/circom-rsa-verify](https://github.com/zkp-application/circom-rsa-verify) | PKCS#1 v1.5 + SHA-256, e=65537, bn128. ~536k constraints. No JWT logic; you wire JWT message/signature yourself. |
| **circom-rsa** | [doubleblind-xyz/circom-rsa](https://github.com/doubleblind-xyz/circom-rsa) | RSA building blocks; you compose verify + padding + SHA256. |
| **zk-email circuits** | [zkemail/zk-email-verifier](https://github.com/zkemail/zk-email-verifier) (e.g. RSAVerifier65537) | RSA-2048 verifier; used for DKIM. Could be adapted for JWT (same RS256). |

**Pros:** Full control; you keep your current nullifier, time, aud, email logic and only add an RSA subcircuit.  
**Cons:** You must encode JWT message and signature into the format the RSA circuit expects (limbs, chunk sizes) and handle Google’s rotating JWKS (see §4).

### Option B: Use a JWT-specific circuit (e.g. zk-jwt)

Use a circuit that already verifies **JWT + RSA** and extracts claims.

| Project | Repo | Notes |
|--------|------|--------|
| **zk-jwt** | [zkemail/zk-jwt](https://github.com/zkemail/zk-jwt) | Circuits + helpers for **Google Sign-In JWTs**: RSA verify, extract iss, email, azp, etc. Demo: [jwt.zk.email](https://jwt.zk.email). Not audited; "not intended for production." |

**Pros:** JWT + RS256 + claim extraction already designed; may support Google’s key format and kid.  
**Cons:** Different circuit structure and I/O; you’d need to **adapt** their circuit or compose it with your nullifier/time/aud logic, or replace your circuit with theirs and map their outputs to your backend (e.g. derive your nullifier from their outputs).

**Recommendation:** Start with **Option A** (circom-rsa-verify) so you keep your existing circuit and only swap in an RSA-verify subcircuit; if integration is too heavy, consider Option B and a hybrid design.

---

## 3. High-Level Implementation Steps (Option A)

### Phase 1: Circuit integration

1. **Add circom-rsa-verify (or chosen lib) to the repo**
   - Clone or add as submodule under `circuits/` (e.g. `circuits/rsa/` or `circuits/vendor/circom-rsa-verify`).
   - Resolve Circom version compatibility (your circuit is Circom 2.x; confirm the RSA lib is 2.x).
   - Get their **main RSA verify template** (e.g. inputs: message chunks, signature chunks, modulus/exponent chunks; output: nothing or a success bit).

2. **Define JWT message and encoding**
   - Signed message = `base64url(header) + "." + base64url(payload)` (no signature part).
   - Decide how to feed it into the RSA circuit: as a single bit string or as pre-hashed (PKCS#1 v1.5 pads SHA-256 hash). circom-rsa-verify expects the **message that was signed** (before RSA padding); the circuit internally hashes it (SHA-256) and applies PKCS#1 v1.5 padding. So you pass the raw JWT message (header.payload) and the circuit checks signature over that.
   - Encode message and signature into **limbs** (e.g. 121 bits per limb, 17 limbs for 2048-bit) as required by the library. Same for RSA modulus `n` and exponent `e` (65537).

3. **Wire RSA into `jwt_usc_main.circom`**
   - **Remove:** `signatureValid` private input and the three constraints that force `signatureValid === 1`.
   - **Add:** Private inputs for: JWT message (as limbs or bytes), message length, signature (as limbs). Public or private inputs for RSA modulus (and optionally exponent) — see §4 for key handling.
   - **Add:** One RSA verify subcircuit instance; connect message, signature, and public key.
   - **Keep:** All existing constraints (audHash, currentTime < exp, emailSuffixValid, Poseidon nullifier). Optionally derive `sub` (and then nullifier) from the **verified** payload so that the circuit cryptographically ties the nullifier to the signed JWT (strongest model).

4. **Circuit I/O and backward compatibility**
   - Your backend currently expects **one public output** (nullifier) and public inputs (pepper, currentTime, expectedAudHash, googleKeyHash). After adding RSA, you may have more public inputs (e.g. RSA modulus hash or limbs). Update `jwtCircuitService.buildPublicSignals` and frontend `buildJwtCircuitInput` to match. Keep nullifier as the main public output for session identity.

5. **Build and test (off-browser)**
   - Compile the new circuit; fix any Circom errors (signal bounds, limb sizes).
   - Run a **local test**: use a real Google id_token (or a test JWT signed with a test RS256 key), generate the witness (message + signature + n, e), run snarkjs fullProve + verify. Confirm the verifier accepts.

### Phase 2: Frontend and keys

6. **Google JWKS and key format**
   - Google exposes RS256 public keys at `https://www.googleapis.com/oauth2/v3/certs` (JWKS). Keys rotate; each key has `kid`, `n`, `e`.
   - The circuit must use a **fixed** public key (or a small set) for a given proof, because the circuit is compiled for a fixed structure. Options:
     - **Option 1 (simplest for MVP):** Pin one Google signing key (n, e) as public inputs to the circuit. When Google rotates keys, you re-run trusted setup with the new key or add a second circuit variant. Not ideal long-term.
     - **Option 2:** Public input = **hash of the modulus** (or kid). Circuit takes multiple (n, e) as private inputs and constrains that the hash of the used key matches the public input; then you verify RSA with that key. Reduces key pinning but increases circuit size.
     - **Option 3:** Use zk-jwt-style design where the circuit accepts the key in a standard limb format and the verifier checks the key hash on-chain; you’d align your backend with their public inputs.
   - Implement **JWKS fetch** in the frontend (or at build time); select the key by `kid` from the JWT header; encode `n` and `e` into the format your circuit expects.

7. **Frontend: build RSA circuit inputs**
   - Parse the id_token: header, payload, signature (base64url).
   - Signed message = `header + "." + payload` (same as in JWT spec).
   - Decode `n` and `e` from JWKS for the token’s `kid`.
   - Encode message, signature, n, e into the **exact format** the Circom circuit expects (limb arrays, bit lengths). Use the same encoding as in your circuit’s test (e.g. Node script) so that the browser and the circuit agree.
   - Call `buildJwtCircuitInput` (or a new builder) that includes these RSA inputs; pass the result to snarkjs fullProve. Ensure you don’t break existing public inputs/outputs the backend expects.

8. **Prover performance**
   - Run fullProve in the browser with a real token; measure time (e.g. 15–40 s on mid-range devices). If needed: optimize (e.g. use a smaller ptau for setup), or document that server-side prover / proof aggregation is a future improvement.

### Phase 3: Backend and deployment

9. **Backend**
   - Verification key: replace `jwt_circuit_vkey.json` with the new one from the circuit that includes RSA. No change to verification **logic** (still snarkjs.groth16.verify); only the vkey and possibly the number/format of public signals change.
   - If you added public inputs (e.g. key hash): the backend need not check them beyond what the circuit enforces, unless you want to whitelist keys.

10. **Trusted setup and artifacts**
    - Re-run Phase 2 (powers of tau + circuit-specific setup) for the new circuit. Use a **larger ptau** if the circuit is big (e.g. 2^20 or 2^21 for ~500k constraints).
    - Export verification key and copy to backend; export WASM + zkey and copy to `frontend/public/zkp/`. Update `copy-to-frontend` script if needed.

11. **Docs and tests**
    - Update `circuits/README.md` with: constraint count, prover time, RSA key handling, and link to this plan.
    - Update `docs/zk-auth-implementation-plan.md` to mark signature authentication as done and reference this doc.
    - Add an E2E test: real Google token (or fixture) → frontend proof → backend verify → session.

---

## 4. Relevant Documentation and Links

### RSA and JWT standards

- **RS256 (JWA):** [RFC 7518](https://www.rfc-editor.org/rfc/rfc7518) — RS256 = RSASSA-PKCS1-v1_5 with SHA-256.
- **JWT:** [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) — structure of header.payload.signature; the **signed** content is `base64url(header).base64url(payload)`.
- **PKCS#1 v1.5:** [RFC 8017](https://www.rfc-editor.org/rfc/rfc8017) (PKCS #1) — padding and signature verification.

### Google OAuth and JWKS

- **Google’s JWKS:** `https://www.googleapis.com/oauth2/v3/certs` — returns `kid`, `n`, `e` for current signing keys.
- **Google Sign-In for the web:** [Google Identity — Sign in](https://developers.google.com/identity/gsi/web) — you already use this; the id_token is a JWT signed by one of the keys in JWKS.

### Circom and ZK

- **Circom docs:** [docs.circom.io](https://docs.circom.io) — language and tooling.
- **snarkjs:** [iden3/snarkjs](https://github.com/iden3/snarkjs) — Groth16 prove/verify, WASM, zkey format.

### RSA-in-circuit implementations

- **circom-rsa-verify:** [zkp-application/circom-rsa-verify](https://github.com/zkp-application/circom-rsa-verify) — PKCS#1 v1.5 + SHA-256, e=65537, ~536k constraints, bn128. Good first candidate to wire into your circuit.
- **zk-jwt (Google JWT):** [zkemail/zk-jwt](https://github.com/zkemail/zk-jwt) — JWT auth circuit for Google Sign-In; [packages/circuits/README](https://github.com/zkemail/zk-jwt/blob/main/packages/circuits/README.md) for I/O and parameters. Use if you want a JWT-native circuit and are willing to adapt your nullifier/session flow to their outputs.
- **zk-email verifier (RSA):** [zkemail/zk-email-verifier](https://github.com/zkemail/zk-email-verifier) — RSAVerifier65537 and related; DKIM-focused but same RS256 idea.

### Your repo

- **Current circuit:** `circuits/jwt_usc_main.circom` — placeholder `signatureValid` to replace.
- **Circuit README:** `circuits/README.md` — build, setup, copy-to-frontend.
- **Architecture:** `docs/zk-auth-architecture.md` — overall ZK auth model.
- **Implementation plan:** `docs/zk-auth-implementation-plan.md` — Phase 2.3 describes signature authentication as the main bottleneck.

---

## 5. Checklist Summary

- [ ] Choose library (circom-rsa-verify recommended for Option A).
- [ ] Add library to repo; resolve Circom 2.x compatibility.
- [ ] Define JWT signed message and limb encoding for message/signature/pubkey.
- [ ] Replace `signatureValid` in `jwt_usc_main.circom` with RSA verify subcircuit; keep all other constraints.
- [ ] Align circuit public inputs/outputs with backend and frontend (nullifier, time, aud, key hash if any).
- [ ] Local test: real or test JWT → witness → fullProve → verify.
- [ ] Frontend: JWKS fetch, key selection by `kid`, encode (message, signature, n, e) for circuit.
- [ ] Frontend: integrate new inputs into `buildJwtCircuitInput` and fullProve; measure prover time.
- [ ] Re-run trusted setup; export vkey, WASM, zkey; update backend and frontend artifacts.
- [ ] Update docs and add E2E test.

When this is done, constraint #1 (signature verification) will be fully implemented in ZK, and the system will be at 100% of the planned ZKP implementation.
