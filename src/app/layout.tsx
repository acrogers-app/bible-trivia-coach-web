import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "../components/RegisterServiceWorker";
import CapacitorBridge from "../components/CapacitorBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bible Study Coach",
  description:
    "Daily Bible quizzes, reading plans, and Scripture coaching — learn God's Word one verse at a time.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bible Study Coach",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Bible Study Coach",
    description:
      "Daily Bible quizzes, reading plans, and Scripture coaching — learn God's Word one verse at a time.",
    type: "website",
  },
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
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
        <CapacitorBridge />
      </body>
    </html>
  );
}
