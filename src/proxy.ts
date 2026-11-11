import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SEEDS } from "@/lib/seeds";

const SLUGS = new Set(SEEDS.map((s) => s.slug));

/**
 * Only the twenty archived titles exist under /anime. A page that streams cannot change its
 * status once it has started, so unknown slugs are turned away here: sending them to a path
 * with no route gives the not-found page a real 404 status instead of a "soft" one.
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];
  if (SLUGS.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/not-in-the-archive", request.url));
}

export const config = { matcher: "/anime/:slug" };
