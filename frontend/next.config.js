/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    // Empty string = relative URLs → nginx proxy handles /api/* → FastAPI
    // Override with full URL only when frontend and backend are separate services
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
};

module.exports = nextConfig;
