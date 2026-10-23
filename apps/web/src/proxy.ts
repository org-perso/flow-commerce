import { NextResponse, type NextRequest } from "next/server";

/**
 * The admin space lives in this app under /admin, served on its own domain (af-v3-admin).
 * With ADMIN_HOST set (e.g. admin.flow-commerce.com):
 * - on that host, "/" and every other path show the admin pages (/x → /admin/x);
 * - on any other host (app.flow-commerce.com), /admin does not exist (404).
 * Without ADMIN_HOST (local development), /admin is reachable directly.
 * This only routes pages: access itself is checked by the API on every admin request.
 */
export function proxy(request: NextRequest) {
  const adminHost = process.env.ADMIN_HOST;
  if (!adminHost) return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0];
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (host === adminHost) {
    if (isAdminPath) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (isAdminPath) return new NextResponse(null, { status: 404 });
  return NextResponse.next();
}

export const config = {
  // Pages only: not the build assets, images or files like icon.svg.
  matcher: ["/((?!_next/|api/|.*\\.[a-z0-9]+$).*)"],
};
