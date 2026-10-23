import type { NextConfig } from "next";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  /**
   * The admin space calls the API through this site (same origin): its session cookie is
   * then first-party, even while the site (vercel.app) and the API (onrender.com) are on
   * different domains. The seller app keeps calling the API directly (Firebase token).
   */
  async rewrites() {
    if (!apiUrl) return [];
    return [
      {
        source: "/api/v1/admin/:path*",
        destination: `${apiUrl}/api/v1/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
