import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.56.1", "192.168.0.153", "localhost", "127.0.0.1", "*.trycloudflare.com"]
};

export default nextConfig;
