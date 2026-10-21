import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.gocwgl.com";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // The browser calls /api/* on this origin and Next.js forwards it to the backend,
  // so the refresh and CSRF cookies stay same-site.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
