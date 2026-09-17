import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import "./vikram.css";

const cinzel = Cinzel({
  variable: "--font-vk-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-vk-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vikram Kumar",
  description: "Table sheet for Vikram Kumar. The Fall of Asperabad.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0908",
};

export default function VikramLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${cinzel.variable} ${cormorant.variable} min-h-full flex-1`}>
      {children}
    </div>
  );
}
