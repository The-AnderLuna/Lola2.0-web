import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.100.16:3000', 'localhost:3000']
    }
  },
  // Siguiendo recomendación exacta de la terminal
  allowedDevOrigins: ['192.168.100.16']
};

export default nextConfig;
