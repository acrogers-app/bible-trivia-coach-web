import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
              "connect-src 'self' https://api.langfuse.com https://cloud.langfuse.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
