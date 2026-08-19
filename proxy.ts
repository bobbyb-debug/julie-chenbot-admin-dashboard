import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// proxy.ts always runs on the Node.js runtime (unlike the old
// middleware.ts, which defaulted to Edge) -- safe to use node:crypto
// here the same way lib/session.ts does elsewhere in the app.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login";
  const isProtected = pathname.startsWith("/dashboard");

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
