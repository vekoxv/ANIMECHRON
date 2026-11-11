import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Reveal, Split } from "@/components/ui/Reveal";
import { ANIME, compact } from "@/lib/catalog";
import type { Anime } from "@/lib/types";

const IN_ARCHIVE = new Map(ANIME.map((a) => [a.id, a.slug]));

/** E. Studio spotlight: who drew it, what part they played here, and what else they are known for. */
export function StudioSpotlight({ a }: { a: Anime }) {
  const studio = a.studio;
  if (!studio) return null;
  const others = studio.works.filter((w) => w.id !== a.id).slice(0, 6);
  const siblings = ANIME.filter((b) => b !== a && b.studio?.id === studio.id);

  return (
    <section aria-labelledby="studio-title" className="paper overflow-hidden py-[clamp(4rem,9vw,8rem)]">
      <div className="shell">
        <Reveal>
          <p lang="ja" aria-hidden="true" className="t-jp text-red">
            制作
          </p>
          <p className="t-label mt-3 text-ink/60">Animation studio</p>
          {/* No logo is shown: AniList does not supply studio marks, so the name is set in type instead. */}
          <h2 id="studio-title" className="t-display mt-1 break-words text-[clamp(3.4rem,13vw,13rem)]">
            <Split text={studio.name} />
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-x-14 gap-y-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h3 className="rise t-display text-3xl">Its part in {a.title.display}</h3>
            <p className="rise t-serif mt-3" style={{ "--d": "120ms" } as CSSProperties}>
              AniList credits {studio.name} as the main animation studio for this {a.format === "MOVIE" ? "film" : "series"}
              {a.director ? `, directed by ${a.director}` : ""}.
              {a.partners.length > 0 && ` Production partners credited alongside it: ${a.partners.slice(0, 6).join(", ")}${a.partners.length > 6 ? ", and others" : ""}.`}
            </p>
            <dl className="rise mt-6 grid grid-cols-2 gap-4 border-t-2 border-ink pt-4" style={{ "--d": "220ms" } as CSSProperties}>
              <div>
                <dt className="t-label text-ink/60">In this archive</dt>
                <dd className="t-num text-4xl">
                  {siblings.length + 1} <span className="text-lg text-ink/60">of {ANIME.length} titles</span>
                </dd>
              </div>
              <div>
                <dt className="t-label text-ink/60">AniList favourites</dt>
                <dd className="t-num text-4xl">{compact(studio.favourites)}</dd>
              </div>
            </dl>
            {siblings.length > 0 && (
              <p className="rise mt-5 text-sm" style={{ "--d": "300ms" } as CSSProperties}>
                Also in the archive:{" "}
                {siblings.map((b, i) => (
                  <span key={b.slug}>
                    {i > 0 && ", "}
                    <Link href={`/anime/${b.slug}`} className="link font-semibold">
                      {b.title.display}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}
            <a href={studio.url} target="_blank" rel="noreferrer" className="rise btn btn-sm mt-6" style={{ "--d": "360ms" } as CSSProperties}>
              {studio.name} on AniList <ExternalLink size={14} aria-hidden="true" />
            </a>
          </Reveal>

          <div className="lg:col-span-7">
            <h3 className="t-display text-3xl">Other notable productions</h3>
            <p className="mt-1 text-sm text-ink/60">The studio’s most-followed work on AniList.</p>
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
              {others.map((w, i) => {
                const slug = IN_ARCHIVE.get(w.id);
                const body = (
                  <>
                    <span className="relative block aspect-[2/3] overflow-hidden border-2 border-ink bg-ink" style={{ background: w.color ?? undefined }}>
                      {w.cover && <Image src={w.cover} alt="" fill sizes="(max-width: 640px) 33vw, 12vw" className="object-cover grayscale transition-[filter,transform] duration-500 group-hover:scale-105 group-hover:grayscale-0" />}
                    </span>
                    <span className="mt-1.5 block text-sm font-semibold leading-tight">{w.title}</span>
                    <span className="t-label !text-[0.62rem] text-ink/60">
                      {w.year ?? "—"}
                      {slug ? " · in the archive" : ""}
                    </span>
                  </>
                );
                return (
                  <li key={w.id}>
                    <Reveal from="up" delay={i * 70}>
                      {slug ? (
                        <Link href={`/anime/${slug}`} className="group block">
                          {body}
                        </Link>
                      ) : (
                        <a href={w.url} target="_blank" rel="noreferrer" className="group block" aria-label={`${w.title} on AniList (opens in a new tab)`}>
                          {body}
                        </a>
                      )}
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
