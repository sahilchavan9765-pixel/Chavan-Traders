import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  // Protect /app/* routes
  if (pathname.startsWith("/app")) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated user from /login to /app
  if (pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Public shared bill route: set noindex headers
  if (pathname.startsWith("/b/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|manifest.webmanifest|robots.txt|sitemap.xml|api).*)",
  ],
};
