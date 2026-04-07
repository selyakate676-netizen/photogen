import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, 
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Reduce memory footprint on small VPS
  // @ts-ignore
  experimental: {
    workerThreads: false,
    cpus: 1,
  }
};

export default nextConfig;
