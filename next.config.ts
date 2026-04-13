import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['write.local.test', 'write.risentta.com', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
