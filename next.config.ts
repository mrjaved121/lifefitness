import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; bulk member-import spreadsheets can exceed that.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
