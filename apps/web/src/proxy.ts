import { NextResponse, type NextRequest } from "next/server";

/**
 * Forwards /api/* to the FastAPI service, keeping session cookies first-party.
 * Runs per request, so API_INTERNAL_URL is read at runtime — the same image
 * works locally, in docker compose (http://api:8000) and in Kubernetes.
 */
export function proxy(request: NextRequest) {
  const target = new URL(request.nextUrl.pathname.replace(/^\/api/, "") + request.nextUrl.search, process.env.API_INTERNAL_URL ?? "http://localhost:8000");
  return NextResponse.rewrite(target);
}

export const config = { matcher: "/api/:path*" };
