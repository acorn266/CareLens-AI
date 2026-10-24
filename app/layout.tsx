import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AccessibilityToolbar } from "@/components/accessibility-toolbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediVision Assistant - AI-Powered Healthcare Companion",
  description:
    "Accessible multimodal health monitoring for elderly and disabled users",
  generator: "",
  keywords: [
    "healthcare",
    "accessibility",
    "AI",
    "health monitoring",
    "elderly care",
  ],
  authors: [{ name: "MediVision Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MediVision" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${workSans.variable} antialiased`}>
        <AuthProvider>
          <AccessibilityProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <div
                id="skip-link"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50"
              >
                <a
                  href="#main-content"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
                >
                  Skip to main content
                </a>
              </div>
              <main id="main-content">{children}</main>
            </Suspense>
            <AccessibilityToolbar />
            <Analytics />
          </AccessibilityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
