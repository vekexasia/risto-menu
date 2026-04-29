import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  transpilePackages: ["@menu/schemas"],
  trailingSlash: true,

  // Image optimization - unoptimized for static export / Cloudflare Pages
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
