import type { NextConfig } from "next";

function getOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function getWebSocketOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  return origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

const supabaseOrigin = getOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const s3Origin = getOrigin(process.env.S3_ENDPOINT);
const connectSources = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://mc.yandex.ru",
  "https://mc.yandex.com",
  supabaseOrigin,
  getWebSocketOrigin(supabaseOrigin),
].filter((source): source is string => Boolean(source));
const imageSources = [
  "'self'",
  "data:",
  "blob:",
  "https://*.storage.beget.cloud",
  "https://mc.yandex.ru",
  "https://mc.yandex.com",
  s3Origin,
].filter((source): source is string => Boolean(source));
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://mc.yandex.com https://yastatic.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src ${imageSources.join(" ")}`,
  `connect-src ${connectSources.join(" ")}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob: https://mc.yandex.ru",
  "frame-src 'self' blob: https://mc.yandex.ru",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Reduce memory footprint on small VPS
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];

    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;