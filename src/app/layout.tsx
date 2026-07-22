import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FamilyModeChrome from "../components/FamilyModeChrome";
import RegisterServiceWorker from "../components/RegisterServiceWorker";
import CapacitorBridge from "../components/CapacitorBridge";
import OfflineBanner from "../components/OfflineBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://biblestudy.webeuseful.com";
const SITE_TITLE = "Bible Study Coach — Bible Trivia, Quizzes & Daily Verse";
const SITE_DESCRIPTION =
  "Play Bible trivia with hundreds of questions, learn Scripture references as you go, and get a daily Verse of the Day on web, iPhone, and Apple Watch.";
const APP_STORE_ID = "6788610253";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Bible Study Coach",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Bible Study Coach",
  keywords: [
    "Bible trivia",
    "Bible quiz",
    "Bible study",
    "Scripture",
    "verse of the day",
    "Bible game",
  ],
  alternates: {
    // Relative canonical resolves per-route against metadataBase,
    // so every page gets its own canonical URL.
    canonical: "./",
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "VEYgF3XyH5DfIINg6ciXSC-X4LP6PQHCH4UBWYIM-FE",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bible Study Coach",
  },
  itunes: {
    appId: APP_STORE_ID,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Bible Study Coach",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Bible Study Coach — Bible trivia, quizzes & a daily verse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Bible Study Coach",
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": ["SoftwareApplication", "MobileApplication"],
      "@id": `${SITE_URL}/#app`,
      name: "Bible Study Coach",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: "EducationApplication",
      operatingSystem: "iOS, watchOS, Web",
      installUrl: `https://apps.apple.com/app/id${APP_STORE_ID}`,
      image: `${SITE_URL}/og.png`,
      publisher: {
        "@type": "Organization",
        name: "Webeuseful",
        url: "https://webeuseful.com",
      },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Apply a manually-chosen theme before first paint (no flash).
            No saved choice → no data-theme attribute → CSS follows the
            system via prefers-color-scheme, live. See src/lib/theme.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('bible-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <FamilyModeChrome />
        <OfflineBanner />
        <RegisterServiceWorker />
        <CapacitorBridge />
      </body>
    </html>
  );
}
