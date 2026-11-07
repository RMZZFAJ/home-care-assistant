import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HCA_E2E === "true" ? ".next-e2e" : ".next",
  outputFileTracingIncludes: { "/api/verification": ["./.generated/pdf-verifier.cjs"] },
  /* config options here */
  experimental: {
    globalNotFound: true,
    optimizePackageImports: ["@fluentui/react-components", "@fluentui/react-icons"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
