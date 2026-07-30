import type { Metadata } from "next";
import { Jost, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { defaultOgImage, siteName, siteUrl } from "@/lib/site";

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
    default: "Joel Peckham, Software & AI Developer",
    template: "%s · Joel Peckham",
  },
  description:
    "Joel Peckham's software portfolio. Full-stack and AI developer in Laramie, Wyoming.",
  keywords: [
    "Joel Peckham",
    "Software Developer",
    "Software Engineer",
    "AI Developer",
    "Portfolio",
    "Full-stack",
  ],
  authors: [{ name: "Joel Peckham" }],
  creator: "Joel Peckham",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Joel Peckham, Software & AI Developer",
    description:
      "Full-stack and AI developer in Laramie, Wyoming. Projects, experiments, and writing.",
    siteName,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@peckham_joel",
    title: "Joel Peckham, Software & AI Developer",
    description:
      "Full-stack and AI developer in Laramie, Wyoming. Projects, experiments, and writing.",
    images: [defaultOgImage],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
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
      className={`${jost.variable} ${jetbrainsMono.variable} h-full overflow-x-clip`}
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-clip font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:uppercase focus:tracking-[0.06em]"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
