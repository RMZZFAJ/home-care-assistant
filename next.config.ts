import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HCA_E2E === "true" ? ".next-e2e" : ".next",
  outputFileTracingIncludes: { "/api/verification": ["./.generated/pdf-verifier.cjs"] },
  async headers() {
    return [{ source: "/service-worker.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" },
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
    ] }];
  },
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
