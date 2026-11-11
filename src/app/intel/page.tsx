import type { Metadata } from "next";
import { Intel } from "@/components/intel/Intel";
import { Page } from "@/components/ui/Art";

export const metadata: Metadata = {
  title: "Rating intelligence",
  description: "Weigh AniList, MyAnimeList, IMDb and TMDB yourself, watch the ranking re-form, and read exactly how every score is built.",
};

export default function IntelPage() {
  return (
    <Page>
      <div>
        <Intel />
      </div>
    </Page>
  );
}
