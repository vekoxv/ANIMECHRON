import type { CSSProperties, ReactNode } from "react";
import { Reveal, Split } from "@/components/ui/Reveal";
import { formatDate, lengthOf, pretty } from "@/lib/catalog";
import type { Anime } from "@/lib/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-ink/20 py-2.5">
      <dt className="t-label pt-0.5 text-ink/60">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** B. Overview, set on paper like the opening page of a volume: synopsis left, the record sheet right. */
export function Overview({ a }: { a: Anime }) {
  const [first, ...rest] = a.synopsis.split(/(?<=[.!?…])\s+/);
  return (
    <section aria-labelledby="overview-title" className="paper py-[clamp(4rem,9vw,8rem)]">
      <div className="shell grid gap-x-14 gap-y-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <p lang="ja" aria-hidden="true" className="t-jp text-red">
            あらすじ
          </p>
          <h2 id="overview-title" className="t-display mt-3 text-[clamp(2.6rem,6vw,5.4rem)]">
            <Split text="The story" />
          </h2>
          <p className="rise t-serif mt-8 text-[clamp(1.3rem,2.2vw,1.9rem)] !leading-snug" style={{ "--d": "200ms" } as CSSProperties}>
            {first}
          </p>
          {rest.length > 0 && (
            <p className="rise t-serif mt-6 max-w-[62ch] text-ink/80" style={{ "--d": "320ms" } as CSSProperties}>
              {rest.join(" ")}
            </p>
          )}
          <p className="rise t-label mt-6 text-ink/50" style={{ "--d": "400ms" } as CSSProperties}>
            Synopsis from AniList, shortened
          </p>
        </Reveal>

        <Reveal from="right" className="lg:col-span-5">
          <dl className="border-t-2 border-ink">
            <Row label="Premiered">{formatDate(a.startDate)}</Row>
            {a.format === "TV" && <Row label="Finished">{a.status === "RELEASING" ? "Still airing" : formatDate(a.endDate)}</Row>}
            <Row label={a.format === "MOVIE" ? "Runtime" : "Length"}>
              {lengthOf(a)}
              {a.format === "TV" && a.duration ? `, about ${a.duration} min each` : ""}
            </Row>
            {a.format === "TV" && a.instalments != null && (
              <Row label="TV instalments">
                {a.instalments === 1 ? "One series; no TV sequel listed" : `${a.instalments} TV series in its sequel chain`}
                <span className="block text-sm font-normal text-ink/60">Counted from AniList sequel links. This page describes the first.</span>
              </Row>
            )}
            <Row label="Studio">{a.studio?.name ?? "—"}</Row>
            <Row label="Source">{pretty(a.source)}</Row>
            <Row label="Status">{pretty(a.status)}</Row>
            {a.creator && <Row label="Original creator">{a.creator}</Row>}
            {a.director && <Row label="Director">{a.director}</Row>}
            <Row label="Genres">{a.genres.join(", ")}</Row>
            {a.tags.length > 0 && <Row label="Themes">{a.tags.join(", ")}</Row>}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
