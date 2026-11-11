import type { Metadata } from "next";
import { Archive } from "@/components/archive/Archive";
import { Page } from "@/components/ui/Art";

export const metadata: Metadata = {
  title: "The archive",
  description: "All twenty titles as a cinematic grid, a manga layout or a ranking table — searchable, filterable and sortable by platform.",
};

export default function ArchivePage() {
  return (
    <Page>
      <div>
        <Archive />
      </div>
    </Page>
  );
}
