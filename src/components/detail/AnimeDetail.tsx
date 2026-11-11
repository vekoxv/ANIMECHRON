"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Art } from "@/components/ui/Art";
import { SectionHeading } from "@/components/ui/Bits";
import { Reveal } from "@/components/ui/Reveal";
import { useTilt } from "@/components/ui/motion";
import { fixed, pad2, related, theme } from "@/lib/catalog";
import { useCatalog } from "@/lib/useCatalog";
import type { Scored } from "@/lib/useCatalog";
import { Characters } from "./Characters";
import { DetailHeader } from "./DetailHeader";
import { Overview } from "./Overview";
import { Ratings } from "./Ratings";
import { StudioSpotlight } from "./Studio";

function RelatedCard({ a, reasons, index }: { a: Scored; reasons: string[]; index: number }) {
  const tilt = useTilt(6);
  return (
    <Reveal from={index % 2 ? "up" : "left"} delay={index * 90} style={theme(a)}>
      <Link href={`/anime/${a.slug}`} data-cursor="Open" className="tilt group block" {...tilt}>
        <div className="relative overflow-hidden">
          <Art share={a.slug} src={a.cover} alt={`${a.title.display} cover art`} sizes="(max-width: 640px) 50vw, 22vw" className="aspect-[2/3] w-full" imgClassName="tilt-depth" />
          <span aria-hidden="true" className="tilt-glare" />
          <span className="t-num absolute bottom-0 right-0 bg-accent px-2.5 py-1.5 text-2xl text-ink">{fixed(a.consensus, 2)}</span>
        </div>
        <h3 className="t-display mt-3 truncate border-t border-rule pt-2.5 text-[1.7rem] transition-colors duration-500 group-hover:border-accent group-hover:text-accent">{a.title.display}</h3>
        <ul className="mt-1.5 space-y-0.5 text-sm text-mute">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Link>
    </Reveal>
  );
}

/** The full file on one title. Every section takes its colours from this title's own cover. */
export function AnimeDetail({ slug }: { slug: string }) {
  const { list, bySlug, personalized } = useCatalog();
  const a = bySlug.get(slug)!;
  const index = list.indexOf(a);
  const previous = list[(index - 1 + list.length) % list.length];
  const next = list[(index + 1) % list.length];

  return (
    <article style={theme(a)}>
      <DetailHeader a={a} total={list.length} personalized={personalized} />
      <Overview a={a} />
      <Ratings a={a} all={list} personalized={personalized} />
      <Characters a={a} />
      <StudioSpotlight a={a} />

      <section aria-label="Related titles" className="bg-ink py-[clamp(4rem,9vw,8rem)]">
        <div className="shell">
          <SectionHeading jp="関連作品" title="If this one stayed with you">
            Chosen by overlap in real metadata — shared genres, themes, studio or director — not by an opaque recommendation model.
          </SectionHeading>
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related(a).map((r, i) => (
              <RelatedCard key={r.anime.slug} a={bySlug.get(r.anime.slug)!} reasons={r.reasons} index={i} />
            ))}
          </div>
        </div>
      </section>

      <nav aria-label="Neighbouring titles" className="grid border-t border-rule sm:grid-cols-2">
        {[
          { a: previous, label: "Previous", Icon: ArrowLeft, align: "" },
          { a: next, label: "Next", Icon: ArrowRight, align: "sm:text-right sm:items-end" },
        ].map(({ a: n, label, Icon, align }) => (
          <Link key={label} href={`/anime/${n.slug}`} style={theme(n)} className={`group relative flex flex-col gap-1 overflow-hidden bg-deep px-(--gutter) py-12 transition-colors sm:odd:border-r sm:odd:border-rule ${align}`}>
            <span aria-hidden="true" className="tone absolute inset-0 text-accent opacity-0 transition-opacity duration-500 group-hover:opacity-25" />
            <span className="t-label relative flex items-center gap-2 text-mute">
              <Icon size={14} aria-hidden="true" /> {label} · № {pad2(n.rank)}
            </span>
            <span className="t-display relative text-[clamp(2rem,5vw,4.2rem)] transition-colors duration-300 group-hover:text-accent">{n.title.display}</span>
          </Link>
        ))}
      </nav>
    </article>
  );
}
