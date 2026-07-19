import type { MetadataRoute } from "next";

// Required for the Capacitor static export build (BUILD_TARGET=capacitor).
export const dynamic = "force-static";

const SITE_URL = "https://biblestudy.webeuseful.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/play`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/read`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/levels`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/settings`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
