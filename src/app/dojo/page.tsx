import type { Metadata } from "next";
import { Dojo } from "@/components/dojo/Dojo";
import { Page } from "@/components/ui/Art";

export const metadata: Metadata = {
  title: "Versus dojo",
  description: "Rank the twenty by head-to-head picks, then see which platform's taste is closest to yours.",
};

export default function DojoPage() {
  return (
    <Page>
      <div>
        <Dojo />
      </div>
    </Page>
  );
}
