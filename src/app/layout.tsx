import type { Metadata } from "next";
import { Jost, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "highlight.js/styles/an-old-hope.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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

const siteUrl = "https://jpeckham.com";

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
    siteName: "Joel Peckham",
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
      data-scroll-behavior="smooth"
      className={`${jost.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
