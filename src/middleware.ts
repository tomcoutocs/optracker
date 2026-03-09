import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip middleware for static assets and the Discord bot API (no cookies/session)
    "/((?!_next/static|_next/image|favicon.ico|api/discord|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
