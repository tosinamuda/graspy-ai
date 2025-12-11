import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable output mode for Cloudflare Workers via OpenNext
  output: 'standalone',

  // Disable image optimization for Edge runtime
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
