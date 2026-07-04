import type { Metadata } from "next";
import { Jost, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteName, siteUrl } from "@/lib/site";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Joel Peckham — Software & AI Developer",
    template: "%s — Joel Peckham",
  },
  description:
    "Joel Peckham's software portfolio and personal website. Backend and AI developer based in Laramie, Wyoming.",
  keywords: [
    "Joel Peckham",
    "Software Developer",
    "Software Engineer",
    "AI Developer",
    "Portfolio",
  ],
  authors: [{ name: "Joel Peckham" }],
  creator: "Joel Peckham",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Joel Peckham — Software & AI Developer",
    description:
      "Backend and AI developer based in Laramie, Wyoming. Projects, experiments, and writing.",
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: "Joel Peckham — Software & AI Developer",
    description:
      "Backend and AI developer based in Laramie, Wyoming. Projects, experiments, and writing.",
  },
  icons: {
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon-32x32.png",
    apple: "/favicon/apple-touch-icon.png",
  },
  alternates: {
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:uppercase focus:tracking-[0.06em]"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
