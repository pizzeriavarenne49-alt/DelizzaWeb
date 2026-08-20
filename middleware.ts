import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_PATH = "/maintenance";

const EXCLUDED_PATHS = new Set([
  MAINTENANCE_PATH,
  "/order-confirmation",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function normalizeAuthPath(pathname: string): string {
  return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function shouldBypassMaintenance(pathname: string, _searchParams?: URLSearchParams): boolean {
  const authHandlerAllowed = normalizeAuthPath(pathname) === "/auth";

  return (
    authHandlerAllowed ||
    EXCLUDED_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images")
  );
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function createMaintenanceResponse(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return response;
}

export function createApiUnavailableResponse(): NextResponse {
  const response = NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return response;
}

export function resolveMaintenanceAction(
  pathname: string,
  maintenanceEnabled: boolean,
  searchParams?: URLSearchParams,
): "next" | "api" | "maintenance" {
  if (!maintenanceEnabled || shouldBypassMaintenance(pathname, searchParams)) {
    return "next";
  }

  if (isApiPath(pathname)) {
    return "api";
  }

  return "maintenance";
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const maintenanceEnabled = process.env.NEXT_PUBLIC_COMING_SOON === "true";
  const action = resolveMaintenanceAction(pathname, maintenanceEnabled, searchParams);

  if (action === "next") {
    return NextResponse.next();
  }

  if (action === "api") {
    return createApiUnavailableResponse();
  }

  return createMaintenanceResponse(request);
}

export const config = {
  matcher: ["/:path*"],
};
