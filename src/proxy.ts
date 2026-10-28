import { NextResponse, type NextRequest } from "next/server";

// The /api rewrite reaches the backend from our host's servers, so pass on the
// browser's IP for per-IP rate limits. The backend trusts it only with the secret.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Never pass on values a browser sent itself.
  headers.delete("x-gocwgl-proxy-secret");
  headers.delete("x-gocwgl-client-ip");

  const secret = process.env.PROXY_SHARED_SECRET; // server-only: no NEXT_PUBLIC_ prefix
  const ip = clientIp(request);
  if (secret && ip) {
    headers.set("x-gocwgl-proxy-secret", secret);
    headers.set("x-gocwgl-client-ip", ip);
  }
  return NextResponse.next({ request: { headers } });
}

// Only read a header the host itself sets; anything else a browser can forge.
// Vercel sets x-real-ip. On AWS Amplify, x-real-ip is missing and the first
// x-forwarded-for entry is whatever the browser sent, but CloudFront overwrites
// cloudfront-viewer-address ("ip:port"), so Amplify sets CLIENT_IP_HEADER to it.
function clientIp(request: NextRequest): string | undefined {
  if (process.env.CLIENT_IP_HEADER === "cloudfront-viewer-address") {
    const address = request.headers.get("cloudfront-viewer-address");
    // Drop the port; IPv6 addresses contain colons too, so cut at the last one.
    const portAt = address?.lastIndexOf(":") ?? -1;
    return portAt > 0 ? address!.slice(0, portAt) : undefined;
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

export const config = { matcher: "/api/:path*" };
