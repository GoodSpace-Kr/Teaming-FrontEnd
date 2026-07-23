import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "13.125.193.243",
        port: "8080",
        pathname: "/files/**",
      },
      {
        protocol: "https",
        hostname: "goodspace-teaming-uploads-prod-apne2-898319808595.s3.ap-northeast-2.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
