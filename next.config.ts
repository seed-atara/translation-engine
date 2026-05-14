import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  serverExternalPackages: ["@anthropic-ai/sdk"],
}

export default nextConfig
