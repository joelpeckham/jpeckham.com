import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  trailingSlash: true,
  experimental: {
    viewTransition: true,
  },
  async redirects() {
    return [
      {
        source: "/resume/",
        destination: "/Joel_Peckham_Resume.pdf",
        permanent: true,
      },
      {
        source: "/designportfolio/",
        destination: "/designPortfolio.pdf",
        permanent: true,
      },
      {
        source: "/designPortfolio/",
        destination: "/designPortfolio.pdf",
        permanent: true,
      },
      {
        source: "/index.xml",
        destination: "/feed.xml",
        permanent: true,
      },
      {
        source: "/posts/no-bullshit-qr/",
        destination: "/projects/no-bullshit-qr/",
        permanent: true,
      },
      {
        source: "/raidviz",
        destination: "/projects/raid-visualizer/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Preserve the standalone static lander micro-app at its original URL.
    return [{ source: "/lander", destination: "/lander/index.html" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm"]],
    rehypePlugins: [["rehype-slug"], ["rehype-highlight"]],
  },
});

export default withMDX(nextConfig);
