import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimeDetail } from "@/components/detail/AnimeDetail";
import { Page } from "@/components/ui/Art";
import { ANIME, BY_SLUG } from "@/lib/catalog";

// Navigating here waits for the prerendered page instead of showing a shell first, so the
// cover a visitor clicked can expand straight into this page's cover (a shell would break the pair).
export const instant = false;

export function generateStaticParams() {
  return ANIME.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/anime/[slug]">): Promise<Metadata> {
  const a = BY_SLUG.get((await params).slug);
  if (!a) return { title: "Not in the archive" };
  return {
    title: a.title.display,
    description: `${a.title.display} (${a.year}, ${a.studio?.name}): synopsis, cast, studio, and ratings compared across AniList, MyAnimeList, IMDb and TMDB.`,
  };
}

export default async function AnimePage({ params }: PageProps<"/anime/[slug]">) {
  const { slug } = await params;
  if (!BY_SLUG.has(slug)) notFound();
  return (
    <Page>
      <div>
        <AnimeDetail slug={slug} />
      </div>
    </Page>
  );
}
