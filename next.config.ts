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
    ];
  },
  async rewrites() {
    // Preserve the standalone static micro-apps at their original URLs.
    return [
      { source: "/date", destination: "/date/index.html" },
      { source: "/raidviz", destination: "/raidviz/index.html" },
      { source: "/lander", destination: "/lander/index.html" },
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
