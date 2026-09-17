"use client";

import { Analytics } from "@vercel/analytics/next";

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url);
          if (url.pathname === "/dj" || url.pathname.startsWith("/dj/")) {
            url.search = "";
            url.hash = "";
            return { ...event, url: url.toString() };
          }
        } catch {
          // keep the original event
        }
        return event;
      }}
    />
  );
}
