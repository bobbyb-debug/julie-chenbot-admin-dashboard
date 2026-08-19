/**
 * Defense-in-depth CSRF check for mutating API routes. The session
 * cookie is already SameSite=Lax (see lib/auth.ts), which stops a
 * cross-site page from sending it on a fetch/XHR/form POST at all --
 * this check is a second, independent layer in case a browser or a
 * future change ever weakens that.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin requests from a browser's fetch() always send an
    // Origin header for state-changing methods; a missing header
    // means this wasn't a normal same-origin browser request.
    return false;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin;
  } catch {
    return false;
  }
}
