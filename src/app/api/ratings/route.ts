import { connection } from "next/server";
import { getLiveRatings } from "@/lib/server/live";

/** Fresh ratings for all titles, with per-source health. Never fabricates: failed sources are simply absent. */
export async function GET() {
  await connection();
  const data = await getLiveRatings();
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
