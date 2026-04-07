import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Reduce memory footprint on small VPS
  experimental: {
    workerThreads: false,
    cpus: 1,
  }
};

export default nextConfig;
