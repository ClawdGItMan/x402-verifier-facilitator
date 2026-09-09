import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@verifier-facilitator/shared", "@verifier-facilitator/agent-pay"]
};

export default nextConfig;
