import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory footprint on small VPS
  experimental: {
    workerThreads: false,
    cpus: 1,
  }
};

export default nextConfig;
