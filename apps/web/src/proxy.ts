import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: visitors without a session cookie are sent to sign in before protected
 * pages render. Real authentication and authorization are enforced by the API on every request.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("cr_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/checkout/:path*", "/admin/:path*"],
};
