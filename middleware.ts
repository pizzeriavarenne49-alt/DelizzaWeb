import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_PATH = "/maintenance";

const EXCLUDED_PATHS = new Set([
  MAINTENANCE_PATH,
  "/mentions-legales",
  "/privacy",
  "/cgu",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function shouldBypassMaintenance(pathname: string): boolean {
  return (
    EXCLUDED_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenanceEnabled = process.env.NEXT_PUBLIC_COMING_SOON === "true";

  if (!maintenanceEnabled || shouldBypassMaintenance(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api).*)"],
};
