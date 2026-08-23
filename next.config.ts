import fs from "node:fs";
import type { NextConfig } from "next";

// BUILD_TARGET=capacitor produces a static export for the mobile shell
// (no server; /api/* calls go to NEXT_PUBLIC_API_BASE instead).
const isCapacitorBuild = process.env.BUILD_TARGET === "capacitor";

// Guard: the capacitor static export is incompatible with dynamic route
// handlers, so scripts/buildMobile.mjs renames src/app/api -> src/app/_api
// for the duration of the build. If BUILD_TARGET=capacitor is set but that
// rename never happened (i.e. someone ran the raw `BUILD_TARGET=capacitor
// next build` instead of `npm run build:mobile`), the build would fail deep
// in page-data collection with a cryptic "export const dynamic" error and,
// worse, leave a stale out/ that cap sync would silently ship. Fail loudly
// and early instead.
if (isCapacitorBuild && fs.existsSync("src/app/api")) {
  throw new Error(
    "BUILD_TARGET=capacitor but src/app/api still exists — dynamic API routes " +
      "cannot be part of a static export. Run `npm run build:mobile` (it renames " +
      "src/app/api out of the way for the build), not `BUILD_TARGET=capacitor next build`.",
  );
}

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
