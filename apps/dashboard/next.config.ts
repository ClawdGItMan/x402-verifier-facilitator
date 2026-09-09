import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@verifier-facilitator/shared", "@verifier-facilitator/agent-pay"],
  webpack(config) {
    // Workspace packages use NodeNext .js specifiers backed by TypeScript source.
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, ".js": [".ts", ".tsx", ".js"] };
    return config;
  }
};

export default nextConfig;
