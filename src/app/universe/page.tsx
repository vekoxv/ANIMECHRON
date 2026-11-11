import type { Metadata } from "next";
import { Page } from "@/components/ui/Art";
import { Atlas } from "@/components/universe/Atlas";

export const metadata: Metadata = {
  title: "The character universe",
  description: "A star atlas of 160 characters in twenty constellations, arranged by how alike their stories are, with a route finder between any two.",
};

export default function UniversePage() {
  return (
    <Page>
      <div>
        <Atlas />
      </div>
    </Page>
  );
}
