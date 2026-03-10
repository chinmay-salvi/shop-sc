/** @type {import("next").NextConfig} */
const path = require("path");

const nextConfig = {
  experimental: {
    externalDir: true
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups"
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = { ...config.resolve.alias };
      // Use browser build (fetch-based); subpath not in exports, so resolve via package dir
      const snarkjsBuildDir = path.dirname(require.resolve("snarkjs"));
      config.resolve.alias.snarkjs = path.join(snarkjsBuildDir, "browser.esm.js");
    }
    return config;
  }
};

module.exports = nextConfig;
