import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* `next dev` refuses its scripts and live reload to other hostnames. Lets the ngrok tunnel use the dev server. */
  allowedDevOrigins: ["*.ngrok-free.app"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
