// Security headers applied to every response that leaves the middleware.
// CSP uses 'unsafe-inline' for style-src because Astro emits inline component
// styles. script-src uses a SHA-256 hash for the single inline palette-restore
// script in Base.astro — see M1 for details.
// Everything else is same-origin; there are no third-party assets.
export const SECURITY_HEADERS: Record<string, string> = {
  // Vary must be present on every response so caches (Vercel edge, CDNs,
  // browser caches) know that curl and browser clients receive different
  // content for the same URL.
  'Vary': 'User-Agent',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; '),
};
