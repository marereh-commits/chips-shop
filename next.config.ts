import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "googleusercontent.com",
      },
    ],
  },
  allowedDevOrigins: ["192.167.8.149"],
};

export default nextConfig;