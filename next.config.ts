import type { NextConfig } from "next";

// BUILD_TARGET=capacitor produces a static export for the mobile shell
// (no server; /api/* calls go to NEXT_PUBLIC_API_BASE instead).
const isCapacitorBuild = process.env.BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild
    ? {
        output: "export" as const,
        // next/image optimization needs a server
        images: { unoptimized: true },
      }
    : {}),

  // Make better-sqlite3 available in Next.js serverless functions
  serverExternalPackages: ["better-sqlite3"],

  // Include the SQLite DB file in the serverless bundle for Vercel
  outputFileTracingIncludes: {
    "/api/passage": ["./db/web.sqlite"],
    "/api/chapter": ["./db/web.sqlite"],
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://api.langfuse.com https://cloud.langfuse.com https://dashboard.webeuseful.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
