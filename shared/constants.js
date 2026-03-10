const EXTERNAL_NULLIFIER = "neighbor-know-access-2026";
const ACCESS_SIGNAL = "marketplace-access";
const JWT_EXPIRY = "1h";
/** Domain string for deriving stable pseudonymous ID from commitment (cross-session identity) */
const STABLE_ID_DOMAIN = "shop-sc-stable-id";

/** JWT-circuit: app pepper (must match backend ZKP_APP_PEPPER and circuit). High-entropy constant. */
const ZKP_APP_PEPPER = process.env.NEXT_PUBLIC_ZKP_APP_PEPPER || "neighbor-know-pepper-dev-only-change-in-production";

module.exports = {
  EXTERNAL_NULLIFIER,
  ACCESS_SIGNAL,
  JWT_EXPIRY,
  STABLE_ID_DOMAIN,
  ZKP_APP_PEPPER
};
