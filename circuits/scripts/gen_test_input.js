const fs = require("fs");
const path = require("path");

const buildDir = process.env.BUILD_DIR || path.join(__dirname, "..", "build");

const input = {
  pepper: "1",
  currentTime: "1700000000",
  expectedAudHash: "9999999999999999999999999999999999999999999999999999999999999999",
  googleKeyHash: "8888888888888888888888888888888888888888888888888888888888888888",
  sub: "123456789012345678901",
  exp: "1700003600",
  audHash: "9999999999999999999999999999999999999999999999999999999999999999",
  emailSuffixValid: "1",
  signatureValid: "1",
};

const outPath = path.join(buildDir, "input.json");
fs.writeFileSync(outPath, JSON.stringify(input, null, 2));
console.log("Wrote", outPath);
