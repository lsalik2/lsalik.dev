// Security headers applied to every response that leaves the middleware.
// CSP uses 'unsafe-inline' for style-src because Astro emits inline component
// styles. script-src is built per-response from the SHA-256 hashes of every
// inline <script> in the HTML body (Astro inlines small hoisted scripts
// directly, and their content changes across builds). Same-origin external
// scripts are allowed via 'self'; there are no third-party assets.

const STATIC_CSP_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

// Base security headers for every response. CSP is added separately by
// buildCsp() so it can include hashes derived from the response body.
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  // Vary must be present on every response so caches (Vercel edge, CDNs,
  // browser caches) know that curl and browser clients receive different
  // content for the same URL.
  'Vary': 'User-Agent',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

const INLINE_SCRIPT_RE = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

async function sha256Base64(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  let binary = '';
  const view = new Uint8Array(digest);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

export async function inlineScriptHashes(html: string): Promise<string[]> {
  const hashes = new Set<string>();
  for (const match of html.matchAll(INLINE_SCRIPT_RE)) {
    const body = match[1];
    if (!body) continue;
    hashes.add(`'sha256-${await sha256Base64(body)}'`);
  }
  return [...hashes];
}

export function buildCsp(scriptHashes: readonly string[]): string {
  const scriptSrc = ["script-src", "'self'", ...scriptHashes].join(' ');
  return [...STATIC_CSP_DIRECTIVES, scriptSrc].join('; ');
}
