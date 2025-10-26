import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    TZ: 'Europe/Berlin',
  },
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
