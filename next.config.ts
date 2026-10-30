import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy, one list of sources per directive. Partial prerendering rules out per-request nonces,
// so inline scripts stay allowed; the policy still blocks scripts and frames from other sites, plugins,
// <base> hijacking, form posts elsewhere and sending data to other servers.
type Policy = Record<string, string[]>;
const csp = (policy: Policy) => Object.entries(policy).map(([name, sources]) => [name, ...sources].join(" ")).join("; ");

const TURNSTILE = "https://challenges.cloudflare.com";

const APP: Policy = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", TURNSTILE, ...(isDev ? ["'unsafe-eval'"] : [])],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'"],
  "frame-src": ["'self'", TURNSTILE],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  // The admin shows /portal in an iframe ("View as client"); no other site may frame the app.
  "frame-ancestors": ["'self'"],
};

// /embed-preview.html runs a client's CRM embed code (sandboxed, see EmbedCodeDialog), so that code's scripts,
// frames, styles and requests to its CRM are allowed (https only).
const EMBED_PREVIEW: Policy = {
  ...APP,
  "script-src": ["'self'", "'unsafe-inline'", "https:"],
  "style-src": [...APP["style-src"], "https:"],
  "font-src": [...APP["font-src"], "https:"],
  "connect-src": ["'self'", "https:"],
  "frame-src": ["'self'", "https:"],
  "form-action": ["'self'", "https:"],
  // Always sandboxed, whoever frames it, so the code never runs as this app; that is what protects this page,
  // so framing it isn't restricted.
  sandbox: ["allow-scripts", "allow-forms"],
  "frame-ancestors": ["*"],
};

// Booking pages, forms and surveys are embedded on clients' own websites.
const PUBLIC: Policy = { ...APP, "frame-ancestors": ["*"] };

const header = (policy: Policy) => [{ key: "Content-Security-Policy", value: csp(policy) }];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // The browser calls /api/* on this origin and Next.js forwards it to the backend,
  // so the refresh and CSRF cookies stay same-site.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  // When several entries match a path, the last one wins.
  async headers() {
    return [
      // /api/* answers come from the backend, which sets its own policy.
      { source: "/((?!api/).*)", headers: header(APP) },
      { source: "/embed-preview.html", headers: header(EMBED_PREVIEW) },
      ...["/book/:path*", "/form/:path*", "/survey/:path*"].map((source) => ({ source, headers: header(PUBLIC) })),
    ];
  },
};

export default nextConfig;
