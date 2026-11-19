import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // CV text extraction libraries load workers/data files at runtime and must
  // not be bundled.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
