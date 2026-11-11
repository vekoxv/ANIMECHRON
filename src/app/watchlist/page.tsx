import type { Metadata } from "next";
import { Page } from "@/components/ui/Art";
import { Watchlist } from "@/components/watchlist/Watchlist";

export const metadata: Metadata = {
  title: "Your watchlist",
  description: "Titles you have saved, with their status, the hours ahead, and a personal seal generated from the list.",
};

export default function WatchlistPage() {
  return (
    <Page>
      <div>
        <Watchlist />
      </div>
    </Page>
  );
}
