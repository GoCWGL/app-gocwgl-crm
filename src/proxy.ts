import { NextResponse, type NextRequest } from "next/server";

// The /api rewrite reaches the backend from Vercel's servers, so pass on the
// browser's IP for per-IP rate limits. The backend trusts it only with the secret.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Never pass on values a browser sent itself.
  headers.delete("x-gocwgl-proxy-secret");
  headers.delete("x-gocwgl-client-ip");

  const secret = process.env.PROXY_SHARED_SECRET; // server-only: no NEXT_PUBLIC_ prefix
  // Vercel sets x-real-ip itself; browsers can't override it there.
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (secret && ip) {
    headers.set("x-gocwgl-proxy-secret", secret);
    headers.set("x-gocwgl-client-ip", ip);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
