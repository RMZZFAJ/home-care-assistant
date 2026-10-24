import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HCA_E2E === "true" ? ".next-e2e" : ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
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
