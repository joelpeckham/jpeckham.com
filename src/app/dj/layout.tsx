import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import "./dj.css";

const cinzel = Cinzel({
  variable: "--font-dj-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-dj-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Asperabad DJ",
  description: "Private table remote for the Fall of Asperabad.",
  robots: { index: false, follow: false },
};

export default function DjLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${cinzel.variable} ${cormorant.variable} min-h-full flex-1`}>
      {children}
    </div>
  );
}
