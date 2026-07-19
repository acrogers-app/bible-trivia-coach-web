import type { MetadataRoute } from "next";

// Required for the Capacitor static export build (BUILD_TARGET=capacitor).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dev"],
    },
    sitemap: "https://biblestudy.webeuseful.com/sitemap.xml",
  };
}
