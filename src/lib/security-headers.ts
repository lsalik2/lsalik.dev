// Security headers applied to every response that leaves the middleware.
// CSP uses 'unsafe-inline' for style-src because Astro emits inline component
// styles. script-src uses a SHA-256 hash for the single inline palette-restore
// script in Base.astro (the IIFE that restores the saved colour palette from
// localStorage before first paint). Re-hash if the script content changes:
//   python3 -c "import hashlib,base64; print(base64.b64encode(hashlib.sha256(SCRIPT_BYTES).digest()).decode())"
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
    // SHA-256 hash of the palette-restore IIFE in Base.astro (the only inline
    // script). If that script changes, recompute the hash — see comment above.
    "script-src 'self' 'sha256-OVMxEOIbYL7kzB5+NR2bhY5aqbo5+Dk1R68D+NM/8iE='",
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
